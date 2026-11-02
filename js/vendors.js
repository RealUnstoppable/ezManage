import { auth, db } from '../firebase.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { logManagerError, escapeHTML } from './utils.js';

let currentOrgId = null;
let unsubscribeVendors = null;

// DOM Elements
const addVendorBtn = document.getElementById('addVendorBtn');
const vendorModal = document.getElementById('vendorModal');
const closeVendorModal = document.getElementById('closeVendorModal');
const vendorForm = document.getElementById('vendorForm');
const vendorTableBody = document.getElementById('vendorTableBody');
const modalTitle = document.getElementById('modalTitle');
const vendorIdInput = document.getElementById('vendorId');
const vendorNameInput = document.getElementById('vendorName');
const vendorContactInput = document.getElementById('vendorContact');
const vendorPhoneInput = document.getElementById('vendorPhone');
const vendorEmailInput = document.getElementById('vendorEmail');
const vendorCategoryInput = document.getElementById('vendorCategory');
const cancelVendorBtn = document.getElementById('cancelVendorBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const emptyState = document.getElementById('emptyState');

let currentUid = null;
let isDashboardLoaded = false;

// Local Vendors helpers for instant UI and offline/demo support
function getLocalVendors() {
    try {
        const stored = localStorage.getItem('ezManage_vendors_' + (currentOrgId || 'default'));
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        return null;
    }
}

function saveLocalVendors(items) {
    try {
        localStorage.setItem('ezManage_vendors_' + (currentOrgId || 'default'), JSON.stringify(items));
    } catch (e) {}
}

function renderLocalVendors(items) {
    vendorTableBody.replaceChildren();
    if (!items || items.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    items.forEach(item => {
        const row = renderVendorRow(item.id, item);
        vendorTableBody.appendChild(row);
    });
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
    loadVendors();
});

// Load Vendors Items Real-time
function loadVendors() {
    if (unsubscribeVendors) {
        unsubscribeVendors();
    }

    loadingSpinner.classList.remove('hidden');
    vendorTableBody.replaceChildren();
    emptyState.classList.add('hidden');

    let isInitialRender = true;

    // Check local inventory first for instant response
    const local = getLocalVendors();
    if (local && local.length > 0) {
        renderLocalVendors(local);
        loadingSpinner.classList.add('hidden');
        isInitialRender = false;
    }

    if (currentOrgId === 'demo-org') {
        loadingSpinner.classList.add('hidden');
        if (!local || local.length === 0) {
             emptyState.classList.remove('hidden');
        }
        return;
    }

    try {
        const q = query(collection(db, "vendors"), where("orgId", "==", currentOrgId));

        // Timeout to handle slow connections
        const loadTimeout = setTimeout(() => {
             loadingSpinner.classList.add('hidden');
             const loc = getLocalVendors();
             if (loc && loc.length > 0) {
                  renderLocalVendors(loc);
             } else {
                  emptyState.classList.remove('hidden');
             }
        }, 5000);

        unsubscribeVendors = onSnapshot(q, (snapshot) => {
            clearTimeout(loadTimeout);
            loadingSpinner.classList.add('hidden');

            if (snapshot.empty) {
                const loc = getLocalVendors();
                if (loc && loc.length > 0) {
                    renderLocalVendors(loc);
                } else {
                    emptyState.classList.remove('hidden');
                    vendorTableBody.replaceChildren();
                }
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            emptyState.classList.add('hidden');

            const remoteItems = [];
            snapshot.forEach(d => remoteItems.push({ id: d.id, ...d.data() }));
            saveLocalVendors(remoteItems);

            if (isInitialRender) {
                 vendorTableBody.replaceChildren();
                 isInitialRender = false;
            }

            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                const id = change.doc.id;

                if (change.type === 'added') {
                    const row = renderVendorRow(id, data);
                    const existingNodes = vendorTableBody.children;
                    if (existingNodes.length > change.newIndex) {
                        vendorTableBody.insertBefore(row, existingNodes[change.newIndex]);
                    } else {
                        vendorTableBody.appendChild(row);
                    }
                }
                if (change.type === 'modified') {
                    const oldRow = document.getElementById(`vendor-row-${id}`);
                    const newRow = renderVendorRow(id, data);

                    if (oldRow) {
                        if (change.oldIndex === change.newIndex) {
                            vendorTableBody.replaceChild(newRow, oldRow);
                        } else {
                            oldRow.remove();
                            const existingNodes = vendorTableBody.children;
                            if (existingNodes.length > change.newIndex) {
                                vendorTableBody.insertBefore(newRow, existingNodes[change.newIndex]);
                            } else {
                                vendorTableBody.appendChild(newRow);
                            }
                        }
                    } else {
                        const existingNodes = vendorTableBody.children;
                        if (existingNodes.length > change.newIndex) {
                            vendorTableBody.insertBefore(newRow, existingNodes[change.newIndex]);
                        } else {
                            vendorTableBody.appendChild(newRow);
                        }
                    }
                }
                if (change.type === 'removed') {
                    const oldRow = document.getElementById(`vendor-row-${id}`);
                    if (oldRow) {
                        oldRow.remove();
                    }
                }
            });

            if (window.lucide) window.lucide.createIcons();
        }, (error) => {
            clearTimeout(loadTimeout);
            logManagerError("Error fetching vendors:", error);
            loadingSpinner.classList.add('hidden');
            const loc = getLocalVendors();
            if (loc && loc.length > 0) {
                renderLocalVendors(loc);
            } else {
                emptyState.classList.remove('hidden');
            }
            if (window.lucide) window.lucide.createIcons();
        });
    } catch (err) {
        logManagerError("Firestore onSnapshot error:", err);
        loadingSpinner.classList.add('hidden');
        const loc = getLocalVendors();
        if (loc && loc.length > 0) {
            renderLocalVendors(loc);
        } else {
            emptyState.classList.remove('hidden');
        }
        if (window.lucide) window.lucide.createIcons();
    }
}

// Render Table Row
function renderVendorRow(id, data) {
    const row = document.createElement('tr');
    row.id = `vendor-row-${id}`;
    row.className = `border-b border-slate-800/50 transition-colors hover:bg-slate-800/20`;

    const phoneOrEmail = (data.vendorPhone || '') + ((data.vendorPhone && data.vendorEmail) ? ' / ' : '') + (data.vendorEmail || '');

    let iconName = 'truck';
    if(data.vendorCategory === 'Supplies') iconName = 'box';
    if(data.vendorCategory === 'Maintenance') iconName = 'tool';
    if(data.vendorCategory === 'Services') iconName = 'briefcase';

    row.insertAdjacentHTML('beforeend', `
        <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
                <div class="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center mr-3 text-slate-300">
                    <i data-lucide="${iconName}"></i>
                </div>
                <div class="text-sm font-medium text-slate-200">${escapeHTML(data.vendorName)}</div>
            </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
            ${escapeHTML(data.vendorContact)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
            ${escapeHTML(phoneOrEmail)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-800 text-slate-300">
                ${escapeHTML(data.vendorCategory)}
            </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button data-action="edit" data-id="${id}" class="text-sky-400 hover:text-sky-300 mr-3 p-1 rounded-md hover:bg-sky-400/10 transition-colors" aria-label="Edit vendor">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
            </button>
            <button data-action="delete" data-id="${id}" class="text-rose-400 hover:text-rose-300 p-1 rounded-md hover:bg-rose-400/10 transition-colors" aria-label="Delete vendor">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </td>
    `);

    const editBtn = row.querySelector('[data-action="edit"]');
    editBtn.dataset.name = data.vendorName;
    editBtn.dataset.contact = data.vendorContact;
    editBtn.dataset.phone = data.vendorPhone || '';
    editBtn.dataset.email = data.vendorEmail || '';
    editBtn.dataset.category = data.vendorCategory || 'Supplies';

    return row;
}

// Event Listeners

vendorTableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'edit') {
        modalTitle.textContent = 'Edit Vendor';
        vendorIdInput.value = id;
        vendorNameInput.value = btn.dataset.name;
        vendorContactInput.value = btn.dataset.contact;
        vendorPhoneInput.value = btn.dataset.phone;
        vendorEmailInput.value = btn.dataset.email;
        vendorCategoryInput.value = btn.dataset.category;
        vendorModal.classList.remove('hidden');
        vendorModal.classList.add('flex');
    } else if (action === 'delete') {
        if (confirm("Are you sure you want to delete this vendor?")) {
            const oldRow = document.getElementById(`vendor-row-${id}`);
            if (oldRow) oldRow.remove();

            let items = getLocalVendors() || [];
            items = items.filter(i => i.id !== id);
            saveLocalVendors(items);

            if (vendorTableBody.children.length === 0) {
                emptyState.classList.remove('hidden');
            }

            try {
                await deleteDoc(doc(db, "vendors", id));
            } catch (error) {
                logManagerError("Error deleting vendor from Firestore:", error);
            }
        }
    }
});

addVendorBtn.addEventListener('click', () => {
    modalTitle.textContent = 'Add New Vendor';
    vendorForm.reset();
    vendorIdInput.value = '';
    vendorModal.classList.remove('hidden');
    vendorModal.classList.add('flex');
});

closeVendorModal.addEventListener('click', () => {
    vendorModal.classList.add('hidden');
    vendorModal.classList.remove('flex');
});

cancelVendorBtn.addEventListener('click', () => {
    vendorModal.classList.add('hidden');
    vendorModal.classList.remove('flex');
});

vendorForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const effectiveOrgId = currentOrgId || (auth && auth.currentUser ? auth.currentUser.uid : 'demo-org');

    const id = vendorIdInput.value;
    const name = vendorNameInput.value.trim();
    const contact = vendorContactInput.value.trim();
    const phone = vendorPhoneInput.value.trim();
    const email = vendorEmailInput.value.trim();
    const category = vendorCategoryInput.value;

    const vendorData = {
        vendorName: name,
        vendorContact: contact,
        vendorPhone: phone,
        vendorEmail: email,
        vendorCategory: category,
        orgId: effectiveOrgId
    };

    const targetId = id || ('ven_' + Date.now());
    vendorData.id = targetId;

    // Wait for the server response for add to avoid duplicate optimistic UI rows.
    // For updates, we can optimistically update safely.
    if (id) {
        let items = getLocalVendors() || [];
        items = items.map(it => it.id === id ? { ...it, ...vendorData } : it);
        const oldRow = document.getElementById(`vendor-row-${id}`);
        const newRow = renderVendorRow(id, vendorData);
        if (oldRow) {
            vendorTableBody.replaceChild(newRow, oldRow);
        } else {
            vendorTableBody.appendChild(newRow);
        }
        saveLocalVendors(items);
    }

    emptyState.classList.add('hidden');
    vendorModal.classList.add('hidden');
    vendorModal.classList.remove('flex');
    if (window.lucide) window.lucide.createIcons();

    try {
        if (id) {
            const itemRef = doc(db, "vendors", id);
            await updateDoc(itemRef, vendorData);
        } else {
            await addDoc(collection(db, "vendors"), vendorData);
        }
    } catch (error) {
        logManagerError("Error syncing vendor to Firestore:", error);
    }
});
