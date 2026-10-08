const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

const s1 = \`  const salt = crypto.randomBytes(16).toString("hex");\\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\\n  const hashedPassword = \\\`$scrypt\${hash}:\${salt}\\\`;\\n\\n\`;
const s2 = \`  const salt = crypto.randomBytes(16).toString("hex");\\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\\n  const hashedPassword = \\\`$scrypt$$\{hash}:\${salt}\\\`;\\n\\n\`;
const s3 = \`  const salt = crypto.randomBytes(16).toString("hex");\\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\\n  const hashedPassword = \\\`$scrypt$$\{hash}:\${salt}\\\`;\`;
const s4 = \`  const salt = crypto.randomBytes(16).toString("hex");\\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\\n  const hashedPassword = \\\`$scrypt\${hash}:\${salt}\\\`;\`;

code = code.replaceAll(s1, "");
code = code.replaceAll(s2, "");
code = code.replaceAll(s3, "");
code = code.replaceAll(s4, "");

const hook = \`checkRequiredFields(payload, ["groupName", "password"]);\`;
code = code.replace(hook, hook + "\\n\\n  const salt = crypto.randomBytes(16).toString(\\"hex\\");\\n  const hash = crypto.scryptSync(password, salt, 64).toString(\\"hex\\");\\n  const hashedPassword = \\\`$scrypt$$\{hash}:\${salt}\\\`;\\n");

const legacyBlock = \`      const docRef = await admin.firestore()
          .collection("shift_groups")
          .add(newGroupLegacy);\`;
code = code.replace(legacyBlock, "");

const badJoinGroup = \`  await admin.firestore().collection("shift_group_requests").add({
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
        password: \\\`$scrypt$$\{hash}:\$\{salt\}\\\`,
      });
    }
  }

  if (!isValid) {
    throw new HttpsError(
        "permission-denied", "Invalid password");
  }\`;

const goodJoinGroup = \`    // Upgrade to salted hash if correct
    if (isValid) {
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync(password, salt, 64).toString("hex");
      await admin.firestore().collection("shift_groups").doc(groupId).update({
        password: \\\`$scrypt$$\{hash}:\$\{salt\}\\\`,
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
}\`;
code = code.replace(badJoinGroup, goodJoinGroup);

// Remove extra braces in standard functions
const doubleCatchPattern = /      if \\(error instanceof HttpsError\\) \\{\\n        throw error;\\n      \\}\\n      throw new HttpsError\\("internal", error\\.message\\);\\n    \\}\\n    throw new HttpsError\\("internal", "An internal error occurred\\."\\);\\n  \\}\\n\\}\\);/g;

const doubleCatchReplacement = \`      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
    throw new HttpsError("internal", "An internal error occurred.");
});\`;

code = code.replace(doubleCatchPattern, doubleCatchReplacement);

const tempBlockBad = \`    throw new HttpsError("invalid-argument", "Invalid action.");
  } catch (error) {
    logManagerError("Error in manageTemperatureLogs: ", error);
    throw new HttpsError("internal", "An internal error occurred.");
  }
});\`;

code = code.replace(tempBlockBad, "");

fs.writeFileSync('backend/index.js', code);
