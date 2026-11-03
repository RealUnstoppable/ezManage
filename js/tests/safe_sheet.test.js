import {
    calculateSafeTotal,
    getAccountingPeriodAndWeek,
    filterSafeSheetsByPeriodAndWeek,
    saveLocalSafeSheet,
    getLocalSafeSheets,
    DEFAULT_SAFE_BASE_TARGET
} from '../safe-sheet.js';

describe('Safe Sheet Denomination Calculator & Period History', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('should calculate accurate bill and coin denomination totals and variances', () => {
        const counts = {
            bill_100: 5,   // $500.00
            bill_50: 4,    // $200.00
            bill_20: 10,   // $200.00
            bill_10: 10,   // $100.00
            bill_5: 10,    // $50.00
            bill_1: 20,    // $20.00 -> Bills: $1070.00
            coin_25c: 20,  // $5.00
            coin_25c_rolls: 2, // 2 * $10 = $20.00
            coin_10c: 30,  // $3.00
            coin_5c: 20,   // $1.00
            coin_1c: 100   // $1.00 -> Coins: $30.00
            // Total: $1100.00
        };

        const result = calculateSafeTotal(counts, 1100.00);
        expect(result.billsTotal).toBe(1070.00);
        expect(result.coinsTotal).toBe(30.00);
        expect(result.totalSafeCount).toBe(1100.00);
        expect(result.variance).toBe(0.00);
        expect(result.status).toBe('Balanced');
    });

    test('should detect short and over variances correctly against target base', () => {
        const shortCounts = { bill_100: 10 }; // $1000
        const shortRes = calculateSafeTotal(shortCounts, 1100.00);
        expect(shortRes.variance).toBe(-100.00);
        expect(shortRes.status).toBe('Short');

        const overCounts = { bill_100: 12 }; // $1200
        const overRes = calculateSafeTotal(overCounts, 1100.00);
        expect(overRes.variance).toBe(100.00);
        expect(overRes.status).toBe('Over');
    });

    test('should compute standard corporate accounting period and week tags', () => {
        // Nov 2, 2026 -> Month 10 (Nov) -> Period 11, Day 2 -> Week 1
        const dateNov2 = new Date('2026-11-02T12:00:00Z');
        const pNov = getAccountingPeriodAndWeek(dateNov2);
        expect(pNov.periodNum).toBe(11);
        expect(pNov.periodLabel).toBe('P11 (Nov)');
        expect(pNov.weekNum).toBe(1);
        expect(pNov.fiscalTag).toBe('P11 W1');

        // Nov 18, 2026 -> Day 18 -> Week 3
        const dateNov18 = new Date('2026-11-18T12:00:00Z');
        const pNov3 = getAccountingPeriodAndWeek(dateNov18);
        expect(pNov3.weekNum).toBe(3);
        expect(pNov3.fiscalTag).toBe('P11 W3');
    });

    test('should persist safe sheets and filter by accounting period and week', () => {
        const entry1 = {
            id: 'safe_01',
            date: '2026-11-02',
            periodNum: 11,
            weekNum: 1,
            totalSafeCount: 1100.00,
            status: 'Balanced'
        };
        const entry2 = {
            id: 'safe_02',
            date: '2026-11-10',
            periodNum: 11,
            weekNum: 2,
            totalSafeCount: 1095.00,
            status: 'Short'
        };
        const entry3 = {
            id: 'safe_03',
            date: '2026-10-05',
            periodNum: 10,
            weekNum: 1,
            totalSafeCount: 1110.00,
            status: 'Over'
        };

        saveLocalSafeSheet(entry1, 'u1');
        saveLocalSafeSheet(entry2, 'u1');
        saveLocalSafeSheet(entry3, 'u1');

        const all = getLocalSafeSheets('u1');
        expect(all.length).toBe(3);

        const p11Only = filterSafeSheetsByPeriodAndWeek(all, 11, null);
        expect(p11Only.length).toBe(2);

        const p11W1Only = filterSafeSheetsByPeriodAndWeek(all, 11, 1);
        expect(p11W1Only.length).toBe(1);
        expect(p11W1Only[0].id).toBe('safe_01');
    });
});
