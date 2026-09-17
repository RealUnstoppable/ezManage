const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const expect = chai.expect;

describe('createCheckoutSession Error Handling', () => {
  let myFunctions;
  let req;
  let res;
  let stripeMock;

  beforeEach(() => {
    // Setup request and response mocks
    req = {
      method: 'POST',
      body: {
        uid: 'user123',
        email: 'test@example.com',
        plan: 'Business Pro',
        amount: 100
      }
    };

    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
      send: sinon.stub()
    };

    // Create a stripe mock that throws an error when creating a session
    stripeMock = sinon.stub().returns({
      checkout: {
        sessions: {
          create: sinon.stub().rejects(new Error('Stripe API error for testing'))
        }
      }
    });

    // We also need to mock firebase-functions and cors if they are problematic in testing
    // Or we can just let proxyquire handle the require('stripe')
    myFunctions = proxyquire('../index', {
      'stripe': stripeMock,
      'cors': () => (req, res, cb) => cb() // bypass cors for testing
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return 500 when Stripe API throws an error', async () => {
    // Call the function
    await myFunctions.createCheckoutSession(req, res);

    // Wait a tick for promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(res.status.calledWith(500)).to.be.true;
    expect(res.json.calledWith({ error: 'Stripe API error for testing' })).to.be.true;
  });
});
