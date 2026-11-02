import { jest } from "@jest/globals";
import {
    checkAccountLockout,
    recordFailedAuth,
    recordSuccessfulAuth,
    MAX_AUTH_ATTEMPTS,
    LOCKOUT_DURATION_MS
} from '../auth.js';

describe('Authentication Security & Account Lockout Defense', () => {
    const testEmail = 'staff.member@company.com';

    beforeEach(() => {
        window.localStorage.clear();
        jest.clearAllMocks();
    });

    it('should initialize with account not locked', () => {
        const status = checkAccountLockout(testEmail);
        expect(status.isLocked).toBe(false);
        expect(status.remainingSeconds).toBe(0);
    });

    it('should track failed attempts and not lock out below threshold', () => {
        for (let i = 1; i < MAX_AUTH_ATTEMPTS; i++) {
            const record = recordFailedAuth(testEmail);
            expect(record.count).toBe(i);
            expect(record.lockedUntil).toBeNull();

            const status = checkAccountLockout(testEmail);
            expect(status.isLocked).toBe(false);
        }
    });

    it('should lock out account after reaching MAX_AUTH_ATTEMPTS (5 failed attempts)', () => {
        // Trigger 5 failed attempts
        for (let i = 0; i < MAX_AUTH_ATTEMPTS; i++) {
            recordFailedAuth(testEmail);
        }

        const status = checkAccountLockout(testEmail);
        expect(status.isLocked).toBe(true);
        expect(status.remainingSeconds).toBeGreaterThan(0);
        expect(status.remainingSeconds).toBeLessThanOrEqual(Math.ceil(LOCKOUT_DURATION_MS / 1000));
    });

    it('should reset failed attempts and unlock upon successful authentication', () => {
        // Fail 3 times
        recordFailedAuth(testEmail);
        recordFailedAuth(testEmail);
        recordFailedAuth(testEmail);

        // Success resets lockout record
        recordSuccessfulAuth(testEmail);

        const status = checkAccountLockout(testEmail);
        expect(status.isLocked).toBe(false);
        expect(status.remainingSeconds).toBe(0);
        expect(window.localStorage.getItem(`ezManage_lockout_${testEmail}`)).toBeNull();
    });

    it('should automatically release lockout after expiration time passes', () => {
        // Lock out account
        for (let i = 0; i < MAX_AUTH_ATTEMPTS; i++) {
            recordFailedAuth(testEmail);
        }

        expect(checkAccountLockout(testEmail).isLocked).toBe(true);

        // Mock Date.now to simulate 16 minutes later
        const realDateNow = Date.now;
        try {
            Date.now = () => realDateNow() + (16 * 60 * 1000);
            const status = checkAccountLockout(testEmail);
            expect(status.isLocked).toBe(false);
        } finally {
            Date.now = realDateNow;
        }
    });

    it('should normalize email to lowercase when tracking lockout', () => {
        recordFailedAuth('USER@EXAMPLE.COM');
        const status = checkAccountLockout('user@example.com');
        expect(status.attempts).toBe(1);
    });
});
