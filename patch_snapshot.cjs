const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(
    /unsubscribeUser = db\.collection\("users"\)\.doc\(user\.uid\)\.onSnapshot\(async doc => \{([\s\S]*?)        \}\);\n            \} else \{/g,
    `unsubscribeUser = db.collection("users").doc(user.uid).onSnapshot(async doc => {$1        }, error => {\n            console.error("Firestore onSnapshot error:", error);\n            isInitializingAuth = false;\n        });\n            } else {`
);
fs.writeFileSync('index.html', html);
