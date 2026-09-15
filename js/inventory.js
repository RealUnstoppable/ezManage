import { auth, db } from '../firebase.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { escapeHTML } from './utils.js';

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

// Auth State Change
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Fetch user's orgId
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            currentOrgId = userDoc.data().orgId;
            if (currentOrgId) {
                loadInventory();
            } else {
                console.error("User does not belong to an organization.");
            }
        }
    } else {
        window.location.href = 'sign in beta.html';
    }
});

// Load Inventory Items Real-time
function loadInventory() {
    if (unsubscribeInventory) {
        unsubscribeInventory();
    }

    loadingSpinner.classList.remove('hidden');
    emptyState.classList.add('hidden');
    inventoryTableBody.innerHTML = '';

    const q = query(collection(db, "inventory"), where("orgId", "==", currentOrgId));

    unsubscribeInventory = onSnapshot(q, (snapshot) => {
        loadingSpinner.classList.add('hidden');
        inventoryTableBody.innerHTML = '';

        if (snapshot.empty) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            renderItemRow(id, data);
        });
    }, (error) => {
        console.error("Error fetching inventory:", error);
        loadingSpinner.classList.add('hidden');
        alert("Failed to load inventory. Please try again.");
    });
}

// Render Table Row
function renderItemRow(id, data) {
    const isLowStock = parseInt(data.quantity) < parseInt(data.threshold);
    const row = document.createElement('tr');
    row.className = `border-b border-slate-800/50 transition-colors hover:bg-slate-800/20 ${isLowStock ? 'bg-rose-900/10' : ''}`;

    row.innerHTML = `
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
    `;

    // Attach dataset properties securely after creation
    const editBtn = row.querySelector('[data-action="edit"]');
    editBtn.dataset.name = data.itemName;
    editBtn.dataset.quantity = data.quantity;
    editBtn.dataset.threshold = data.threshold;

    inventoryTableBody.appendChild(row);
    if (window.lucide) {
        window.lucide.createIcons();
    }
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
            try {
                await deleteDoc(doc(db, "inventory", id));
            } catch (error) {
                console.error("Error deleting item: ", error);
                alert("Failed to delete item.");
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

    if (!currentOrgId) {
        alert("Organization ID not found. Cannot save item.");
        return;
    }

    const id = itemIdInput.value;
    const name = itemNameInput.value.trim();
    const quantity = parseInt(itemQuantityInput.value, 10);
    const threshold = parseInt(itemThresholdInput.value, 10);

    const itemData = {
        itemName: name,
        quantity: quantity,
        threshold: threshold,
        orgId: currentOrgId
    };

    try {
        if (id) {
            // Update
            const itemRef = doc(db, "inventory", id);
            await updateDoc(itemRef, itemData);
        } else {
            // Create
            await addDoc(collection(db, "inventory"), itemData);
        }
        itemModal.classList.add('hidden');
        itemModal.classList.remove('flex');
    } catch (error) {
        console.error("Error saving item: ", error);
        alert("Failed to save item. Check console for details.");
    }
});
