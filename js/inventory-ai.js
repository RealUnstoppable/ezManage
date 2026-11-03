/**
 * ezManage Unified Inventory & AI Prediction Engine
 * Handles AI recall detection, predictive volume estimation, velocity sorting,
 * tiered AI filtering, and multi-select shift tracker import synchronization.
 */

// Safety and Recall Keywords to scan in announcements, shift notes, and prep logs
export const RECALL_KEYWORDS = [
    'recall',
    'recalled',
    'contamination',
    'contaminated',
    'do not serve',
    'discard',
    'quality issue',
    'hold',
    'safety hold',
    'advisory',
    'allergen issue',
    'withdrawn',
    'outbreak',
    'health hazard',
    'stop sale'
];

/**
 * Normalizes item names to canonical keys for grouping and matching
 */
export function normalizeItemName(name, existingKeys = []) {
    if (!name || typeof name !== 'string') return '';
    const lower = name.toLowerCase().trim();

    // Canonical shortcuts for common kitchen/store assets
    if (lower.includes('mac') && (lower.includes('cheese') || lower.includes('chs') || lower.includes('chz'))) return 'Mac & Cheese';
    if (lower.includes('bacon')) return 'Bacon';
    if (lower.includes('milk') && lower.includes('whole')) return 'Whole Milk';

    for (let key of existingKeys) {
        if (!key) continue;
        const keyLower = key.toLowerCase();
        if (keyLower === lower) return key;

        // Plural / singular matching
        if (keyLower === lower + 's' || lower === keyLower + 's') return key;
        if (keyLower === lower + 'es' || lower === keyLower + 'es') return key;

        const keyWords = keyLower.split(' ');
        const lowerWords = lower.split(' ');
        if (keyWords[0] === lowerWords[0] && Math.abs(keyLower.length - lower.length) <= 4) {
            if (keyLower.includes(lower) || lower.includes(keyLower)) {
                return key;
            }
        }
    }
    return name.trim();
}

/**
 * Detects if a text string contains safety or recall keywords
 */
export function detectRecallKeywords(text) {
    if (!text || typeof text !== 'string') return { isRecall: false, matchedKeywords: [] };
    const lower = text.toLowerCase();
    const matched = RECALL_KEYWORDS.filter(kw => lower.includes(kw));
    return {
        isRecall: matched.length > 0,
        matchedKeywords: matched
    };
}

/**
 * Scans announcements, shift notes, and prep notes for recall keywords
 * and flags affected inventory items.
 *
 * @param {Array} announcements Array of announcement objects { title, content }
 * @param {Array|string} shiftNotes Array of shift notes or string content
 * @param {Array} inventoryItems Array of inventory items { itemName, ... }
 * @returns {Object} Map of normalized item names to recall match info
 */
export function scanAnnouncementsAndNotesForRecalls(announcements = [], shiftNotes = [], inventoryItems = []) {
    const recallMap = {};

    // Helper to process a text entry
    function processText(text, source) {
        if (!text || typeof text !== 'string') return;
        const detection = detectRecallKeywords(text);
        if (!detection.isRecall) return;

        const lowerText = text.toLowerCase();

        // Check if any inventory item is explicitly or partially referenced
        inventoryItems.forEach(item => {
            const rawName = item.itemName || item.name || '';
            if (!rawName) return;
            const norm = rawName.toLowerCase().trim();

            // Match if normalized item name is found in text
            if (lowerText.includes(norm)) {
                recallMap[norm] = {
                    itemName: rawName,
                    matchedKeywords: detection.matchedKeywords,
                    source: source,
                    text: text.slice(0, 140),
                    flaggedAt: new Date().toISOString()
                };
            } else {
                // Check significant word stems (e.g. "milk", "lettuce", "bacon", "cheese")
                const tokens = norm.split(/\s+/).filter(w => w.length >= 4);
                const hasTokenMatch = tokens.some(t => lowerText.includes(t));
                if (hasTokenMatch && tokens.length > 0) {
                    recallMap[norm] = {
                        itemName: rawName,
                        matchedKeywords: detection.matchedKeywords,
                        source: source,
                        text: text.slice(0, 140),
                        flaggedAt: new Date().toISOString()
                    };
                }
            }
        });
    }

    // Scan Announcements
    if (Array.isArray(announcements)) {
        announcements.forEach(ann => {
            const data = ann.data || ann;
            const title = data.title || '';
            const content = data.content || '';
            processText(`${title} - ${content}`, 'Announcement');
        });
    }

    // Scan Shift Notes
    if (Array.isArray(shiftNotes)) {
        shiftNotes.forEach(note => {
            const data = note.data || note;
            const content = typeof data === 'string' ? data : (data.content || data.notes || '');
            processText(content, 'Shift Note');
        });
    } else if (typeof shiftNotes === 'string') {
        processText(shiftNotes, 'Shift Note');
    }

    return recallMap;
}

/**
 * Checks whether an item is flagged in the recall map
 */
export function isItemRecalled(itemName, recallMap = {}) {
    if (!itemName || !recallMap) return false;
    const lower = itemName.toLowerCase().trim();
    if (recallMap[lower]) return true;

    // Check partial matches
    for (const key of Object.keys(recallMap)) {
        if (key.includes(lower) || lower.includes(key)) {
            return true;
        }
    }
    return false;
}

/**
 * Renders HTML for a high-visibility Recall Badge
 */
export function renderRecallBadgeHTML(itemName, recallMap = {}) {
    if (!isItemRecalled(itemName, recallMap)) return '';
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse recall-flag-badge" title="Flagged in recall / safety announcement"><i data-lucide="alert-triangle" class="w-3 h-3"></i> ⚠️ RECALL / ISSUE FLAGGED</span>`;
}

/**
 * Automatically indexes an item into local and remote inventory
 */
export function indexItemToInventory(itemData, orgId = 'default', dbInstance = null) {
    if (!itemData || !itemData.itemName || !itemData.itemName.trim()) return null;

    const trimmedName = itemData.itemName.trim();
    const storageKey = 'ezManage_inventory_' + (orgId || 'default');

    let currentItems = [];
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) currentItems = JSON.parse(stored);
    } catch (e) {
        currentItems = [];
    }

    // Check if item already exists
    const existingIndex = currentItems.findIndex(i =>
        i.itemName && i.itemName.toLowerCase().trim() === trimmedName.toLowerCase()
    );

    let resolvedItem;
    if (existingIndex >= 0) {
        resolvedItem = {
            ...currentItems[existingIndex],
            lastTracked: new Date().toISOString(),
            quantity: itemData.quantity !== undefined ? itemData.quantity : currentItems[existingIndex].quantity
        };
        currentItems[existingIndex] = resolvedItem;
    } else {
        resolvedItem = {
            id: itemData.id || ('inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)),
            itemName: trimmedName,
            quantity: parseInt(itemData.quantity, 10) || 0,
            threshold: parseInt(itemData.threshold, 10) || 5,
            addedVia: itemData.addedVia || 'other',
            orgId: orgId,
            createdAt: new Date().toISOString(),
            lastTracked: new Date().toISOString()
        };
        currentItems.push(resolvedItem);
    }

    try {
        localStorage.setItem(storageKey, JSON.stringify(currentItems));
    } catch (e) {
        console.warn("Could not save to localStorage", e);
    }

    // Sync to Firestore if db provided
    if (dbInstance && orgId && orgId !== 'demo-org') {
        try {
            dbInstance.collection('inventory').doc(resolvedItem.id).set(resolvedItem, { merge: true })
                .catch(err => console.warn("Firestore index error:", err));
        } catch (e) {
            console.warn("Async firestore index catch:", e);
        }
    }

    return resolvedItem;
}

/**
 * Calculates predictive velocity, usage rate, and depletion forecasts
 */
export function calculateItemMetrics(item, shiftHistory = []) {
    const rawName = (item.itemName || item.name || '').trim().toLowerCase();
    const currentQty = Math.max(0, parseInt(item.quantity, 10) || 0);

    let occurrences = 0;
    let totalConsumed = 0;

    if (Array.isArray(shiftHistory)) {
        shiftHistory.forEach(shift => {
            if (!shift || !Array.isArray(shift.inventory)) return;
            const match = shift.inventory.find(i => (i.name || '').trim().toLowerCase() === rawName);
            if (match) {
                occurrences++;
                const bl = parseFloat(match.bl) || 0;
                const cl = parseFloat(match.cl) || 0;
                const fr = parseFloat(match.fr) || 0;
                totalConsumed += (bl + cl + fr);
            }
        });
    }

    // Default heuristic consumption if sparse history
    const shiftsCount = shiftHistory.length || 1;
    const avgUsagePerShift = occurrences > 0 ? (totalConsumed / occurrences) : (currentQty > 0 ? Math.min(5, currentQty * 0.05) : 1.0);
    const dailyDepletionRate = Math.max(0.5, Math.round(avgUsagePerShift * 10) / 10);
    const estimatedDaysLeft = Math.round((currentQty / dailyDepletionRate) * 10) / 10;

    // Velocity score prioritizes actual verified shift history consumption, falling back to stock turnover
    const velocityScore = occurrences > 0
        ? (occurrences * 50) + (totalConsumed * 10) + dailyDepletionRate
        : Math.min(15, Math.round(dailyDepletionRate * 2));

    let velocityTier = 'Standard';
    if (velocityScore > 40 || occurrences >= 2) velocityTier = 'High';
    else if (velocityScore > 15 || occurrences >= 1) velocityTier = 'Medium';

    // Projected next shift demand
    const aiForecast = {
        bl: Math.max(1, Math.round(dailyDepletionRate * 0.5)),
        cl: Math.max(0, Math.round(dailyDepletionRate * 0.3)),
        fr: Math.max(0, Math.round(dailyDepletionRate * 0.2)),
        total: Math.max(1, Math.round(dailyDepletionRate))
    };

    return {
        velocityScore,
        velocityTier,
        dailyDepletionRate,
        estimatedDaysLeft,
        aiForecast,
        occurrences
    };
}

/**
 * Filters and sorts inventory items based on search term, sorting criteria,
 * and AI-enabled tiered access.
 */
export function filterAndSortInventory(items = [], options = {}) {
    const {
        searchTerm = '',
        sortBy = 'velocity', // 'velocity' | 'alpha' | 'stock'
        aiEnabled = true,
        shiftHistory = []
    } = options;

    if (!Array.isArray(items)) return [];

    // Step 1: Tiered Access Filtering
    // If AI is disabled: show ONLY items manually added via 'Other' or manual form
    let filtered = items.filter(item => {
        if (!item || !item.itemName) return false;
        if (!aiEnabled) {
            // Only allow items with addedVia == 'other' or 'manual'
            return item.addedVia === 'other' || item.addedVia === 'manual' || item.isManual === true;
        }
        return true;
    });

    // Step 2: Search Bar Filtering
    if (searchTerm && searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        filtered = filtered.filter(item => {
            const name = (item.itemName || '').toLowerCase();
            return name.includes(query);
        });
    }

    // Step 3: Compute AI Metrics for Velocity Sorting & Forecasts
    const itemsWithMetrics = filtered.map(item => ({
        ...item,
        metrics: calculateItemMetrics(item, shiftHistory)
    }));

    // Step 4: Sorting
    itemsWithMetrics.sort((a, b) => {
        if (sortBy === 'alpha') {
            return (a.itemName || '').localeCompare(b.itemName || '');
        }
        if (sortBy === 'stock') {
            return (parseInt(a.quantity, 10) || 0) - (parseInt(b.quantity, 10) || 0);
        }
        // Default: 'velocity' (Highest-velocity / most-used first)
        const scoreDiff = (b.metrics?.velocityScore || 0) - (a.metrics?.velocityScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (a.itemName || '').localeCompare(b.itemName || '');
    });

    return itemsWithMetrics;
}

/**
 * Prepares payload for importing selected items into the Shift Tracker
 */
export function prepareTrackerImportPayload(selectedItems = []) {
    if (!Array.isArray(selectedItems)) return [];
    const payload = selectedItems.map(item => ({
        name: item.itemName || item.name || '',
        bl: item.metrics?.aiForecast?.bl !== undefined ? String(item.metrics.aiForecast.bl) : '',
        cl: item.metrics?.aiForecast?.cl !== undefined ? String(item.metrics.aiForecast.cl) : '',
        fr: item.metrics?.aiForecast?.fr !== undefined ? String(item.metrics.aiForecast.fr) : '',
        quantity: item.quantity,
        threshold: item.threshold,
        importedAt: new Date().toISOString()
    }));

    try {
        localStorage.setItem('ezManage_pending_tracker_import', JSON.stringify(payload));
    } catch (e) {
        console.warn("Could not save pending import to localStorage", e);
    }
    return payload;
}

/**
 * Retrieves and clears pending items to import into the Shift Tracker
 */
export function consumePendingTrackerImport() {
    try {
        const raw = localStorage.getItem('ezManage_pending_tracker_import');
        if (!raw) return [];
        localStorage.removeItem('ezManage_pending_tracker_import');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

// Window global fallback for vanilla scripts
if (typeof window !== 'undefined') {
    window.InventoryAI = {
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
    };
}
