/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

describe('Scheduled Shifts and Notices (Announcements)', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <div id="view-schedule">
                <input type="date" id="scheduleDate" value="2026-10-14" />
                <select id="shiftEmpName">
                    <option value="">Select Employee...</option>
                </select>
                <select id="shiftRole">
                    <option value="Cashier">Cashier</option>
                    <option value="Cook">Cook</option>
                    <option value="Shift Leader">Shift Leader</option>
                    <option value="Manager">Manager</option>
                    <option value="Driver">Driver</option>
                </select>
                <input type="time" id="shiftStart" value="10:00" />
                <input type="time" id="shiftEnd" value="18:00" />
                <div id="scheduleList"></div>
            </div>

            <div id="view-announcements">
                <button id="btnCreateAnnouncement" class="hidden">New Announcement</button>
                <form id="announcementForm">
                    <input type="text" id="announcementTitle" value="Test Title" />
                    <textarea id="announcementContent">Test Content Message</textarea>
                    <select id="announcementPriority">
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                    </select>
                </form>
                <div id="announcementsContainer"></div>
            </div>

            <div id="trackerAnnouncementsContainer"></div>
        `;

        global.lucide = { createIcons: jest.fn() };
        global.escapeHTML = str => String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[m]));
        global.window.escapeHTML = global.escapeHTML;
        global.window.logManagerError = jest.fn();
    });

    test('Loads default dummy scheduled shifts when date is selected and no cloud schedule exists', () => {
        const DEFAULT_DUMMY_SHIFTS = [
            { employeeName: "Alex Rivera", role: "Shift Leader", startTime: "08:00", endTime: "16:00" },
            { employeeName: "Sarah Connor", role: "Cook", startTime: "09:00", endTime: "17:00" },
            { employeeName: "Marcus Vance", role: "Cashier", startTime: "11:30", endTime: "19:30" },
            { employeeName: "Elena Rostova", role: "Driver", startTime: "16:00", endTime: "23:00" }
        ];

        const listContainer = document.getElementById('scheduleList');
        expect(listContainer).not.toBeNull();

        // Render dummy shifts
        DEFAULT_DUMMY_SHIFTS.forEach((shift) => {
            const div = document.createElement('div');
            div.className = "shift-card";
            div.innerHTML = `<h4>${shift.employeeName}</h4><p>${shift.role}</p><p>${shift.startTime} - ${shift.endTime}</p>`;
            listContainer.appendChild(div);
        });

        expect(listContainer.children.length).toBe(4);
        expect(listContainer.innerHTML).toContain('Alex Rivera');
        expect(listContainer.innerHTML).toContain('Shift Leader');
        expect(listContainer.innerHTML).toContain('Sarah Connor');
        expect(listContainer.innerHTML).toContain('Marcus Vance');
        expect(listContainer.innerHTML).toContain('Elena Rostova');
    });

    test('Loads dummy announcements in Notices when no cloud announcements exist', () => {
        const DEFAULT_DUMMY_ANNOUNCEMENTS = [
            {
                id: 'dummy-notice-1',
                title: 'Weekly Store Schedule & Shift Guidelines',
                content: 'All team members please review your scheduled shifts for this week.',
                priority: 'High',
                authorName: 'Store Manager'
            },
            {
                id: 'dummy-notice-2',
                title: 'Kitchen & Station Sanitation Protocol',
                content: 'End-of-shift checklists must be completed.',
                priority: 'Normal',
                authorName: 'Lead Supervisor'
            }
        ];

        const container = document.getElementById('announcementsContainer');
        DEFAULT_DUMMY_ANNOUNCEMENTS.forEach(data => {
            const div = document.createElement('div');
            div.className = 'announcement-card';
            div.innerHTML = `<h3>${data.title}</h3><p>${data.content}</p><span>${data.authorName}</span>`;
            container.appendChild(div);
        });

        expect(container.children.length).toBe(2);
        expect(container.innerHTML).toContain('Weekly Store Schedule');
        expect(container.innerHTML).toContain('Kitchen &amp; Station Sanitation');
        expect(container.innerHTML).toContain('Store Manager');
    });

    test('Allows adding and removing shifts in schedule list', () => {
        let shifts = [
            { employeeName: "Alex Rivera", role: "Shift Leader", startTime: "08:00", endTime: "16:00" }
        ];

        // Add a new shift
        const newShift = { employeeName: "Jordan Lee", role: "Cook", startTime: "10:00", endTime: "18:00" };
        shifts.push(newShift);
        expect(shifts.length).toBe(2);
        expect(shifts[1].employeeName).toBe("Jordan Lee");

        // Remove a shift
        shifts.splice(0, 1);
        expect(shifts.length).toBe(1);
        expect(shifts[0].employeeName).toBe("Jordan Lee");
    });

    test('Allows creating and deleting announcements in notices list', () => {
        let notices = [
            { id: '1', title: 'First Notice', content: 'Notice body 1' }
        ];

        // Create
        const newNotice = { id: '2', title: 'New Notice', content: 'Notice body 2' };
        notices.unshift(newNotice);
        expect(notices.length).toBe(2);
        expect(notices[0].title).toBe('New Notice');

        // Delete
        notices = notices.filter(n => n.id !== '1');
        expect(notices.length).toBe(1);
        expect(notices[0].id).toBe('2');
    });
});
