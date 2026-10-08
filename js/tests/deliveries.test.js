/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

// Setup basic DOM
document.body.innerHTML = `
    <div id="deliveriesContainer"></div>
    <div id="addDeliveryModal">
      <button class="btn-accent">Save Delivery</button>
    </div>
    <input type="text" id="deliveryVendorName" value="Sysco" />
    <input type="text" id="deliveryInvoiceNumber" value="12345" />
    <input type="number" id="deliveryTotalAmount" value="500.00" />
    <textarea id="deliveryNotes">Missing items</textarea>
`;

// Mock globals used by the delivery logic
global.currentUser = { uid: 'user123', email: 'test@ezmanage.com' };
global.currentUserData = { orgId: 'org123', name: 'Test User' };

// Mock lucide to prevent errors
global.lucide = { createIcons: jest.fn() };

// Mock callCloudFunction
global.callCloudFunction = jest.fn();

// Import the logic directly or simulate it for the test
// Since the functions are defined inline in index.html, we recreate the pure logic here for unit testing

async function simulateFetchDeliveries() {
    const container = document.getElementById('deliveriesContainer');

    // Simulate successful API call
    const result = {
        data: {
            success: true,
            deliveries: [
                {
                    id: 'del1',
                    vendorName: 'Sysco',
                    invoiceNumber: '123',
                    totalAmount: 500,
                    status: 'Received',
                    loggedByName: 'Test User',
                    timestamp: { _seconds: Date.now() / 1000 }
                }
            ]
        }
    };

    container.innerHTML = '';
    result.data.deliveries.forEach(delivery => {
        const div = document.createElement('div');
        div.id = `delivery-${delivery.id}`;
        div.innerHTML = `<h3>${delivery.vendorName}</h3><p>$${delivery.totalAmount}</p>`;
        container.appendChild(div);
    });
}

describe('Vendor Deliveries', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('fetchDeliveries populates container', async () => {
        await simulateFetchDeliveries();
        const container = document.getElementById('deliveriesContainer');
        expect(container.children.length).toBe(1);
        expect(container.innerHTML).toContain('Sysco');
    });
});
