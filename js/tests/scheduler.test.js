import {
    timeToMinutes,
    validateShiftTime,
    validateShiftData,
    hasShiftConflict,
    calculateShiftDurationHours,
    calculateTotalScheduleHours,
    addShiftToList,
    removeShiftFromList,
    DEFAULT_DUMMY_SHIFTS
} from '../scheduler.js';

describe('ezManage Shift Scheduling Engine', () => {
    describe('timeToMinutes', () => {
        it('should correctly parse 24-hour time strings to minutes', () => {
            expect(timeToMinutes("00:00")).toBe(0);
            expect(timeToMinutes("08:30")).toBe(510);
            expect(timeToMinutes("16:45")).toBe(1005);
            expect(timeToMinutes("23:59")).toBe(1439);
        });

        it('should return -1 for invalid time formats or values', () => {
            expect(timeToMinutes("")).toBe(-1);
            expect(timeToMinutes(null)).toBe(-1);
            expect(timeToMinutes("24:00")).toBe(-1);
            expect(timeToMinutes("12:60")).toBe(-1);
            expect(timeToMinutes("abc")).toBe(-1);
            expect(timeToMinutes("10:00:00")).toBe(-1);
        });
    });

    describe('validateShiftTime', () => {
        it('should accept valid start and end times', () => {
            const result = validateShiftTime("09:00", "17:00");
            expect(result.valid).toBe(true);
        });

        it('should reject when start time is equal to or after end time', () => {
            expect(validateShiftTime("17:00", "09:00").valid).toBe(false);
            expect(validateShiftTime("12:00", "12:00").valid).toBe(false);
        });

        it('should reject shifts shorter than 30 minutes', () => {
            const result = validateShiftTime("09:00", "09:15");
            expect(result.valid).toBe(false);
            expect(result.error).toContain("at least 30 minutes");
        });

        it('should reject shifts longer than 16 consecutive hours', () => {
            const result = validateShiftTime("06:00", "23:00");
            expect(result.valid).toBe(false);
            expect(result.error).toContain("cannot exceed 16 consecutive hours");
        });
    });

    describe('validateShiftData', () => {
        it('should validate and sanitize correct shift data', () => {
            const shift = {
                employeeName: "  Alex Rivera  ",
                role: "Shift Leader",
                startTime: "08:00",
                endTime: "16:00"
            };
            const result = validateShiftData(shift);
            expect(result.valid).toBe(true);
            expect(result.sanitized.employeeName).toBe("Alex Rivera");
            expect(result.sanitized.role).toBe("Shift Leader");
        });

        it('should reject shifts with missing employee name or role', () => {
            expect(validateShiftData({ role: "Cook", startTime: "08:00", endTime: "16:00" }).valid).toBe(false);
            expect(validateShiftData({ employeeName: "Sarah", startTime: "08:00", endTime: "16:00" }).valid).toBe(false);
        });

        it('should escape HTML in employee name and role to prevent XSS', () => {
            const shift = {
                employeeName: '<script>alert("hacked")</script>Marcus',
                role: '<b>Cashier</b>',
                startTime: "10:00",
                endTime: "18:00"
            };
            const result = validateShiftData(shift);
            expect(result.valid).toBe(true);
            expect(result.sanitized.employeeName).toContain('&lt;script&gt;');
            expect(result.sanitized.role).toContain('&lt;b&gt;');
        });
    });

    describe('hasShiftConflict (Overlap Detection)', () => {
        const existingShifts = [
            { employeeName: "Sarah Connor", role: "Cook", startTime: "09:00", endTime: "15:00" },
            { employeeName: "Marcus Vance", role: "Cashier", startTime: "10:00", endTime: "18:00" }
        ];

        it('should detect when the same employee is double booked with overlapping hours', () => {
            // Partially overlapping shift (12:00 - 18:00 overlaps with 09:00 - 15:00)
            const overlapShift = { employeeName: "Sarah Connor", startTime: "12:00", endTime: "18:00" };
            const conflict = hasShiftConflict(existingShifts, overlapShift);
            expect(conflict.hasConflict).toBe(true);
            expect(conflict.conflictingShift.employeeName).toBe("Sarah Connor");
        });

        it('should allow non-overlapping shifts for the same employee', () => {
            // Evening shift (16:00 - 22:00 does NOT overlap with 09:00 - 15:00)
            const eveningShift = { employeeName: "Sarah Connor", startTime: "16:00", endTime: "22:00" };
            const conflict = hasShiftConflict(existingShifts, eveningShift);
            expect(conflict.hasConflict).toBe(false);
        });

        it('should allow simultaneous shifts for different employees', () => {
            const otherEmpShift = { employeeName: "Elena Rostova", startTime: "09:00", endTime: "15:00" };
            const conflict = hasShiftConflict(existingShifts, otherEmpShift);
            expect(conflict.hasConflict).toBe(false);
        });
    });

    describe('calculateShiftDurationHours & calculateTotalScheduleHours', () => {
        it('should calculate individual shift durations accurately', () => {
            expect(calculateShiftDurationHours("08:00", "16:30")).toBe(8.5);
            expect(calculateShiftDurationHours("09:00", "17:00")).toBe(8);
            expect(calculateShiftDurationHours("12:00", "12:45")).toBe(0.75);
        });

        it('should calculate total schedule hours for a team', () => {
            const shifts = [
                { startTime: "08:00", endTime: "16:00" }, // 8 hours
                { startTime: "09:00", endTime: "17:30" }, // 8.5 hours
                { startTime: "10:00", endTime: "14:00" }, // 4 hours
            ];
            expect(calculateTotalScheduleHours(shifts)).toBe(20.5);
        });
    });

    describe('addShiftToList & removeShiftFromList', () => {
        it('should add a valid shift and sort chronologically', () => {
            const initial = [
                { employeeName: "Sarah Connor", role: "Cook", startTime: "14:00", endTime: "22:00" }
            ];
            const newShift = {
                employeeName: "Alex Rivera",
                role: "Leader",
                startTime: "07:00",
                endTime: "15:00"
            };

            const result = addShiftToList(initial, newShift);
            expect(result.success).toBe(true);
            expect(result.shifts.length).toBe(2);
            // 07:00 shift should be first
            expect(result.shifts[0].employeeName).toBe("Alex Rivera");
            expect(result.shifts[1].employeeName).toBe("Sarah Connor");
        });

        it('should block adding a shift that causes a schedule conflict', () => {
            const initial = [
                { employeeName: "Marcus Vance", role: "Cashier", startTime: "10:00", endTime: "18:00" }
            ];
            const conflicting = {
                employeeName: "Marcus Vance",
                role: "Cashier",
                startTime: "12:00",
                endTime: "20:00"
            };

            const result = addShiftToList(initial, conflicting, false);
            expect(result.success).toBe(false);
            expect(result.error).toContain("Schedule conflict");
            expect(result.shifts.length).toBe(1);
        });

        it('should remove a shift at a specified index safely', () => {
            const initial = [...DEFAULT_DUMMY_SHIFTS];
            const originalLength = initial.length;

            const updated = removeShiftFromList(initial, 1);
            expect(updated.length).toBe(originalLength - 1);
            expect(updated[0].employeeName).toBe(DEFAULT_DUMMY_SHIFTS[0].employeeName);
            expect(updated[1].employeeName).toBe(DEFAULT_DUMMY_SHIFTS[2].employeeName);
        });

        it('should handle out of bounds indices gracefully', () => {
            const initial = [...DEFAULT_DUMMY_SHIFTS];
            const result = removeShiftFromList(initial, 999);
            expect(result.length).toBe(initial.length);
        });
    });
});
