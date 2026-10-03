const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add Sidebar Link
const sidebarLink = `
            <a href="#" onclick="navTo('lostandfound')"
                class="flex items-center gap-4 font-bold text-lg hover:text-sky-500"><i data-lucide="search"></i>
                Lost & Found</a>`;

if (!html.includes("navTo('lostandfound')")) {
    html = html.replace(
        '<a href="#" onclick="navTo(\'deliveries\')"',
        sidebarLink + '\n\n            <a href="#" onclick="navTo(\'deliveries\')"'
    );
}

// 2. Add View Block
const viewBlock = `
        <div id="view-lostandfound" class="view-section px-6 py-12 hidden">
            <div class="max-w-4xl mx-auto">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h1 class="text-4xl font-black">Lost & Found</h1>
                    <button onclick="document.getElementById('reportLostItemModal').classList.toggle('hidden')"
                        class="btn btn-primary flex items-center gap-2 px-6">
                        <i data-lucide="plus-circle" class="w-5 h-5"></i> Log Item
                    </button>
                </div>

                <div id="reportLostItemModal"
                    class="hidden bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-800 mb-12">
                    <h2 class="text-xl font-bold mb-4">Log Found Item</h2>
                    <div class="space-y-4">
                        <input type="text" id="lostItemName" placeholder="Item Name (e.g. Black Wallet, Keys)" aria-label="Item Name"
                            class="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border-none focus:ring-2 focus:ring-sky-500">
                        <textarea id="lostItemDesc" placeholder="Description / Location found..." aria-label="Item Description" rows="3"
                            class="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border-none focus:ring-2 focus:ring-sky-500 resize-none"></textarea>

                        <div class="flex flex-col md:flex-row gap-4">
                            <select id="lostItemStatus" aria-label="Item Status"
                                class="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border-none focus:ring-2 focus:ring-sky-500">
                                <option value="Found">Found / Held</option>
                                <option value="Claimed">Claimed by Owner</option>
                            </select>
                            <input type="date" id="lostItemDate" class="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border-none focus:ring-2 focus:ring-sky-500" aria-label="Date Found">
                        </div>

                        <div class="flex justify-end gap-3 pt-2">
                            <button onclick="document.getElementById('reportLostItemModal').classList.add('hidden')"
                                class="btn btn-outline px-6 py-2">Cancel</button>
                            <button onclick="submitLostItem()" class="btn btn-accent px-6 py-2">Log Item</button>
                        </div>
                    </div>
                </div>

                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-black">Logged Items</h2>
                    <button onclick="fetchLostAndFound()"
                        class="text-sm font-bold text-sky-500 hover:text-sky-600 flex items-center gap-2">
                        <i data-lucide="refresh-cw" class="w-4 h-4"></i> Refresh
                    </button>
                </div>

                <div id="lostAndFoundContainer" class="space-y-4">
                    <!-- Items populated via JS -->
                </div>
            </div>
        </div>
`;

if (!html.includes('id="view-lostandfound"')) {
    html = html.replace(
        '<div id="view-incidents" class="view-section px-6 py-12 hidden">',
        viewBlock + '\n        <div id="view-incidents" class="view-section px-6 py-12 hidden">'
    );
}

// 3. Update navTo
const authRoutes = "['history', 'presets', 'performance', 'request', 'profile', 'shiftNotes', 'team', 'employees', 'timeoff', 'tasks', 'announcements', 'deliveries', 'marketplace']";
const newAuthRoutes = "['history', 'presets', 'performance', 'request', 'profile', 'shiftNotes', 'team', 'employees', 'timeoff', 'tasks', 'announcements', 'deliveries', 'marketplace', 'lostandfound']";

html = html.replace(authRoutes, newAuthRoutes);

const fetchCall = `
            if (viewId === 'lostandfound' && currentUser) {
                fetchLostAndFound();
            }
`;

if (!html.includes('viewId === \'lostandfound\'')) {
    html = html.replace(
        'if (viewId === \'incidents\' && currentUser) {',
        fetchCall + '\n            if (viewId === \'incidents\' && currentUser) {'
    );
}

// 4. JS Logic
const jsLogic = `
        window.fetchLostAndFound = fetchLostAndFound;
        async function submitLostItem() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                alert("You must be part of an organization to log lost & found items.");
                return;
            }

            const itemName = document.getElementById('lostItemName').value.trim();
            const description = document.getElementById('lostItemDesc').value.trim();
            const status = document.getElementById('lostItemStatus').value;
            const dateFound = document.getElementById('lostItemDate').value;

            if (!itemName) {
                alert("Please provide the item name.");
                return;
            }

            const submitBtn = document.querySelector('#reportLostItemModal .btn-accent');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Submitting...';
            submitBtn.disabled = true;
            lucide.createIcons();

            try {
                await callCloudFunction('manageLostAndFound', {
                    action: "create",
                    payload: { itemName, description, status, dateFound }
                });

                document.getElementById('lostItemName').value = '';
                document.getElementById('lostItemDesc').value = '';
                document.getElementById('lostItemStatus').value = 'Found';
                document.getElementById('lostItemDate').value = '';
                document.getElementById('reportLostItemModal').classList.add('hidden');

                alert("Item logged successfully.");
                fetchLostAndFound();
            } catch (error) {
                window.logManagerError("Error logging item:", error);
                alert("Failed to log item. " + error.message);
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                lucide.createIcons();
            }
        }

        async function fetchLostAndFound() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                const container = document.getElementById('lostAndFoundContainer');
                if (container) {
                    container.innerHTML = \`
                        <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <i data-lucide="users" class="w-12 h-12 text-slate-400 mx-auto mb-4"></i>
                            <h3 class="text-xl font-bold mb-2">Join or Create a Group</h3>
                            <p class="text-slate-500 mb-4">You must be in a Management Group to view lost & found items.</p>
                        </div>
                    \`;
                    lucide.createIcons();
                }
                return;
            }

            const container = document.getElementById('lostAndFoundContainer');
            container.innerHTML = '<div class="text-center py-8"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-sky-500 mb-4"></i><p class="text-slate-500">Loading items...</p></div>';
            lucide.createIcons();

            try {
                const result = await callCloudFunction('manageLostAndFound', { action: "get", payload: {} });

                if (result.data.success) {
                    const items = result.data.items || [];
                    container.innerHTML = '';

                    if (items.length === 0) {
                        container.innerHTML = \`
                            <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <i data-lucide="check-circle-2" class="w-12 h-12 text-emerald-400 mx-auto mb-4"></i>
                                <h3 class="text-xl font-bold mb-2">No Items Logged!</h3>
                                <p class="text-slate-500">There are no lost items reported.</p>
                            </div>
                        \`;
                        lucide.createIcons();
                        return;
                    }

                    const fragment = document.createDocumentFragment();

                    items.forEach(item => {
                        const statusColors = {
                            'Found': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                            'Claimed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        };

                        const dateStr = item.dateFound || (item.timestamp ? new Date(item.timestamp._seconds * 1000).toLocaleDateString() : 'Just now');

                        const div = document.createElement('div');
                        div.id = \`lost-item-\${escapeHTML(item.id)}\`;
                        div.className = \`card p-6 border-l-4 \${item.status === 'Found' ? 'border-l-amber-500' : 'border-l-emerald-500'}\`;

                        div.innerHTML = \`
                            <div class="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                <div>
                                    <h3 class="text-lg font-bold">\${escapeHTML(item.itemName)}</h3>
                                    <p class="text-sm text-slate-500">Logged by \${escapeHTML(item.loggedByName)} • Date Found: \${escapeHTML(dateStr)}</p>
                                </div>
                                <div class="flex gap-2 items-start">
                                    <select aria-label="Update item status" class="px-3 py-1 rounded-full text-xs font-bold border appearance-none cursor-pointer focus:outline-none lostitem-status-select \${statusColors[item.status] || statusColors['Found']}" data-item-id="\${escapeHTML(item.id)}">
                                        <option value="Found" \${item.status === 'Found' ? 'selected' : ''}>Found / Held</option>
                                        <option value="Claimed" \${item.status === 'Claimed' ? 'selected' : ''}>Claimed</option>
                                    </select>
                                    <button data-action="deleteLostItem" data-id="\${escapeHTML(item.id)}" class="text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md ml-2" aria-label="Delete Item"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                </div>
                            </div>
                            <p class="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">\${escapeHTML(item.description)}</p>
                        \`;
                        fragment.appendChild(div);
                    });
                    container.appendChild(fragment);
                    lucide.createIcons();
                }
            } catch (error) {
                console.error("Error fetching items:", error);
                container.innerHTML = \`<div class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">Failed to load items: \${window.escapeHTML ? window.escapeHTML(error.message) : error.message}</div>\`;
            }
        }

        async function updateLostItemStatus(itemId, newStatus) {
            try {
                await callCloudFunction('manageLostAndFound', {
                    action: "updateStatus",
                    payload: { itemId, status: newStatus }
                });
                // Optimistic UI update handled by changing the select value
            } catch (error) {
                window.logManagerError("Error updating item:", error);
                alert("Failed to update status. " + error.message);
                fetchLostAndFound(); // revert
            }
        }

        async function deleteLostItem(itemId) {
            if (!confirm("Are you sure you want to permanently delete this item log?")) return;
            const incEl = document.getElementById('lost-item-' + escapeHTML(itemId));
            if (incEl) incEl.style.display = 'none'; // Optimistically hide
            try {
                await callCloudFunction('manageLostAndFound', { action: "delete", payload: { itemId } });
                fetchLostAndFound();
            } catch (err) {
                logManagerError("Error deleting item:", err);
                alert("Failed to delete item.");
                fetchLostAndFound(); // Revert on failure
            }
        }

`;

if (!html.includes('function submitLostItem')) {
    html = html.replace(
        'window.addEventListener(\'offline\', updateNetworkStatus);',
        jsLogic + '\n        window.addEventListener(\'offline\', updateNetworkStatus);'
    );
}

// 5. Event delegation
const delg = `
            if (e.target && e.target.classList.contains('lostitem-status-select')) {
                const itemId = e.target.getAttribute('data-item-id');
                if (itemId) {
                    updateLostItemStatus(itemId, e.target.value);
                }
            }
`;

if (!html.includes('lostitem-status-select')) {
    html = html.replace(
        'if (e.target && e.target.classList.contains(\'incident-status-select\')) {',
        delg + '\n            if (e.target && e.target.classList.contains(\'incident-status-select\')) {'
    );
}

// 6. Delete action delegation
const delg2 = `
                if (action === 'deleteLostItem') deleteLostItem(id);
`;
if (!html.includes("action === 'deleteLostItem'")) {
    html = html.replace(
        'if (action === \'deleteIncident\') deleteIncident(id);',
        delg2 + '                if (action === \'deleteIncident\') deleteIncident(id);'
    );
}

fs.writeFileSync('index.html', html);
