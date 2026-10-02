cat js/shop.js | head -n 233 > js/shop_fixed.js
echo "        // ⚡ Bolt Optimization: Debounce quantity inputs to prevent rapid multiple Firestore updates and re-renders" >> js/shop_fixed.js
echo "        // Impact: Reduces overlapping rapid inputs, DOM updates, and Firestore writes when using spinners or typing quickly." >> js/shop_fixed.js
echo "        const updateQuantityTimeouts = new Map();" >> js/shop_fixed.js
echo "        cartItemsContainer.addEventListener('input', (e) => {" >> js/shop_fixed.js
echo "            if (e.target.classList.contains('item-quantity-input')) {" >> js/shop_fixed.js
echo "                const productId = e.target.dataset.id;" >> js/shop_fixed.js
echo "                const quantity = parseInt(e.target.value, 10);" >> js/shop_fixed.js
echo "" >> js/shop_fixed.js
echo "                if (updateQuantityTimeouts.has(productId)) {" >> js/shop_fixed.js
echo "                    clearTimeout(updateQuantityTimeouts.get(productId));" >> js/shop_fixed.js
echo "                }" >> js/shop_fixed.js
echo "" >> js/shop_fixed.js
echo "                const timeoutId = setTimeout(() => {" >> js/shop_fixed.js
echo "                    handleUpdateQuantity(productId, quantity);" >> js/shop_fixed.js
echo "                    updateQuantityTimeouts.delete(productId);" >> js/shop_fixed.js
echo "                }, 300);" >> js/shop_fixed.js
echo "" >> js/shop_fixed.js
echo "                updateQuantityTimeouts.set(productId, timeoutId);" >> js/shop_fixed.js
cat js/shop.js | tail -n +266 >> js/shop_fixed.js
mv js/shop_fixed.js js/shop.js
