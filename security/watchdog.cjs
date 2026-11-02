/**
 * ezManage Security Watchdog & Account Lockout System
 * Provides automated malicious payload detection, threat monitoring,
 * and temporary account lockout to prevent brute-force attacks and abuse.
 */

class AccountLockoutManager {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 5;
    this.lockoutWindowMs = options.lockoutWindowMs || 15 * 60 * 1000; // 15 minutes
    this.attempts = new Map(); // identifier -> { count, lockedUntil, lastAttempt }
  }

  _cleanup() {
    const now = Date.now();
    for (const [id, record] of this.attempts.entries()) {
      if (record.lockedUntil && record.lockedUntil < now && (now - record.lastAttempt > this.lockoutWindowMs)) {
        this.attempts.delete(id);
      }
    }
  }

  recordAttempt(identifier, success) {
    if (!identifier) return { isLocked: false, remainingSeconds: 0 };
    const id = String(identifier).toLowerCase().trim();
    const now = Date.now();

    let record = this.attempts.get(id);
    if (!record) {
      record = { count: 0, lockedUntil: null, lastAttempt: now };
      this.attempts.set(id, record);
    }

    // Check if previously locked and window has expired
    if (record.lockedUntil && record.lockedUntil <= now) {
      record.count = 0;
      record.lockedUntil = null;
    }

    if (success) {
      this.attempts.delete(id);
      return { isLocked: false, remainingSeconds: 0, count: 0 };
    }

    // Increment failed attempts
    record.count += 1;
    record.lastAttempt = now;

    if (record.count >= this.maxAttempts) {
      record.lockedUntil = now + this.lockoutWindowMs;
      return {
        isLocked: true,
        remainingSeconds: Math.ceil(this.lockoutWindowMs / 1000),
        count: record.count,
        lockedUntil: record.lockedUntil,
      };
    }

    return {
      isLocked: false,
      remainingSeconds: 0,
      attemptsRemaining: this.maxAttempts - record.count,
      count: record.count,
    };
  }

  checkLockout(identifier) {
    if (!identifier) return { isLocked: false, remainingSeconds: 0, count: 0 };
    const id = String(identifier).toLowerCase().trim();
    const record = this.attempts.get(id);
    if (!record) return { isLocked: false, remainingSeconds: 0, count: 0 };

    const now = Date.now();
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        isLocked: true,
        remainingSeconds,
        count: record.count,
        lockedUntil: record.lockedUntil,
      };
    }

    if (record.lockedUntil && record.lockedUntil <= now) {
      record.count = 0;
      record.lockedUntil = null;
    }

    return {
      isLocked: false,
      remainingSeconds: 0,
      count: record.count,
    };
  }

  reset(identifier) {
    if (!identifier) return;
    this.attempts.delete(String(identifier).toLowerCase().trim());
  }

  clearAll() {
    this.attempts.clear();
  }
}

class PayloadScanner {
  constructor() {
    // Attack signatures
    this.patterns = [
      { name: 'XSS_SCRIPT_TAG', regex: /<\s*script\b[^>]*>/i },
      { name: 'XSS_JAVASCRIPT_URI', regex: /javascript\s*:/i },
      { name: 'XSS_EVENT_HANDLER', regex: /\bon[a-z]+\s*=\s*['"]/i },
      { name: 'XSS_IFRAME_TAG', regex: /<\s*iframe\b[^>]*>/i },
      { name: 'XSS_OBJECT_EMBED', regex: /<\s*(object|embed|applet)\b[^>]*>/i },
      { name: 'SQL_INJECTION_OR', regex: /('\s*OR\s*['"]?1['"]?\s*=\s*['"]?1|UNION\s+SELECT|DROP\s+TABLE|;\s*SHUTDOWN)/i },
      { name: 'NOSQL_INJECTION_KEY', regex: /^\$(where|gt|gte|lt|lte|ne|in|nin|regex|expr)$/i },
      { name: 'PROTOTYPE_POLLUTION', regex: /^(__proto__|constructor|prototype)$/ },
      { name: 'PATH_TRAVERSAL', regex: /(\.\.[\/\\]|%2e%2e[%2f%5c])/i },
    ];
  }

  scan(data, currentPath = '') {
    const threats = [];

    if (data === null || data === undefined) {
      return { safe: true, threats };
    }

    if (typeof data === 'string') {
      for (const pattern of this.patterns) {
        if (pattern.regex.test(data)) {
          threats.push({
            path: currentPath || 'root',
            threatType: pattern.name,
            sample: data.slice(0, 100),
          });
        }
      }
      return { safe: threats.length === 0, threats };
    }

    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        const result = this.scan(item, `${currentPath}[${index}]`);
        if (!result.safe) threats.push(...result.threats);
      });
      return { safe: threats.length === 0, threats };
    }

    if (typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        const fieldPath = currentPath ? `${currentPath}.${key}` : key;

        // Check key name itself for prototype pollution or NoSQL keys
        for (const pattern of this.patterns) {
          if (pattern.regex.test(key)) {
            threats.push({
              path: fieldPath,
              threatType: pattern.name,
              sample: `Key: ${key}`,
            });
          }
        }

        const valueResult = this.scan(value, fieldPath);
        if (!valueResult.safe) {
          threats.push(...valueResult.threats);
        }
      }
      return { safe: threats.length === 0, threats };
    }

    return { safe: true, threats };
  }
}

class SecurityWatchdog {
  constructor(options = {}) {
    this.lockout = new AccountLockoutManager(options.lockout);
    this.scanner = new PayloadScanner();
    this.incidents = [];
    this.maxIncidentsLogged = options.maxIncidentsLogged || 1000;
  }

  logIncident(type, details = {}) {
    const incident = {
      timestamp: new Date().toISOString(),
      type,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      path: details.path || 'unknown',
      details,
    };
    this.incidents.push(incident);
    if (this.incidents.length > this.maxIncidentsLogged) {
      this.incidents.shift();
    }
    console.warn(`🚨 [SECURITY WATCHDOG ALERT] [${type}] from IP: ${incident.ip} on ${incident.path}:`, JSON.stringify(details));
    return incident;
  }

  getIncidents(limit = 50) {
    return this.incidents.slice(-limit);
  }

  middleware() {
    return (req, res, next) => {
      // 1. Inspect request query, body, and params
      const scanTargets = [
        { name: 'query', data: req.query },
        { name: 'body', data: req.body },
        { name: 'params', data: req.params },
      ];

      for (const target of scanTargets) {
        if (target.data && typeof target.data === 'object') {
          const scanResult = this.scanner.scan(target.data, target.name);
          if (!scanResult.safe) {
            const incident = this.logIncident('SUSPICIOUS_PAYLOAD_DETECTED', {
              ip: req.ip || req.connection.remoteAddress,
              path: req.originalUrl || req.url,
              userAgent: req.headers['user-agent'],
              target: target.name,
              threats: scanResult.threats,
            });

            return res.status(403).json({
              error: 'Forbidden: Suspicious payload detected by ezManage Security Watchdog',
              incidentId: incident.timestamp,
            });
          }
        }
      }

      next();
    };
  }
}

// Singleton watchdog instance
const defaultWatchdog = new SecurityWatchdog();

module.exports = {
  AccountLockoutManager,
  PayloadScanner,
  SecurityWatchdog,
  watchdog: defaultWatchdog,
};
