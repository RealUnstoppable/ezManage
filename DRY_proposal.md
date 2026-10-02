# DRY Proposal: \`withAuthAndCatch\`

## The Problem
Currently, in \`backend/index.js\`, many Cloud Functions (e.g., \`manageTasks\`, \`manageShiftNotes\`, \`manageEmployees\`) share boilerplate code for authentication and error handling:
1. They call \`getAuthAndPayload(data, context, admin)\`.
2. They wrap their logic in a \`try...catch\` block that logs the error and throws an \`HttpsError\`.

## The Solution
Create a higher-order function named \`withAuthAndCatch\` to abstract this logic.

### Implementation Concept
\`\`\`javascript
function withAuthAndCatch(functionName, handler) {
  return functions.https.onCall(async (data, context) => {
    try {
      const authData = await getAuthAndPayload(data, context, admin);
      return await handler(authData);
    } catch (error) {
      logManagerError(\`Error in \${functionName} for uid: \${context?.auth?.uid || 'unknown'}\`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message || "Internal server error");
    }
  });
}
\`\`\`
