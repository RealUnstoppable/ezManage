const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

// 1. Remove duplicate salt declarations
code = code.replace(/([ \t]*const salt = crypto\.randomBytes\(16\)\.toString\("hex"\);\n[ \t]*const hash = crypto\.scryptSync\(password, salt, 64\)\.toString\("hex"\);\n[ \t]*const hashedPassword = `\$scrypt\$?\{hash\}:\$\{salt\}`;\n)+/g, "");

// If it didn't work (regex issues), let's use exact strings:
const s1 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt\${hash}:\${salt}\`;\n\n`;
const s2 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;\n\n`;
const s3 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;`;
const s4 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt\${hash}:\${salt}\`;`;

code = code.replaceAll(s1, "").replaceAll(s2, "").replaceAll(s3, "").replaceAll(s4, "");

const hook = `checkRequiredFields(payload, ["groupName", "password"]);`;
code = code.replace(hook, hook + "\n\n  const salt = crypto.randomBytes(16).toString(\"hex\");\n  const hash = crypto.scryptSync(password, salt, 64).toString(\"hex\");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;\n");

// 2. Remove newGroupLegacy
const legacyBlock = `      const docRef = await admin.firestore()
          .collection("shift_groups")
          .add(newGroupLegacy);`;
code = code.replace(legacyBlock, "");

// 3. Fix the dangling handleRequestJoinShiftGroup
const badJoinGroup = `  await admin.firestore().collection("shift_group_requests").add({
    groupId,
    userId: uid,
    userName: userName || "Anonymous",
    status: "Pending",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {success: true};
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

const goodJoinGroup = `    // Upgrade to salted hash if correct
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
  }

  await admin.firestore().collection("shift_group_requests").add({
    groupId,
    userId: uid,
    userName: userName || "Anonymous",
    status: "Pending",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {success: true};
}`;
// We may need to do this more robustly if the string changed.
// Let's use substring for dangling block.
const markerStart = "    // Upgrade to salted hash if correct\n    if (isValid) {\n      const salt = crypto.randomBytes(16).toString(\"hex\");\n      const hash = crypto.scryptSync(password, salt, 64).toString(\"hex\");\n      await admin.firestore().collection(\"shift_groups\").doc(groupId).update({\n        password: `$scrypt${hash}:${salt}`,\n      });\n    }\n  }\n\n  if (!isValid) {\n    throw new HttpsError(\n        \"permission-denied\", \"Invalid password\");\n  }\n";
code = code.replace(markerStart, "");


// 4. Fix double catch blocks and missing signatures!
const doubleCatchRegex = /      throw new HttpsError\("internal", error\.message\);\n    \}\n  \}\);\n\n    throw new HttpsError\("invalid-argument", "Invalid action\."\);\n  \} catch \(error\) \{\n    logManagerError\(".*?", error\);\n    throw new HttpsError\("internal", "An internal error occurred\."\);\n  \}\n\}\);/g;

// Wait, the double catch blocks are super broken. Let's fix them with generic regex.
// Look at the pattern:
//     throw new HttpsError("invalid-argument", "Invalid action");
//   } catch (error) {
//     ...
//     throw new HttpsError("internal", error.message);
//   }
//   throw new HttpsError("internal", "An internal error occurred.");
// }
// });
const badEndingPattern = /      if \(error instanceof HttpsError\) \{\n        throw error;\n      \}\n      throw new HttpsError\("internal", error\.message\);\n    \}\n    throw new HttpsError\("internal", "An internal error occurred\."\);\n  \}\n\}\);/g;
const goodEndingPattern = `      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
});`;
code = code.replace(badEndingPattern, goodEndingPattern);


fs.writeFileSync('backend/index.js', code);
