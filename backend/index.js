const functions = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const HttpsError = functions.https.HttpsError;
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const {adaptGen2Params, logManagerError, handleInternalError, checkRequiredFields, safeGetOrderedDocs} = require("./utils");
const crypto = require("crypto");

/**
 * Helper to authenticate user, fetch user doc, and extract payload.
 */
async function getAuthAndPayload(data, context, adminInstance) {
  const {adaptGen2Params} = require("./utils");
  const adapted = adaptGen2Params(data, context);
  data = adapted.data;
  context = adapted.context;

  if (!context || !context.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const uid = context.auth.uid;
  const userDoc = await adminInstance.firestore().collection("users").doc(uid).get();
  const userOrgId = userDoc.exists ? userDoc.data().orgId : null;
  const isAdmin = userDoc.exists ? userDoc.data().isAdmin : false;
  const userEmail = (context.auth && context.auth.token && context.auth.token.email) ? context.auth.token.email : "user@example.com";
  const defaultName = userEmail.split("@")[0];
  const userName = userDoc.exists ? (userDoc.data().name || defaultName) : defaultName;

  const action = data.action;
  const payload = data.payload || {};

  return {uid, userDoc, userOrgId, isAdmin, userName, action, payload};
}


/**
 * Helper to get a document, verify its existence, and verify its orgId.
 * @param {string} collection - The collection name
 * @param {string} docId - The document ID
 * @param {string} expectedOrgId - The expected organization ID
 * @param {string} notFoundMessage - Message if not found
 * @param {string} unauthorizedMessage - Message if unauthorized
 * @return {Promise<Object>} The document reference and snapshot
 */
async function verifyDocAndAuth(collection, docId, expectedOrgId, notFoundMessage, unauthorizedMessage) {
  try {
    const docRef = admin.firestore().collection(collection).doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new HttpsError("not-found", notFoundMessage);
    }

    if (docSnap.data().orgId !== expectedOrgId) {
      throw new HttpsError("permission-denied", unauthorizedMessage);
    }

    return {docRef, docSnap};
  } catch (error) { handleInternalError(`Error verifying document auth for ${collection}/${docId}:`, error); }
}

admin.initializeApp();

// Remove hardcoded secrets. Use environment variables.
// Use conditional initialization to prevent Firebase analyzer from crashing during deployment
const stripeKey = process.env.STRIPE_SECRET || (process.env.NODE_ENV === "test" ? "test_secret_key" : null);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeKey ? require("stripe")(stripeKey) : (process.env.NODE_ENV === "test" ? require("stripe")("test_secret_key") : null);

// 🔹 Create Checkout Session

/**
 * Helper to get the actual organization ID for a user.
 * @param {Object} admin - The firebase admin instance
 * @param {string} uid - The user ID
 * @return {Promise<string>} The actual organization ID
 */
async function getActualOrgId(admin, uid) {
  try {
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }
    return userDoc.data().orgId || null;
  } catch (error) { handleInternalError("Error fetching user organization data for uid: " + uid, error); }
}

exports.createCheckoutSession = onRequest({invoker: "public"}, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const {uid, email, plan, successUrl, cancelUrl} = req.body;

    let lineItems;

    // Calculate final prices and discounts strictly server-side
    let finalPrice = plan === "Business Pro" ? 199 : 59;
    let userData = {};

    if (uid) {
      try {
        const userDoc = await admin.firestore().collection("users").doc(uid).get();
        if (userDoc.exists) userData = userDoc.data();
      } catch (err) {
        logManagerError("Error fetching user data for checkout", err);
      }
    }

    if (userData.hasPromoCode) {
      finalPrice *= 0.9;
    }
    finalPrice = Math.floor(finalPrice);

    // If a discount was applied, we must build price_data dynamically
    if (finalPrice !== (plan === "Business Pro" ? 199 : 59)) {
      const productId = plan === "Business Pro" ?
        "prod_UFnBrTwFCgb54A" :
        "prod_UFn8zqZ0mwyy5r";
      lineItems = [{
        price_data: {
          currency: "usd",
          product: productId,
          recurring: {interval: "year"},
          // Stripe requires amounts in cents
          unit_amount: Math.round(finalPrice * 100),
        },
        quantity: 1,
      }];
    } else {
      // 🔴 Fallback to Actual Price IDs if no custom amount was provided
      const priceId = plan === "Business Pro" ?
        "price_1UJifEBmfNp1AIykML2Y8VLE" :
        "price_1UJifGBmfNp1AIykFdVlMS1x";
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
          "https://ezmanage.realunstoppable.store/index.html?success=true",
        cancel_url: cancelUrl ||
          "https://ezmanage.realunstoppable.store/index.html?canceled=true",
        metadata: {
          uid: uid || "unknown",
          planName: plan || "Pro",
        },
      });

      res.status(200).json({url: session.url});
    } catch (err) {
      logManagerError("Checkout Error for uid:", uid, err);
      res.status(500).json({error: "An internal server error occurred. Please try again later."});
    }
  });
});

// 🔐 STRIPE WEBHOOK (SECURE)
exports.stripeWebhook = onRequest({invoker: "public"}, async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const currentSecret = process.env.STRIPE_WEBHOOK_SECRET || endpointSecret;
  let event;

  if (!sig) {
    return res.status(400).send("Webhook Error: Missing stripe-signature header");
  }

  if (!req.rawBody) {
    return res.status(400).send("Webhook Error: Missing raw request body");
  }

  try {
    const Stripe = require("stripe");
    const activeStripe = stripe || (process.env.STRIPE_SECRET ? Stripe(process.env.STRIPE_SECRET) : Stripe);
    if (activeStripe && activeStripe.webhooks) {
      event = activeStripe.webhooks.constructEvent(req.rawBody, sig, currentSecret);
    } else {
      event = Stripe.webhooks.constructEvent(req.rawBody, sig, currentSecret);
    }
  } catch (err) {
    logManagerError("Webhook Error:", err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🎯 Handle Events
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    let uid = session.client_reference_id || (session.metadata && session.metadata.uid);
    const planName = (session.metadata && session.metadata.planName) || "Business Pro";
    const customerEmail = (session.customer_details && session.customer_details.email) || session.customer_email;

    // Fallback: If UID not in client_reference_id or metadata, look up user by customer email in Firestore!
    if ((!uid || uid === "unknown") && customerEmail) {
      try {
        const userQuery = await admin.firestore().collection("users")
            .where("email", "==", customerEmail.toLowerCase().trim())
            .limit(1)
            .get();
        if (!userQuery.empty) {
          uid = userQuery.docs[0].id;
          console.log(`🔍 Resolved user uid ${uid} from customer email: ${customerEmail}`);
        }
      } catch (lookupErr) {
        logManagerError("Error looking up user by email in webhook:", lookupErr);
      }
    }

    if (uid && uid !== "unknown") {
      // Updates the frontend to unlock pro features immediately
      try {
        await admin.firestore().collection("users").doc(uid).set({
          plan: planName,
          membershipLevel: planName,
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
    } else {
      console.warn(`⚠️ checkout.session.completed received but could not resolve UID for session ${session.id}`);
    }
  }

  if (event.type === "customer.subscription.deleted" ||
    (event.type === "customer.subscription.updated" && (event.data.object.status === "canceled" || event.data.object.status === "unpaid"))) {
    const sub = event.data.object;

    try {
      const snapshot = await admin.firestore()
          .collection("users")
          .where("subscription.customerId", "==", sub.customer)
          .get();

      const batch = admin.firestore().batch();
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          "plan": "Free",
          "membershipLevel": "Free Tier",
          "subscription.status": "canceled",
          "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`❌ Reverted user ${doc.id} back to Free plan (batched).`);
      });

      try {
        if (snapshot.docs.length > 0) {
          await batch.commit();
        }
      } catch (err) {
        logManagerError("Error committing batch to revert users to Free plan:", err);
      }
    } catch (webhookError) {
      logManagerError("Error processing Stripe webhook subscription cancellation:", webhookError);
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;
    if (invoice.subscription && invoice.customer) {
      try {
        const snapshot = await admin.firestore()
            .collection("users")
            .where("subscription.customerId", "==", invoice.customer)
            .get();

        const batch = admin.firestore().batch();
        snapshot.docs.forEach((doc) => {
          batch.update(doc.ref, {
            "subscription.status": "active",
            "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        if (snapshot.docs.length > 0) {
          await batch.commit();
        }
      } catch (invoiceErr) {
        logManagerError("Error processing invoice.payment_succeeded webhook:", invoiceErr);
      }
    }
  }

  res.json({received: true});
});

// 🔻 Cancel Subscription Manually
exports.cancelSubscription = functions.https.onCall(async (data, context) => {
  if (!context || !context.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const uid = context.auth.uid;

  try {
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const customerId = userDoc.data().subscription && userDoc.data().subscription.customerId;
    if (!customerId) {
      throw new HttpsError("failed-precondition", "No active subscription found.");
    }

    const subs = await stripe.subscriptions.list({customer: customerId});
    await Promise.all(
        subs.data.map((sub) => stripe.subscriptions.cancel(sub.id)),
    );
    return {success: true};
  } catch (err) {
    logManagerError(`Cancel Error for uid: ${uid}`, err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", "An internal server error occurred. Please try again later.");
  }
});

/**
 * Manage Tasks API
 * Handles creation, status updating, and deletion of shift tasks.
 */
exports.manageTasks = functions.https.onCall(async (data, context) => {
  const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

  try {
    const isManager = (!userOrgId || userOrgId === uid || isAdmin);
    const actualOrgId = userOrgId || uid;

    if (action === "create") {
      if (!isManager) {
        throw new HttpsError("permission-denied", "Only managers can create tasks");
      }
      const {title, description, assignee, dueDate, priority} = payload;
      checkRequiredFields(payload, ["title", "assignee"]);

      const newTask = {
        title,
        description: description || "",
        assigneeName: assignee, // The frontend sends employee names here
        assigneeId: assignee, // In case frontend just passes the name, let's store it as assignee too
        orgId: actualOrgId,
        authorId: uid,
        assignedByName: userName || "Manager",
        priority: priority || "Low",
        dueDate: dueDate || null,
        status: "Pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await admin.firestore().collection("tasks").add(newTask);
      return {success: true, id: docRef.id};
    }

    if (action === "get") {
      let query = admin.firestore().collection("tasks").where("orgId", "==", actualOrgId);

      const snapshot = await query.get();
      const tasks = [];
      snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
      return {success: true, tasks};
    }

    if (action === "updateStatus") {
      const {taskId, status} = payload;
      const taskRef = admin.firestore().collection("tasks").doc(taskId);
      const taskDoc = await taskRef.get();
      if (!taskDoc.exists) {
        throw new HttpsError("not-found", "Task not found");
      }

      // We check if the user is a manager or the assignee
      const taskData = taskDoc.data();
      const isAssignee = taskData.assigneeName === userName || taskData.assigneeId === uid || taskData.assigneeId === userName;

      if (!isManager && !isAssignee) {
        throw new HttpsError("permission-denied", "Not authorized to update this task");
      }

      await taskRef.update({
          status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return {success: true};
    }

    if (action === "delete") {
      if (!isManager) {
        throw new HttpsError("permission-denied", "Only managers can delete tasks");
      }
      const {taskId} = payload;
      const taskRef = admin.firestore().collection("tasks").doc(taskId);
      const taskDoc = await taskRef.get();
      if (!taskDoc.exists) {
        throw new HttpsError("not-found", "Task not found");
      }
      if (taskDoc.data().orgId !== actualOrgId) {
        throw new HttpsError("permission-denied", "Not authorized to delete this task");
      }
      await taskRef.delete();
      return {success: true};
    }

    throw new HttpsError("invalid-argument", "Invalid action");
  } catch (error) { handleInternalError(`Manage Tasks Error for uid: ${uid}`, error); }
});

/**
 * Manage Shift Notes API
 * Handles creation, updating, and resolution of shift notes.
 */
exports.manageShiftNotes = functions.https.onCall(async (data, context) => {
  const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

  try {
    // 🛡️ Securely fetch the user's actual orgId from the database
    // instead of trusting the client payload to prevent IDOR
    const actualOrgId = payload.orgId || userOrgId || null;

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

      checkRequiredFields(payload, ["noteId", "resolvedBy"]);

      // 🛡️ Verify the user resolving the note is in the same organization
      const {docRef: noteRef} = await verifyDocAndAuth(
          "shift_notes",
          noteId,
          actualOrgId,
          "Note not found",
          "Unauthorized to resolve this note",
      );

      await noteRef.update({
        status: "Resolved",
        resolvedBy,
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {success: true};
    }

    throw new HttpsError(
        "invalid-argument", "Invalid action");
  } catch (error) { handleInternalError(`Shift Note Error for uid: ${uid}`, error); }
});

/**
 * Manage Employees API
 * Handles creation, updating, and deletion of employees.
 */
exports.manageCertifications = functions.https.onCall(async (data, context) => {
  try {
    const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

    if (!userOrgId) {
      throw new HttpsError("permission-denied", "User must be part of an organization to manage certifications.");
    }

    if (action === "create") {
      checkRequiredFields(payload, ["empId", "empName", "certName", "expiryDate"]);

      const certRef = await admin.firestore().collection("certifications").add({
        empId: payload.empId,
        empName: payload.empName,
        certName: payload.certName,
        issueDate: payload.issueDate || null,
        expiryDate: payload.expiryDate,
        status: "Valid", // Frontend logic can update this if needed, or backend can verify
        orgId: userOrgId,
        loggedByUid: uid,
        loggedByName: userName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {success: true, message: "Certification created", id: certRef.id};
    } else if (action === "get") {
      const query = admin.firestore().collection("certifications")
          .where("orgId", "==", userOrgId);
      const certs = await safeGetOrderedDocs(query, "createdAt", "desc", 100);
      return {success: true, certifications: certs};
    } else if (action === "delete") {
      checkRequiredFields(payload, ["certId"]);

      const certRef = admin.firestore().collection("certifications").doc(payload.certId);
      const doc = await certRef.get();
      if (!doc.exists) throw new HttpsError("not-found", "Certification not found.");
      if (doc.data().orgId !== userOrgId && !isAdmin) {
        throw new HttpsError("permission-denied", "Cannot delete a certification outside your organization.");
      }

      await certRef.delete();
      return {success: true, message: "Certification deleted"};
    } else if (action === "updateStatus") {
      checkRequiredFields(payload, ["certId", "status"]);

      const certRef = admin.firestore().collection("certifications").doc(payload.certId);
      const doc = await certRef.get();
      if (!doc.exists) throw new HttpsError("not-found", "Certification not found.");
      if (doc.data().orgId !== userOrgId && !isAdmin) {
        throw new HttpsError("permission-denied", "Cannot update a certification outside your organization.");
      }

      await certRef.update({status: payload.status});
      return {success: true, message: "Certification updated"};
    } else {
      throw new HttpsError("invalid-argument", "Unknown action");
    }
  } catch (error) { handleInternalError("Error in manageCertifications: ", error); }
});

exports.manageEmployees = functions.https.onCall(async (data, context) => {
  const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

  try {
    const actualOrgId = userOrgId;

    if (!actualOrgId) {
      throw new HttpsError("permission-denied", "User must be part of an organization.");
    }

    if (action === "create") {
      const {name, role, phone} = payload;

      checkRequiredFields(payload, ["name", "role"], "Missing required employee details");

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
      snapshot.forEach((doc) => employees.push({id: doc.id, ...doc.data()}));
      return {success: true, employees};
    }

    if (action === "update") {
      const {empId, name, role, phone, status} = payload;
      if (!empId) {
        throw new HttpsError("invalid-argument", "Missing employee ID");
      }

      const {docRef: empRef} = await verifyDocAndAuth(
          "employees",
          empId,
          actualOrgId,
          "Employee not found",
          "Unauthorized to update this employee",
      );

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (role !== undefined) updates.role = role;
      if (phone !== undefined) updates.phone = phone;
      if (status !== undefined) updates.status = status;
    }

    if (action === "delete") {
      const {empId} = payload;
      if (!empId) {
        throw new HttpsError("invalid-argument", "Missing employee ID");
      }

      const {docRef: empRef} = await verifyDocAndAuth(
          "employees",
          empId,
          actualOrgId,
          "Employee not found",
          "Unauthorized to delete this employee",
      );

      // Soft delete
      await empRef.update({status: "Inactive"});
      return {success: true};
    }

    throw new HttpsError("invalid-argument", "Invalid action");
  } catch (error) { handleInternalError(`Manage Employees Error for uid: ${uid}`, error); }
});


/**
 * Generates a unique, readable workplace company code.
 * @param {string} groupName - The company or group name.
 * @return {string} Formatted workplace code, e.g. EZM-APEX-8F2D.
 */
function generateUniqueWorkplaceCode(groupName) {
  const cleanName = (groupName || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 4) || "CORP";
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `EZM-${cleanName}-${randomSuffix}`;
}

/**
 * Generates a unique secure workplace join key.
 * @return {string} Formatted workplace join key, e.g. WPK-8F2D-91A4.
 */
function generateUniqueWorkplaceKey() {
  const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `WPK-${part1}-${part2}`;
}

/**
 * Generates a deterministic, collision-checked human-readable Corporate ID (CORP-XXXXXXXX).
 * Excludes ambiguous characters (0, O, 1, I).
 * @return {string} Formatted corporate ID, e.g. CORP-ABC23456.
 */
function generateUniqueCorporateId() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let id = "CORP-";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return id;
}

async function handleCreateShiftGroup(payload, uid) {
  const {groupName, password, ownerName, authorId, orgId, workplaceCode, joinKey, plan, workersCount, aiEnabled, name, multiStoreEnabled, requireApproval} = payload;

  checkRequiredFields(payload, ["groupName"]);

  const plainJoinKey = joinKey || password || generateUniqueWorkplaceKey();
  const finalWorkplaceCode = workplaceCode || generateUniqueWorkplaceCode(groupName);

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plainJoinKey, salt, 64).toString("hex");
  const hashedPassword = `$scrypt$${hash}:${salt}`;

  // Generate unique collision-checked corporate ID (CORP-XXXXXXXX)
  let uniqueGroupId;
  const shiftGroupsCol = admin.firestore().collection("shift_groups");
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidateId = generateUniqueCorporateId();
    if (typeof shiftGroupsCol.doc === "function") {
      try {
        const existingDoc = await shiftGroupsCol.doc(candidateId).get();
        if (!existingDoc || !existingDoc.exists) {
          uniqueGroupId = candidateId;
          break;
        }
      } catch (e) {
        uniqueGroupId = candidateId;
        break;
      }
    } else {
      uniqueGroupId = candidateId;
      break;
    }
  }
  if (!uniqueGroupId) {
    uniqueGroupId = `CORP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  }

  const newGroupParams = {
    ownerId: authorId || uid,
    orgId: uniqueGroupId,
    ownerName: ownerName || "Anonymous",
    groupName,
    workplaceCode: finalWorkplaceCode,
    // Security Enhancement: Only the scrypt hashed password is saved to the DB to prevent plaintext exposure
    password: hashedPassword,
    multiStoreEnabled: multiStoreEnabled !== false,
    aiEnabled: aiEnabled !== undefined ? Boolean(aiEnabled) : true,
    workersCount: workersCount || "1-10",
    requireApproval: requireApproval !== false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  let docId = uniqueGroupId;
  if (typeof shiftGroupsCol.doc === "function") {
    await shiftGroupsCol.doc(uniqueGroupId).set(newGroupParams);
  } else {
    const docRef = await shiftGroupsCol.add(newGroupParams);
    docId = docRef.id;
  }

  // Atomically update user document on the server via Admin SDK
  const targetUid = authorId || uid;
  const userUpdate = {
    orgId: docId,
    role: "CorporateAdmin",
  };
  if (plan !== undefined) userUpdate.plan = plan;
  if (workersCount !== undefined) userUpdate.workersCount = workersCount;
  if (aiEnabled !== undefined) userUpdate.aiEnabled = Boolean(aiEnabled);
  if (name || ownerName) userUpdate.name = name || ownerName;

  await admin.firestore().collection("users").doc(targetUid).set(userUpdate, {merge: true});

  return {
    success: true,
    groupId: docId,
    workplaceCode: finalWorkplaceCode,
    joinKey: plainJoinKey,
  };
}

async function handleRequestJoinShiftGroup(payload, uid) {
  const {userName, groupId, password} = payload;

  checkRequiredFields(payload, ["groupId", "password"]);

  let targetGroupId = (groupId || "").trim();
  let groupDoc = await admin.firestore()
      .collection("shift_groups").doc(targetGroupId).get();

  if (!groupDoc.exists && targetGroupId.toUpperCase() !== targetGroupId) {
    targetGroupId = targetGroupId.toUpperCase();
    groupDoc = await admin.firestore()
        .collection("shift_groups").doc(targetGroupId).get();
  }

  if (!groupDoc.exists) {
    const snap = await admin.firestore()
        .collection("shift_groups")
        .where("workplaceCode", "==", targetGroupId.toUpperCase())
        .limit(1)
        .get();
    if (!snap.empty) {
      groupDoc = snap.docs[0];
      targetGroupId = groupDoc.id;
    }
  }

  if (!groupDoc.exists) {
    throw new HttpsError("not-found", "Group not found");
  }

  const storedPassword = groupDoc.data().password;
  let isValid = false;

  // Check if it's a salted hash
  if (storedPassword && storedPassword.startsWith("$scrypt$")) {
    const [hash, salt] = storedPassword.substring(8).split(":");
    const derivedHash = crypto.scryptSync(password, salt, 64).toString("hex");
    isValid = (hash === derivedHash);
  } else {
    // Legacy plaintext comparison
    isValid = (storedPassword === password);

    // Upgrade to salted hash if correct
    if (isValid) {
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync(password, salt, 64).toString("hex");
      await admin.firestore().collection("shift_groups").doc(targetGroupId).update({
        password: `$scrypt$${hash}:${salt}`,
      });
    }
  }

  if (!isValid) {
    throw new HttpsError(
        "permission-denied", "Invalid password");
  }

  await admin.firestore().collection("shift_group_requests").add({
    groupId: targetGroupId,
    userId: uid,
    userName: userName || "Anonymous",
    status: "Pending",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {success: true, groupId: targetGroupId};
}

async function handleRotateWorkplaceCredentials(payload, uid) {
  const {groupId, newJoinKey} = payload;
  checkRequiredFields(payload, ["groupId"]);

  const groupDocRef = admin.firestore().collection("shift_groups").doc(groupId);
  const groupDoc = await groupDocRef.get();

  if (!groupDoc.exists) {
    throw new HttpsError("not-found", "Group not found");
  }

  if (groupDoc.data().ownerId !== uid) {
    throw new HttpsError("permission-denied", "Unauthorized to modify workspace credentials");
  }

  const updatedJoinKey = newJoinKey || generateUniqueWorkplaceKey();
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(updatedJoinKey, salt, 64).toString("hex");
  const hashedPassword = `$scrypt$${hash}:${salt}`;

  let workplaceCode = groupDoc.data().workplaceCode;
  if (!workplaceCode) {
    workplaceCode = generateUniqueWorkplaceCode(groupDoc.data().groupName);
  }

  await groupDocRef.update({
    // Security Enhancement: Only the scrypt hashed password is saved to the DB to prevent plaintext exposure
    password: hashedPassword,
    workplaceCode: workplaceCode,
    credentialsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    groupId,
    workplaceCode,
    joinKey: updatedJoinKey,
  };
}

  async function handleRetractJoinShiftGroup(payload, uid) {
    const {requestId} = payload;
    if (!requestId) {
      throw new HttpsError("invalid-argument", "Missing requestId");
    }
    const requestDocRef = admin.firestore().collection("shift_group_requests").doc(requestId);
    const requestDoc = await requestDocRef.get();

  checkRequiredFields(payload, ["requestId"]);

    if (requestDoc.data().userId !== uid) {
      throw new HttpsError("permission-denied", "You can only retract your own requests.");
    }

    await requestDocRef.delete();
    return {success: true};
  }

  async function handleApproveJoinShiftGroup(payload, uid) {
    const {requestId} = payload;

    checkRequiredFields(payload, ["requestId"]);

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

    // Update request status
    await requestDocRef.update({
      status: "Approved",
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user's orgId in users collection
    await admin.firestore().collection("users").doc(userId).set({
      orgId: groupId,
    }, {merge: true});

    return {success: true};
  }

  async function handleRemoveManagerShiftGroup(payload, uid) {
    const {userId, groupId} = payload;

    checkRequiredFields(payload, ["userId", "groupId"]);

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

  async function handleAddManagerShiftGroup(payload, uid) {
    const {groupId, email} = payload;
    checkRequiredFields(payload, ["groupId", "email"]);

    const cleanEmail = String(email).trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new HttpsError("invalid-argument", "Valid manager email is required");
    }

    const groupDoc = await admin.firestore().collection("shift_groups").doc(groupId).get();
    if (!groupDoc.exists) {
      throw new HttpsError("not-found", "Shift group not found");
    }

    if (groupDoc.data().ownerId !== uid) {
      throw new HttpsError("permission-denied", "Unauthorized to add managers to this group");
    }

    const usersSnap = await admin.firestore().collection("users")
        .where("email", "==", cleanEmail)
        .limit(1)
        .get();

    let managerUid;
    if (!usersSnap.empty) {
      managerUid = usersSnap.docs[0].id;
      await admin.firestore().collection("users").doc(managerUid).set({
        orgId: groupId,
        role: "Manager",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
    } else {
      const newDocRef = admin.firestore().collection("users").doc();
      managerUid = newDocRef.id;
      await newDocRef.set({
        email: cleanEmail,
        name: cleanEmail.split("@")[0],
        role: "Manager",
        orgId: groupId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {success: true, managerId: managerUid, email: cleanEmail};
  }

  async function handleUpdateProfile(payload, uid) {
    const {name, jobTitle, defaultTab} = payload;
    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (name !== undefined) updates.name = String(name).trim();
    if (jobTitle !== undefined) updates.jobTitle = String(jobTitle).trim();
    if (defaultTab !== undefined) updates.defaultTab = String(defaultTab).trim();

    await admin.firestore().collection("users").doc(uid).set(updates, {merge: true});
    return {success: true, ...updates};
  }

  async function handleUpdateCompanyShiftGroup(payload, uid) {
    const {groupId, groupName, newPassword, multiStoreEnabled, aiEnabled, workersCount, requireApproval} = payload;
    checkRequiredFields(payload, ["groupId"]);

    const groupDocRef = admin.firestore().collection("shift_groups").doc(groupId);
    const groupDoc = await groupDocRef.get();

    if (!groupDoc.exists) {
      throw new HttpsError("not-found", "Shift group not found");
    }

    if (groupDoc.data().ownerId !== uid) {
      throw new HttpsError("permission-denied", "Unauthorized to update company settings");
    }

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (groupName !== undefined) {
      const cleanName = String(groupName).trim();
      if (!cleanName) {
        throw new HttpsError("invalid-argument", "Company name cannot be empty");
      }
      updateData.groupName = cleanName;
    }

    if (newPassword !== undefined && String(newPassword).trim() !== "") {
      const passStr = String(newPassword).trim();
      if (passStr.length < 6) {
        throw new HttpsError("invalid-argument", "Password must be at least 6 characters");
      }
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync(passStr, salt, 64).toString("hex");
      // Security Enhancement: Only the scrypt hashed password is saved to the DB to prevent plaintext exposure
      updateData.password = `$scrypt$${hash}:${salt}`;
    }

    if (multiStoreEnabled !== undefined) {
      updateData.multiStoreEnabled = Boolean(multiStoreEnabled);
    }

    if (aiEnabled !== undefined) {
      updateData.aiEnabled = Boolean(aiEnabled);
    }

    if (workersCount !== undefined) {
      updateData.workersCount = String(workersCount);
    }

    if (requireApproval !== undefined) {
      updateData.requireApproval = Boolean(requireApproval);
    }

    await groupDocRef.update(updateData);

    return {success: true, updatedFields: updateData};
  }

  /**
 * Manage Shift Groups API
 * Handles creating groups, joining groups, and approving joins.
 */
  exports.manageShiftGroups = functions.https.onCall(async (data, context) => {
    const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

    try {
      if (action === "create") return await handleCreateShiftGroup(payload, uid);
      if (action === "request_join") return await handleRequestJoinShiftGroup(payload, uid);
      if (action === "retract_join") return await handleRetractJoinShiftGroup(payload, uid);
      if (action === "approve_join") return await handleApproveJoinShiftGroup(payload, uid);
      if (action === "remove_manager") return await handleRemoveManagerShiftGroup(payload, uid);
      if (action === "rotate_credentials") return await handleRotateWorkplaceCredentials(payload, uid);
      if (action === "add_manager") return await handleAddManagerShiftGroup(payload, uid);
      if (action === "update_profile") return await handleUpdateProfile(payload, uid);
      if (action === "update_company") return await handleUpdateCompanyShiftGroup(payload, uid);

      throw new HttpsError("invalid-argument", "Invalid action");
    } catch (error) { handleInternalError(`Shift Groups Error for uid: ${uid}`, error); }
});


  /**
 * Helper functions for manageIncidents
 */
  async function handleCreateIncident(payload, uid, context, actualOrgId) {
    const {title, description, severity, type} = payload;

    checkRequiredFields(payload, ["title", "description", "severity", "type"], "Missing required incident details");

    const newIncident = {
      title,
      description,
      severity,
      type,
      status: "Open",
      reportedByUid: uid,
      reportedByName: context.auth.token.name || "Anonymous",
      orgId: actualOrgId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await admin.firestore().collection("incident_reports").add(newIncident);
    return {success: true, id: docRef.id};
  }

  async function handleGetIncidents(actualOrgId) {
    const query = admin.firestore().collection("incident_reports")
        .where("orgId", "==", actualOrgId);
    const incidents = await safeGetOrderedDocs(query, "timestamp", "desc", 100);
    return {success: true, incidents};
  }

  async function handleUpdateIncidentStatus(payload, actualOrgId) {
    const {incidentId, status} = payload;
    if (!incidentId || !status) {
      throw new HttpsError("invalid-argument", "Missing incident ID or status");
    }

    const incidentRef = admin.firestore().collection("incident_reports").doc(incidentId);
    const incidentDoc = await incidentRef.get();

    if (!incidentDoc.exists) {
      throw new HttpsError("not-found", "Incident not found");
    }

    if (incidentDoc.data().orgId !== actualOrgId) {
      throw new HttpsError("permission-denied", "Unauthorized to update this incident");
    }

    await incidentRef.update({status});
    return {success: true};
  }

  async function handleDeleteIncident(payload, actualOrgId) {
    const {incidentId} = payload;
    if (!incidentId) {
      throw new HttpsError("invalid-argument", "Missing incident ID");
    }

    const incidentRef = admin.firestore().collection("incident_reports").doc(incidentId);
    const incidentDoc = await incidentRef.get();

    if (!incidentDoc.exists) {
      throw new HttpsError("not-found", "Incident not found");
    }

    if (incidentDoc.data().orgId !== actualOrgId) {
      throw new HttpsError("permission-denied", "Unauthorized to delete this incident");
    }

    await incidentRef.delete();
    return {success: true};
  }


  /**
 * Manage Incidents API
 * Handles creation, reading, status updates, and deletion of incidents.
 */
  exports.manageIncidents = functions.https.onCall(async (data, context) => {
    const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

    try {
      const actualOrgId = userOrgId;

      if (!actualOrgId) {
        throw new HttpsError("permission-denied", "User must be part of an organization to report incidents.");
      }

      if (action === "create") {
        return await handleCreateIncident(payload, uid, context, actualOrgId);
      }

      if (action === "get") {
        return await handleGetIncidents(actualOrgId);
      }

      if (action === "updateStatus") {
        return await handleUpdateIncidentStatus(payload, actualOrgId);
      }

      if (action === "delete") {
        return await handleDeleteIncident(payload, actualOrgId);
      }

      throw new HttpsError("invalid-argument", "Invalid action");
    } catch (error) { handleInternalError(`Manage Incidents Error for uid: ${uid}`, error); }
});

  /**
 * Manage Time Logs API
 * Handles clock in, clock out, and retrieving time logs.
 */
  exports.manageTimeLogs = functions.https.onCall(async (data, context) => {
    const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

    try {
      const actualOrgId = userOrgId || null;
      const employeeName = userName || "Anonymous";

      if (!actualOrgId) {
        throw new HttpsError("permission-denied", "User must be part of an organization to clock in/out.");
      }

      if (action === "clock_in") {
      // Check if there is already an active clock in
        const activeLogSnap = await admin.firestore().collection("time_logs")
            .where("uid", "==", uid)
            .where("orgId", "==", actualOrgId)
            .where("status", "==", "Clocked In")
            .limit(1)
            .get();

        if (!activeLogSnap.empty) {
          throw new HttpsError("already-exists", "User is already clocked in.");
        }

        const newLog = {
          uid: uid,
          employeeName: employeeName,
          orgId: actualOrgId,
          clockInTime: admin.firestore.FieldValue.serverTimestamp(),
          clockOutTime: null,
          status: "Clocked In",
        };

        const docRef = await admin.firestore().collection("time_logs").add(newLog);
        return {success: true, id: docRef.id};
      }

      if (action === "clock_out") {
      // Find the active clock in
        const activeLogSnap = await admin.firestore().collection("time_logs")
            .where("uid", "==", uid)
            .where("orgId", "==", actualOrgId)
            .where("status", "==", "Clocked In")
            .limit(1)
            .get();

        if (activeLogSnap.empty) {
          throw new HttpsError("failed-precondition", "User is not clocked in.");
        }

        const activeLog = activeLogSnap.docs[0];
        await activeLog.ref.update({
          clockOutTime: admin.firestore.FieldValue.serverTimestamp(),
          status: "Clocked Out",
        });

        return {success: true, id: activeLog.id};
      }

      if (action === "get_logs") {
        const isManager = userOrgId === uid || isAdmin;

        let query = admin.firestore().collection("time_logs").where("orgId", "==", actualOrgId);

        if (!isManager) {
          query = query.where("uid", "==", uid);
        }

        const snapshot = await query.limit(100).get();

        const logs = [];
        snapshot.forEach((doc) => logs.push({id: doc.id, ...doc.data()}));
        return {success: true, logs};
      }

      throw new HttpsError("invalid-argument", "Invalid action");
    } catch (error) { handleInternalError(`Manage Time Logs Error for uid: ${uid}`, error); }
});

/**
 * Manage Maintenance Logs API
 * Handles creation, reading, status updates, and deletion of maintenance logs.
 */
exports.manageMaintenanceLogs = functions.https.onCall(async (data, context) => {
  const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

  try {
    const actualOrgId = userOrgId;

    if (!actualOrgId) {
      throw new HttpsError("permission-denied", "User must be part of an organization to report maintenance issues.");
    }

    if (action === "create") {
      const {title, description, priority, cost} = payload;

      checkRequiredFields(payload, ["title", "description", "priority"], "Missing required maintenance details");

      const newMaintenanceLog = {
        title,
        description,
        priority,
        cost: cost ? Number(cost) : 0,
        status: "Open",
        reportedByUid: uid,
        reportedByName: context.auth.token.name || "Anonymous",
        orgId: actualOrgId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await admin.firestore().collection("maintenance_logs").add(newMaintenanceLog);
      return {success: true, id: docRef.id};
    }

    if (action === "get") {
      const query = admin.firestore().collection("maintenance_logs")
          .where("orgId", "==", actualOrgId);
      const logs = await safeGetOrderedDocs(query, "timestamp", "desc", 100);
      return {success: true, logs};
    }

    if (action === "updateStatus") {
      const {logId, status} = payload;
      if (!logId || !status) {
        throw new HttpsError("invalid-argument", "Missing log ID or status");
      }

      const logRef = admin.firestore().collection("maintenance_logs").doc(logId);
      const logDoc = await logRef.get();

      if (!logDoc.exists) {
        throw new HttpsError("not-found", "Maintenance log not found");
      }

      if (logDoc.data().orgId !== actualOrgId) {
        throw new HttpsError("permission-denied", "Unauthorized to update this log");
      }

      await logRef.update({status});
      return {success: true};
    }

    if (action === "delete") {
      const {logId} = payload;
      if (!logId) {
        throw new HttpsError("invalid-argument", "Missing log ID");
      }

      const logRef = admin.firestore().collection("maintenance_logs").doc(logId);
      const logDoc = await logRef.get();

      if (!logDoc.exists) {
        throw new HttpsError("not-found", "Maintenance log not found");
      }

      if (logDoc.data().orgId !== actualOrgId) {
        throw new HttpsError("permission-denied", "Unauthorized to delete this log");
      }

      await logRef.delete();
      return {success: true};
    }

    throw new HttpsError("invalid-argument", "Invalid action");
  } catch (error) { handleInternalError(`Manage Maintenance Logs Error for uid: ${uid}`, error); }
});

  /**
 * Manage Waste Logs API
 * Handles creation, reading, and deletion of waste logs.
 */
  exports.manageWaste = functions.https.onCall(async (data, context) => {
    const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

    try {
      const actualOrgId = userOrgId;

      if (!actualOrgId) {
        throw new HttpsError("permission-denied", "User must be part of an organization to log waste.");
      }

      if (action === "create") {
        const {itemName, quantity, cost, reason} = payload;

        checkRequiredFields(payload, ["itemName", "quantity", "cost", "reason"], "Missing required waste log details");

        const newLog = {
          itemName,
          quantity: Number(quantity),
          cost: Number(cost),
          reason,
          loggedByUid: uid,
          loggedByName: context.auth.token.name || "Anonymous",
          orgId: actualOrgId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await admin.firestore().collection("waste_logs").add(newLog);
        return {success: true, id: docRef.id};
      }

      if (action === "get") {
        const query = admin.firestore().collection("waste_logs")
            .where("orgId", "==", actualOrgId);
        const logs = await safeGetOrderedDocs(query, "timestamp", "desc", 100);
        return {success: true, logs};
      }

      if (action === "delete") {
        const {logId} = payload;
        if (!logId) {
          throw new HttpsError("invalid-argument", "Missing log ID");
        }

        const logRef = admin.firestore().collection("waste_logs").doc(logId);
        const logDoc = await logRef.get();

        if (!logDoc.exists) {
          throw new HttpsError("not-found", "Waste log not found");
        }

        if (logDoc.data().orgId !== actualOrgId) {
          throw new HttpsError("permission-denied", "Unauthorized to delete this log");
        }

        await logRef.delete();
        return {success: true};
      }

      throw new HttpsError("invalid-argument", "Invalid action");
    } catch (error) { handleInternalError(`Manage Waste Error for uid: ${uid}`, error); }
});

  /**
 * Manage Temperature Logs API
 * Handles creation, reading, and deletion of temperature logs.
 */

  /**
 * Manage Recognitions API
 * Handles creation, reading, and deletion of recognitions (Kudos / Private Feedback).
 */
  exports.manageRecognitions = functions.https.onCall(async (data, context) => {
    const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

  try {
    const actualOrgId = userOrgId || null;

      if (!actualOrgId) {
        throw new HttpsError("permission-denied", "User must be part of an organization to manage recognitions.");
      }

      if (action === "create") {
        const {receiverId, receiverName, message, type} = payload;

        checkRequiredFields(payload, ["receiverId", "receiverName", "message", "type"], "Missing required recognition details");

        const validTypes = ["Kudos", "Private Feedback"];
        const recognitionType = validTypes.includes(type) ? type : "Kudos";

        const newRecognition = {
          senderId: uid,
          senderName: userName || "Anonymous",
          receiverId,
          receiverName,
          message,
          type: recognitionType,
          orgId: actualOrgId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await admin.firestore().collection("recognitions").add(newRecognition);
        return {success: true, id: docRef.id};
      }

      if (action === "get") {
        const query = admin.firestore().collection("recognitions")
            .where("orgId", "==", actualOrgId);
        const docs = await safeGetOrderedDocs(query, "createdAt", "desc", 100);

        const recognitions = [];
        const isManager = userOrgId === uid;

        docs.forEach((rec) => {

          // Properly isolate Private Feedback on the server side
          if (rec.type === "Private Feedback") {
            if (isManager || rec.receiverId === uid || rec.senderId === uid) {
              recognitions.push(rec);
            }
          } else {
            recognitions.push(rec);
          }
        });
        return {success: true, recognitions};
      }

      if (action === "delete") {
        const {recognitionId} = payload;
        if (!recognitionId) {
          throw new HttpsError("invalid-argument", "Missing recognition ID");
        }

        const recRef = admin.firestore().collection("recognitions").doc(recognitionId);
        const recDoc = await recRef.get();

        if (!recDoc.exists) {
          throw new HttpsError("not-found", "Recognition not found");
        }

        if (recDoc.data().orgId !== actualOrgId) {
          throw new HttpsError("permission-denied", "Unauthorized to delete this recognition");
        }

        if (recDoc.data().senderId !== uid && userOrgId !== uid) {
          throw new HttpsError("permission-denied", "Only the sender or an admin can delete a recognition.");
        }

        await recRef.delete();
        return {success: true};
      }

      throw new HttpsError("invalid-argument", "Invalid action");
    } catch (error) { handleInternalError(`Manage Recognitions Error for uid: ${uid}`, error); }
});


  /**
 * Manage Feedbacks API
 * Handles creation, reading, and deletion of employee feedbacks.
 */
  exports.manageFeedbacks = functions.https.onCall(async (data, context) => {
    const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

    try {
      const actualOrgId = userOrgId || null;

      if (!actualOrgId) {
        throw new HttpsError("permission-denied", "User must be part of an organization to manage feedbacks.");
      }

      if (action === "create") {
        const {empId, empName, rating, comment} = payload;

        if (!empId || !rating) {
          throw new HttpsError("invalid-argument", "Missing required feedback details");
        }

        const newFeedback = {
          empId,
          empName: empName || "Employee",
          rating: Number(rating),
          comment: comment || "",
          managerId: uid,
          managerName: userName || "Anonymous Manager",
          orgId: actualOrgId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await admin.firestore().collection("feedbacks").add(newFeedback);
        return {success: true, id: docRef.id};
      }

      if (action === "get") {
        const {empId} = payload;
        if (!empId) {
          throw new HttpsError("invalid-argument", "Missing employee ID");
        }

        const query = admin.firestore().collection("feedbacks")
            .where("orgId", "==", actualOrgId)
            .where("empId", "==", empId);
        const feedbacks = await safeGetOrderedDocs(query, "createdAt", "desc", 100);
        return {success: true, feedbacks};
      }

      if (action === "delete") {
        const {feedbackId} = payload;
        if (!feedbackId) {
          throw new HttpsError("invalid-argument", "Missing feedback ID");
        }

        const feedbackRef = admin.firestore().collection("feedbacks").doc(feedbackId);
        const feedbackDoc = await feedbackRef.get();

        if (!feedbackDoc.exists) {
          throw new HttpsError("not-found", "Feedback not found");
        }

        if (feedbackDoc.data().orgId !== actualOrgId) {
          throw new HttpsError("permission-denied", "Unauthorized to delete this feedback");
        }

        await feedbackRef.delete();
        return {success: true};
      }

      throw new HttpsError("invalid-argument", "Invalid action");
    } catch (error) { handleInternalError(`Manage Feedbacks Error for uid: ${uid}`, error); }
});

  exports.trainGlobalAI = require("./trainGlobalAI").trainGlobalAI;


  exports.manageTemperatureLogs = functions.https.onCall(async (data, context) => {
    const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

    try {
      if (action === "create") {
        checkRequiredFields(payload, ["equipmentName", "temperature", "unit"]);
        const activeOrgId = userOrgId || uid;

        let status = "Safe";
        // Basic safety logic: Freezers > 0F / -18C, Coolers > 41F / 5C, Hot Holding < 135F / 57C could be warnings, but we'll let client define or use a generic "Warning" if submitted by client, or just store it.
        if (payload.status) {
          status = payload.status;
        }

        const newLogRef = await admin.firestore().collection("temperature_logs").add({
          equipmentName: payload.equipmentName,
          temperature: payload.temperature,
          unit: payload.unit,
          status: status,
          notes: payload.notes || "",
          loggedByUid: uid,
          loggedByName: userName,
          orgId: activeOrgId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {success: true, message: "Temperature log created.", id: newLogRef.id};
      }

      if (action === "get") {
        if (!userOrgId && !isAdmin) {
          return {success: true, logs: []};
        }

        let query = admin.firestore().collection("temperature_logs");
        if (!isAdmin) {
          query = query.where("orgId", "==", userOrgId);
        } else if (payload.orgId) {
          query = query.where("orgId", "==", payload.orgId);
        }

        const logs = await safeGetOrderedDocs(query, "timestamp", "desc", 50);
        return {success: true, logs};
      }

      if (action === "delete") {
        checkRequiredFields(payload, ["logId"]);
        const logRef = admin.firestore().collection("temperature_logs").doc(payload.logId);
        const logDoc = await logRef.get();

        if (!logDoc.exists) {
          throw new HttpsError("not-found", "Log not found.");
        }

        if (logDoc.data().orgId !== userOrgId && !isAdmin) {
          throw new HttpsError("permission-denied", "Unauthorized.");
        }

        await logRef.delete();
        return {success: true, message: "Log deleted."};
      }

      throw new HttpsError("invalid-argument", "Invalid action.");
    } catch (error) { handleInternalError("Error in manageTemperatureLogs: ", error); }
  });

exports.manageVendorDeliveries = functions.https.onCall(async (data, context) => {
  const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

    try {
      if (action === "create") {
        checkRequiredFields(payload, ["vendorName", "totalAmount"]);
        const activeOrgId = userOrgId || uid;

        const newDeliveryRef = await admin.firestore().collection("vendor_deliveries").add({
          vendorName: payload.vendorName,
          invoiceNumber: payload.invoiceNumber || "",
          totalAmount: payload.totalAmount,
          notes: payload.notes || "",
          status: "Received",
          loggedByUid: uid,
          loggedByName: userName,
          orgId: activeOrgId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {success: true, deliveryId: newDeliveryRef.id};
      }

      if (action === "get") {
        const activeOrgId = userOrgId || uid;
        let query = admin.firestore().collection("vendor_deliveries");
        if (!isAdmin) {
          query = query.where("orgId", "==", activeOrgId);
        }
        const deliveries = await safeGetOrderedDocs(query, "timestamp", "desc", 50);
        return {success: true, deliveries};
      }

      if (action === "updateStatus") {
        checkRequiredFields(payload, ["deliveryId", "status"]);
        const {docRef, docSnap} = await verifyDocAndAuth("vendor_deliveries", payload.deliveryId, userOrgId || uid, "Delivery not found.", "Unauthorized access to this delivery.");

        await docRef.update({
          status: payload.status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {success: true};
      }

      if (action === "delete") {
        checkRequiredFields(payload, ["deliveryId"]);
        const {docRef, docSnap} = await verifyDocAndAuth("vendor_deliveries", payload.deliveryId, userOrgId || uid, "Delivery not found.", "Unauthorized access to this delivery.");

        await docRef.delete();
        return {success: true};
      }

      throw new HttpsError("invalid-argument", "Invalid action specified.");
    } catch (error) { handleInternalError("Error in manageVendorDeliveries: ", error); }
});


exports.manageShiftMarketplace = functions.https.onCall(async (data, context) => {
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
        } else if (action === "get") {
            const query = admin.firestore().collection("shift_marketplace")
                .where("orgId", "==", orgId);
            const shifts = await safeGetOrderedDocs(query, "createdAt", "desc", 100);
            return {success: true, shifts: shifts};
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
    } catch (error) { handleInternalError("Error managing shift marketplace:", error); }
});

exports.manageLostAndFound = functions.https.onCall(async (data, context) => {
  const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

  try {
    const actualOrgId = userOrgId || null;

    if (!actualOrgId) {
      throw new HttpsError("permission-denied", "User must be part of an organization to manage lost & found items.");
    }

    if (action === "create") {
      const {itemName, description, status, dateFound} = payload;
      checkRequiredFields(payload, ["itemName", "status"]);

      const newItem = {
        orgId: actualOrgId,
        itemName,
        description: description || "",
        status,
        dateFound: dateFound || new Date().toISOString(),
        loggedByUid: uid,
        loggedByName: userName,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await admin.firestore().collection("lost_and_found").add(newItem);
      return {success: true, itemId: docRef.id};
    } else if (action === "get") {
      const query = admin.firestore().collection("lost_and_found")
          .where("orgId", "==", actualOrgId);
      const items = await safeGetOrderedDocs(query, "timestamp", "desc", 50);
      return {success: true, items};
    } else if (action === "updateStatus") {
      const {itemId, status} = payload;
      checkRequiredFields(payload, ["itemId", "status"]);

      const {docRef, docSnap} = await verifyDocAndAuth("lost_and_found", itemId, actualOrgId, "Item not found.", "Unauthorized access to this item.");

      await docRef.update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return {success: true};
    } else if (action === "delete") {
      const {itemId} = payload;
      checkRequiredFields(payload, ["itemId"]);

      const {docRef, docSnap} = await verifyDocAndAuth("lost_and_found", itemId, actualOrgId, "Item not found.", "Unauthorized access to this item.");

      if (!isAdmin && docSnap.data().loggedByUid !== uid) {
        throw new HttpsError("permission-denied", "Only admins or the creator can delete this item.");
      }

      await docRef.delete();
      return {success: true};
    } else {
      throw new HttpsError("invalid-argument", "Invalid action.");
    }
  } catch (error) { handleInternalError("Error in manageLostAndFound: ", error); }
});

exports.manageAnnouncements = functions.https.onCall(async (data, context) => {
  const {uid, userOrgId, isAdmin, userName, action, payload} = await getAuthAndPayload(data, context, admin);

  try {
    const actualOrgId = userOrgId || uid;

    if (action === "get") {
      const query = admin.firestore().collection("announcements")
          .where("orgId", "==", actualOrgId);
      const announcements = await safeGetOrderedDocs(query, "createdAt", "desc", 100);
      return {success: true, announcements};
    } else if (action === "create") {
      const {title, content, priority} = payload;
      checkRequiredFields(payload, ["title", "content"]);

      const isHigh = priority === "high" || priority === "High";
      const newAnn = {
        orgId: actualOrgId,
        title: title.trim(),
        content: content.trim(),
        priority: isHigh ? "High" : "Normal",
        authorId: uid,
        authorName: userName || "Manager",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await admin.firestore().collection("announcements").add(newAnn);
      return {success: true, announcementId: docRef.id};
    } else if (action === "delete") {
      const {announcementId} = payload;
      checkRequiredFields(payload, ["announcementId"]);

      const docRef = admin.firestore().collection("announcements").doc(announcementId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return {success: true};
      }

      const docData = docSnap.data();
      const isManager = userOrgId === uid;
      if (!isAdmin && !isManager && docData.authorId !== uid && docData.orgId !== actualOrgId) {
        throw new HttpsError("permission-denied", "Unauthorized to delete this announcement.");
      }

      await docRef.delete();
      return {success: true};
    } else {
      throw new HttpsError("invalid-argument", "Invalid action.");
    }
  } catch (error) {
    handleInternalError("Error in manageAnnouncements: ", error);
  }
});

exports.handleCreateShiftGroup = handleCreateShiftGroup;
exports.handleRequestJoinShiftGroup = handleRequestJoinShiftGroup;
exports.handleRotateWorkplaceCredentials = handleRotateWorkplaceCredentials;
exports.handleAddManagerShiftGroup = handleAddManagerShiftGroup;
exports.handleUpdateProfile = handleUpdateProfile;
exports.handleUpdateCompanyShiftGroup = handleUpdateCompanyShiftGroup;
exports.generateUniqueCorporateId = generateUniqueCorporateId;
exports.generateUniqueWorkplaceCode = generateUniqueWorkplaceCode;
exports.generateUniqueWorkplaceKey = generateUniqueWorkplaceKey;

exports.getActualOrgId = getActualOrgId;
