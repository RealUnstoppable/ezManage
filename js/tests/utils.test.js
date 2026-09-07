import { jest } from "@jest/globals";
import { parseNum, getDayOfWeek, escapeHTML, showToast, getFirebaseErrorMessage, logManagerError } from '../utils.js';

describe('utils.js', () => {
    describe('parseNum', () => {
        it('should correctly parse integers', () => {
            expect(parseNum(123)).toBe(123);
            expect(parseNum("123")).toBe(123);
        });

        it('should correctly parse floats', () => {
            expect(parseNum(123.45)).toBe(123.45);
            expect(parseNum("123.45")).toBe(123.45);
        });

        it('should remove non-numeric characters before parsing', () => {
            expect(parseNum("$1,234.56")).toBe(1234.56);
            expect(parseNum("abc123def")).toBe(123);
        });

        it('should return 0 for falsy values', () => {
            expect(parseNum(null)).toBe(0);
            expect(parseNum(undefined)).toBe(0);
            expect(parseNum("")).toBe(0);
            expect(parseNum(0)).toBe(0);
        });

        it('should return 0 if parsed result is NaN', () => {
            expect(parseNum("abcdef")).toBe(0);
        });
    });

    describe('getDayOfWeek', () => {
        it('should correctly parse YYYY-MM-DD format', () => {
            // "2023-10-15" is a Sunday (0)
            expect(getDayOfWeek("2023-10-15")).toBe(0);
            // "2023-10-16" is a Monday (1)
            expect(getDayOfWeek("2023-10-16")).toBe(1);
        });

        it('should correctly parse other valid date formats', () => {
            expect(getDayOfWeek("October 15, 2023")).toBe(0);
        });

        it('should return -1 for invalid dates', () => {
            expect(getDayOfWeek("invalid-date")).toBe(-1);
        });

        it('should return -1 for falsy values', () => {
            expect(getDayOfWeek(null)).toBe(-1);
            expect(getDayOfWeek(undefined)).toBe(-1);
            expect(getDayOfWeek("")).toBe(-1);
        });
    });
    describe('escapeHTML', () => {
        it('should correctly escape special characters', () => {
            expect(escapeHTML('<div class="test">Hello & World\'s</div>')).toBe('&lt;div class=&quot;test&quot;&gt;Hello &amp; World&#039;s&lt;/div&gt;');
            expect(escapeHTML('&&<<>>""\'\'')).toBe('&amp;&amp;&lt;&lt;&gt;&gt;&quot;&quot;&#039;&#039;');
        });

        it('should return the original value if it is not a string', () => {
            expect(escapeHTML(123)).toBe(123);
            expect(escapeHTML(null)).toBe(null);
            expect(escapeHTML(undefined)).toBe(undefined);
            const obj = {};
            expect(escapeHTML(obj)).toBe(obj);
        });
    });
    describe('getFirebaseErrorMessage', () => {
        it('should return correct message for auth/invalid-email', () => {
            expect(getFirebaseErrorMessage({ code: 'auth/invalid-email' })).toBe('Please enter a valid email address.');
        });

        it('should return correct message for invalid credentials', () => {
            expect(getFirebaseErrorMessage({ code: 'auth/user-not-found' })).toBe('Invalid email or password.');
            expect(getFirebaseErrorMessage({ code: 'auth/wrong-password' })).toBe('Invalid email or password.');
            expect(getFirebaseErrorMessage({ code: 'auth/invalid-credential' })).toBe('Invalid email or password.');
        });

        it('should return correct message for auth/email-already-in-use', () => {
            expect(getFirebaseErrorMessage({ code: 'auth/email-already-in-use' })).toBe('An account with this email already exists.');
        });

        it('should return correct message for auth/weak-password', () => {
            expect(getFirebaseErrorMessage({ code: 'auth/weak-password' })).toBe('Password should be at least 6 characters.');
        });

        it('should return default message for unknown error codes', () => {
            expect(getFirebaseErrorMessage({ code: 'auth/unknown-error' })).toBe('An unexpected error occurred. Please try again.');
            expect(getFirebaseErrorMessage({})).toBe('An unexpected error occurred. Please try again.');
        });
    });
    describe('showToast', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            document.body.innerHTML = '';
        });

        afterEach(() => {
            jest.runOnlyPendingTimers();
            jest.useRealTimers();
        });

        it('should append a toast notification to the body', () => {
            showToast('Test Message');
            const toast = document.querySelector('.toast-notification');
            expect(toast).not.toBeNull();
            expect(toast.textContent).toBe('Test Message');
        });

        it('should add fade-out class after 3000ms', () => {
            showToast('Test Message');
            const toast = document.querySelector('.toast-notification');

            expect(toast.classList.contains('fade-out')).toBe(false);

            jest.advanceTimersByTime(3000);

            expect(toast.classList.contains('fade-out')).toBe(true);
        });

        it('should remove the toast after 3300ms total', () => {
            showToast('Test Message');

            jest.advanceTimersByTime(3000); // Trigger fade-out
            expect(document.querySelector('.toast-notification')).not.toBeNull();

            jest.advanceTimersByTime(300); // Trigger removal
            expect(document.querySelector('.toast-notification')).toBeNull();
        });
    });
    describe('logManagerError', () => {
        let consoleErrorSpy;

        beforeEach(() => {
            consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
            consoleErrorSpy.mockRestore();
        });

        it('should call console.error with the correct prefix and message', () => {
            logManagerError('Test error message');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Manager Troubleshooting: Test error message');
        });

        it('should forward additional arguments to console.error', () => {
            const errorObj = new Error('Test error');
            logManagerError('Failed to load', errorObj, { details: 'info' });
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Manager Troubleshooting: Failed to load',
                errorObj,
                { details: 'info' }
            );
        });
    });
});
