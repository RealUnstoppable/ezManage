function parseNum(val) {
    if (!val) return 0;
    const n = parseFloat(val.toString().replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
}

function getDayOfWeek(dateString) {
    if (!dateString) return -1;
    let d;
    if (dateString.includes("-")) {
        const [yyyy, mm, dd] = dateString.split("-");
        d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    } else {
        d = new Date(dateString);
    }
    return isNaN(d.getTime()) ? -1 : d.getDay();
}

window.parseNum = parseNum;
window.getDayOfWeek = getDayOfWeek;
