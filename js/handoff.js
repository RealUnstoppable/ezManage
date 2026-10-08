import { db, auth, fetchUserDoc } from './auth.js';
import { logManagerError } from './utils.js';

async function getCurrentUserOrgAndProfile() {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in to access handoffs.");

        const userDoc = await fetchUserDoc(user.uid);
        if (!userDoc.exists) throw new Error("User profile not found.");

        const orgId = userDoc.data().orgId;
        if (!orgId) throw new Error("User is not associated with an organization.");

    return { user, userDoc, orgId };
}

export async function createHandoff(notes, urgentAlerts, shiftType) {
    const { user, userDoc, orgId } = await getCurrentUserOrgAndProfile();

    const handoffData = {
        orgId,
        authorId: user.uid,
        authorName: userDoc.data().username || "Manager",
        shiftType: shiftType || "General",
        notes: notes || "",
        urgentAlerts: urgentAlerts || "",
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        acknowledgedBy: []
    };

        const docRef = await db.collection('shift_handoffs').add(handoffData);
        return docRef.id;
    } catch (e) {
        logManagerError("Error creating shift handoff", e);
        throw e;
    }
}

export async function fetchRecentHandoffs(limitCount = 10) {
    const { orgId } = await getCurrentUserOrgAndProfile();

        const snapshot = await db.collection('shift_handoffs')
            .where('orgId', '==', orgId)
            .orderBy('createdAt', 'desc')
            .limit(limitCount)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (e) {
        logManagerError("Error fetching shift handoffs", e);
        throw e;
    }
}

export async function acknowledgeHandoff(handoffId) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to acknowledge.");

        await db.collection('shift_handoffs').doc(handoffId).update({
            acknowledgedBy: window.firebase.firestore.FieldValue.arrayUnion(user.uid)
        });
    } catch (e) {
        logManagerError("Error acknowledging shift handoff", e);
        throw e;
    }
}
