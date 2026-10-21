import { auth, db } from '../firebase.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { logManagerError, escapeHTML } from './utils.js';

let currentOrgId = null;
let unsubscribeInventory = null;

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

let currentUid = null;
let isDashboardLoaded = false;

// Local Inventory helpers for instant UI and offline/demo support
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

function renderLocalInventory(items) {
    inventoryTableBody.replaceChildren();
    if (!items || items.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    // ⚡ Bolt Optimization: Replace O(N) DOM manipulations in loop with a DocumentFragment
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const row = renderItemRow(item.id, item);
        fragment.appendChild(row);
    });
    inventoryTableBody.appendChild(fragment);
    if (window.lucide) window.lucide.createIcons();
}

// Auth State Change
onAuthStateChanged(auth, async (user) => {
    if (user && user.uid === currentUid && isDashboardLoaded) return;
    currentUid = user ? user.uid : null;
    isDashboardLoaded = true;
    if (user) {
        try {
            // Fetch user's orgId
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc && userDoc.exists()) {
                currentOrgId = userDoc.data().orgId || user.uid;
            } else {
                currentOrgId = user.uid;
            }
        } catch (error) {
            logManagerError("Error fetching user profile", error);
            currentOrgId = user.uid;
        }
    } else {
        currentOrgId = 'demo-org';
    }
    loadInventory();
});

// Load Inventory Items Real-time
function loadInventory() {
    if (unsubscribeInventory) {
        unsubscribeInventory();
    }

    loadingSpinner.classList.remove('hidden');
    emptyState.classList.add('hidden');
    inventoryTableBody.replaceChildren();

    // Check local inventory first for instant response
    const cachedItems = getLocalInventory();
    if (cachedItems && cachedItems.length > 0) {
        renderLocalInventory(cachedItems);
        loadingSpinner.classList.add('hidden');
    }

    // Safety timeout: ensure loading spinner is never stuck infinitely
    const loadTimeout = setTimeout(() => {
        loadingSpinner.classList.add('hidden');
        if (inventoryTableBody.children.length === 0) {
            emptyState.classList.remove('hidden');
            if (window.lucide) window.lucide.createIcons();
        }
    }, 1500);

    const q = query(collection(db, "inventory"), where("orgId", "==", currentOrgId));

    // Flag to handle initial load vs incremental updates to avoid duplicates on re-subscription
    let isInitialRender = true;

    try {
        unsubscribeInventory = onSnapshot(q, (snapshot) => {
            clearTimeout(loadTimeout);
            loadingSpinner.classList.add('hidden');

            if (snapshot.empty) {
                const local = getLocalInventory();
                if (local && local.length > 0) {
                    renderLocalInventory(local);
                } else {
                    emptyState.classList.remove('hidden');
                    inventoryTableBody.replaceChildren();
                }
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            emptyState.classList.add('hidden');

            const remoteItems = [];
            snapshot.forEach(d => remoteItems.push({ id: d.id, ...d.data() }));
            saveLocalInventory(remoteItems);

            if (isInitialRender) {
                 inventoryTableBody.replaceChildren();
                 isInitialRender = false;
            }

        // ⚡ Bolt Optimization: Use docChanges() to incrementally update the DOM instead of recreating it all.
        // Impact: Eliminates O(N) DOM node destruction and recreation on every update, drastically reducing layout thrashing.
        snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            const id = change.doc.id;

            if (change.type === 'added') {
                const row = renderItemRow(id, data);
                // Respect index to maintain sort order
                const existingNodes = inventoryTableBody.children;
                if (existingNodes.length > change.newIndex) {
                    inventoryTableBody.insertBefore(row, existingNodes[change.newIndex]);
                } else {
                    inventoryTableBody.appendChild(row);
                }
            }
            if (change.type === 'modified') {
                const oldRow = document.getElementById(`item-row-${id}`);
                const newRow = renderItemRow(id, data);

                if (oldRow) {
                    if (change.oldIndex === change.newIndex) {
                        inventoryTableBody.replaceChild(newRow, oldRow);
                    } else {
                        oldRow.remove();
                        const existingNodes = inventoryTableBody.children;
                        if (existingNodes.length > change.newIndex) {
                            inventoryTableBody.insertBefore(newRow, existingNodes[change.newIndex]);
                        } else {
                            inventoryTableBody.appendChild(newRow);
                        }
                    }
                } else {
                    const existingNodes = inventoryTableBody.children;
                    if (existingNodes.length > change.newIndex) {
                        inventoryTableBody.insertBefore(newRow, existingNodes[change.newIndex]);
                    } else {
                        inventoryTableBody.appendChild(newRow); // Fallback
                    }
                }
            }
            if (change.type === 'removed') {
                const oldRow = document.getElementById(`item-row-${id}`);
                if (oldRow) {
                    oldRow.remove();
                }
            }
        });

        if (window.lucide) window.lucide.createIcons();
    }, (error) => {
        clearTimeout(loadTimeout);
        logManagerError("Error fetching inventory:", error);
        loadingSpinner.classList.add('hidden');
        const local = getLocalInventory();
        if (local && local.length > 0) {
            renderLocalInventory(local);
        } else {
            emptyState.classList.remove('hidden');
        }
        if (window.lucide) window.lucide.createIcons();
    });
    } catch (err) {
        clearTimeout(loadTimeout);
        logManagerError("Firestore onSnapshot error:", err);
        loadingSpinner.classList.add('hidden');
        const local = getLocalInventory();
        if (local && local.length > 0) {
            renderLocalInventory(local);
        } else {
            emptyState.classList.remove('hidden');
        }
        if (window.lucide) window.lucide.createIcons();
    }
}

// Render Table Row
function renderItemRow(id, data) {
    const isLowStock = parseInt(data.quantity) < parseInt(data.threshold);
    const row = document.createElement('tr');
    row.id = `item-row-${id}`; // Needed for targeted DOM updates
    row.className = `border-b border-slate-800/50 transition-colors hover:bg-slate-800/20 ${isLowStock ? 'bg-rose-900/10' : ''}`;

    row.insertAdjacentHTML('beforeend', `
        <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
                <div class="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center mr-3 text-slate-300">
                    <i data-lucide="${isLowStock ? 'alert-triangle' : 'box'}" class="${isLowStock ? 'text-rose-400' : ''}"></i>
                </div>
                <div class="text-sm font-medium text-slate-200">${escapeHTML(data.itemName)}</div>
            </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${isLowStock ? 'bg-rose-900/50 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'}">
                ${escapeHTML(String(data.quantity))}
            </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
            ${escapeHTML(String(data.threshold))}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button data-action="edit" data-id="${id}" class="text-sky-400 hover:text-sky-300 mr-3 p-1 rounded-md hover:bg-sky-400/10 transition-colors" aria-label="Edit item">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
            </button>
            <button data-action="delete" data-id="${id}" class="text-rose-400 hover:text-rose-300 p-1 rounded-md hover:bg-rose-400/10 transition-colors" aria-label="Delete item">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </td>
    `);

    // Attach dataset properties securely after creation
    const editBtn = row.querySelector('[data-action="edit"]');
    editBtn.dataset.name = data.itemName;
    editBtn.dataset.quantity = data.quantity;
    editBtn.dataset.threshold = data.threshold;

    return row;
}

// Event Listeners

inventoryTableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'edit') {
        modalTitle.textContent = 'Edit Item';
        itemIdInput.value = id;
        itemNameInput.value = btn.dataset.name;
        itemQuantityInput.value = btn.dataset.quantity;
        itemThresholdInput.value = btn.dataset.threshold;
        itemModal.classList.remove('hidden');
        itemModal.classList.add('flex');
    } else if (action === 'delete') {
        if (confirm("Are you sure you want to delete this item?")) {
            // Instant local update
            const oldRow = document.getElementById(`item-row-${id}`);
            if (oldRow) oldRow.remove();

            let items = getLocalInventory() || [];
            items = items.filter(i => i.id !== id);
            saveLocalInventory(items);

            if (inventoryTableBody.children.length === 0) {
                emptyState.classList.remove('hidden');
            }

            try {
                await deleteDoc(doc(db, "inventory", id));
            } catch (error) {
                logManagerError("Error deleting item from Firestore:", error);
            }
        }
    }
});

addItemBtn.addEventListener('click', () => {
    modalTitle.textContent = 'Add New Item';
    itemForm.reset();
    itemIdInput.value = '';
    itemModal.classList.remove('hidden');
    itemModal.classList.add('flex');
});

closeItemModal.addEventListener('click', () => {
    itemModal.classList.add('hidden');
    itemModal.classList.remove('flex');
});

cancelItemBtn.addEventListener('click', () => {
    itemModal.classList.add('hidden');
    itemModal.classList.remove('flex');
});

itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const effectiveOrgId = currentOrgId || (auth && auth.currentUser ? auth.currentUser.uid : 'demo-org');

    const id = itemIdInput.value;
    const name = itemNameInput.value.trim();
    const quantity = parseInt(itemQuantityInput.value, 10);
    const threshold = parseInt(itemThresholdInput.value, 10);

    const itemData = {
        itemName: name,
        quantity: quantity,
        threshold: threshold,
        orgId: effectiveOrgId
    };

    const targetId = id || ('inv_' + Date.now());
    itemData.id = targetId;

    // Instant local update
    let items = getLocalInventory() || [];
    if (id) {
        items = items.map(it => it.id === id ? { ...it, ...itemData } : it);
        const oldRow = document.getElementById(`item-row-${id}`);
        const newRow = renderItemRow(id, itemData);
        if (oldRow) {
            inventoryTableBody.replaceChild(newRow, oldRow);
        } else {
            inventoryTableBody.appendChild(newRow);
        }
    } else {
        items.push(itemData);
        const newRow = renderItemRow(targetId, itemData);
        inventoryTableBody.appendChild(newRow);
    }
    saveLocalInventory(items);

    emptyState.classList.add('hidden');
    itemModal.classList.add('hidden');
    itemModal.classList.remove('flex');
    if (window.lucide) window.lucide.createIcons();

    try {
        if (id) {
            const itemRef = doc(db, "inventory", id);
            await updateDoc(itemRef, itemData);
        } else {
            await addDoc(collection(db, "inventory"), itemData);
        }
    } catch (error) {
        logManagerError("Error syncing item to Firestore:", error);
    }
});
