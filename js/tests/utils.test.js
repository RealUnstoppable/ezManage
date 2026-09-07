import { getFirebaseErrorMessage } from '../utils.js';

describe('getFirebaseErrorMessage', () => {
    it('should return correct message for auth/invalid-email', () => {
        const error = { code: 'auth/invalid-email' };
        expect(getFirebaseErrorMessage(error)).toBe('Please enter a valid email address.');
    });

    it('should return correct message for auth/user-not-found', () => {
        const error = { code: 'auth/user-not-found' };
        expect(getFirebaseErrorMessage(error)).toBe('Invalid email or password.');
    });

    it('should return correct message for auth/wrong-password', () => {
        const error = { code: 'auth/wrong-password' };
        expect(getFirebaseErrorMessage(error)).toBe('Invalid email or password.');
    });

    it('should return correct message for auth/invalid-credential', () => {
        const error = { code: 'auth/invalid-credential' };
        expect(getFirebaseErrorMessage(error)).toBe('Invalid email or password.');
    });

    it('should return correct message for auth/email-already-in-use', () => {
        const error = { code: 'auth/email-already-in-use' };
        expect(getFirebaseErrorMessage(error)).toBe('An account with this email already exists.');
    });

    it('should return correct message for auth/weak-password', () => {
        const error = { code: 'auth/weak-password' };
        expect(getFirebaseErrorMessage(error)).toBe('Password should be at least 6 characters.');
    });

    it('should return default message for unknown error code', () => {
        const error = { code: 'some/unknown-error' };
        expect(getFirebaseErrorMessage(error)).toBe('An unexpected error occurred. Please try again.');
    });

    it('should return default message for error without code', () => {
        const error = { message: 'Some error occurred' };
        expect(getFirebaseErrorMessage(error)).toBe('An unexpected error occurred. Please try again.');
    });
});
