const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

admin.initializeApp();

// Fallback "placeholder" string to stop Firebase Analyzer from crashing
// during deployment
const stripeKey = process.env.STRIPE_SECRET || "sk_test_placeholder";
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET ||
  "whsec_placeholder";
const stripe = require("stripe")(stripeKey);

// 🔹 Create Checkout Session
exports.createCheckoutSession = functions.https.onRequest((req, res) => {
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
      console.error("Checkout Error:", err);
      res.status(500).json({error: err.message});
    }
  });
});

// 🔐 STRIPE WEBHOOK (SECURE)
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook Error:", err);
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
        console.error("Error updating user subscription status:", error);
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
        console.error(`Error reverting user ${doc.id} back to Free plan:`, err);
      }
    }
  }

  res.json({received: true});
});

// 🔻 Cancel Subscription Manually
exports.cancelSubscription = functions.https.onRequest((req, res) => {
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
      console.error("Cancel Error:", err);
      res.status(500).json({error: err.message});
    }
  });
});

/**
 * Manage Shift Notes API
 * Handles creation, updating, and resolution of shift notes.
 */
exports.manageShiftNotes = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({error: "Method Not Allowed"});
    }

    try {
      const {action, payload} = req.body;

      if (!action || !payload) {
        return res.status(400).json({error: "Missing action or payload"});
      }

      if (action === "create") {
        const {authorId, authorName, content, priority, orgId} = payload;

        if (!authorId || !content) {
          return res.status(400).json({error: "Missing required fields"});
        }

        const validPriorities = ["Normal", "Urgent"];
        const notePriority = validPriorities.includes(priority) ?
          priority : "Normal";

        const newNote = {
          authorId,
          authorName: authorName || "Anonymous",
          content,
          priority: notePriority,
          status: "Active",
          orgId: orgId || null,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await admin.firestore()
            .collection("shift_notes")
            .add(newNote);

        return res.status(200).json({success: true, id: docRef.id});
      }

      if (action === "resolve") {
        const {noteId, resolvedBy} = payload;

        if (!noteId || !resolvedBy) {
          return res.status(400).json({error: "Missing required fields"});
        }

        await admin.firestore()
            .collection("shift_notes")
            .doc(noteId)
            .update({
              status: "Resolved",
              resolvedBy,
              resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        return res.status(200).json({success: true});
      }

      return res.status(400).json({error: "Invalid action"});
    } catch (error) {
      console.error("Shift Note Error:", error);
      return res.status(500).json({error: error.message});
    }
  });
});

/**
 * Manage Shift Groups API
 * Handles creating groups, joining groups, and approving joins.
 */
exports.manageShiftGroups = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({error: "Method Not Allowed"});
    }

    try {
      const {action, payload} = req.body;

      if (!action || !payload) {
        return res.status(400).json({error: "Missing action or payload"});
      }

      // Create a new group
      if (action === "create") {
        const {ownerId, ownerName, groupName, password} = payload;

        if (!ownerId || !groupName || !password) {
          return res.status(400).json({error: "Missing required fields"});
        }

        const newGroup = {
          ownerId,
          ownerName: ownerName || "Anonymous",
          groupName,
          password, // Basic password for joining (in a real app, hash this)
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await admin.firestore()
            .collection("shift_groups")
            .add(newGroup);

        // Automatically set the owner's orgId to the new group ID
        await admin.firestore().collection("users").doc(ownerId).update({
          orgId: docRef.id,
        });

        return res.status(200).json({success: true, groupId: docRef.id});
      }

      // Request to join a group
      if (action === "request_join") {
        const {userId, userName, groupId, password} = payload;

        if (!userId || !groupId || !password) {
          return res.status(400).json({error: "Missing required fields"});
        }

        const groupDoc = await admin.firestore()
            .collection("shift_groups").doc(groupId).get();

        if (!groupDoc.exists) {
          return res.status(404).json({error: "Group not found"});
        }

        if (groupDoc.data().password !== password) {
          return res.status(401).json({error: "Invalid password"});
        }

        // Create a join request
        await admin.firestore().collection("shift_group_requests").add({
          groupId,
          userId,
          userName: userName || "Anonymous",
          status: "Pending",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(200).json({success: true});
      }

      // Approve a join request
      if (action === "approve_join") {
        const {ownerId, requestId} = payload;

        if (!ownerId || !requestId) {
          return res.status(400).json({error: "Missing required fields"});
        }

        const requestDocRef = admin.firestore()
            .collection("shift_group_requests").doc(requestId);
        const requestDoc = await requestDocRef.get();

        if (!requestDoc.exists) {
          return res.status(404).json({error: "Request not found"});
        }

        const {groupId, userId} = requestDoc.data();

        // Verify the user approving is the owner
        const groupDoc = await admin.firestore()
            .collection("shift_groups").doc(groupId).get();

        if (!groupDoc.exists || groupDoc.data().ownerId !== ownerId) {
          return res.status(403).json({error: "Unauthorized"});
        }

        // Update the requesting user's orgId
        await admin.firestore().collection("users").doc(userId).update({
          orgId: groupId,
        });

        // Update request status
        await requestDocRef.update({
          status: "Approved",
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(200).json({success: true});
      }

      return res.status(400).json({error: "Invalid action"});
    } catch (error) {
      console.error("Shift Groups Error:", error);
      return res.status(500).json({error: error.message});
    }
  });
});

exports.trainGlobalAI = require("./trainGlobalAI").trainGlobalAI;
