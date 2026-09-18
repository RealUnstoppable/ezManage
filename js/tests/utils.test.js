/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';
import { getDayOfWeek, showToast } from '../utils.js';

describe('getDayOfWeek', () => {
    it('returns correct day for YYYY-MM-DD format', () => {
        // May 15, 2024 is a Wednesday (day 3)
        expect(getDayOfWeek('2024-05-15')).toBe(3);
        // Jan 1, 2024 is a Monday (day 1)
        expect(getDayOfWeek('2024-01-01')).toBe(1);
    });

    it('returns correct day for standard date string format', () => {
        // May 15, 2024 is a Wednesday (day 3)
        expect(getDayOfWeek('May 15, 2024')).toBe(3);
    });

    it('returns -1 for falsy inputs', () => {
        expect(getDayOfWeek('')).toBe(-1);
        expect(getDayOfWeek(null)).toBe(-1);
        expect(getDayOfWeek(undefined)).toBe(-1);
    });

    it('returns -1 for invalid date strings', () => {
        expect(getDayOfWeek('not-a-date')).toBe(-1);
        expect(getDayOfWeek('invalid')).toBe(-1);
    });

    it('returns -1 for malformed dates with hyphens', () => {
        // Parsing something that results in NaN for time
        expect(getDayOfWeek('2024-notamonth-15')).toBe(-1);
    });
});


describe('showToast', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('creates a toast and appends it to the body', () => {
        showToast('Test message');

        const toast = document.querySelector('.toast-notification');
        expect(toast).not.toBeNull();
        expect(toast.textContent).toBe('Test message');
    });

    it('adds fade-out class after 3000ms', () => {
        showToast('Test message');

        const toast = document.querySelector('.toast-notification');
        expect(toast.classList.contains('fade-out')).toBe(false);

        jest.advanceTimersByTime(3000);

        expect(toast.classList.contains('fade-out')).toBe(true);
    });

    it('removes toast from DOM after 3300ms', () => {
        showToast('Test message');

        let toast = document.querySelector('.toast-notification');
        expect(toast).not.toBeNull();

        // Advance by 3000ms (fade-out starts)
        jest.advanceTimersByTime(3000);
        toast = document.querySelector('.toast-notification');
        expect(toast).not.toBeNull();

        // Advance by remaining 300ms (removal)
        jest.advanceTimersByTime(300);
        toast = document.querySelector('.toast-notification');
        expect(toast).toBeNull();
    });
});
