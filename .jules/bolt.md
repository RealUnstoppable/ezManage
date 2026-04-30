## 2026-04-29 - [Optimized array.find to dictionary lookup]
**Learning:** Found that `js/shop.js` was doing O(N) array lookups using `.find` when updating the cart, which had an existing dictionary lookup `productMap` available. Also learned that trying to fix tests by modifying `package.json` violates Bolt constraints.
**Action:** Use existing lookup tables when they are available instead of array searches. Always adhere to constraints of not modifying `package.json` or `tsconfig.json` unless explicitly instructed to.
