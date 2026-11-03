const request = require('supertest');
const app = require('./server.cjs');
const { watchdog } = require('./security/watchdog.cjs');

// Mock Stripe
jest.mock('stripe', () => {
  const mCreate = jest.fn();
  const mConstructEvent = jest.fn();
  const StripeConstructor = jest.fn(() => ({
    checkout: {
      sessions: {
        create: mCreate,
      },
    },
    webhooks: {
      constructEvent: mConstructEvent,
    },
  }));
  StripeConstructor._mCreate = mCreate;
  StripeConstructor._mConstructEvent = mConstructEvent;
  return StripeConstructor;
});

const stripeModule = require('stripe');
const mockCreate = stripeModule._mCreate;
const mockConstructEvent = stripeModule._mConstructEvent;

describe('ezManage Server Security & Stripe API Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    watchdog.lockout.clearAll();
  });

  describe('HTTP Security Headers (Helmet)', () => {
    it('should set secure HTTP headers on responses', async () => {
      const response = await request(app).get('/api/security/lockout-status?email=test@example.com');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('Security Watchdog & Malicious Payload Detection', () => {
    it('should block requests with XSS script injection payloads with 403', async () => {
      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          plan: 'Business Pro',
          malicious: '<script>alert("XSS")</script>',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Suspicious payload detected by ezManage Security Watchdog');
    });

    it('should block requests with JavaScript URI injection', async () => {
      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          plan: 'Business Pro',
          callback: 'javascript:document.cookie',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Suspicious payload detected by ezManage Security Watchdog');
    });

    it('should block SQL injection patterns', async () => {
      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          plan: 'Business Pro',
          filter: "' OR '1'='1",
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Suspicious payload detected by ezManage Security Watchdog');
    });
  });

  describe('Account Lockout Mechanism', () => {
    const testEmail = 'staff@example.com';

    it('should track failed attempts and lock out after 5 failures', async () => {
      // 4 failed attempts: not locked out yet
      for (let i = 1; i <= 4; i++) {
        const res = await request(app)
          .post('/api/security/auth-attempt')
          .send({ email: testEmail, success: false });

        expect(res.status).toBe(200);
        expect(res.body.isLocked).toBe(false);
        expect(res.body.attemptsRemaining).toBe(5 - i);
      }

      // 5th failed attempt: triggers lockout
      const lockRes = await request(app)
        .post('/api/security/auth-attempt')
        .send({ email: testEmail, success: false });

      expect(lockRes.status).toBe(200);
      expect(lockRes.body.isLocked).toBe(true);
      expect(lockRes.body.remainingSeconds).toBeGreaterThan(0);

      // Checking lockout status confirms account is locked
      const statusRes = await request(app)
        .get(`/api/security/lockout-status?email=${encodeURIComponent(testEmail)}`);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.isLocked).toBe(true);
      expect(statusRes.body.remainingSeconds).toBeGreaterThan(0);
    });

    it('should reset failed attempts upon successful login', async () => {
      // 2 failed attempts
      await request(app).post('/api/security/auth-attempt').send({ email: testEmail, success: false });
      await request(app).post('/api/security/auth-attempt').send({ email: testEmail, success: false });

      // Successful login resets counter
      const successRes = await request(app)
        .post('/api/security/auth-attempt')
        .send({ email: testEmail, success: true });

      expect(successRes.body.isLocked).toBe(false);
      expect(successRes.body.count).toBe(0);

      const statusRes = await request(app)
        .get(`/api/security/lockout-status?email=${encodeURIComponent(testEmail)}`);

      expect(statusRes.body.isLocked).toBe(false);
    });
  });

  describe('POST /create-checkout-session', () => {
    it('should create a checkout session for Business Pro plan', async () => {
      const mockSessionUrl = 'https://checkout.stripe.com/test-session-url';
      mockCreate.mockResolvedValueOnce({ url: mockSessionUrl });

      const response = await request(app)
        .post('/create-checkout-session')
        .send({ plan: 'Business Pro' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ url: mockSessionUrl });
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [
            {
              price: 'price_1UJifEBmfNp1AIykML2Y8VLE',
              quantity: 1,
            },
          ],
        })
      );
    });

    it('should create a checkout session for Individual plan', async () => {
      const mockSessionUrl = 'https://checkout.stripe.com/test-individual-url';
      mockCreate.mockResolvedValueOnce({ url: mockSessionUrl });

      const response = await request(app)
        .post('/create-checkout-session')
        .send({ plan: 'Individual' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ url: mockSessionUrl });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            {
              price: 'price_1UJifGBmfNp1AIykFdVlMS1x',
              quantity: 1,
            },
          ],
        })
      );
    });

    it('should reject invalid or manipulated plans with 400', async () => {
      const response = await request(app)
        .post('/create-checkout-session')
        .send({ plan: 'SuperHackerFreePlan' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid plan specified.');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should sanitize external open-redirect URLs to safe defaults', async () => {
      mockCreate.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/test-url' });

      await request(app)
        .post('/create-checkout-session')
        .send({
          plan: 'Business Pro',
          successUrl: 'https://evil-phishing-site.com/steal',
          cancelUrl: 'http://localhost:3000?canceled=true',
        });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.success_url).toBe('http://localhost:3000?success=true'); // Fallback to safe default
      expect(callArgs.cancel_url).toBe('http://localhost:3000?canceled=true');
    });

    it('should handle Stripe API errors gracefully with 500', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Stripe API network timeout'));

      const response = await request(app)
        .post('/create-checkout-session')
        .send({ plan: 'Business Pro' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Stripe API network timeout');
    });
  });

  describe('POST /webhook (Stripe Webhook Signature Verification)', () => {
    it('should reject webhook request if stripe-signature header is missing', async () => {
      const response = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ type: 'checkout.session.completed' }));

      expect(response.status).toBe(400);
      expect(response.text).toContain('Missing stripe-signature header');
    });

    it('should reject webhook request with invalid signature', async () => {
      mockConstructEvent.mockImplementationOnce(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'invalid_sig_12345')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ id: 'evt_test' }));

      expect(response.status).toBe(400);
      expect(response.text).toContain('Webhook Signature Error');
    });

    it('should process webhook when signature is valid', async () => {
      mockConstructEvent.mockReturnValueOnce({
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_123',
          },
        },
      });

      const response = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'valid_test_signature')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ id: 'evt_123' }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
      expect(mockConstructEvent).toHaveBeenCalled();
    });

    it('should ignore duplicate webhook events with the same event.id', async () => {
      mockConstructEvent.mockReturnValue({
        id: 'evt_idempotent_test_456',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_456',
          },
        },
      });

      // First call
      const res1 = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'valid_test_signature')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ id: 'evt_idempotent_test_456' }));

      expect(res1.status).toBe(200);
      expect(res1.body).toEqual({ received: true });

      // Duplicate call with same event.id
      const res2 = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'valid_test_signature')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ id: 'evt_idempotent_test_456' }));

      expect(res2.status).toBe(200);
      expect(res2.body).toEqual({ received: true, duplicate: true });
    });
  });
});
