const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const expect = chai.expect;

describe('cancelSubscription', () => {
  let myFunctions;
  let data;
  let context;
  let stripeMock;
  let adminMock;
  let userDocMock;
  let logManagerErrorMock;

  beforeEach(() => {
    data = {
      payload: {
        customerId: 'cus_test_123'
      }
    };

    context = {
      auth: {
        uid: 'user123',
        token: { email: 'test@example.com' }
      }
    };

    stripeMock = sinon.stub().returns({
      subscriptions: {
        list: sinon.stub().resolves({
          data: [
            { id: 'sub_1' },
            { id: 'sub_2' }
          ]
        }),
        cancel: sinon.stub().resolves({})
      }
    });

    userDocMock = {
      exists: true,
      data: () => ({ subscription: { customerId: 'cus_test_123' } })
    };

    adminMock = {
      initializeApp: sinon.stub(),
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            get: sinon.stub().resolves(userDocMock)
          })
        })
      })
    };

    logManagerErrorMock = sinon.stub();

    myFunctions = proxyquire('../index', {
      'stripe': stripeMock,
      'firebase-admin': adminMock,
      './utils': {
        adaptGen2Params: (data, context) => ({ data, context }),
        logManagerError: logManagerErrorMock,
        checkRequiredFields: () => {}
      }
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should cancel all subscriptions for a customer and return success', async () => {
    const cancelSubscriptionFn = myFunctions.cancelSubscription.run || myFunctions.cancelSubscription;
    const result = await cancelSubscriptionFn(data, context);
    expect(result).to.deep.equal({ success: true });
  });

  it('should throw permission-denied if user is unauthorized', async () => {
    userDocMock.data = () => ({ subscription: { customerId: 'cus_other_456' } });
    const cancelSubscriptionFn = myFunctions.cancelSubscription.run || myFunctions.cancelSubscription;

    try {
      await cancelSubscriptionFn(data, context);
      expect.fail('Should have thrown an error');
    } catch (err) {
      expect(err.code).to.equal('permission-denied');
    }
  });

  it('should handle error when listing subscriptions', async () => {
    const error = new Error('Stripe List Error');
    stripeMock().subscriptions.list.rejects(error);
    const cancelSubscriptionFn = myFunctions.cancelSubscription.run || myFunctions.cancelSubscription;

    try {
      await cancelSubscriptionFn(data, context);
      expect.fail('Should have thrown an error');
    } catch (err) {
      expect(err.code).to.equal('internal');
      expect(logManagerErrorMock.calledOnce).to.be.true;
    }
  });
});
