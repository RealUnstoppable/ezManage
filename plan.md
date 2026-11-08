1. **Identify the vulnerability**: In `backend/index.js`, the functions `manageShiftNotes`, `manageTemperatureLogs` (specifically the `get` action where it allows `payload.orgId`), and `manageLostAndFound` allow a user to supply `payload.orgId` from the client and fallback to `userOrgId`. However, trusting client-provided `orgId` allows for Insecure Direct Object Reference (IDOR) attacks, enabling users to access or create data in organizations they don't belong to.

2. **Fix `manageShiftNotes`**:
   - In `backend/index.js`, line 472, change `const actualOrgId = payload.orgId || userOrgId || null;` to `const actualOrgId = userOrgId || null;`.
   - Also, in the `create` action (line ~490), ensure `orgId` uses `actualOrgId` directly, not `orgId || actualOrgId` where `orgId` is from `payload`. `orgId: actualOrgId` should be used instead of `orgId: orgId || actualOrgId`.

3. **Fix `manageTemperatureLogs`**:
   - In `backend/index.js`, around line 1670: `const targetOrgId = (payload && payload.orgId) || userOrgId || null;` allows users to query logs of any `targetOrgId`. We should remove trusting `payload.orgId` if they are not an admin. Actually, if they are an admin, they can query any org. So we can say `const targetOrgId = isAdmin ? ((payload && payload.orgId) || userOrgId || null) : (userOrgId || null);` OR simply check `if (!isAdmin && payload && payload.orgId && payload.orgId !== userOrgId) throw ...`.
   - Let's look closely at `manageTemperatureLogs`:
     ```javascript
        const targetOrgId = (payload && payload.orgId) || userOrgId || null;
        if (!targetOrgId && !isAdmin) {
          return {success: true, logs: []};
        }

        let query = admin.firestore().collection("temperature_logs");
        if (!isAdmin) {
          query = query.where("orgId", "==", targetOrgId);
        } else if (targetOrgId) {
          query = query.where("orgId", "==", targetOrgId);
        }
     ```
     If we don't trust `payload.orgId`, we should only allow it if `isAdmin` is true. `const targetOrgId = isAdmin ? ((payload && payload.orgId) || userOrgId || null) : (userOrgId || null);`.

4. **Fix `manageLostAndFound`**:
   - In `backend/index.js`, line 1863: `const actualOrgId = (payload && payload.orgId) || userOrgId || null;` should be `const actualOrgId = isAdmin ? ((payload && payload.orgId) || userOrgId || null) : (userOrgId || null);`.

5. **Journaling**:
   - Add a journal entry to `.jules/sentinel.md` noting the critical learning about avoiding client-provided payload overriding securely validated variables.

6. **Run Tests**:
   - Run backend tests to ensure they still pass.
   - We will run `cd backend && pnpm test`.

7. **Review & Pre-commit Steps**:
   - Run pre-commit instructions before submitting.
