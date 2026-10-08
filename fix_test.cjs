const fs = require('fs');
let code = fs.readFileSync('backend/__tests__/cancelSubscription.test.js', 'utf8');

const badBlock1 = `    await expect(cancelSubscription.run(data, context)).rejects.toThrow("Stripe List Error");

<<<<<<< HEAD
    expect(consoleSpy).toHaveBeenCalledWith(\`Manager Troubleshooting: Cancel Error for customerId: \${req.body.customerId}\`, error);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({error: "An internal server error occurred. Please try again later."});
=======
    expect(consoleSpy).toHaveBeenCalledWith(\`Manager Troubleshooting: Cancel Error for uid: user_test_123\`, error);
>>>>>>> origin/main`;

const goodBlock1 = `    await expect(cancelSubscription.run(data, context)).rejects.toThrow("An internal server error occurred. Please try again later.");
    expect(consoleSpy).toHaveBeenCalledWith(\`Manager Troubleshooting: Cancel Error for uid: user_test_123\`, error);`;

code = code.replace(badBlock1, goodBlock1);

const badBlock2 = `    await expect(cancelSubscription.run(data, context)).rejects.toThrow("Stripe Cancel Error");

<<<<<<< HEAD
    expect(consoleSpy).toHaveBeenCalledWith(\`Manager Troubleshooting: Cancel Error for customerId: \${req.body.customerId}\`, error);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({error: "An internal server error occurred. Please try again later."});
=======
    expect(consoleSpy).toHaveBeenCalledWith(\`Manager Troubleshooting: Cancel Error for uid: user_test_123\`, error);
>>>>>>> origin/main`;

const goodBlock2 = `    await expect(cancelSubscription.run(data, context)).rejects.toThrow("An internal server error occurred. Please try again later.");
    expect(consoleSpy).toHaveBeenCalledWith(\`Manager Troubleshooting: Cancel Error for uid: user_test_123\`, error);`;

code = code.replace(badBlock2, goodBlock2);

fs.writeFileSync('backend/__tests__/cancelSubscription.test.js', code);
