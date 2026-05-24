export function parseNum(val) {
    if (!val) return 0;
    const parsed = parseFloat(val.toString().replace(/[^0-9.]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
}
