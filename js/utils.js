/**
 * Utility functions shared across the frontend
 */

export function parseNum(val) {
    if (!val) return 0;
    const parsed = parseFloat(val.toString().replace(/[^0-9.]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
}

export function getDayOfWeek(dateString) {
    if (!dateString) return -1;
    let d;
    if (dateString.includes("-")) {
        const [yyyy, mm, dd] = dateString.split("-");
        d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    } else {
        d = new Date(dateString);
    }
    if (isNaN(d.getTime())) return -1;
    return d.getDay();
}

export function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function getFirebaseErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Invalid email or password.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
}

export function logManagerError(actionMessage, error) {
    console.error("Manager Troubleshooting: " + actionMessage, error);
}
