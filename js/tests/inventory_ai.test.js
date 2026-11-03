/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import {
    RECALL_KEYWORDS,
    normalizeItemName,
    detectRecallKeywords,
    scanAnnouncementsAndNotesForRecalls,
    isItemRecalled,
    renderRecallBadgeHTML,
    indexItemToInventory,
    calculateItemMetrics,
    filterAndSortInventory,
    prepareTrackerImportPayload,
    consumePendingTrackerImport
} from '../inventory-ai.js';

describe('Inventory & AI Unified Engine Unit Tests', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    describe('Recall Keyword Detection', () => {
        test('Detects presence of standard recall and safety keywords', () => {
            expect(detectRecallKeywords('Urgent: recall on romaine lettuce').isRecall).toBe(true);
            expect(detectRecallKeywords('Do not serve batch 42 due to contamination').isRecall).toBe(true);
            expect(detectRecallKeywords('Discard all cartons immediately').isRecall).toBe(true);
            expect(detectRecallKeywords('Quality issue flagged with beef patties').isRecall).toBe(true);
            expect(detectRecallKeywords('Standard operational restock complete').isRecall).toBe(false);
        });

        test('Returns all matched recall keywords', () => {
            const res = detectRecallKeywords('Immediate safety hold and recall due to contamination');
            expect(res.isRecall).toBe(true);
            expect(res.matchedKeywords).toContain('recall');
            expect(res.matchedKeywords).toContain('contamination');
            expect(res.matchedKeywords).toContain('hold');
        });
    });

    describe('Cross-App Recall Scanner (Announcements & Shift Notes)', () => {
        const inventoryItems = [
            { itemName: 'Organic Whole Milk', quantity: 24, threshold: 5 },
            { itemName: 'Romaine Lettuce', quantity: 10, threshold: 2 },
            { itemName: 'Brioche Buns', quantity: 60, threshold: 10 }
        ];

        test('Flags inventory item when mentioned in an urgent announcement', () => {
            const announcements = [
                {
                    data: {
                        title: 'Vendor Health Warning',
                        content: 'National recall notice: do not serve Organic Whole Milk lot #908 due to quality issue.'
                    }
                }
            ];

            const recallMap = scanAnnouncementsAndNotesForRecalls(announcements, [], inventoryItems);
            expect(isItemRecalled('Organic Whole Milk', recallMap)).toBe(true);
            expect(isItemRecalled('Brioche Buns', recallMap)).toBe(false);

            const badgeHtml = renderRecallBadgeHTML('Organic Whole Milk', recallMap);
            expect(badgeHtml).toContain('RECALL / ISSUE FLAGGED');
            expect(badgeHtml).toContain('bg-rose-500/20');
        });

        test('Flags inventory item when mentioned in shift notes', () => {
            const shiftNotes = [
                {
                    data: {
                        content: 'Night shift alert: supplier reported contamination in Romaine Lettuce. Discard immediately.'
                    }
                }
            ];

            const recallMap = scanAnnouncementsAndNotesForRecalls([], shiftNotes, inventoryItems);
            expect(isItemRecalled('Romaine Lettuce', recallMap)).toBe(true);
            expect(isItemRecalled('Brioche Buns', recallMap)).toBe(false);
        });

        test('Returns empty map when no announcements contain recall keywords', () => {
            const announcements = [
                { data: { title: 'Team Meeting', content: 'Great job hitting target sales yesterday!' } }
            ];
            const shiftNotes = ['Cleaned fryers and restocked paper bags'];

            const recallMap = scanAnnouncementsAndNotesForRecalls(announcements, shiftNotes, inventoryItems);
            expect(Object.keys(recallMap).length).toBe(0);
            expect(isItemRecalled('Organic Whole Milk', recallMap)).toBe(false);
        });
    });

    describe('Cross-App Item Ingestion & Indexing', () => {
        test('Indexes newly entered manual item into local inventory storage', () => {
            const newItem = {
                itemName: 'Special Reserve Espresso Beans',
                quantity: 12,
                threshold: 3,
                addedVia: 'other'
            };

            const indexed = indexItemToInventory(newItem, 'store_001');
            expect(indexed).toBeDefined();
            expect(indexed.itemName).toBe('Special Reserve Espresso Beans');
            expect(indexed.addedVia).toBe('other');

            const stored = JSON.parse(localStorage.getItem('ezManage_inventory_store_001'));
            expect(stored).toHaveLength(1);
            expect(stored[0].itemName).toBe('Special Reserve Espresso Beans');
        });

        test('Updates existing item timestamp without creating duplicates', () => {
            indexItemToInventory({ itemName: 'Chai Tea Mix', quantity: 5 }, 'org_test');
            indexItemToInventory({ itemName: 'Chai Tea Mix', quantity: 8 }, 'org_test');

            const stored = JSON.parse(localStorage.getItem('ezManage_inventory_org_test'));
            expect(stored).toHaveLength(1);
            expect(stored[0].quantity).toBe(8);
        });
    });

    describe('Tiered AI Access & Filtering', () => {
        const inventoryPool = [
            { id: '1', itemName: 'Spoons Box', quantity: 100, threshold: 20, addedVia: 'other' },
            { id: '2', itemName: 'Forks Box', quantity: 100, threshold: 20, addedVia: 'manual' },
            { id: '3', itemName: 'Straws Box', quantity: 50, threshold: 10, addedVia: 'automated' },
            { id: '4', itemName: 'Cups 16oz', quantity: 200, threshold: 40, addedVia: 'system_forecast' }
        ];

        test('When AI is DISABLED: displays ONLY items manually added via "other" or "manual"', () => {
            const results = filterAndSortInventory(inventoryPool, {
                aiEnabled: false
            });

            expect(results).toHaveLength(2);
            expect(results.map(r => r.itemName)).toEqual(['Forks Box', 'Spoons Box']);
        });

        test('When AI is ENABLED: displays all items with full predictive volume metrics', () => {
            const results = filterAndSortInventory(inventoryPool, {
                aiEnabled: true
            });

            expect(results).toHaveLength(4);
            results.forEach(item => {
                expect(item.metrics).toBeDefined();
                expect(item.metrics.dailyDepletionRate).toBeGreaterThan(0);
                expect(item.metrics.aiForecast).toBeDefined();
            });
        });
    });

    describe('Real-Time Search and Sorting', () => {
        const testItems = [
            { id: '1', itemName: 'Oat Milk Barista', quantity: 15, threshold: 5, addedVia: 'other' },
            { id: '2', itemName: 'Almond Milk', quantity: 8, threshold: 4, addedVia: 'other' },
            { id: '3', itemName: 'Whole Milk Organic', quantity: 30, threshold: 10, addedVia: 'other' },
            { id: '4', itemName: 'Paper Coffee Sleeves', quantity: 400, threshold: 50, addedVia: 'other' }
        ];

        const shiftHistory = [
            {
                inventory: [
                    { name: 'Oat Milk Barista', bl: 10, cl: 5, fr: 0 },
                    { name: 'Whole Milk Organic', bl: 2, cl: 1, fr: 0 }
                ]
            },
            {
                inventory: [
                    { name: 'Oat Milk Barista', bl: 8, cl: 4, fr: 0 },
                    { name: 'Oat Milk Barista', bl: 6, cl: 2, fr: 0 }
                ]
            }
        ];

        test('Filters accurately based on search keyword', () => {
            const results = filterAndSortInventory(testItems, {
                searchTerm: 'milk',
                aiEnabled: true
            });

            expect(results).toHaveLength(3);
            results.forEach(r => expect(r.itemName.toLowerCase()).toContain('milk'));
        });

        test('Sorts by Highest Velocity / Most-Used first', () => {
            const results = filterAndSortInventory(testItems, {
                sortBy: 'velocity',
                aiEnabled: true,
                shiftHistory: shiftHistory
            });

            // Oat Milk Barista has highest consumption in history, should be first
            expect(results[0].itemName).toBe('Oat Milk Barista');
            expect(results[0].metrics.velocityTier).toBe('High');
        });

        test('Sorts Alphabetically (A-Z)', () => {
            const results = filterAndSortInventory(testItems, {
                sortBy: 'alpha',
                aiEnabled: true
            });

            const names = results.map(r => r.itemName);
            expect(names).toEqual([
                'Almond Milk',
                'Oat Milk Barista',
                'Paper Coffee Sleeves',
                'Whole Milk Organic'
            ]);
        });
    });

    describe('Multi-Select & Sticky Shift Tracker Import', () => {
        test('Prepares import payload and saves to localStorage', () => {
            const selected = [
                {
                    itemName: 'Croissants',
                    quantity: 20,
                    threshold: 5,
                    metrics: { aiForecast: { bl: 12, cl: 0, fr: 8 } }
                },
                {
                    itemName: 'Muffins',
                    quantity: 15,
                    threshold: 4,
                    metrics: { aiForecast: { bl: 8, cl: 0, fr: 0 } }
                }
            ];

            const payload = prepareTrackerImportPayload(selected);
            expect(payload).toHaveLength(2);
            expect(payload[0].name).toBe('Croissants');
            expect(payload[0].bl).toBe('12');

            // Verify stored in localStorage
            const stored = JSON.parse(localStorage.getItem('ezManage_pending_tracker_import'));
            expect(stored).toHaveLength(2);
        });

        test('Consumes pending tracker import and clears storage', () => {
            localStorage.setItem('ezManage_pending_tracker_import', JSON.stringify([
                { name: 'Cold Brew Keg', bl: '2', cl: '1', fr: '0' }
            ]));

            const consumed = consumePendingTrackerImport();
            expect(consumed).toHaveLength(1);
            expect(consumed[0].name).toBe('Cold Brew Keg');

            // Key should now be removed
            expect(localStorage.getItem('ezManage_pending_tracker_import')).toBeNull();
        });
    });
});
