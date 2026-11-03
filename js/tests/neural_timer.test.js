import { NeuralTimerEngine } from '../neural-timer.js';

describe('Neural / Heuristic Task & Shift Timer Engine', () => {
    test('should track wall-clock time accurately across start, pause, and resume without drift or skipping', () => {
        const engine = new NeuralTimerEngine();
        const t0 = 1000000;

        engine.startTimer(t0);
        expect(engine.isShiftRunning).toBe(true);
        expect(engine.getElapsedShiftMs(t0 + 5000)).toBe(5000);

        // Pause after 10 seconds
        engine.pauseTimer(t0 + 10000);
        expect(engine.isShiftRunning).toBe(false);
        expect(engine.getElapsedShiftMs(t0 + 15000)).toBe(10000); // Does not tick while paused

        // Resume at t0 + 20000
        engine.startTimer(t0 + 20000);
        expect(engine.isShiftRunning).toBe(true);

        // Check at t0 + 25000 -> 10000 + 5000 = 15000 ms
        expect(engine.getElapsedShiftMs(t0 + 25000)).toBe(15000);
        expect(engine.getFormattedElapsedTime(t0 + 25000)).toBe('00:00:15');

        engine.stopTimer(t0 + 30000);
        expect(engine.isShiftRunning).toBe(false);
        expect(engine.getElapsedShiftMs(t0 + 40000)).toBe(20000);
    });

    test('should classify shift context into Opening, Mid/Day, and Closing based on time of day', () => {
        const morning = new Date('2026-11-02T08:30:00');
        const mid = new Date('2026-11-02T13:00:00');
        const night = new Date('2026-11-02T19:00:00');

        const engine = new NeuralTimerEngine();
        expect(engine.detectShiftContext(morning).type).toBe('Opening');
        expect(engine.detectShiftContext(mid).type).toBe('Mid');
        expect(engine.detectShiftContext(night).type).toBe('Closing');
    });

    test('should automatically track sub-task velocity windows and close at last active timestamp upon 9-minute inactivity', () => {
        const engine = new NeuralTimerEngine({
            inactivityThresholdMs: 9 * 60 * 1000 // 9 mins
        });

        const t0 = 1000000;
        // User starts counting inventory
        engine.recordInteraction('inventory', t0);
        engine.recordInteraction('inventory', t0 + 60000); // 1 min in
        engine.recordInteraction('inventory', t0 + 120000); // 2 mins in (last active time)

        // 10 minutes pass with no activity (> 9 min threshold), then user touches cash register
        const tSwitch = t0 + 120000 + (10 * 60 * 1000);
        engine.recordInteraction('cash', tSwitch);

        // The inventory window should have closed at its last active timestamp (t0 + 120000, duration 2 mins)
        expect(engine.subtaskSegments.length).toBe(1);
        const invSeg = engine.subtaskSegments[0];
        expect(invSeg.subtask).toBe('inventory');
        expect(invSeg.durationMs).toBe(120000);
        expect(invSeg.isRushLookup).toBe(false);

        // Current subtask is now cash
        expect(engine.currentSubtask).toBe('cash');
    });

    test('should filter out rush-hour single lookups (<= 2 interactions under 45s) from active velocity metrics', () => {
        const engine = new NeuralTimerEngine({
            rushThresholdMs: 45 * 1000
        });

        const t0 = 1000000;
        // Manager quickly checks a single inventory item during a rush (2 interactions in 15 seconds)
        engine.recordInteraction('inventory', t0);
        engine.recordInteraction('inventory', t0 + 15000);

        // Switched to cash register right away
        engine.recordInteraction('cash', t0 + 20000);

        expect(engine.subtaskSegments.length).toBe(1);
        const rushSeg = engine.subtaskSegments[0];
        expect(rushSeg.isRushLookup).toBe(true);
        expect(rushSeg.durationMs).toBe(15000);

        const metrics = engine.getSubtaskMetrics();
        expect(metrics.inventory.rushLookupCount).toBe(1);
        expect(metrics.inventory.activeCountingMs).toBe(0); // Excluded from deep counting velocity
    });

    test('should trigger smart shift auto-close when inactivity exceeds threshold past scheduled off-time', () => {
        let autoClosedPayload = null;
        const engine = new NeuralTimerEngine({
            scheduledOffTime: '16:00',
            autoCloseGraceMs: 15 * 60 * 1000, // 15 mins
            onAutoClose: (payload) => { autoClosedPayload = payload; }
        });

        const shiftStart = new Date('2026-11-02T11:00:00').getTime();
        engine.startTimer(shiftStart);

        // Active interaction at 3:55 PM
        const lastActive = new Date('2026-11-02T15:55:00').getTime();
        engine.recordInteraction('cash', lastActive);

        // At 4:05 PM (5 mins past 4:00 PM scheduled off-time, < 15 min grace): should NOT auto-close yet
        const check1 = new Date('2026-11-02T16:05:00').getTime();
        expect(engine.checkSmartAutoClose(check1)).toBe(false);
        expect(engine.isShiftRunning).toBe(true);

        // At 4:20 PM (20 mins past scheduled off-time, 25 mins since last active): auto-close fires!
        const check2 = new Date('2026-11-02T16:20:00').getTime();
        expect(engine.checkSmartAutoClose(check2)).toBe(true);
        expect(engine.isShiftRunning).toBe(false);
        expect(autoClosedPayload).not.toBeNull();
        expect(autoClosedPayload.autoCloseTimestamp).toBeLessThanOrEqual(new Date('2026-11-02T16:00:00').getTime());
    });
});
