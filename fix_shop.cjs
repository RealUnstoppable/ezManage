const fs = require('fs');
let code = fs.readFileSync('js/shop.js', 'utf8');

// Remove the first conflict block (origin/main adds const quantityTimeouts = new Map();)
code = code.replace(/<<<<<<< HEAD\n=======\n        const quantityTimeouts = new Map\(\);\n>>>>>>> origin\/main\n/g, "");

// Remove the second conflict block
const block2 = `<<<<<<< HEAD
=======
                if (quantityTimeouts.has(productId)) {
                    clearTimeout(quantityTimeouts.get(productId));
                }

                quantityTimeouts.set(productId, setTimeout(() => {
                    handleUpdateQuantity(productId, quantity);
                    quantityTimeouts.delete(productId);
                }, 300));
>>>>>>> origin/main
`;
code = code.replace(block2, "");

fs.writeFileSync('js/shop.js', code);
