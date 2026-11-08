import { auth, db } from '../firebase.js';
import { logManagerError, escapeHTML, debounce } from './utils.js';
import * as InventoryAI from './inventory-ai.js';

let currentOrgId = null;
let currentUid = null;
let isDashboardLoaded = false;
let unsubscribeInventory = null;
let unsubscribeUser = null;

// Application State
let rawInventoryItems = [];
let userShiftHistory = [];
let activeRecallMap = {};
let selectedItemIds = new Set();
let currentSearchQuery = '';
let currentSortBy = 'velocity';
let isAIEnabled = true;

// DOM Elements
const addItemBtn = document.getElementById('addItemBtn');
const itemModal = document.getElementById('itemModal');
const closeItemModal = document.getElementById('closeItemModal');
const itemForm = document.getElementById('itemForm');
const inventoryTableBody = document.getElementById('inventoryTableBody');
const modalTitle = document.getElementById('modalTitle');
const itemIdInput = document.getElementById('itemId');
const itemNameInput = document.getElementById('itemName');
const itemQuantityInput = document.getElementById('itemQuantity');
const itemThresholdInput = document.getElementById('itemThreshold');
const cancelItemBtn = document.getElementById('cancelItemBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const emptyState = document.getElementById('emptyState');

// Search, Sort & Tier Controls
const inventorySearchInput = document.getElementById('inventorySearchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const inventorySortSelect = document.getElementById('inventorySortSelect');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const btnImportSelected = document.getElementById('btnImportSelected');
const btnImportSelectedText = document.getElementById('btnImportSelectedText');
const aiDisabledBanner = document.getElementById('aiDisabledBanner');
const btnEnableAIFromInventory = document.getElementById('btnEnableAIFromInventory');

// Stat Cards
const statTotalItems = document.getElementById('statTotalItems');
const statAIStatus = document.getElementById('statAIStatus');
const statAISubtext = document.getElementById('statAISubtext');
const statLowStock = document.getElementById('statLowStock');
const statVelocitySort = document.getElementById('statVelocitySort');

// Local Storage helpers
function getLocalInventory() {
    try {
        const stored = localStorage.getItem('ezManage_inventory_' + (currentOrgId || 'default'));
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        return null;
    }
}

function saveLocalInventory(items) {
    try {
        localStorage.setItem('ezManage_inventory_' + (currentOrgId || 'default'), JSON.stringify(items));
    } catch (e) {}
}

export function cleanupInventory() {
    if (unsubscribeInventory) {
        unsubscribeInventory();
        unsubscribeInventory = null;
    }
    if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
    }
}
if (typeof window !== "undefined") {
    window.addEventListener('beforeunload', cleanupInventory);
    window.addEventListener('unload', cleanupInventory);
}

// Evaluate AI permissions from user profile or local storage
function evaluateAIPermissions(userData) {
    const uid = currentUid || (auth && auth.currentUser ? auth.currentUser.uid : null) || localStorage.getItem('ezManage_lastUid');
    const localAI = uid ? localStorage.getItem(`ezManage_aiEnabled_${uid}`) : null;
    
    // Default enabled unless explicitly toggled off
    if (userData && userData.aiTrainingEnabled === false) {
        isAIEnabled = false;
    } else if (localAI === 'false') {
        isAIEnabled = false;
    } else {
        isAIEnabled = true;
    }

    updateAIStatusUI();
}

function updateAIStatusUI() {
    if (isAIEnabled) {
        if (aiDisabledBanner) aiDisabledBanner.classList.add('hidden');
        if (statAIStatus) {
            statAIStatus.className = 'text-sm font-bold text-emerald-400 flex items-center gap-1.5';
            statAIStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>AI Enabled</span>';
        }
        if (statAISubtext) statAISubtext.textContent = 'Neural predictions active';
    } else {
        if (aiDisabledBanner) aiDisabledBanner.classList.remove('hidden');
        if (statAIStatus) {
            statAIStatus.className = 'text-sm font-bold text-amber-400 flex items-center gap-1.5';
            statAIStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span><span>AI Disabled</span>';
        }
        if (statAISubtext) statAISubtext.textContent = 'Manual items view';
    }
}

// Fetch Announcements & Shift Notes to check for active recalls
async function fetchRecallData() {
    let announcements = [];
    let shiftNotes = [];

    try {
        const storedAnn = localStorage.getItem('ezManage_announcements');
        if (storedAnn) announcements = JSON.parse(storedAnn);
    } catch (e) {}

    try {
        const storedNotes = localStorage.getItem('ezManage_shift_notes');
        if (storedNotes) shiftNotes = JSON.parse(storedNotes);
    } catch (e) {}

    if (db && currentOrgId && currentOrgId !== 'demo-org') {
        try {
            const annSnap = await db.collection('announcements')
                .where('orgId', '==', currentOrgId)
                .limit(10)
                .get();
            if (!annSnap.empty) {
                announcements = annSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        } catch (e) {
            console.warn("Notice: could not fetch remote announcements for recall scan", e);
        }
    }

    activeRecallMap = InventoryAI.scanAnnouncementsAndNotesForRecalls(announcements, shiftNotes, rawInventoryItems);
}

// Main Table Rendering Engine with Search, Sort, Recall Badges & AI Tiering
function renderInventoryView() {
    if (!inventoryTableBody) return;

    // Filter and sort items using Unified Engine
    const processedItems = InventoryAI.filterAndSortInventory(rawInventoryItems, {
        searchTerm: currentSearchQuery,
        sortBy: currentSortBy,
        aiEnabled: isAIEnabled,
        shiftHistory: userShiftHistory
    });

    inventoryTableBody.replaceChildren();

    // Update Metric Cards
    if (statTotalItems) statTotalItems.textContent = rawInventoryItems.length;
    let lowStockCount = 0;
    rawInventoryItems.forEach(i => {
        if (Number(i.quantity) <= Number(i.threshold)) lowStockCount++;
    });
    if (statLowStock) statLowStock.textContent = lowStockCount;

    if (statVelocitySort) {
        if (currentSortBy === 'velocity') statVelocitySort.textContent = '🔥 Most-Used First';
        else if (currentSortBy === 'alpha') statVelocitySort.textContent = '🔤 Alphabetical (A–Z)';
        else if (currentSortBy === 'stock') statVelocitySort.textContent = '⚠️ Lowest Stock';
    }

    if (processedItems.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        updateSelectAllCheckbox(0, 0);
        updateStickyImportBtn();
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    const fragment = document.createDocumentFragment();
    processedItems.forEach(item => {
        const row = renderItemRow(item.id, item);
        fragment.appendChild(row);
    });

    inventoryTableBody.appendChild(fragment);

    updateSelectAllCheckbox(processedItems.length, countSelectedInList(processedItems));
    updateStickyImportBtn();

    if (window.lucide) window.lucide.createIcons();
}

function countSelectedInList(items) {
    let count = 0;
    items.forEach(i => {
        if (selectedItemIds.has(i.id)) count++;
    });
    return count;
}

// Render Individual Item Row
function renderItemRow(id, data) {
    const row = document.createElement('tr');
    const isLowStock = Number(data.quantity) <= Number(data.threshold);
    row.id = `item-row-${id}`;
    row.className = `border-b border-slate-800/50 transition-colors hover:bg-slate-800/20 ${isLowStock ? 'bg-rose-900/10' : ''}`;

    const isSelected = selectedItemIds.has(id);
    const recallBadgeHtml = InventoryAI.renderRecallBadgeHTML(data.itemName, activeRecallMap);

    // AI Forecast & Depletion computation
    const metrics = data.metrics || InventoryAI.calculateItemMetrics(data, userShiftHistory);
    let aiColumnHtml = '';

    if (!isAIEnabled) {
        aiColumnHtml = `
            <div class="flex items-center gap-1.5">
                <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-800 text-slate-400 border border-slate-700/60">AI Off (Manual)</span>
            </div>
        `;
    } else {
        const estBurn = metrics.dailyDepletionRate;
        const daysLeft = metrics.estimatedDaysLeft;
        const fc = metrics.aiForecast;
        aiColumnHtml = `
            <div class="flex flex-col gap-0.5">
                <div class="text-xs font-bold text-slate-200 flex items-center gap-1.5 flex-wrap">
                    <span>${estBurn}/day</span>
                    <span class="text-[10px] font-normal text-slate-400">· ~${daysLeft}d stock</span>
                    ${metrics.velocityTier === 'High' ? '<span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">🔥 High Velocity</span>' : ''}
                </div>
                <div class="text-[11px] font-mono text-sky-400">
                    Next Shift: ${fc.bl} Back · ${fc.cl} Cool · ${fc.fr} Frz
                </div>
            </div>
        `;
    }

    row.innerHTML = `
        <td class="w-12 px-4 py-4 text-center whitespace-nowrap">
            <input type="checkbox" class="item-select-checkbox w-4 h-4 rounded text-sky-500 bg-slate-800 border-slate-700 focus:ring-sky-500 cursor-pointer" data-id="${escapeHTML(id)}" ${isSelected ? 'checked' : ''} aria-label="Select ${escapeHTML(data.itemName)}">
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
                <div class="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center mr-3 text-slate-300 shrink-0">
                    <i data-lucide="package" class="w-5 h-5 text-sky-400"></i>
                </div>
                <div class="min-w-0">
                    <div class="font-bold text-white flex items-center gap-2 flex-wrap">
                        <span>${escapeHTML(data.itemName)}</span>
                        ${recallBadgeHtml}
                    </div>
                    <div class="text-xs text-slate-400">Threshold: ${escapeHTML(data.threshold)}</div>
                </div>
            </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <span class="text-lg font-bold font-mono ${isLowStock ? 'text-rose-400' : 'text-slate-200'}">
                ${escapeHTML(data.quantity)}
            </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-3 py-1 text-xs font-semibold rounded-full border ${
                isLowStock 
                ? 'bg-rose-950/40 text-rose-400 border-rose-800/50' 
                : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
            }">
                ${isLowStock ? 'Low Stock' : 'In Stock'}
            </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            ${aiColumnHtml}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
            <button data-action="edit" data-id="${escapeHTML(id)}" class="text-slate-400 hover:text-white mr-3 transition-colors" aria-label="Edit Item">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
            </button>
            <button data-action="delete" data-id="${escapeHTML(id)}" class="text-slate-400 hover:text-rose-400 transition-colors" aria-label="Delete Item">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </td>
    `;

    const editBtn = row.querySelector('[data-action="edit"]');
    if (editBtn) {
        editBtn.dataset.name = data.itemName;
        editBtn.dataset.quantity = data.quantity;
        editBtn.dataset.threshold = data.threshold;
    }

    return row;
}

// Update Select All Checkbox state
function updateSelectAllCheckbox(totalVisible, totalSelected) {
    if (!selectAllCheckbox) return;
    if (totalVisible === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (totalSelected === totalVisible) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (totalSelected > 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
}

// Update Sticky Floating Action Button Visibility and Count
function updateStickyImportBtn() {
    if (!btnImportSelected) return;
    const count = selectedItemIds.size;
    if (count > 0) {
        btnImportSelected.classList.remove('hidden');
        if (btnImportSelectedText) {
            btnImportSelectedText.textContent = `Import Selected to Shift Tracker (${count})`;
        }
    } else {
        btnImportSelected.classList.add('hidden');
    }
}

// Auth State Change - wait for auth resolution
if (auth && typeof auth.onAuthStateChanged === 'function') {
    try {
        auth.onAuthStateChanged(async (user) => {
            if (user && user.uid === currentUid && isDashboardLoaded) return;
            currentUid = user ? user.uid : null;
            isDashboardLoaded = true;

            if (user) {
                localStorage.setItem('ezManage_lastUid', user.uid);
            }

            if (user && db) {
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc && userDoc.exists) {
                        const uData = userDoc.data();
                        currentOrgId = uData.orgId || user.uid;
                        userShiftHistory = uData.shiftHistory || [];
                        evaluateAIPermissions(uData);
                    } else {
                        currentOrgId = user.uid;
                        evaluateAIPermissions({});
                    }

                    // Listen to user doc for real-time AI toggle changes
                    if (unsubscribeUser) unsubscribeUser();
                    unsubscribeUser = db.collection('users').doc(user.uid).onSnapshot(snap => {
                        if (snap.exists) {
                            const uData = snap.data();
                            userShiftHistory = uData.shiftHistory || [];
                            evaluateAIPermissions(uData);
                            renderInventoryView();
                        }
                    });
                } catch (error) {
                    logManagerError("Error fetching user profile", error);
                    currentOrgId = user.uid;
                    evaluateAIPermissions({});
                }
            } else if (user) {
                currentOrgId = user.uid;
                evaluateAIPermissions({});
            } else {
                currentOrgId = 'demo-org';
                evaluateAIPermissions({});
            }

            loadInventory();
        });
    } catch (e) {
        currentOrgId = 'demo-org';
        evaluateAIPermissions({});
        loadInventory();
    }
} else {
    currentOrgId = 'demo-org';
    evaluateAIPermissions({});
    loadInventory();
}

// Load Inventory Items Real-time
async function loadInventory() {
    if (unsubscribeInventory) {
        unsubscribeInventory();
        unsubscribeInventory = null;
    }

    if (loadingSpinner) loadingSpinner.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    // Instant local cache load
    const cachedItems = getLocalInventory();
    if (cachedItems && cachedItems.length > 0) {
        rawInventoryItems = cachedItems;
        await fetchRecallData();
        renderInventoryView();
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
    }

    if (!db || !currentOrgId || currentOrgId === 'demo-org') {
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
        await fetchRecallData();
        renderInventoryView();
        return;
    }

    // Safety timeout: ensure loading spinner is never stuck infinitely
    const loadTimeout = setTimeout(() => {
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
        renderInventoryView();
    }, 1500);

    try {
        unsubscribeInventory = db.collection('inventory')
            .where('orgId', '==', currentOrgId)
            .onSnapshot(async (snapshot) => {
                clearTimeout(loadTimeout);
                if (loadingSpinner) loadingSpinner.classList.add('hidden');

                if (snapshot.empty) {
                    const local = getLocalInventory();
                    rawInventoryItems = (local && local.length > 0) ? local : [];
                } else {
                    const remoteItems = [];
                    snapshot.forEach(d => remoteItems.push({ id: d.id, ...d.data() }));
                    rawInventoryItems = remoteItems;
                    saveLocalInventory(remoteItems);
                }

                await fetchRecallData();
                renderInventoryView();
            }, async (error) => {
                clearTimeout(loadTimeout);
                logManagerError("Error fetching inventory:", error);
                if (loadingSpinner) loadingSpinner.classList.add('hidden');
                const local = getLocalInventory();
                rawInventoryItems = (local && local.length > 0) ? local : [];
                await fetchRecallData();
                renderInventoryView();
            });
    } catch (err) {
        clearTimeout(loadTimeout);
        logManagerError("Synchronous error attaching inventory listener:", err);
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
        renderInventoryView();
    }
}

// Search & Sort Event Listeners
if (inventorySearchInput) {
    // ⚡ Bolt: Debounce the expensive renderInventoryView function
    // to prevent O(N) layout thrashing and excessive DOM updates on every keystroke.
    // Reduces re-renders significantly during rapid typing.
    const debouncedRender = debounce(renderInventoryView, 300);
    inventorySearchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value;
        if (clearSearchBtn) {
            if (currentSearchQuery) clearSearchBtn.classList.remove('hidden');
            else clearSearchBtn.classList.add('hidden');
        }
        debouncedRender();
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        if (inventorySearchInput) inventorySearchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.classList.add('hidden');
        renderInventoryView();
    });
}

if (inventorySortSelect) {
    inventorySortSelect.addEventListener('change', (e) => {
        currentSortBy = e.target.value;
        renderInventoryView();
    });
}

// Select All & Row Selection Checkboxes
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const visibleItems = InventoryAI.filterAndSortInventory(rawInventoryItems, {
            searchTerm: currentSearchQuery,
            sortBy: currentSortBy,
            aiEnabled: isAIEnabled,
            shiftHistory: userShiftHistory
        });

        visibleItems.forEach(item => {
            if (isChecked) selectedItemIds.add(item.id);
            else selectedItemIds.delete(item.id);
        });

        // Update all checkbox elements in DOM
        document.querySelectorAll('.item-select-checkbox').forEach(chk => {
            chk.checked = isChecked;
        });

        updateStickyImportBtn();
    });
}

// Sticky Floating Import Button Action
if (btnImportSelected) {
    btnImportSelected.addEventListener('click', () => {
        const selected = rawInventoryItems.filter(item => selectedItemIds.has(item.id));
        if (selected.length === 0) return;

        InventoryAI.prepareTrackerImportPayload(selected);

        // Clear selection
        selectedItemIds.clear();
        updateStickyImportBtn();

        // Navigate to Tracker
        window.location.href = 'index.html#tracker';
    });
}

// Enable AI Predictor from Banner Button
if (btnEnableAIFromInventory) {
    btnEnableAIFromInventory.addEventListener('click', async () => {
        const uid = currentUid || localStorage.getItem('ezManage_lastUid');
        if (uid) {
            localStorage.setItem(`ezManage_aiEnabled_${uid}`, 'true');
            localStorage.setItem(`ezManage_cloudEnabled_${uid}`, 'true');
        }
        isAIEnabled = true;
        updateAIStatusUI();
        renderInventoryView();

        if (currentUid && db) {
            try {
                await db.collection('users').doc(currentUid).set({
                    aiTrainingEnabled: true,
                    cloudSyncEnabled: true
                }, { merge: true });
            } catch (e) {
                console.warn("Could not sync AI opt-in to Firestore:", e);
            }
        }
    });
}

// Table Action Listeners (Edit, Delete, Checkbox)
if (inventoryTableBody) {
    inventoryTableBody.addEventListener('change', (e) => {
        const chk = e.target.closest('.item-select-checkbox');
        if (!chk) return;
        const id = chk.dataset.id;
        if (chk.checked) selectedItemIds.add(id);
        else selectedItemIds.delete(id);

        const visibleItems = InventoryAI.filterAndSortInventory(rawInventoryItems, {
            searchTerm: currentSearchQuery,
            sortBy: currentSortBy,
            aiEnabled: isAIEnabled,
            shiftHistory: userShiftHistory
        });
        updateSelectAllCheckbox(visibleItems.length, countSelectedInList(visibleItems));
        updateStickyImportBtn();
    });

    inventoryTableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'edit') {
            if (modalTitle) modalTitle.textContent = 'Edit Item';
            if (itemIdInput) itemIdInput.value = id;
            if (itemNameInput) itemNameInput.value = btn.dataset.name || '';
            if (itemQuantityInput) itemQuantityInput.value = btn.dataset.quantity || '';
            if (itemThresholdInput) itemThresholdInput.value = btn.dataset.threshold || '';
            if (itemModal) {
                itemModal.classList.remove('hidden');
                itemModal.classList.add('flex');
            }
        } else if (action === 'delete') {
            if (confirm("Are you sure you want to delete this item?")) {
                const oldRow = (id ? document.getElementById(`item-row-${id}`) : null) || btn.closest('tr');
                if (oldRow) oldRow.remove();

                rawInventoryItems = rawInventoryItems.filter(i => i.id !== id);
                selectedItemIds.delete(id);
                saveLocalInventory(rawInventoryItems);

                renderInventoryView();

                try {
                    if (db && currentOrgId && currentOrgId !== 'demo-org') {
                        await db.collection('inventory').doc(id).delete();
                    }
                } catch (error) {
                    logManagerError("Error deleting item from Firestore:", error);
                }
            }
        }
    });
}

// Modal open/close controls
if (addItemBtn) {
    addItemBtn.addEventListener('click', () => {
        if (modalTitle) modalTitle.textContent = 'Add New Item';
        if (itemForm) itemForm.reset();
        if (itemIdInput) itemIdInput.value = '';
        if (itemModal) {
            itemModal.classList.remove('hidden');
            itemModal.classList.add('flex');
        }
    });
}

if (closeItemModal) {
    closeItemModal.addEventListener('click', () => {
        if (itemModal) {
            itemModal.classList.add('hidden');
            itemModal.classList.remove('flex');
        }
    });
}

if (cancelItemBtn) {
    cancelItemBtn.addEventListener('click', () => {
        if (itemModal) {
            itemModal.classList.add('hidden');
            itemModal.classList.remove('flex');
        }
    });
}

// Add/Edit Form Submission
if (itemForm) {
    itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const effectiveOrgId = currentOrgId || (auth && auth.currentUser ? auth.currentUser.uid : null) || 'demo-org';

        const id = itemIdInput ? itemIdInput.value : '';
        const name = itemNameInput ? itemNameInput.value.trim() : '';
        const quantity = parseInt(itemQuantityInput ? itemQuantityInput.value : '0', 10);
        const threshold = parseInt(itemThresholdInput ? itemThresholdInput.value : '0', 10);

        const itemData = {
            itemName: name,
            quantity: quantity,
            threshold: threshold,
            orgId: effectiveOrgId,
            addedVia: 'manual'
        };

        const targetId = id || ('inv_' + Date.now());
        itemData.id = targetId;

        // Instant local update
        if (id) {
            rawInventoryItems = rawInventoryItems.map(it => it.id === id ? { ...it, ...itemData } : it);
        } else {
            rawInventoryItems.push(itemData);
        }
        saveLocalInventory(rawInventoryItems);

        if (itemModal) {
            itemModal.classList.add('hidden');
            itemModal.classList.remove('flex');
        }

        renderInventoryView();

        try {
            if (db && currentOrgId && currentOrgId !== 'demo-org') {
                if (id) {
                    await db.collection('inventory').doc(id).update(itemData);
                } else {
                    const docRef = await db.collection('inventory').add(itemData);
                    itemData.id = docRef.id;
                }
            }
        } catch (error) {
            logManagerError("Error syncing item to Firestore:", error);
        }
    });
}
