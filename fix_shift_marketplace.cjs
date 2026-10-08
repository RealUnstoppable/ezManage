const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

const markerStart = "exports.manageShiftMarketplace = functions.https.onCall(async (data, context) => {";
const markerEnd = "exports.manageLostAndFound = functions.https.onCall(async (data, context) => {";

const startIdx = code.indexOf(markerStart);
const endIdx = code.indexOf(markerEnd);

if (startIdx !== -1 && endIdx !== -1) {
    const goodMarketplace = `exports.manageShiftMarketplace = functions.https.onCall(async (data, context) => {
    const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

    try {
        const orgId = userOrgId || uid;
        const isManager = orgId === uid || isAdmin;

        if (action === "create") {
            const { originalEmployeeId, originalEmployeeName, shiftDate, shiftStart, shiftEnd, role } = payload;
            if (!originalEmployeeId || !shiftDate) {
                throw new HttpsError('invalid-argument', 'Missing required shift data');
            }
            const docRef = await admin.firestore().collection('shift_marketplace').add({
                orgId: orgId,
                originalEmployeeId: originalEmployeeId,
                originalEmployeeName: originalEmployeeName || 'Unknown',
                shiftDate: shiftDate,
                shiftStart: shiftStart || '',
                shiftEnd: shiftEnd || '',
                role: role || '',
                status: 'Open',
                coveringEmployeeId: null,
                coveringEmployeeName: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, shiftId: docRef.id };
        }
        else if (action === "offer_cover") {
            const { shiftId, coveringEmployeeId, coveringEmployeeName } = payload;
            if (!shiftId || !coveringEmployeeId) throw new HttpsError('invalid-argument', 'Missing cover info');

            const shiftRef = admin.firestore().collection('shift_marketplace').doc(shiftId);
            const shiftDoc = await shiftRef.get();
            if (!shiftDoc.exists || shiftDoc.data().orgId !== orgId) throw new HttpsError('not-found', 'Shift not found');
            if (shiftDoc.data().status !== 'Open') throw new HttpsError('failed-precondition', 'Shift is not open for coverage');

            await shiftRef.update({
                coveringEmployeeId: coveringEmployeeId,
                coveringEmployeeName: coveringEmployeeName,
                status: 'Pending Approval'
            });
            return { success: true };
        }
        else if (action === "approve") {
            if (!isManager) throw new HttpsError('permission-denied', 'Only managers can approve swaps');
            const { shiftId } = payload;
            if (!shiftId) throw new HttpsError('invalid-argument', 'Missing shift ID');

            const shiftRef = admin.firestore().collection('shift_marketplace').doc(shiftId);
            const shiftDoc = await shiftRef.get();
            if (!shiftDoc.exists || shiftDoc.data().orgId !== orgId) throw new HttpsError('not-found', 'Shift not found');

            await shiftRef.update({ status: 'Approved' });
            return { success: true };
        }
        else if (action === "deny") {
            if (!isManager) throw new HttpsError('permission-denied', 'Only managers can deny swaps');
            const { shiftId } = payload;
            if (!shiftId) throw new HttpsError('invalid-argument', 'Missing shift ID');

            const shiftRef = admin.firestore().collection('shift_marketplace').doc(shiftId);
            const shiftDoc = await shiftRef.get();
            if (!shiftDoc.exists || shiftDoc.data().orgId !== orgId) throw new HttpsError('not-found', 'Shift not found');

            await shiftRef.update({
                coveringEmployeeId: null,
                coveringEmployeeName: null,
                status: 'Open'
            });
            return { success: true };
        }
        else if (action === "get") {
            const snapshot = await admin.firestore().collection('shift_marketplace')
                .where('orgId', '==', orgId)
                .orderBy('createdAt', 'desc')
                .get();

            let shifts = [];
            snapshot.forEach(doc => {
                shifts.push({ id: doc.id, ...doc.data() });
            });
            return { success: true, shifts: shifts };
        }
        else if (action === "delete") {
            const { shiftId } = payload;
            if (!shiftId) throw new HttpsError('invalid-argument', 'Missing shift ID');

            const shiftRef = admin.firestore().collection('shift_marketplace').doc(shiftId);
            const shiftDoc = await shiftRef.get();
            if (!shiftDoc.exists || shiftDoc.data().orgId !== orgId) throw new HttpsError('not-found', 'Shift not found');
            if (!isManager && shiftDoc.data().originalEmployeeId !== uid) {
                 throw new HttpsError('permission-denied', 'Cannot delete this shift');
            }

            await shiftRef.delete();
            return { success: true };
        }
        else {
             throw new HttpsError('invalid-argument', 'Invalid action');
        }
    } catch (error) {
        logManagerError("Error managing shift marketplace:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "An internal error occurred.");
    }
});

`;

    code = code.substring(0, startIdx) + goodMarketplace + code.substring(endIdx);
}

fs.writeFileSync('backend/index.js', code);
