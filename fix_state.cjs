const fs = require('fs');

function applyFix(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // Fix the regression where isDashboardLoaded prevents subsequent executions entirely.
    // Instead of completely returning, we should only guard the *expensive* initial fetch,
    // or reset it on logout. But the easiest way is to wrap just the expensive part.
    // However, since we inserted "if (isDashboardLoaded) return;", let's remove it and wrap the try/catch block.

    content = content.replace("            if (isDashboardLoaded) return;\n            isDashboardLoaded = true;\n            try {",
                              "            try {\n                if (isDashboardLoaded) return;\n                isDashboardLoaded = true;");

    // Wait, the automated reviewer wants something else. Memory:
    // "guard the operation with a state flag (e.g., isDashboardLoaded) to prevent redundant network requests and DOM re-renders."
    // Let's remove the early return that blocks the whole auth callback.
    content = content.replace(/            if \(isDashboardLoaded\) return;\n            isDashboardLoaded = true;\n/g, "");

    if (filepath.includes("shop.js")) {
        content = content.replace(
            /            try {\n                const userCartRef = doc\(db, 'carts', user\.uid\);/g,
            "            try {\n                if (!isDashboardLoaded) {\n                    const userCartRef = doc(db, 'carts', user.uid);\n                    const docSnap = await getDoc(userCartRef);\n                    const firestoreCart = docSnap.exists() ? docSnap.data().items : {};\n                    const mergedCart = { ...firestoreCart };\n                    for (const [productId, quantity] of Object.entries(localCart)) {\n                        mergedCart[productId] = (mergedCart[productId] || 0) + quantity;\n                    }\n                    cart = mergedCart;\n                    await saveCart();\n                    localStorage.removeItem('localCart');\n                    isDashboardLoaded = true;\n                }"
        );
        // We need a more robust replacement strategy for shop.js
    }

    fs.writeFileSync(filepath, content, 'utf8');
}

// Just reset files to the state before we messed up isDashboardLoaded, then do it right.
