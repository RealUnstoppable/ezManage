import { TextEncoder, TextDecoder } from 'util';
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { jsPDF } = req('jspdf');
globalThis.jspdf = { jsPDF };

import { generateShiftPDF } from '../shift-pdf.js';

describe('Shift Report Direct PDF Generator', () => {
    test('should generate a branded PDF document with all required shift sections', async () => {
        const dummyState = {
            id: 'shift_test_999',
            dateSaved: '2026-11-02',
            timeSaved: '04:30 PM',
            manager: 'Sarah Connor',
            durationMins: 450,
            safeCount: '$1,120.00',
            changeNeeded: '$100 in $5 bills, $20 in quarters',
            drawers: [
                { name: 'Register 1', val: '100.00', res: 'Balanced' },
                { name: 'Register 2', val: '98.50', res: '$1.50 Short' }
            ],
            deposits: [
                { val: '1250.00', ver: true, verTimestamp: '2026-11-02T16:00:00Z', valCheck: true, valTimestamp: '2026-11-02T16:05:00Z' }
            ],
            routines: [
                { name: 'Sanitize food contact surfaces', checked: true },
                { name: 'Verify cooler temperatures', checked: true },
                { name: 'Empty grease traps', checked: false }
            ],
            beefCook: '42 cases',
            beefTempered: '18 cases',
            laborVariance: '-1.2%',
            prepNotes: 'Dinner rush volume was high; prepped extra stock.',
            inventory: [
                { name: 'Brioche Buns', bl: '20', cl: '40', fr: '100' },
                { name: 'Ground Beef 80/20', bl: '12', cl: '24', fr: '80' }
            ]
        };

        const result = await generateShiftPDF(dummyState, { returnDocOnly: true });
        expect(result).toBeDefined();
        expect(result.doc).toBeDefined();
        expect(result.filename).toContain('Sarah_Connor');
        expect(result.totalPages).toBeGreaterThanOrEqual(1);

        const pdfOutput = result.doc.output();
        expect(typeof pdfOutput).toBe('string');
        expect(pdfOutput.length).toBeGreaterThan(1000);
    });
});
