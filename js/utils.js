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
