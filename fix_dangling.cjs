const fs = require('fs');
let content = fs.readFileSync('backend/index.js', 'utf8');

const badDanglingBlock = `  return {success: true};
}

    // Upgrade to salted hash if correct
    if (isValid) {
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync(password, salt, 64).toString("hex");
      await admin.firestore().collection("shift_groups").doc(groupId).update({
        password: \`$scrypt$$\{hash}:\$\{salt\}\`,
      });
    }
  }

  if (!isValid) {
    throw new HttpsError(
        "permission-denied", "Invalid password");
  }`;

content = content.replace(badDanglingBlock, '  return {success: true};\n}');
fs.writeFileSync('backend/index.js', content);
