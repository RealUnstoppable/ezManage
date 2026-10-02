# State Management Proposal

## Problem
In the frontend dashboard (e.g., \`js/shop.js\`), whenever a cart item is updated, \`updateCartState\` calls \`renderCart()\`, which re-renders the *entire* cart HTML. This triggers unnecessary DOM reflows and re-renders of elements that haven't changed.

## Proposed Solution
1. **Fine-Grained DOM Updates**: Instead of re-rendering the whole cart via \`innerHTML\`, update only the specific DOM elements that changed (e.g., the item's quantity input and the total price).
2. **State Management Library**: Consider integrating a lightweight state management library (like Alpine.js, which is already used in the repo) to bind state to specific DOM nodes reactively.
3. **Debounce UI Updates**: We already debounce Firestore writes using \`Map\`. We should extend this concept to batch DOM updates, avoiding layout thrashing.
