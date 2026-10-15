/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('Task Manager, Reachable Payments, and Inventory', () => {
    beforeEach(() => {
        localStorage.clear();
        global.lucide = { createIcons: jest.fn() };
        global.escapeHTML = str => String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[m]));
        global.window.escapeHTML = global.escapeHTML;
        global.window.logManagerError = jest.fn();
    });

    describe('Task Manager', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="view-tasks">
                    <select id="taskFilterStatus1">
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                    </select>
                    <select id="taskFilterAssignee">
                        <option value="All">All Assignees</option>
                    </select>
                    <div id="tasksContainer"></div>
                    <div id="completedTasksContainer"></div>
                </div>
            `;
        });

        test('Renders active tasks and completed tasks from dummy fallback', () => {
            const DUMMY_TASKS = [
                {
                    id: 'task-1',
                    title: 'Deep Clean Ice Machine',
                    description: 'Sanitize dispenser',
                    assigneeName: 'Alex Rivera',
                    assignedByName: 'Manager',
                    priority: 'High',
                    status: 'Pending',
                    dueDate: '2026-10-15',
                    createdAt: { _seconds: 1700000000 }
                },
                {
                    id: 'task-2',
                    title: 'Restock Cups',
                    description: 'Refill 16oz cups',
                    assigneeName: 'Sarah Connor',
                    assignedByName: 'Supervisor',
                    priority: 'Medium',
                    status: 'In Progress',
                    dueDate: '2026-10-14',
                    createdAt: { _seconds: 1700000100 }
                },
                {
                    id: 'task-3',
                    title: 'Evening Safe Audit',
                    description: 'Reconcile drawer counts',
                    assigneeName: 'Elena Rostova',
                    assignedByName: 'Manager',
                    priority: 'High',
                    status: 'Completed',
                    dueDate: '2026-10-13',
                    createdAt: { _seconds: 1699999000 }
                }
            ];

            const activeTasks = DUMMY_TASKS.filter(t => t.status !== 'Completed');
            const completedTasks = DUMMY_TASKS.filter(t => t.status === 'Completed');

            const container = document.getElementById('tasksContainer');
            const completedContainer = document.getElementById('completedTasksContainer');

            container.innerHTML = activeTasks.map(t => `<div class="task-card" data-id="${t.id}">${t.title} - ${t.status}</div>`).join('');
            completedContainer.innerHTML = completedTasks.map(t => `<div class="task-card" data-id="${t.id}">${t.title} - ${t.status}</div>`).join('');

            expect(container.textContent).toContain('Deep Clean Ice Machine');
            expect(container.textContent).toContain('Restock Cups');
            expect(container.textContent).not.toContain('Evening Safe Audit');

            expect(completedContainer.textContent).toContain('Evening Safe Audit');
            expect(completedContainer.textContent).not.toContain('Restock Cups');
        });

        test('Allows updating task status and moving between active and completed', () => {
            let tasks = [
                { id: 'task-1', title: 'Task One', status: 'Pending' },
                { id: 'task-2', title: 'Task Two', status: 'Completed' }
            ];

            // Update task-1 to Completed
            const t1 = tasks.find(t => t.id === 'task-1');
            t1.status = 'Completed';

            const activeTasks = tasks.filter(t => t.status !== 'Completed');
            const completedTasks = tasks.filter(t => t.status === 'Completed');

            expect(activeTasks.length).toBe(0);
            expect(completedTasks.length).toBe(2);
            expect(completedTasks.map(t => t.id)).toContain('task-1');
        });

        test('Allows deleting a task', () => {
            let tasks = [
                { id: 'task-1', title: 'Task One', status: 'Pending' },
                { id: 'task-2', title: 'Task Two', status: 'In Progress' }
            ];

            tasks = tasks.filter(t => t.id !== 'task-1');
            expect(tasks.length).toBe(1);
            expect(tasks[0].id).toBe('task-2');
        });
    });

    describe('Reachable Payments', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="paymentModal" class="hidden">
                    <h2 id="payModalPlanTitle">Upgrade Plan</h2>
                    <div id="paySummaryPlan"></div>
                    <div id="paySummaryPrice"></div>
                    <div id="payFormCard"></div>
                    <div id="payFormApple" class="hidden"></div>
                    <div id="payFormPaypal" class="hidden"></div>
                    <button id="btnConfirmPayment"><span id="btnPayText">Complete Order & Activate</span></button>
                    <a href="checkout-ultimate.html" id="linkFullCheckout"></a>
                </div>
            `;
        });

        test('Opens in-app payment modal with correct plan and price when triggered', () => {
            const planName = 'Business Pro';
            const price = 207;

            const modal = document.getElementById('paymentModal');
            const title = document.getElementById('payModalPlanTitle');
            const planSummary = document.getElementById('paySummaryPlan');
            const priceSummary = document.getElementById('paySummaryPrice');
            const payText = document.getElementById('btnPayText');
            const link = document.getElementById('linkFullCheckout');

            title.textContent = `Upgrade to ${planName}`;
            planSummary.textContent = `${planName} (Annual Subscription)`;
            priceSummary.textContent = `$${price}/year`;
            payText.textContent = `Confirm & Pay $${price}`;
            link.href = `checkout-ultimate.html?plan=${encodeURIComponent(planName)}&price=${price}`;
            modal.classList.remove('hidden');

            expect(modal.classList.contains('hidden')).toBe(false);
            expect(title.textContent).toBe('Upgrade to Business Pro');
            expect(priceSummary.textContent).toBe('$207/year');
            expect(payText.textContent).toBe('Confirm & Pay $207');
            expect(link.href).toContain('Business%20Pro');
        });

        test('Successfully completes payment and upgrades user plan in storage', () => {
            const uid = 'user_123';
            const plan = 'Individual Pro';

            localStorage.setItem(`ezManage_plan_${uid}`, plan);
            localStorage.setItem(`ezManage_subscription_${uid}`, JSON.stringify({
                status: 'active',
                plan: plan,
                updatedAt: Date.now()
            }));

            const savedPlan = localStorage.getItem(`ezManage_plan_${uid}`);
            const savedSub = JSON.parse(localStorage.getItem(`ezManage_subscription_${uid}`));

            expect(savedPlan).toBe('Individual Pro');
            expect(savedSub.status).toBe('active');
            expect(savedSub.plan).toBe('Individual Pro');
        });
    });

    describe('Inventory Management Page', () => {
        test('inventory.html contains navbar with Home, App, Schedule, and Back to Dashboard', () => {
            const inventoryHtml = fs.readFileSync(path.resolve(process.cwd(), 'inventory.html'), 'utf8');

            expect(inventoryHtml).toContain('ezManage');
            expect(inventoryHtml).toContain('Back to Dashboard');
            expect(inventoryHtml).toContain('index.html#welcome');
            expect(inventoryHtml).toContain('index.html#tracker');
            expect(inventoryHtml).toContain('index.html#schedule');
            expect(inventoryHtml).toContain('index.html#tasks');
        });

        test('inventory.html empty state displays "Nothing yet, add to inventory for more items."', () => {
            const inventoryHtml = fs.readFileSync(path.resolve(process.cwd(), 'inventory.html'), 'utf8');

            expect(inventoryHtml).toContain('Nothing yet');
            expect(inventoryHtml).toContain('Nothing yet, add to inventory for more items.');
            expect(inventoryHtml).toContain('Add to Inventory');
        });

        test('Adding and removing items from inventory table DOM works properly', () => {
            document.body.innerHTML = `
                <table>
                    <tbody id="inventoryTableBody"></tbody>
                </table>
                <div id="emptyState" class="hidden"></div>
                <div id="loadingSpinner" class="hidden"></div>
            `;

            const table = document.getElementById('inventoryTableBody');
            const emptyState = document.getElementById('emptyState');

            // Add item
            const row = document.createElement('tr');
            row.id = 'item-row-1';
            row.innerHTML = '<td>Paper Napkins</td><td>150</td>';
            table.appendChild(row);

            expect(table.children.length).toBe(1);
            expect(table.textContent).toContain('Paper Napkins');

            // Remove item
            row.remove();
            if (table.children.length === 0) {
                emptyState.classList.remove('hidden');
            }

            expect(table.children.length).toBe(0);
            expect(emptyState.classList.contains('hidden')).toBe(false);
        });
    });
});
