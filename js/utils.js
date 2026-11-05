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

/**
 * Strips dangerous executable script tags and handlers from input to prevent XSS.
 * @param {any} input - Value to sanitize
 * @returns {any} Sanitized value
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
        .replace(/<\s*script\b[^>]*>([\s\S]*?)<\s*\/\s*script\s*>/gi, '')
        .replace(/<\s*iframe\b[^>]*>([\s\S]*?)<\s*\/\s*iframe\s*>/gi, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/\bon[a-z]+\s*=\s*['"][^'"]*['"]/gi, '')
        .replace(/\0/g, '')
        .trim();
}

/**
 * Recursively sanitizes an object or array, stripping prototype pollution keys.
 * @param {any} obj - Object to sanitize
 * @returns {any} Cleaned object
 */
export function sanitizeObject(obj) {
    if (obj === null || typeof obj !== 'object') {
        return typeof obj === 'string' ? sanitizeInput(obj) : obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    const clean = {};
    for (const [key, val] of Object.entries(obj)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;
        }
        clean[key] = sanitizeObject(val);
    }
    return clean;
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

export function logManagerError(actionMessage, ...args) {
    console.error("Manager Troubleshooting: " + actionMessage, ...args);
}

export function isNetworkError(error) {
    return error.code === 'auth/network-request-failed' || error.code === 'unavailable' || error.code === 'firestore/unavailable';
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @returns {Function} Returns the new debounced function.
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
