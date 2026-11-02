/**
 * ezManage Shift Scheduling Logic Module
 * Provides pure business logic, validation, conflict detection,
 * and calculations for employee shifts and schedules.
 */

import { escapeHTML } from './utils.js';

export const DEFAULT_DUMMY_SHIFTS = [
    { employeeName: "Alex Rivera", role: "Shift Leader", startTime: "08:00", endTime: "16:00" },
    { employeeName: "Sarah Connor", role: "Cook", startTime: "09:00", endTime: "17:00" },
    { employeeName: "Marcus Vance", role: "Cashier", startTime: "11:30", endTime: "19:30" },
    { employeeName: "Elena Rostova", role: "Driver", startTime: "16:00", endTime: "23:00" }
];

/**
 * Converts a "HH:MM" 24-hour time string into minutes from midnight.
 * @param {string} timeStr - Time string formatted as HH:MM
 * @returns {number} Minutes from midnight (0-1439), or -1 if invalid
 */
export function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return -1;
    const parts = timeStr.trim().split(':');
    if (parts.length !== 2) return -1;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return -1;
    }
    return hours * 60 + minutes;
}

/**
 * Validates a shift's start and end times.
 * @param {string} startTime - HH:MM format
 * @param {string} endTime - HH:MM format
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateShiftTime(startTime, endTime) {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    if (startMin === -1) {
        return { valid: false, error: "Invalid start time format. Use HH:MM." };
    }
    if (endMin === -1) {
        return { valid: false, error: "Invalid end time format. Use HH:MM." };
    }
    if (startMin >= endMin) {
        return { valid: false, error: "Start time must be earlier than end time." };
    }
    if (endMin - startMin < 30) {
        return { valid: false, error: "Shift duration must be at least 30 minutes." };
    }
    if (endMin - startMin > 16 * 60) {
        return { valid: false, error: "Shift duration cannot exceed 16 consecutive hours." };
    }
    return { valid: true };
}

/**
 * Validates complete shift object data.
 * @param {Object} shift
 * @returns {{ valid: boolean, error?: string, sanitized?: Object }}
 */
export function validateShiftData(shift) {
    if (!shift || typeof shift !== 'object') {
        return { valid: false, error: "Shift payload must be an object." };
    }

    const employeeName = (shift.employeeName || '').trim();
    const role = (shift.role || '').trim();
    const startTime = (shift.startTime || '').trim();
    const endTime = (shift.endTime || '').trim();

    if (!employeeName) {
        return { valid: false, error: "Employee name is required." };
    }
    if (employeeName.length > 80) {
        return { valid: false, error: "Employee name exceeds maximum length (80 chars)." };
    }
    if (!role) {
        return { valid: false, error: "Role is required." };
    }
    if (role.length > 50) {
        return { valid: false, error: "Role exceeds maximum length (50 chars)." };
    }

    const timeValidation = validateShiftTime(startTime, endTime);
    if (!timeValidation.valid) {
        return timeValidation;
    }

    return {
        valid: true,
        sanitized: {
            employeeName: escapeHTML(employeeName),
            role: escapeHTML(role),
            startTime,
            endTime,
        }
    };
}

/**
 * Checks if a new shift conflicts (overlaps) with existing shifts for the same employee.
 * @param {Array<Object>} existingShifts
 * @param {Object} newShift
 * @param {number} [excludeIndex=-1] - Optional index of shift being edited
 * @returns {{ hasConflict: boolean, conflictingShift?: Object }}
 */
export function hasShiftConflict(existingShifts, newShift, excludeIndex = -1) {
    if (!Array.isArray(existingShifts) || !newShift) return { hasConflict: false };

    const newStart = timeToMinutes(newShift.startTime);
    const newEnd = timeToMinutes(newShift.endTime);
    const targetName = (newShift.employeeName || '').toLowerCase().trim();

    for (let i = 0; i < existingShifts.length; i++) {
        if (i === excludeIndex) continue;
        const s = existingShifts[i];
        if (!s || (s.employeeName || '').toLowerCase().trim() !== targetName) continue;

        const sStart = timeToMinutes(s.startTime);
        const sEnd = timeToMinutes(s.endTime);

        // Overlap condition: startA < endB and endA > startB
        if (newStart < sEnd && newEnd > sStart) {
            return { hasConflict: true, conflictingShift: s, index: i };
        }
    }

    return { hasConflict: false };
}

/**
 * Calculates duration in decimal hours for a shift.
 * @param {string} startTime
 * @param {string} endTime
 * @returns {number} Hours (e.g. 8.5)
 */
export function calculateShiftDurationHours(startTime, endTime) {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (startMin === -1 || endMin === -1 || endMin <= startMin) return 0;
    return parseFloat(((endMin - startMin) / 60).toFixed(2));
}

/**
 * Calculates total scheduled hours across all shifts.
 * @param {Array<Object>} shifts
 * @returns {number} Total hours
 */
export function calculateTotalScheduleHours(shifts) {
    if (!Array.isArray(shifts)) return 0;
    const total = shifts.reduce((acc, shift) => {
        return acc + calculateShiftDurationHours(shift.startTime, shift.endTime);
    }, 0);
    return parseFloat(total.toFixed(2));
}

/**
 * Pure function to add a shift to a list of shifts.
 * Returns a new array.
 * @param {Array<Object>} shifts
 * @param {Object} newShift
 * @param {boolean} [allowConflicts=false]
 * @returns {{ success: boolean, shifts: Array<Object>, error?: string }}
 */
export function addShiftToList(shifts, newShift, allowConflicts = false) {
    const validation = validateShiftData(newShift);
    if (!validation.valid) {
        return { success: false, shifts: [...shifts], error: validation.error };
    }

    const currentShifts = Array.isArray(shifts) ? [...shifts] : [];

    if (!allowConflicts) {
        const conflict = hasShiftConflict(currentShifts, validation.sanitized);
        if (conflict.hasConflict) {
            return {
                success: false,
                shifts: currentShifts,
                error: `Schedule conflict: ${validation.sanitized.employeeName} is already scheduled from ${conflict.conflictingShift.startTime} to ${conflict.conflictingShift.endTime}.`
            };
        }
    }

    currentShifts.push(validation.sanitized);
    // Sort shifts chronologically by start time
    currentShifts.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    return { success: true, shifts: currentShifts };
}

/**
 * Pure function to remove a shift from a list.
 * @param {Array<Object>} shifts
 * @param {number} index
 * @returns {Array<Object>} New array of shifts
 */
export function removeShiftFromList(shifts, index) {
    if (!Array.isArray(shifts)) return [];
    if (index < 0 || index >= shifts.length) return [...shifts];
    const updated = [...shifts];
    updated.splice(index, 1);
    return updated;
}
