const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const { watchdog } = require("./security/watchdog.cjs");

const app = express();

// 1. 🛡️ Secure HTTP Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.tailwindcss.com",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net",
          "https://www.gstatic.com",
          "https://js.stripe.com",
          "https://apis.google.com",
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.tailwindcss.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: [
          "'self'",
          "https://*.firebaseio.com",
          "https://*.googleapis.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://api.stripe.com",
          "https://*.cloudfunctions.net",
          "http://localhost:*",
          "ws://localhost:*",
        ],
        frameSrc: ["'self'", "https://js.stripe.com", "https://*.firebaseapp.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// 2. CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "https://ezmanage.realunstoppable.store",
        "https://dts-hub-website.web.app",
        "https://dts-hub-website.firebaseapp.com",
      ];
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(new Error("CORS policy violation: origin not allowed"), false);
    },
    credentials: true,
  })
);

// 3. ⏱️ Rate Limiting
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
});

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 checkout sessions per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout requests created. Please wait before trying again." },
});

const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication tracking requests. Try again later." },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 webhook events per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many webhook calls. Rate limit exceeded." },
});

// 4. Stripe webhook endpoint with raw body parsing (MUST come before express.json())
const stripeSecret = process.env.STRIPE_SECRET || "sk_test_placeholder";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = Stripe(stripeSecret);
const processedStripeWebhookEvents = new Set();

app.post(
  "/webhook",
  webhookLimiter,
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      return res.status(400).send("Webhook Error: Missing stripe-signature header");
    }

    if (!req.body || (typeof req.body !== "string" && !Buffer.isBuffer(req.body))) {
      return res.status(400).send("Webhook Error: Missing raw request body");
    }

    const currentSecret = stripeWebhookSecret || (process.env.NODE_ENV === "test" ? "whsec_test_secret" : null);
    if (!currentSecret) {
      return res.status(500).send("Webhook Error: STRIPE_WEBHOOK_SECRET is not configured on the server");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, currentSecret);
    } catch (err) {
      watchdog.logIncident("STRIPE_SIGNATURE_VERIFICATION_FAILED", {
        ip: req.ip,
        error: err.message,
      });
      return res.status(400).send(`Webhook Signature Error: ${err.message}`);
    }

    // 🛡️ Webhook Idempotency Check
    const eventId = event && event.id;
    if (eventId && processedStripeWebhookEvents.has(eventId)) {
      console.log(`[Stripe Webhook] Duplicate event ${eventId} already processed, skipping.`);
      return res.status(200).json({ received: true, duplicate: true });
    }
    if (eventId) {
      if (processedStripeWebhookEvents.size >= 5000) {
        const oldest = processedStripeWebhookEvents.values().next().value;
        processedStripeWebhookEvents.delete(oldest);
      }
      processedStripeWebhookEvents.add(eventId);
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        console.log(`[Stripe Webhook] Checkout completed for session: ${event.data.object.id}`);
        break;
      case "customer.subscription.deleted":
      case "customer.subscription.updated":
        console.log(`[Stripe Webhook] Subscription update: ${event.type}`);
        break;
      case "invoice.payment_succeeded":
        console.log(`[Stripe Webhook] Invoice payment succeeded: ${event.data.object.id}`);
        break;
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });
  }
);

// 5. Body Parsers (with size limits to prevent DoS)
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true, limit: "500kb" }));

// 6. 🚨 Malicious Payload Watchdog Middleware
app.use(watchdog.middleware());

// Apply global rate limit to API routes
app.use("/create-checkout-session", checkoutLimiter);
app.use("/api/", globalApiLimiter);

// 7. Security Watchdog & Account Lockout API Endpoints
app.post("/api/security/auth-attempt", authAttemptLimiter, (req, res) => {
  const { email, success } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const result = watchdog.lockout.recordAttempt(email, Boolean(success));
  return res.json(result);
});

app.get("/api/security/lockout-status", (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email query parameter is required" });
  }

  const status = watchdog.lockout.checkLockout(email);
  return res.json(status);
});

app.get("/api/security/incidents", (req, res) => {
  // In production, require admin key/authorization
  const authHeader = req.headers.authorization;
  if (process.env.NODE_ENV === "production" && (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.json({ incidents: watchdog.getIncidents() });
});

// 8. 💳 Stripe Checkout Session Endpoint
app.post("/create-checkout-session", async (req, res) => {
  const { plan, successUrl, cancelUrl } = req.body;

  // Strict input validation to prevent manipulation
  const validPlans = {
    "Business Pro": "price_1UJifEBmfNp1AIykML2Y8VLE",
    "Individual": "price_1UJifGBmfNp1AIykFdVlMS1x",
    "Starter": "price_1UJifGBmfNp1AIykFdVlMS1x",
  };

  const selectedPlan = plan || "Individual";
  if (!validPlans[selectedPlan]) {
    return res.status(400).json({ error: "Invalid plan specified." });
  }

  try {
    const priceId = validPlans[selectedPlan];

    // Validate callback URLs against open redirect attacks
    const defaultSuccess = "http://localhost:3000?success=true";
    const defaultCancel = "http://localhost:3000?canceled=true";

    const sanitizeRedirectUrl = (url, fallback) => {
      if (!url || typeof url !== "string") return fallback;
      try {
        const parsed = new URL(url);
        const allowedHosts = ["localhost", "127.0.0.1", "ezmanage.realunstoppable.store"];
        if (allowedHosts.includes(parsed.hostname)) return url;
      } catch (e) {
        // invalid URL
      }
      return fallback;
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: sanitizeRedirectUrl(successUrl, defaultSuccess),
      cancel_url: sanitizeRedirectUrl(cancelUrl, defaultCancel),
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Checkout Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 9. Static Assets & Frontend
app.use(express.static(__dirname));

// 10. Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

// Export app for testability (e.g. supertest)
if (require.main === module && process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running securely on port ${PORT}`));
}

module.exports = app;
