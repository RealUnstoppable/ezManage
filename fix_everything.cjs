const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

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

code = code.replace(badJoinGroup, goodJoinGroup);

// Fix duplicate salt declarations in handleCreateShiftGroup
const s1 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt\${hash}:\${salt}\`;\n\n`;
const s2 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;\n\n`;
const s3 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;`;
const s4 = `  const salt = crypto.randomBytes(16).toString("hex");\n  const hash = crypto.scryptSync(password, salt, 64).toString("hex");\n  const hashedPassword = \`$scrypt\${hash}:\${salt}\`;`;

code = code.replaceAll(s1, "");
code = code.replaceAll(s2, "");
code = code.replaceAll(s3, "");
code = code.replaceAll(s4, "");

const hook = `checkRequiredFields(payload, ["groupName", "password"]);`;
code = code.replace(hook, hook + "\n\n  const salt = crypto.randomBytes(16).toString(\"hex\");\n  const hash = crypto.scryptSync(password, salt, 64).toString(\"hex\");\n  const hashedPassword = \`$scrypt$$\{hash}:\${salt}\`;\n");


// Also fix the extra brace in manageShiftGroups
const badShiftGroupsEnd = `      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
    throw new HttpsError("internal", "An internal error occurred.");
  }
});`;

const goodShiftGroupsEnd = `      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
    throw new HttpsError("internal", "An internal error occurred.");
});`;

code = code.replace(badShiftGroupsEnd, goodShiftGroupsEnd);

fs.writeFileSync('backend/index.js', code);
