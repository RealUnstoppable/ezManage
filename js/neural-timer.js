/**
 * ezManage Intelligent Neural / Heuristic Task & Shift Timer Engine
 * Replaces naive continuous timers with activity-aware velocity tracking,
 * shift context detection, rush-hour filtering, and smart shift auto-closing.
 */

export class NeuralTimerEngine {
    constructor(options = {}) {
        this.shiftStartTime = null;
        this.accumulatedShiftMs = 0;
        this.isShiftRunning = false;
        this.pausedAt = null;

        // Current Shift Context
        this.shiftContext = this.detectShiftContext(options.now ? new Date(options.now) : new Date());

        // Sub-Task Velocity Tracking
        this.currentSubtask = null; // 'inventory' | 'cash' | 'routine' | 'stats'
        this.subtaskStartTime = null;
        this.subtaskLastActiveTime = null;
        this.subtaskInteractionCount = 0;
        this.subtaskSegments = []; // completed segments: { subtask, durationMs, isRushLookup, startTime, endTime, interactions }

        // Thresholds
        this.INACTIVITY_THRESHOLD_MS = options.inactivityThresholdMs || (9 * 60 * 1000); // 9 minutes
        this.RUSH_LOOKUP_THRESHOLD_MS = options.rushThresholdMs || (45 * 1000); // 45 seconds
        this.AUTO_CLOSE_GRACE_MS = options.autoCloseGraceMs || (15 * 60 * 1000); // 15 mins past scheduled off-time

        this.scheduledOffTime = options.scheduledOffTime || null; // e.g. '16:00' or Date
        this.lastOverallActiveTime = Date.now();
        this.onAutoClose = options.onAutoClose || null;
    }

    detectShiftContext(date = new Date()) {
        const hours = date.getHours();
        if (hours >= 7 && hours < 11) {
            return {
                type: 'Opening',
                name: 'Opening Shift (8:00 AM – 11:00 AM)',
                expectedDurationMins: 180,
                defaultOffTime: '11:00'
            };
        } else if (hours >= 11 && hours < 16) {
            return {
                type: 'Mid',
                name: 'Mid / Day Shift (11:00 AM – 4:00 PM)',
                expectedDurationMins: 300,
                defaultOffTime: '16:00'
            };
        } else {
            return {
                type: 'Closing',
                name: 'Closing Shift (4:00 PM – 12:00 AM)',
                expectedDurationMins: 480,
                defaultOffTime: '00:00'
            };
        }
    }

    startTimer(now = Date.now()) {
        if (this.isShiftRunning) return;
        this.isShiftRunning = true;
        this.shiftStartTime = now;
        this.pausedAt = null;
        this.lastOverallActiveTime = now;
    }

    pauseTimer(now = Date.now()) {
        if (!this.isShiftRunning) return;
        this.accumulatedShiftMs += Math.max(0, now - this.shiftStartTime);
        this.isShiftRunning = false;
        this.pausedAt = now;
        this.lastOverallActiveTime = now;

        // Also close any currently open sub-task window at pause time
        this.closeSubtaskWindow(now);
    }

    stopTimer(now = Date.now()) {
        if (this.isShiftRunning) {
            this.accumulatedShiftMs += Math.max(0, now - this.shiftStartTime);
            this.isShiftRunning = false;
        }
        this.shiftStartTime = null;
        this.pausedAt = null;
        this.closeSubtaskWindow(now);
        return this.accumulatedShiftMs;
    }

    getElapsedShiftMs(now = Date.now()) {
        if (!this.isShiftRunning) {
            return this.accumulatedShiftMs;
        }
        return this.accumulatedShiftMs + Math.max(0, now - this.shiftStartTime);
    }

    getFormattedElapsedTime(now = Date.now()) {
        const totalMs = this.getElapsedShiftMs(now);
        const totalSecs = Math.floor(totalMs / 1000);
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    recordInteraction(subtaskName, now = Date.now()) {
        this.lastOverallActiveTime = now;

        // Auto-start timer on first user interaction if stopped
        if (!this.isShiftRunning && this.accumulatedShiftMs === 0) {
            this.startTimer(now);
        }

        // Check if switching subtasks or inactive > 9 minutes in the current subtask
        if (this.currentSubtask) {
            const timeSinceLastSubtaskAction = now - this.subtaskLastActiveTime;
            if (this.currentSubtask !== subtaskName || timeSinceLastSubtaskAction > this.INACTIVITY_THRESHOLD_MS) {
                // Close previous subtask window at its last active timestamp
                this.closeSubtaskWindow(this.subtaskLastActiveTime);
            }
        }

        // Start new subtask window if none is open
        if (!this.currentSubtask) {
            this.currentSubtask = subtaskName;
            this.subtaskStartTime = now;
            this.subtaskLastActiveTime = now;
            this.subtaskInteractionCount = 1;
        } else {
            this.subtaskLastActiveTime = now;
            this.subtaskInteractionCount++;
        }
    }

    closeSubtaskWindow(endTime = Date.now()) {
        if (!this.currentSubtask || !this.subtaskStartTime) return;

        const actualEnd = Math.max(this.subtaskStartTime, endTime);
        const durationMs = actualEnd - this.subtaskStartTime;
        const isRushLookup = (this.subtaskInteractionCount <= 2 && durationMs < this.RUSH_LOOKUP_THRESHOLD_MS);

        this.subtaskSegments.push({
            subtask: this.currentSubtask,
            startTime: this.subtaskStartTime,
            endTime: actualEnd,
            durationMs,
            interactionCount: this.subtaskInteractionCount,
            isRushLookup
        });

        this.currentSubtask = null;
        this.subtaskStartTime = null;
        this.subtaskLastActiveTime = null;
        this.subtaskInteractionCount = 0;
    }

    getSubtaskMetrics() {
        const metrics = {};
        this.subtaskSegments.forEach(seg => {
            if (!metrics[seg.subtask]) {
                metrics[seg.subtask] = {
                    totalDurationMs: 0,
                    activeCountingMs: 0,
                    rushLookupCount: 0,
                    segmentCount: 0,
                    interactionCount: 0
                };
            }
            const m = metrics[seg.subtask];
            m.totalDurationMs += seg.durationMs;
            m.segmentCount++;
            m.interactionCount += seg.interactionCount;
            if (seg.isRushLookup) {
                m.rushLookupCount++;
            } else {
                m.activeCountingMs += seg.durationMs;
            }
        });
        return metrics;
    }

    checkSmartAutoClose(now = Date.now()) {
        if (!this.isShiftRunning) return false;

        const offTimeStr = this.scheduledOffTime || this.shiftContext.defaultOffTime;
        const [offH, offM] = offTimeStr.split(':').map(Number);

        const scheduledDate = new Date(now);
        scheduledDate.setHours(offH, offM, 0, 0);

        // If closing shift crosses midnight (e.g. 00:00)
        if (offH === 0 && scheduledDate.getTime() < this.shiftStartTime) {
            scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        const scheduledOffTimeMs = scheduledDate.getTime();
        const inactiveMs = now - this.lastOverallActiveTime;

        // If current time is past scheduled off time AND user has been inactive past grace period
        if (now > scheduledOffTimeMs && inactiveMs > this.AUTO_CLOSE_GRACE_MS) {
            // Auto close at the last active timestamp or scheduled off time (whichever is earlier)
            const autoCloseTimestamp = Math.min(this.lastOverallActiveTime, scheduledOffTimeMs);
            this.stopTimer(autoCloseTimestamp);

            if (typeof this.onAutoClose === 'function') {
                this.onAutoClose({
                    autoCloseTimestamp,
                    totalDurationMs: this.accumulatedShiftMs,
                    reason: 'Scheduled shift end reached with sustained inactivity.'
                });
            }
            return true;
        }
        return false;
    }
}

if (typeof window !== 'undefined') {
    window.NeuralTimerEngine = NeuralTimerEngine;
}
