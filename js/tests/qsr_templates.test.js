import {
    QSR_TEMPLATES,
    getQSRTemplates,
    getQSRTemplateById,
    searchAndSortTemplates,
    getServSafeStandards
} from '../qsr-templates.js';

describe('Multi-Chain QSR Templates & ServSafe Standards Engine', () => {

    test('should provide templates for all 14 major QSR chains', () => {
        const templates = getQSRTemplates();
        expect(templates).toHaveLength(14);

        const expectedIds = [
            'arbys', 'chickfila', 'mcdonalds', 'papajohns', 'wendys',
            'tacobell', 'burgerking', 'chipotle', 'zaxbys', 'subway',
            'starbucks', 'dominos', 'culvers', 'panera'
        ];

        expectedIds.forEach(id => {
            const found = templates.find(t => t.id === id);
            expect(found).toBeDefined();
            expect(found.inventory.length).toBeGreaterThan(5);
            expect(found.routines.length).toBeGreaterThan(5);
            expect(found.drawers.length).toBeGreaterThan(0);
        });
    });

    test('should expand Arby\'s routine to include comprehensive real-world ServSafe checkpoints', () => {
        const arbys = getQSRTemplateById('arbys');
        expect(arbys).toBeDefined();

        const routines = arbys.routines.join(' | ');

        // Check required critical checkpoints
        expect(routines).toContain('Walk-In Cooler/Freezer Temps (below 40°F / 0°F)');
        expect(routines).toContain('Hot Holding Line Temps (above 135°F)');
        expect(routines).toContain('Roast Beef Slicer Sanitization (4-Hour Cycle)');
        expect(routines).toContain('Quat/Chlorine Sanitizer Bucket PPM Test');
        expect(routines).toContain('FIFO Date Marking & 7-Day Discard Audit');
        expect(routines).toContain('Handwashing Sink Soap/Towel Stock & 100°F Water');
        expect(routines).toContain('Raw vs. Ready-to-Eat Cross-Contamination Check');
        expect(routines).toContain('Ice Machine Chute & Scoop Sanitization');
        expect(routines).toContain('Hood Vent / Ansul System Visual Check');
    });

    test('should include authentic brand-specific checkpoints for Chick-fil-A', () => {
        const cfa = getQSRTemplateById('chickfila');
        expect(cfa).toBeDefined();

        const routines = cfa.routines.join(' | ');
        expect(routines).toContain('Pressure Fryer Filtration');
        expect(routines).toContain('Kanban Warming Chute Holding Temps');
        expect(routines).toContain('Fresh Lemon Squeezing');
        expect(routines).toContain('Dining Room');
        expect(routines).toContain('Hospitality');
    });

    test('should include authentic brand-specific checkpoints for McDonald\'s', () => {
        const mcd = getQSRTemplateById('mcdonalds');
        expect(mcd).toBeDefined();

        const routines = mcd.routines.join(' | ');
        expect(routines).toContain('Clamshell Grill Platen Calibration');
        expect(routines).toContain('Taylor Shake / McFlurry Daily Heat-Treat Cycle');
        expect(routines).toContain('Universal Holding Cabinet (UHC) Timers');
        expect(routines).toContain('Drive-Thru Pull Bays');
    });

    test('should include authentic brand-specific checkpoints for Papa Johns', () => {
        const pj = getQSRTemplateById('papajohns');
        expect(pj).toBeDefined();

        const routines = pj.routines.join(' | ');
        expect(routines).toContain('Dough Proofing Temperature & Tray Rotation');
        expect(routines).toContain('Makeline Refrigerated Rail Temps');
        expect(routines).toContain('Oven Conveyor Speed & Bake Temp');
        expect(routines).toContain('Driver Dispatch Lockbox Audit & Driver Bank Cash Drop Limit');
    });

    test('should accurately search and filter templates by keyword', () => {
        // Search by brand name
        const chipotleMatches = searchAndSortTemplates(QSR_TEMPLATES, 'Chipotle');
        expect(chipotleMatches).toHaveLength(1);
        expect(chipotleMatches[0].id).toBe('chipotle');

        // Search by keyword in inventory
        const waffleMatches = searchAndSortTemplates(QSR_TEMPLATES, 'Waffle');
        expect(waffleMatches.some(t => t.id === 'chickfila')).toBe(true);

        // Search by keyword in routines
        const slicerMatches = searchAndSortTemplates(QSR_TEMPLATES, 'Slicer');
        expect(slicerMatches.some(t => t.id === 'arbys')).toBe(true);
        expect(slicerMatches.some(t => t.id === 'subway')).toBe(true);
    });

    test('should sort templates alphabetically (A-Z) and by popularity/recent', () => {
        const alphaSorted = searchAndSortTemplates(QSR_TEMPLATES, '', 'alpha');
        expect(alphaSorted[0].name).toBe("Arby's");
        expect(alphaSorted[1].name).toBe("Burger King");
        expect(alphaSorted[2].name).toBe("Chick-fil-A");

        const popSorted = searchAndSortTemplates(QSR_TEMPLATES, '', 'recent');
        expect(popSorted[0].id).toBe('arbys');
        expect(popSorted[1].id).toBe('chickfila');
        expect(popSorted[2].id).toBe('mcdonalds');
    });

    test('should provide complete ServSafe standards including danger zone, cooling, and PPMs', () => {
        const standards = getServSafeStandards();

        // Danger zone
        expect(standards.dangerZone.minF).toBe(41);
        expect(standards.dangerZone.maxF).toBe(135);

        // Cooling rules
        expect(standards.coolingRules.stage1).toContain('135°F down to 70°F within 2 hours');
        expect(standards.coolingRules.stage2).toContain('70°F down to 41°F or lower within an additional 4 hours');
        expect(standards.coolingRules.totalMaxHours).toBe(6);

        // Sanitizer PPMs
        const quat = standards.sanitizerPPM.find(s => s.chemical.includes('Quat'));
        expect(quat).toBeDefined();
        expect(quat.targetRange).toBe('200 – 400 PPM');

        const chlorine = standards.sanitizerPPM.find(s => s.chemical.includes('Chlorine'));
        expect(chlorine).toBeDefined();
        expect(chlorine.targetRange).toBe('50 – 100 PPM');

        // External links
        const servSafeUrl = standards.externalResources.find(r => r.name.includes('ServSafe'));
        expect(servSafeUrl.url).toBe('https://www.servsafe.com/');
    });
});
