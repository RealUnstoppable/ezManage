const {
  sanitizeInput,
  sanitizeObject,
  verifyRateLimit,
  verifyAppCheck,
  backendRateLimits,
} = require("../utils.js");

describe("Backend Security Utilities", () => {
  describe("sanitizeInput (XSS Mitigation)", () => {
    it("should strip <script> tags and inner contents", () => {
      const malicious = 'Hello <script>alert("XSS")</script> World';
      expect(sanitizeInput(malicious)).toBe("Hello  World");
    });

    it("should strip <iframe> tags", () => {
      const malicious = '<iframe src="https://evil.com"></iframe>Safe text';
      expect(sanitizeInput(malicious)).toBe("Safe text");
    });

    it("should strip javascript: pseudoprotocols", () => {
      const malicious = 'javascript:stealData()';
      expect(sanitizeInput(malicious)).toBe("stealData()");
    });

    it("should strip inline event handlers", () => {
      const malicious = '<img src="x" onerror="alert(1)">';
      expect(sanitizeInput(malicious)).not.toContain('onerror=');
    });

    it("should handle non-string values gracefully", () => {
      expect(sanitizeInput(12345)).toBe(12345);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
    });
  });

  describe("sanitizeObject (Prototype Pollution & Recursive Sanitization)", () => {
    it("should strip __proto__, constructor, and prototype keys", () => {
      const maliciousPayload = JSON.parse(
        '{"title": "Valid Shift", "__proto__": {"polluted": true}, "constructor": {"polluted": true}}'
      );
      const cleaned = sanitizeObject(maliciousPayload);

      expect(cleaned.title).toBe("Valid Shift");
      expect(Object.prototype.hasOwnProperty.call(cleaned, 'constructor')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(cleaned, '__proto__')).toBe(false);
      expect({}.polluted).toBeUndefined();
    });

    it("should recursively sanitize nested objects and arrays", () => {
      const payload = {
        name: "Normal",
        notes: ["Good note", "<script>bad()</script>"],
        meta: {
          tag: "Safe",
          subScript: "<script>evil()</script>Cleaned",
        },
      };

      const cleaned = sanitizeObject(payload);
      expect(cleaned.notes[1]).toBe("");
      expect(cleaned.meta.subScript).toBe("Cleaned");
    });
  });

  describe("verifyRateLimit", () => {
    beforeEach(() => {
      backendRateLimits.clear();
    });

    it("should allow requests within rate limit threshold", () => {
      const ip = "192.168.1.100";
      for (let i = 0; i < 5; i++) {
        expect(() => verifyRateLimit(ip, 5, 10000)).not.toThrow();
      }
    });

    it("should throw resource-exhausted when rate limit is exceeded", () => {
      const ip = "192.168.1.101";
      for (let i = 0; i < 3; i++) {
        verifyRateLimit(ip, 3, 10000);
      }
      expect(() => verifyRateLimit(ip, 3, 10000)).toThrow(/Rate limit exceeded/);
    });
  });

  describe("verifyAppCheck", () => {
    const origEnv = process.env.ENFORCE_APP_CHECK;

    afterEach(() => {
      process.env.ENFORCE_APP_CHECK = origEnv;
    });

    it("should allow request if ENFORCE_APP_CHECK is false", () => {
      process.env.ENFORCE_APP_CHECK = "false";
      expect(() => verifyAppCheck({})).not.toThrow();
    });

    it("should throw unauthenticated if ENFORCE_APP_CHECK is true and context.app is missing", () => {
      process.env.ENFORCE_APP_CHECK = "true";
      expect(() => verifyAppCheck({})).toThrow(/App Check verification failed/);
    });

    it("should succeed if ENFORCE_APP_CHECK is true and context.app is present", () => {
      process.env.ENFORCE_APP_CHECK = "true";
      expect(() => verifyAppCheck({ app: { appId: "dts-hub-app" } })).not.toThrow();
    });
  });
});
