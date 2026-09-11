export function getDayOfWeek(dateString) {
    if (!dateString) return -1;
    let d;
    // Handle if a Date object is passed instead of a string
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
