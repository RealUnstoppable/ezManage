export function parseNum(val) {
    if (!val) return 0;
    const parsed = parseFloat(val.toString().replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
}

export function getDayOfWeek(dateString) {
    if (!dateString) return -1;
    let d;
    if (dateString.includes('-')) {
        d = new Date(dateString + 'T12:00:00Z');
    } else {
        d = new Date(dateString);
    }
    if (isNaN(d.getTime())) return -1;
    return d.getDay();
}
