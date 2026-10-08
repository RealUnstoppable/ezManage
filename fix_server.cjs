const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const badBlock = `<<<<<<< HEAD
    console.error("Stripe Checkout Error:", err);
    res.status(500).json({ error: "An internal server error occurred. Please try again later." });
=======
    console.error("Error creating checkout session:", err);
    res.status(500).json({ error: "An unexpected error occurred" });
>>>>>>> origin/main`;

const goodBlock = `    console.error("Stripe Checkout Error:", err);
    res.status(500).json({ error: "An internal server error occurred. Please try again later." });`;

code = code.replace(badBlock, goodBlock);
fs.writeFileSync('server.js', code);
