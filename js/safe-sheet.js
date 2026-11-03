/**
 * ezManage Safe Sheet & Accounting Period/Week Cash Audit Engine
 * Handles structured bill/coin denomination counting and historical Safe Log calendar tracking.
 */

export const BILL_DENOMINATIONS = [
    { key: 'bill_100', label: '$100 Bills', value: 100 },
    { key: 'bill_50', label: '$50 Bills', value: 50 },
    { key: 'bill_20', label: '$20 Bills', value: 20 },
    { key: 'bill_10', label: '$10 Bills', value: 10 },
    { key: 'bill_5', label: '$5 Bills', value: 5 },
    { key: 'bill_2', label: '$2 Bills', value: 2 },
    { key: 'bill_1', label: '$1 Bills', value: 1 }
];

export const COIN_DENOMINATIONS = [
    { key: 'coin_1', label: '$1 Dollar Coins', value: 1.00, rollValue: null },
    { key: 'coin_50c', label: '50¢ Half-Dollars', value: 0.50, rollValue: null },
    { key: 'coin_25c', label: '25¢ Quarters', value: 0.25, rollValue: 10.00, rollLabel: 'Rolls ($10)' },
    { key: 'coin_10c', label: '10¢ Dimes', value: 0.10, rollValue: 5.00, rollLabel: 'Rolls ($5)' },
    { key: 'coin_5c', label: '5¢ Nickels', value: 0.05, rollValue: 2.00, rollLabel: 'Rolls ($2)' },
    { key: 'coin_1c', label: '1¢ Pennies', value: 0.01, rollValue: 0.50, rollLabel: 'Rolls (50¢)' }
];

export const DEFAULT_SAFE_BASE_TARGET = 1100.00;

export function getAccountingPeriodAndWeek(dateInput = new Date()) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return { periodNum: 1, periodLabel: 'P1 (Jan)', weekNum: 1, weekLabel: 'Week 1', fiscalTag: 'P1 W1' };

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = d.getMonth(); // 0-11
    const periodNum = month + 1;
    const periodLabel = `P${periodNum} (${monthNames[month]})`;

    const dayOfMonth = d.getDate();
    const weekNum = Math.min(5, Math.ceil(dayOfMonth / 7));
    const weekLabel = `Week ${weekNum}`;
    const fiscalTag = `P${periodNum} W${weekNum}`;

    return { periodNum, periodLabel, weekNum, weekLabel, fiscalTag };
}

export function calculateSafeTotal(counts = {}, baseTarget = DEFAULT_SAFE_BASE_TARGET) {
    let billsTotal = 0;
    BILL_DENOMINATIONS.forEach(b => {
        const qty = Math.max(0, parseInt(counts[b.key], 10) || 0);
        billsTotal += qty * b.value;
    });

    let coinsTotal = 0;
    COIN_DENOMINATIONS.forEach(c => {
        const looseQty = Math.max(0, parseInt(counts[c.key], 10) || 0);
        coinsTotal += looseQty * c.value;
        if (c.rollValue) {
            const rollQty = Math.max(0, parseInt(counts[c.key + '_rolls'], 10) || 0);
            coinsTotal += rollQty * c.rollValue;
        }
    });

    // Rounding to 2 decimal places to avoid floating-point errors
    billsTotal = Math.round(billsTotal * 100) / 100;
    coinsTotal = Math.round(coinsTotal * 100) / 100;
    const totalSafeCount = Math.round((billsTotal + coinsTotal) * 100) / 100;
    const variance = Math.round((totalSafeCount - baseTarget) * 100) / 100;

    let status = 'Balanced';
    if (variance < -0.009) status = 'Short';
    else if (variance > 0.009) status = 'Over';

    return {
        billsTotal,
        coinsTotal,
        totalSafeCount,
        baseTarget,
        variance,
        status
    };
}

export function getLocalSafeSheets(userId = 'guest') {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(`ezManage_safe_sheets_${userId}`);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

export function saveLocalSafeSheet(entry, userId = 'guest') {
    if (typeof localStorage === 'undefined') return [];
    try {
        const current = getLocalSafeSheets(userId);
        const filtered = current.filter(s => s.id !== entry.id);
        filtered.unshift(entry);
        localStorage.setItem(`ezManage_safe_sheets_${userId}`, JSON.stringify(filtered));
        return filtered;
    } catch (e) {
        return [];
    }
}

export function filterSafeSheetsByPeriodAndWeek(sheets = [], periodNum = null, weekNum = null) {
    return sheets.filter(sheet => {
        if (periodNum && sheet.periodNum !== Number(periodNum)) return false;
        if (weekNum && sheet.weekNum !== Number(weekNum)) return false;
        return true;
    });
}

if (typeof window !== 'undefined') {
    window.BILL_DENOMINATIONS = BILL_DENOMINATIONS;
    window.COIN_DENOMINATIONS = COIN_DENOMINATIONS;
    window.DEFAULT_SAFE_BASE_TARGET = DEFAULT_SAFE_BASE_TARGET;
    window.getAccountingPeriodAndWeek = getAccountingPeriodAndWeek;
    window.calculateSafeTotal = calculateSafeTotal;
    window.getLocalSafeSheets = getLocalSafeSheets;
    window.saveLocalSafeSheet = saveLocalSafeSheet;
    window.filterSafeSheetsByPeriodAndWeek = filterSafeSheetsByPeriodAndWeek;
}
