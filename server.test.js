const request = require('supertest');
const app = require('./server');

// Mock Stripe so we don't make real API calls
jest.mock('stripe', () => {
  const mCreate = jest.fn();
  return jest.fn(() => ({
    checkout: {
      sessions: {
        create: mCreate
      }
    }
  }));
});

describe('POST /create-checkout-session', () => {
  let mockCreate;

  beforeAll(() => {
    mockCreate = require('stripe')().checkout.sessions.create;
  });

  beforeEach(() => {
    // Reset the mock before each test
    mockCreate.mockReset();
  });

  it('should create a checkout session for Business Pro plan', async () => {
    // Arrange
    const mockSessionUrl = 'https://checkout.stripe.com/test-session-url';
    mockCreate.mockResolvedValueOnce({ url: mockSessionUrl });

    // Act
    const response = await request(app)
      .post('/create-checkout-session')
      .send({ plan: 'Business Pro' });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ url: mockSessionUrl });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: '', // Business Pro price ID is currently empty string in the code
          quantity: 1,
        },
      ],
    }));
  });

  it('should create a checkout session for default plan', async () => {
    // Arrange
    const mockSessionUrl = 'https://checkout.stripe.com/test-session-url-default';
    mockCreate.mockResolvedValueOnce({ url: mockSessionUrl });

    // Act
    const response = await request(app)
      .post('/create-checkout-session')
      .send({ plan: 'Individual' });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ url: mockSessionUrl });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [
        {
          price: 'price_individual_id',
          quantity: 1,
        },
      ],
    }));
  });

  it('should return 500 if Stripe throws an error', async () => {
    // Arrange
    const errorMessage = 'Stripe API error';
    mockCreate.mockRejectedValueOnce(new Error(errorMessage));

    // Act
    const response = await request(app)
      .post('/create-checkout-session')
      .send({ plan: 'Business Pro' });

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: errorMessage });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
