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
          }
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
    }
  }

  if (event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.canceled") {
    const sub = event.data.object;

    const snapshot = await admin.firestore()
        .collection("users")
        .where("subscription.customerId", "==", sub.customer)
        .get();

    snapshot.forEach((doc) => {
      // Revert the user back to the free plan
      doc.ref.update({
        "plan": "Free",
        "subscription.status": "canceled",
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`❌ Reverted user ${doc.id} back to Free plan.`);
    });
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
exports.trainGlobalAI = require("./trainGlobalAI").trainGlobalAI;
