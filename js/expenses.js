import { auth, db } from '../firebase.js';
import { collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { escapeHTML, logManagerError } from './utils.js';

let currentOrgId = null;
let unsubscribeExpenses = null;

// DOM Elements
const addExpenseBtn = document.getElementById('addExpenseBtn');
const expenseModal = document.getElementById('expenseModal');
const closeExpenseModal = document.getElementById('closeExpenseModal');
const expenseForm = document.getElementById('expenseForm');
const expenseTableBody = document.getElementById('expenseTableBody');
const expenseDescriptionInput = document.getElementById('expenseDescription');
const expenseAmountInput = document.getElementById('expenseAmount');
const expenseCategoryInput = document.getElementById('expenseCategory');
const cancelExpenseBtn = document.getElementById('cancelExpenseBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const emptyState = document.getElementById('emptyState');
const submitExpenseBtn = document.getElementById('submitExpenseBtn');

// Auth State Change
let currentUid = null;
let isDashboardLoaded = false;
onAuthStateChanged(auth, async (user) => {
    if (user && user.uid === currentUid && isDashboardLoaded) return;
    currentUid = user ? user.uid : null;
    isDashboardLoaded = true;
    if (user) {
        try {
            // Because window.firebase.functions isn't initialized if firebase-compat isn't used
            // we will fetch orgId natively via auth state callback to populate it immediately.
            // Using standard firestore approach since it's already there
            const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js");
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                currentOrgId = userDoc.data().orgId;
                if (currentOrgId) {
                    loadExpenses();
                } else {
                    logManagerError("User does not belong to an organization.");
                }
            }
        } catch (error) {
            logManagerError("Error fetching user profile", error);
        }
    } else {
        window.location.href = 'sign in beta.html';
    }
});

// Load Expenses Real-time
function loadExpenses() {
    if (unsubscribeExpenses) {
        unsubscribeExpenses();
    }

    loadingSpinner.classList.remove('hidden');
    emptyState.classList.add('hidden');
    expenseTableBody.innerHTML = '';

    const q = query(collection(db, "expenses"), where("orgId", "==", currentOrgId));

    let isInitialRender = true;
    unsubscribeExpenses = onSnapshot(q, (snapshot) => {
        loadingSpinner.classList.add('hidden');

        if (snapshot.empty) {
            emptyState.classList.remove('hidden');
            expenseTableBody.innerHTML = '';
            return;
        }

        emptyState.classList.add('hidden');

        if (isInitialRender) {
             expenseTableBody.innerHTML = '';
             isInitialRender = false;
        }

        snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            const id = change.doc.id;

            if (change.type === 'added') {
                const row = renderExpenseRow(id, data);
                if (expenseTableBody.children.length === 0 || change.newIndex >= expenseTableBody.children.length) {
                    expenseTableBody.appendChild(row);
                } else {
                    expenseTableBody.insertBefore(row, expenseTableBody.children[change.newIndex]);
                }
            } else if (change.type === 'modified') {
                const row = renderExpenseRow(id, data);
                const oldRow = document.querySelector(`tr[data-id="${id}"]`);
                if (oldRow) {
                    expenseTableBody.replaceChild(row, oldRow);
                }
            } else if (change.type === 'removed') {
                const row = document.querySelector(`tr[data-id="${id}"]`);
                if (row) {
                    row.remove();
                }
            }
        });

        if (window.lucide) window.lucide.createIcons();
    }, (error) => {
        logManagerError("Error fetching expenses", error);
        loadingSpinner.classList.add('hidden');
        alert("Failed to load expenses. Please try again.");
    });
}

// Render Table Row
function renderExpenseRow(id, data) {
    const row = document.createElement('tr');
    row.className = `border-b border-slate-800/50 transition-colors hover:bg-slate-800/20`;
    row.dataset.id = id;

    const dateStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString() : 'Just now';
    const amountStr = parseFloat(data.amount).toFixed(2);

    // Icon based on category
    let iconName = 'receipt';
    if(data.category === 'Supplies') iconName = 'shopping-cart';
    if(data.category === 'Repairs') iconName = 'tool';
    if(data.category === 'Register Shortage') iconName = 'alert-circle';

    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
            ${escapeHTML(dateStr)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
                <div class="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center mr-3 text-slate-300">
                    <i data-lucide="${iconName}" class="w-5 h-5"></i>
                </div>
                <div class="text-sm font-medium text-slate-200">${escapeHTML(data.description)}</div>
            </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
            ${escapeHTML(data.category)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-slate-800 text-sky-400">
                $${escapeHTML(amountStr)}
            </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
            ${escapeHTML(data.loggedByName || 'Unknown')}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button data-action="delete" data-id="${id}" class="text-rose-400 hover:text-rose-300 p-1 rounded-md hover:bg-rose-400/10 transition-colors" aria-label="Delete expense">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </td>
    `;

    return row;
}

// Event Listeners

expenseTableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'delete') {
        if (confirm("Are you sure you want to delete this expense?")) {
            try {
                const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/9.15.0/firebase-functions.js");
                const functions = getFunctions();
                const manageExpenses = httpsCallable(functions, 'manageExpenses');
                await manageExpenses({
                    action: "delete",
                    payload: { expenseId: id }
                });
            } catch (error) {
                logManagerError("Error deleting expense", error);
                alert("Failed to delete expense.");
            }
        }
    }
});

addExpenseBtn.addEventListener('click', () => {
    expenseForm.reset();
    expenseModal.classList.remove('hidden');
    expenseModal.classList.add('flex');
});

closeExpenseModal.addEventListener('click', () => {
    expenseModal.classList.add('hidden');
    expenseModal.classList.remove('flex');
});

cancelExpenseBtn.addEventListener('click', () => {
    expenseModal.classList.add('hidden');
    expenseModal.classList.remove('flex');
});

expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentOrgId) {
        alert("Organization ID not found. Cannot save expense.");
        return;
    }

    const description = expenseDescriptionInput.value.trim();
    const amount = expenseAmountInput.value;
    const category = expenseCategoryInput.value;

    const originalBtnText = submitExpenseBtn.innerHTML;
    submitExpenseBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
    submitExpenseBtn.disabled = true;
    submitExpenseBtn.classList.add('opacity-70', 'cursor-not-allowed');
    if (window.lucide) window.lucide.createIcons();

    try {
        const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/9.15.0/firebase-functions.js");
        const functions = getFunctions();
        const manageExpenses = httpsCallable(functions, 'manageExpenses');

        await manageExpenses({
            action: "create",
            payload: {
                description: description,
                amount: amount,
                category: category
            }
        });

        expenseModal.classList.add('hidden');
        expenseModal.classList.remove('flex');
        expenseForm.reset();
    } catch (error) {
        logManagerError("Error saving expense", error);
        alert("Failed to save expense. Check console for details.");
    } finally {
        submitExpenseBtn.innerHTML = originalBtnText;
        submitExpenseBtn.disabled = false;
        submitExpenseBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        if (window.lucide) window.lucide.createIcons();
    }
});
