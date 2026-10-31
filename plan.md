1. **Remove plaintext `joinKey` storage in `handleCreateShiftGroup`**:
   - In `backend/index.js`, modify `handleCreateShiftGroup` to stop saving `plainJoinKey` to the Firestore document field `joinKey`.
2. **Remove plaintext `joinKey` storage in `handleRotateWorkplaceCredentials`**:
   - Modify `handleRotateWorkplaceCredentials` to stop updating the Firestore document with `joinKey: updatedJoinKey`.
3. **Remove plaintext `joinKey` storage in `handleUpdateCompanyShiftGroup`**:
   - Modify `handleUpdateCompanyShiftGroup` to stop setting `updateData.joinKey = passStr`.
4. **Update tests in `backend/__tests__/manageShiftGroups.test.js`**:
   - Change tests that previously asserted `expect(savedGroup.joinKey).toBe(...)` and `expect(updateData.joinKey).toBe(...)` to assert `.toBeUndefined()`.
   - Leave `result.joinKey` assertions unchanged as the ephemeral return value is allowed.
5. **Run backend tests**:
   - Execute `cd backend && npx jest` to ensure the modifications haven't introduced regressions.
6. **Pre-commit checks**:
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
