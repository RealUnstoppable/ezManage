import { calculateCartTotal } from '../shop.js';

describe('calculateCartTotal', () => {
    const mockProductMap = {
        'prod1': { id: 'prod1', price: 10.00 },
        'prod2': { id: 'prod2', price: 25.50 },
        'prod3': { id: 'prod3', price: 5.00 },
    };

    it('should return 0 for an empty cart', () => {
        const cartData = {};
        const total = calculateCartTotal(cartData, mockProductMap);
        expect(total).toBe(0);
    });

    it('should calculate the correct total for a cart with items', () => {
        const cartData = {
            'prod1': 2, // 20.00
            'prod2': 1, // 25.50
        };
        const total = calculateCartTotal(cartData, mockProductMap);
        expect(total).toBe(45.50);
    });

    it('should ignore products not found in the product map', () => {
        const cartData = {
            'prod1': 1, // 10.00
            'missing-prod': 3, // should be ignored
        };
        const total = calculateCartTotal(cartData, mockProductMap);
        expect(total).toBe(10.00);
    });

    it('should calculate the total correctly with multiple items and quantities', () => {
        const cartData = {
            'prod1': 3, // 30.00
            'prod2': 2, // 51.00
            'prod3': 5, // 25.00
        };
        const total = calculateCartTotal(cartData, mockProductMap);
        expect(total).toBe(106.00);
    });

    it('should handle zero quantities correctly', () => {
        const cartData = {
            'prod1': 0, // 0.00
            'prod2': 1, // 25.50
        };
        const total = calculateCartTotal(cartData, mockProductMap);
        expect(total).toBe(25.50);
    });
});
