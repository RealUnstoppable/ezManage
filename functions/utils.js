/**
 * Get day of week
 * @param {string} dateString
 * @return {number}
 */
function getDayOfWeek(dateString) {
  if (!dateString) return -1;
  let d;
  if (dateString instanceof Date) {
    d = dateString;
  } else if (typeof dateString === 'string' && dateString.includes("-")) {
    const [yyyy, mm, dd] = dateString.split("-");
    d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  } else {
    d = new Date(dateString);
  }
  if (isNaN(d.getTime())) return -1;
  return d.getDay();
}

/**
 * Parse number
 * @param {any} val
 * @return {number}
 */
function parseNum(val) {
  if (!val) return 0;
  const parsed = parseFloat(val.toString().replace(/[^0-9.]/g, ""));
  return isNaN(parsed) ? 0 : parsed;
}

module.exports = {getDayOfWeek, parseNum};
