const fs = require('fs');
let code = fs.readFileSync('js/shop.js', 'utf8');

const badBlock = `<<<<<<< HEAD
                if (updateQuantityTimeouts.has(productId)) {
                    clearTimeout(updateQuantityTimeouts.get(productId));
=======
                if (quantityTimeouts.has(productId)) {
                    clearTimeout(quantityTimeouts.get(productId));
>>>>>>> origin/main`;

const goodBlock = `                if (updateQuantityTimeouts.has(productId)) {
                    clearTimeout(updateQuantityTimeouts.get(productId));`;

code = code.replace(badBlock, goodBlock);

const badBlock2 = `<<<<<<< HEAD
                const timeoutId = setTimeout(() => {
                    handleUpdateQuantity(productId, quantity);
                    updateQuantityTimeouts.delete(productId);
                }, 300);

                updateQuantityTimeouts.set(productId, timeoutId);
=======
                quantityTimeouts.set(productId, setTimeout(() => {
                    handleUpdateQuantity(productId, quantity);
                    quantityTimeouts.delete(productId);
                }, 300));
>>>>>>> origin/main`;

const goodBlock2 = `                const timeoutId = setTimeout(() => {
                    handleUpdateQuantity(productId, quantity);
                    updateQuantityTimeouts.delete(productId);
                }, 300);

                updateQuantityTimeouts.set(productId, timeoutId);`;

code = code.replace(badBlock2, goodBlock2);

fs.writeFileSync('js/shop.js', code);
