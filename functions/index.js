const functions = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const HttpsError = functions.https.HttpsError;
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { adaptGen2Params, logManagerError } = require("./utils");

admin.initializeApp();

// Fallback "placeholder" string to stop Firebase Analyzer from crashing
// during deployment
const stripeKey = process.env.STRIPE_SECRET || "sk_test_placeholder";
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET ||
  "whsec_placeholder";
const stripe = require("stripe")(stripeKey);

// 🔹 Create Checkout Session
exports.createCheckoutSession = onRequest({invoker: "public"}, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const {uid, email, plan, amount, successUrl, cancelUrl} = req.body;

    let lineItems;

    // If the frontend passed a specific discounted amount (Sale or Referral)
    if (amount) {
      const productId = plan === "Business Pro" ?
        "prod_UFnBrTwFCgb54A" :
        "prod_UFn8zqZ0mwyy5r";
      lineItems = [{
        price_data: {
          currency: "usd",
          product: productId,
          recurring: {interval: "year"},
          // Stripe requires amounts in cents
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }];
    } else {
      // 🔴 Fallback to Actual Price IDs if no custom amount was provided
      const priceId = plan === "Business Pro" ?
        "price_1THHbVBp2C5GdKaKvCVoMf1X" :
        "price_1THHYPBp2C5GdKaKxNpqndNE";
      lineItems = [{price: priceId, quantity: 1}];
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        client_reference_id: uid,
        payment_method_types: ["card"],
        customer_email: email,
        line_items: lineItems,
        subscription_data: {
          trial_period_days: 7,
          metadata: {
            uid: uid || "unknown",
            planName: plan || "Pro",
          },
        },

        // Use URLs from frontend, fallback to hardcoded if missing
        success_url: successUrl ||
          "https://dreamstimeskip-beta.pages.dev/tracker?success=true",
        cancel_url: cancelUrl ||
          "https://dreamstimeskip-beta.pages.dev/tracker?canceled=true",
        metadata: {
          uid: uid || "unknown",
          planName: plan || "Pro",
        },
      });

      res.status(200).json({url: session.url});
    } catch (err) {
      logManagerError(`Checkout Error for uid: ${uid}`, err);
      res.status(500).json({error: err.message});
    }
  });
});

// 🔐 STRIPE WEBHOOK (SECURE)
exports.stripeWebhook = onRequest({invoker: "public"}, async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error("Manager Troubleshooting: Webhook Error:", err);
    logManagerError("Webhook Error:", err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🎯 Handle Events
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const uid = session.metadata.uid;
    const planName = session.metadata.planName || "Pro";

    if (uid && uid !== "unknown") {
      // Updates the frontend to unlock pro features immediately
      try {
        await admin.firestore().collection("users").doc(uid).set({
          plan: planName,
          subscription: {
            status: "active",
            customerId: session.customer,
            subscriptionId: session.subscription,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
        console.log(`✅ Successfully upgraded user ${uid} to ${planName}`);
      } catch (error) {
        logManagerError("Error updating user subscription status:", error);
      }
    }
  }

  if (event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.canceled") {
    const sub = event.data.object;

    const snapshot = await admin.firestore()
        .collection("users")
        .where("subscription.customerId", "==", sub.customer)
        .get();

    for (const doc of snapshot.docs) {
      // Revert the user back to the free plan
      try {
        await doc.ref.update({
          "plan": "Free",
          "subscription.status": "canceled",
          "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`❌ Reverted user ${doc.id} back to Free plan.`);
      } catch (err) {
        logManagerError(`Error reverting user ${doc.id} back to Free plan:`, err);
      }
    }
  }

  res.json({received: true});
});

// 🔻 Cancel Subscription Manually
exports.cancelSubscription = onRequest({invoker: "public"}, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const {customerId} = req.body;

    try {
      const subs = await stripe.subscriptions.list({customer: customerId});
      await Promise.all(
          subs.data.map((sub) => stripe.subscriptions.cancel(sub.id)),
      );
      res.status(200).json({success: true});
    } catch (err) {
      logManagerError(`Cancel Error for customerId: ${customerId}`, err);
      res.status(500).json({error: err.message});
    }
  });
});

/**
 * Manage Shift Notes API
 * Handles creation, updating, and resolution of shift notes.
 */
exports.manageShiftNotes = functions.https.onCall(async (data, context) => {
  const adapted = adaptGen2Params(data, context);
  data = adapted.data;
  context = adapted.context;

  if (!context || !context.auth) {
    throw new HttpsError(
        "unauthenticated", "User must be logged in.");
  }

  const {action, payload} = data;
  const uid = context.auth.uid;

  if (!action || !payload) {
    throw new HttpsError(
        "invalid-argument", "Missing action or payload");
  }

  try {
    // 🛡️ Securely fetch the user's actual orgId from the database
    // instead of trusting the client payload to prevent IDOR
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }
    const actualOrgId = payload.orgId || userDoc.data().orgId || null;

    if (action === "create") {
      const {authorId, orgId, authorName, content, priority} = payload;

      if (!content) {
        throw new HttpsError(
            "invalid-argument", "Missing note content");
      }

      const validPriorities = ["Normal", "Urgent"];
      const notePriority = validPriorities.includes(priority) ?
        priority : "Normal";

      const newNote = {
        authorId: authorId || uid,
        authorName: authorName || "Anonymous",
        content,
        priority: notePriority,
        status: "Active",
        orgId: orgId || actualOrgId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await admin.firestore()
          .collection("shift_notes")
          .add(newNote);

      return {success: true, id: docRef.id};
    }

    if (action === "resolve") {
      const {noteId, resolvedBy} = payload;

      if (!noteId || !resolvedBy) {
        throw new HttpsError(
            "invalid-argument", "Missing required fields");
      }

      // 🛡️ Verify the user resolving the note is in the same organization
      const noteRef = admin.firestore().collection("shift_notes").doc(noteId);
      const noteDoc = await noteRef.get();

      if (!noteDoc.exists) {
        throw new HttpsError("not-found", "Note not found");
      }

      if (noteDoc.data().orgId !== actualOrgId) {
        throw new HttpsError(
            "permission-denied", "Unauthorized to resolve this note");
      }

      await noteRef.update({
        status: "Resolved",
        resolvedBy,
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {success: true};
    }

    throw new HttpsError(
        "invalid-argument", "Invalid action");
  } catch (error) {
    logManagerError("Shift Note Error for uid:", uid, error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Manage Employees API
 * Handles creation, updating, and deletion of employees.
 */
exports.manageEmployees = functions.https.onCall(async (data, context) => {
  if (data && typeof data === "object" && "rawRequest" in data && "auth" in data) {
    context = data;
    data = data.data;
  }

  if (!context || !context.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const {action, payload} = data;
  const uid = context.auth.uid;

  if (!action || !payload) {
    throw new HttpsError("invalid-argument", "Missing action or payload");
  }

  try {
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }
    const actualOrgId = userDoc.data().orgId || null;

    if (!actualOrgId) {
       throw new HttpsError("permission-denied", "User must be part of an organization.");
    }

    if (action === "create") {
      const {name, role, phone} = payload;

      if (!name || !role) {
        throw new HttpsError("invalid-argument", "Missing required employee details");
      }

      const newEmployee = {
        name,
        role,
        phone: phone || "",
        status: "Active",
        orgId: actualOrgId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await admin.firestore().collection("employees").add(newEmployee);
      return {success: true, id: docRef.id};
    }

    if (action === "get") {
      const snapshot = await admin.firestore().collection("employees")
        .where("orgId", "==", actualOrgId)
        .where("status", "==", "Active")
        .get();

      const employees = [];
      snapshot.forEach(doc => employees.push({id: doc.id, ...doc.data()}));
      return {success: true, employees};
    }

    if (action === "update") {
       const {empId, name, role, phone, status} = payload;
       if (!empId) {
          throw new HttpsError("invalid-argument", "Missing employee ID");
       }

       const empRef = admin.firestore().collection("employees").doc(empId);
       const empDoc = await empRef.get();

       if (!empDoc.exists) {
          throw new HttpsError("not-found", "Employee not found");
       }

       if (empDoc.data().orgId !== actualOrgId) {
          throw new HttpsError("permission-denied", "Unauthorized to update this employee");
       }

       const updates = {};
       if (name !== undefined) updates.name = name;
       if (role !== undefined) updates.role = role;
       if (phone !== undefined) updates.phone = phone;
       if (status !== undefined) updates.status = status;

       await empRef.update(updates);
       return {success: true};
    }

    if (action === "delete") {
       const {empId} = payload;
       if (!empId) {
          throw new HttpsError("invalid-argument", "Missing employee ID");
       }

       const empRef = admin.firestore().collection("employees").doc(empId);
       const empDoc = await empRef.get();

       if (!empDoc.exists) {
          throw new HttpsError("not-found", "Employee not found");
       }

       if (empDoc.data().orgId !== actualOrgId) {
          throw new HttpsError("permission-denied", "Unauthorized to delete this employee");
       }

       // Soft delete
       await empRef.update({ status: "Inactive" });
       return {success: true};
    }

    throw new HttpsError("invalid-argument", "Invalid action");
  } catch (error) {
    logManagerError(`Manage Employees Error for uid: ${uid}`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Manage Shift Groups API
 * Handles creating groups, joining groups, and approving joins.
 */
exports.manageShiftGroups = functions.https.onCall(async (data, context) => {
  const adapted = adaptGen2Params(data, context);
  data = adapted.data;
  context = adapted.context;

  if (!context || !context.auth) {
    throw new HttpsError(
        "unauthenticated", "User must be logged in.");
  }

  const {action, payload} = data;
  const uid = context.auth.uid;

  if (!action || !payload) {
    throw new HttpsError(
        "invalid-argument", "Missing action or payload");
  }

  try {
    // Create a new group
    if (action === "create") {
      const {authorId, orgId, ownerName, groupName, password} = payload;

      if (!groupName || !password) {
        throw new HttpsError(
            "invalid-argument", "Missing required fields");
      }

      const newGroup = {
        ownerId: authorId || uid,
        orgId: orgId || uid,
        ownerName: ownerName || "Anonymous",
        groupName,
        password, // Basic password for joining (in a real app, hash this)
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await admin.firestore()
          .collection("shift_groups")
          .add(newGroup);

      // Automatically set the owner's orgId to the new group ID
      await admin.firestore().collection("users").doc(uid).set({
        orgId: docRef.id,
      }, {merge: true});

      return {success: true, groupId: docRef.id};
    }

    // Request to join a group
    if (action === "request_join") {
      const {userName, groupId, password} = payload;

      if (!groupId || !password) {
        throw new HttpsError(
            "invalid-argument", "Missing required fields");
      }

      const groupDoc = await admin.firestore()
          .collection("shift_groups").doc(groupId).get();

      if (!groupDoc.exists) {
        throw new HttpsError("not-found", "Group not found");
      }

      if (groupDoc.data().password !== password) {
        throw new HttpsError(
            "permission-denied", "Invalid password");
      }

      // Create a join request
      await admin.firestore().collection("shift_group_requests").add({
        groupId,
        userId: uid,
        userName: userName || "Anonymous",
        status: "Pending",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {success: true};
    }

    // Retract a join request
    if (action === "retract_join") {
      const {requestId} = payload;
      if (!requestId) {
        throw new HttpsError("invalid-argument", "Missing requestId");
      }
      const requestDocRef = admin.firestore().collection("shift_group_requests").doc(requestId);
      const requestDoc = await requestDocRef.get();

      if (!requestDoc.exists) {
        throw new HttpsError("not-found", "Request not found");
      }

      if (requestDoc.data().userId !== uid) {
        throw new HttpsError("permission-denied", "You can only retract your own requests.");
      }

      await requestDocRef.delete();
      return {success: true};
    }

    // Approve a join request
    if (action === "approve_join") {
      const {requestId} = payload;

      if (!requestId) {
        throw new HttpsError(
            "invalid-argument", "Missing required fields");
      }

      const requestDocRef = admin.firestore()
          .collection("shift_group_requests").doc(requestId);
      const requestDoc = await requestDocRef.get();

      if (!requestDoc.exists) {
        throw new HttpsError("not-found", "Request not found");
      }

      const {groupId, userId} = requestDoc.data();

      // Verify the user approving is the owner
      const groupDoc = await admin.firestore()
          .collection("shift_groups").doc(groupId).get();

      if (!groupDoc.exists || groupDoc.data().ownerId !== uid) {
        throw new HttpsError(
            "permission-denied", "Unauthorized");
      }

      // Update the requesting user's orgId
      await admin.firestore().collection("users").doc(userId).set({
        orgId: groupId,
      }, {merge: true});

      // Update request status
      await requestDocRef.update({
        status: "Approved",
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {success: true};
    }

    // Remove a manager from a group
    if (action === "remove_manager") {
      const {userId, groupId} = payload;

      if (!userId || !groupId) {
        throw new HttpsError(
            "invalid-argument", "Missing required fields");
      }

      const groupDoc = await admin.firestore()
          .collection("shift_groups").doc(groupId).get();

      if (!groupDoc.exists || groupDoc.data().ownerId !== uid) {
        throw new HttpsError(
            "permission-denied", "Unauthorized");
      }

      await admin.firestore().collection("users").doc(userId).update({
        orgId: null,
      });

      return {success: true};
    }

    throw new HttpsError("invalid-argument", "Invalid action");
  } catch (error) {
    logManagerError("Shift Groups Error for uid:", uid, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

exports.trainGlobalAI = require("./trainGlobalAI").trainGlobalAI;
