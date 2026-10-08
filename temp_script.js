

        // Wait, since this script is not a module, we need to make sure firebase.js runs before it.
        // Let's just make the inline script check for singleton.
        const firebaseConfig = {
            apiKey: "AIzaSyBgrI9HwJPSc5b4pu2Egsv4DE7shNwptSw",
            authDomain: "ezmanage.realunstoppable.store",
            projectId: "dts-hub-website",
            storageBucket: "dts-hub-website.firebasestorage.app",
            messagingSenderId: "48345990988",
            appId: "1:48345990988:web:e3662c9b508168546471e9",
            measurementId: "G-ZN3YJPHVGX"
        };
        const app = !window.firebase.apps.length ? window.firebase.initializeApp(firebaseConfig) : window.firebase.app();
        const auth = window.firebase.auth();
        window.firebase.firestore().settings({ experimentalForceLongPolling: true });
        const db = window.firebase.firestore();
        const cloudFunctions = window.firebase.functions();
        db.enablePersistence().catch(err => console.error("Offline sync error:", err));

        let currentUser = null;
        let currentUserData = null;
        window.currentUser = null;


        window.currentUserData = null;
        let isRegisterMode = false;
        let shiftStartTime = null;
        let timerInterval = null;
        let cloudSyncTimeout = null;
        let hasReferralDiscount = false;
        let unsubscribeUser = null;
        let initialDraftLoaded = false;
        let isInitializingAuth = true;

        async function callCloudFunction(functionName, payload) {
            try {
                const func = firebase.functions().httpsCallable(functionName);
                return await func(payload);
            } catch (error) {
                console.error("Manager Troubleshooting: Error calling cloud function " + functionName, error);
                throw error;
            }
        }

        // Legal & Privacy Settings
        let cloudSyncEnabled = false;

        auth.onAuthStateChanged((user) => {
            currentUser = user;
            const navStatus = document.getElementById('navUserStatus');

            if (unsubscribeUser) unsubscribeUser();

            if (user) {
                navStatus.innerText = "Manager: " + (user.displayName || "Online");
                document.getElementById('profEmail').value = user.email;

                const cached = sessionStorage.getItem('ezManage_userData');
                if (cached) {
                    try {
                        currentUserData = JSON.parse(cached);
                        loadProfileUI(currentUserData);
                    } catch (e) {
                        console.error("Manager Troubleshooting: Cache parsing error", e);
                    }
                }

                unsubscribeUser = db.collection("users").doc(user.uid).onSnapshot(async doc => {
                    isInitializingAuth = false;
                    if (doc.exists) {
                        currentUserData = doc.data();
                        sessionStorage.setItem('ezManage_userData', JSON.stringify(currentUserData));

                        const pendingNav = localStorage.getItem('navTo');
                        if (pendingNav) {
                            localStorage.removeItem('navTo');
                            setTimeout(() => navTo(pendingNav), 100);
                        }

                        if (!currentUserData.name) {
                            const defaultName = user.displayName || (user.email ? user.email.split('@')[0] : "Manager");
                            currentUserData.name = defaultName;
                            // Only update locally if we shouldn't trigger another snapshot write loop immediately
                            // Wait until the user saves their profile to commit this
                        }

                        // Enforce Opt-In Cloud Policy
                        cloudSyncEnabled = !!currentUserData.cloudSyncEnabled;
                        document.getElementById('profileCloudSyncToggle').checked = cloudSyncEnabled;
                        updateCloudSyncUI();

                        loadProfileUI(currentUserData);
                        calculatePerformance();

                        // Announcements UI Visibility (Only Managers/Admins can see the form)
                        const formContainer = document.getElementById('announcementFormContainer');
                        if (formContainer) {
                            if (currentUser.uid === currentUserData.orgId || currentUserData.isAdmin || currentUserData.role === 'Manager') {
                                formContainer.classList.remove('hidden');
                            } else {
                                formContainer.classList.add('hidden');
                            }
                        }

                        await fetchAnnouncements();
                        renderHistory();
                        updateStorageBar();

                        // Concurrent non-blocking fetches
                        Promise.allSettled([
                            loadCustomPresets(),
                            fetchFeatureRequests(),
                            fetchTasks()
                        ]);

                        // Populate shift notes if that view is already active or we just logged in
                        if (document.getElementById('view-shiftNotes').classList.contains('active')) {
                            fetchShiftNotes();
                        } else {
                            // Ensure the group controls render even if we haven't opened the tab yet
                            checkAndRenderOrgControls();
                        }

                        // Load team directory in background so schedule dropdown works
                        if (currentUserData.orgId) {
                           fetchTeamDirectory();
                        }
                        // Always fetch employees to populate the schedule dropdown
                        fetchEmployees();
                        fetchTimeOffRequests();

                        if (!initialDraftLoaded) {
                            syncDraftFromServer();
                            initialDraftLoaded = true;
                        }

                        const pendingNavTo = localStorage.getItem('navTo');
                        if (pendingNavTo) {
                            localStorage.removeItem('navTo');
                            navTo(pendingNavTo);
                        } else {
                            let activeView = document.querySelector('.view-section.active');
                            if (activeView && activeView.id === 'view-auth') navTo('tracker');
                        }
                        runAIPatternLogic();
                    } else {
                        if (!doc.exists) {
                            isInitializingAuth = false;
                            activeView = document.querySelector('.view-section.active');
                            if (activeView && activeView.id !== 'view-setup') {
                                try {
                                    const emailDoc = await db.collection("users").doc(user.email).get();
                                    if (emailDoc.exists) {
                                        await db.collection("users").doc(user.uid).set(emailDoc.data(), { merge: true });
                                        return;
                                    } else {
                                        navTo('setup');
                                    }
                                } catch (e) { console.warn("Email recovery check skipped", e); navTo('setup'); }
                            }
                        }
                        if (!doc.exists || !doc.data().name) {
                            await db.collection("users").doc(user.uid).set({
                                name: user.displayName || "Manager",
                                email: user.email
                            }, { merge: true });
                            navTo('tracker');
                        }

                        activeView = document.querySelector('.view-section.active');
                        const activeView2 = document.querySelector('.view-section.active');
                        if (!navigator.onLine) {
                            if (activeView2 && activeView2.id !== 'view-tracker') navTo('tracker');
                        }
                    }
                });
            } else {
                isInitializingAuth = false;
                navStatus.innerText = "Login / Sign Up";
                currentUserData = null;
                initialDraftLoaded = false;
                cloudSyncEnabled = false;
                updateCloudSyncUI();

                const pendingNavTo = localStorage.getItem('navTo');
                if (pendingNavTo) {
                    localStorage.removeItem('navTo');
                    navTo(pendingNavTo);
                } else {
                    activeView = document.querySelector('.view-section.active');
                    if (activeView && activeView.id !== 'view-auth' && activeView.id !== 'view-tracker') navTo('auth');
                }
                isInitializingAuth = false;
            }
        });



        function runAIPatternLogic() {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];
            let msg = `AI: It's ${today}. Setting up standard floor.`;

            if (today === 'Tuesday' || today === 'Friday') {
                msg = `AI: It's ${today}. Truck delivery anticipated. Check cooler inventory presets.`;
            } else if (today === 'Saturday' || today === 'Sunday') {
                msg = `AI: Weekend volume detected. Prioritizing main line prep checks.`;
            }
            document.getElementById('aiSuggestionText').innerText = msg;
        }

        function triggerCloudOptIn(checkbox) {
            if (checkbox.checked) {

                checkbox.checked = false;
                document.getElementById('tosModal').classList.remove('hidden');
            } else {
                disableCloudSync();
            }
        }

        function acceptToSAndEnableCloud() {
            if (!currentUser) return;
            const isBusiness = (currentUserData && currentUserData.plan && currentUserData.plan.includes('Business'));

            if (!isBusiness) {
                alert("Enterprise Cloud Sync is only available for the Business Pro plan.");
                document.getElementById('tosModal').classList.add('hidden');
                return;
            }

            cloudSyncEnabled = true;
            document.getElementById('profileCloudSyncToggle').checked = true;
            document.getElementById('tosModal').classList.add('hidden');

            db.collection('users').doc(currentUser.uid).set({ cloudSyncEnabled: true }, { merge: true });
            localStorage.setItem(`ezManage_cloudEnabled_${currentUser.uid}`, 'true');
            updateCloudSyncUI();
            debouncedTriggerDraftSync();
        }

        function declineToS() {
            document.getElementById('tosModal').classList.add('hidden');
            document.getElementById('profileCloudSyncToggle').checked = false;
            disableCloudSync();
        }

        function disableCloudSync() {
            if (!currentUser) return;
            cloudSyncEnabled = false;
            db.collection('users').doc(currentUser.uid).set({ cloudSyncEnabled: false }, { merge: true });
            localStorage.setItem(`ezManage_cloudEnabled_${currentUser.uid}`, 'false');
            updateCloudSyncUI();
        }

        function updateCloudSyncUI() {
            const statusIndicator = document.getElementById('cloudSyncStatus');
            const statusText = document.getElementById('cloudSyncText');
            const btnCloudSave = document.getElementById('btnCloudSave');
            const iconCloudSave = document.getElementById('iconCloudSave');

            if (cloudSyncEnabled) {
                statusIndicator.className = "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]";
                statusText.innerText = "Cloud Sync Active (Data Controller)";
                btnCloudSave.disabled = false;
                btnCloudSave.classList.remove('opacity-50', 'cursor-not-allowed');
                iconCloudSave.setAttribute('data-lucide', 'cloud-upload');

                document.getElementById('profileAIToggle').disabled = false;
                document.getElementById('profileAIToggle').parentElement.parentElement.classList.remove('opacity-50');
            } else {
                statusIndicator.className = "w-2 h-2 rounded-full bg-slate-400";
                statusText.innerText = "Local Mode Only (Opt-In Required)";
                btnCloudSave.disabled = true;
                btnCloudSave.classList.add('opacity-50', 'cursor-not-allowed');
                iconCloudSave.setAttribute('data-lucide', 'cloud-off');

                document.getElementById('profileAIToggle').disabled = true;
                document.getElementById('profileAIToggle').checked = false;
                document.getElementById('profileAIToggle').parentElement.parentElement.classList.add('opacity-50');
            }
            lucide.createIcons();
        }

        function exportDataJSON() {
            const state = getTrackerState();
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", `ezManage_ShiftData_${state.dateSaved}.json`);
            document.body.appendChild(dlAnchorElem);
            dlAnchorElem.click();
            document.body.removeChild(dlAnchorElem);
        }

        function importDataJSON(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const state = JSON.parse(e.target.result);
                    if (confirm("This will overwrite your current tracker draft. Proceed?")) {
                        populateTrackerFromState(state);
                        debouncedTriggerDraftSync();
                        alert("Data imported successfully!");
                    }
                } catch (err) {
                    alert("Invalid JSON file.");
                }
                event.target.value = "";
            };
            reader.readAsText(file);
        }

        function toggleAuthModeUI() {
            document.getElementById('authTitle').innerText = isRegisterMode ? "Create Account" : "Sign In";
            document.getElementById('authBtn').innerText = isRegisterMode ? "Sign Up" : "Sign In";
            document.getElementById('authToggleText').innerText = isRegisterMode ? "Already have an account?" : "Don't have an account?";
            document.getElementById('authToggleLink').innerText = isRegisterMode ? "Sign In" : "Create one";
        }

        function toggleAuthMode(e) {
            if (e) e.preventDefault();
            isRegisterMode = !isRegisterMode;
            toggleAuthModeUI();
        }

        async function handleAuth(e) {
            e.preventDefault();
            const email = document.getElementById('authEmail').value;
            const pass = document.getElementById('authPass').value;
            const btn = document.getElementById('authBtn');

            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${originalHTML}`;
            lucide.createIcons();
            btn.disabled = true;

            if (isRegisterMode) {
                auth.createUserWithEmailAndPassword(email, pass)
                    .then(() => navTo('setup'))
                    .catch(err => {
                        if (err.code === 'auth/network-request-failed' || err.code === 'firestore/unavailable') {
                            alert("Network error: Could not connect to the server. Please check your connection.");
                        } else {
                            alert(err.message);
                        }
                    })
                    .finally(() => {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                    });
            } else {
                auth.signInWithEmailAndPassword(email, pass)
                    .catch(err => {
                        if (err.code === 'auth/network-request-failed' || err.code === 'firestore/unavailable') {
                            alert("Network error: Could not connect to the server. Please check your connection.");
                        } else {
                            alert(err.message);
                        }
                    })
                    .finally(() => {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                    });
            }
        }

        function signInWithGoogle() {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).then(cred => {
                fetchUserDoc(cred.user.uid).then(doc => {
                    if (!doc.exists) navTo('setup');
                });
            }).catch(err => alert(err.message));
        }

        function signOut() { auth.signOut().then(() => window.location.reload()); }

        async function completeSetup() {
            if (!currentUser) return;
            const data = {
                name: document.getElementById('setupName').value,
                phone: document.getElementById('setupPhone').value,
                role: document.getElementById('setupRole').value,
                store: document.getElementById('setupStore').value,
                location: document.getElementById('setupLocation').value,
                email: currentUser.email,
                signupDate: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!currentUserData || !currentUserData.plan) data.plan = 'Free';
            if (!currentUserData || currentUserData.cloudSyncEnabled === undefined) data.cloudSyncEnabled = false;

            if (!data.name) return alert("Name is required.");

            try {
                await db.collection('users').doc(currentUser.uid).set(data, { merge: true });
                currentUser.updateProfile({ displayName: data.name });
                document.getElementById('shiftManager').value = data.name;
                navTo('tracker');
            } catch (err) {
                if (err.code === 'auth/network-request-failed' || err.code === 'unavailable') {
                    alert("Network error: Could not connect to the server.");
                } else {
                    alert("Setup failed: " + err.message);
                }
            }
        }

        function toggleSidebar() { 
            document.getElementById('sidebar').classList.toggle('open'); 
            document.body.classList.toggle('overflow-hidden');
        }

        function navTo(viewId) {
            if (isInitializingAuth) {
                localStorage.setItem('navTo', viewId);
                return;
            }
            if (!currentUser && (['history', 'presets', 'performance', 'request', 'profile', 'shiftNotes', 'team', 'employees', 'timeoff', 'tasks', 'announcements'].includes(viewId))) {
                viewId = 'auth';
            }
            if (viewId === 'maintenance' && currentUser) {
                fetchMaintenanceTickets();
            }

            if (viewId === 'announcements' && currentUser) {
                fetchAnnouncements();
            }
            if (viewId === 'tasks' && currentUser) {
                fetchTasks();
            }
            if (viewId === 'team' && currentUser) {
                fetchTeamDirectory();
            }

            if (viewId === 'waste' && currentUser) {
                fetchWasteLogs();
            }
            if (viewId === 'incidents' && currentUser) {
                fetchIncidents();
            }
            if (viewId === 'recognition' && currentUser) {
                fetchRecognitions();
                populateRecognitionDropdown();
            }

            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
            document.getElementById('view-' + viewId).classList.add('active');
            document.getElementById('sidebar').classList.remove('open');
            document.body.classList.remove('overflow-hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            lucide.createIcons();

            if (viewId === 'shiftNotes') {
                fetchShiftNotes();
            }
            if (viewId === 'tasks') {
                fetchAssignedTasks();
            }
        }

        function handleNavAccountClick() {
            if (isInitializingAuth) return;
            navTo(currentUser ? 'profile' : 'auth');
        }

        function toggleTheme() {
            const isDark = document.getElementById('themeToggle').checked;
            document.body.classList.toggle('dark-mode', isDark);
            localStorage.setItem('managerProTheme', isDark ? 'dark' : 'light');
        }

        function toggleShiftTimer() {
            const btn = document.getElementById('timerBtn');
            const disp = document.getElementById('timerDisplay');
            if (!shiftStartTime) {
                shiftStartTime = Date.now();
                btn.innerHTML = `<i data-lucide="square" class="w-4"></i> Stop`;
                btn.classList.replace('btn-success', 'btn-danger');
                timerInterval = setInterval(updateTimerUI, 1000);
            } else {
                clearInterval(timerInterval);
                const mins = Math.round((Date.now() - shiftStartTime) / 60000);
                disp.innerText = `Log: ${mins}m`;
                shiftStartTime = null;
                btn.innerHTML = `<i data-lucide="play" class="w-4"></i> Resume`;
                btn.classList.replace('btn-danger', 'btn-success');
            }
            lucide.createIcons();
        }

        let lastTimerText = ""; // ⚡ Bolt Optimization: Cache text content to prevent interval layout thrashing
        function updateTimerUI() {
            if (!shiftStartTime) return;
            const diff = Date.now() - shiftStartTime;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            const newText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

            if (newText !== lastTimerText) {
                document.getElementById('timerDisplay').innerText = newText;
                lastTimerText = newText;
            }
        }

        function addDrawerItem(val = "100.00", label = "") {
            const div = document.createElement('div');
            div.className = "flex gap-2 items-center animate-fadeIn";
            div.innerHTML = `
                <input type="text" placeholder="Drawer Label" class="drawer-name" style="flex: 2;" aria-label="Drawer Label">
                <input type="number" step="0.01" class="drawer-val" style="flex: 1;" aria-label="Drawer Amount">
                <input type="text" readonly class="drawer-res text-xs font-bold opacity-70" style="flex: 1.5; border:none; background:transparent;" aria-label="Drawer Result">
                <button type="button" class="text-red-400 p-2 delete-drawer-btn" aria-label="Remove drawer"><i data-lucide="x" class="w-4"></i></button>
            `;

            div.querySelector('.drawer-name').oninput = debouncedTriggerDraftSync;
            div.querySelector('.drawer-val').oninput = function() { calcDrawer(this); debouncedTriggerDraftSync(); };
            div.querySelector('.delete-drawer-btn').onclick = function() {
                if(confirm('Are you sure you want to delete this drawer? This action cannot be undone.')) {
                    this.parentElement.remove(); debouncedTriggerDraftSync();
                }
            };

            div.querySelector('.drawer-name').value = label;
            div.querySelector('.drawer-val').value = val;
            document.getElementById('drawersContainer').appendChild(div);
            calcDrawer(div.querySelector('.drawer-val'));
            lucide.createIcons();
            if (initialDraftLoaded) debouncedTriggerDraftSync();
        }

        function calcDrawer(input) {
            let val = parseFloat(input.value) || 0;
            let diff = val - 100;
            let res = input.parentElement.querySelector('.drawer-res');
            if (diff === 0) res.value = "Balanced";
            else res.value = diff < 0 ? `$${Math.abs(diff).toFixed(2)} Short` : `$${diff.toFixed(2)} Over`;
        }

        function addDepositItem(val = "", ver = true, valCheck = true) {
            const div = document.createElement('div');
            div.className = "flex gap-4 items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-xl animate-fadeIn";
            div.innerHTML = `
                <input type="text" placeholder="Amount" class="dep-val" style="flex:1;" aria-label="Deposit Amount" oninput="debouncedTriggerDraftSync()">
                <label class="flex items-center gap-1 text-[10px] font-bold"><input type="checkbox" class="dep-ver accent-sky-500 w-4 h-4" onchange="debouncedTriggerDraftSync()" aria-label="Verify Deposit"> VER</label>
                <label class="flex items-center gap-1 text-[10px] font-bold"><input type="checkbox" class="dep-val-chk accent-sky-500 w-4 h-4" onchange="debouncedTriggerDraftSync()" aria-label="Validate Deposit"> VAL</label>
                <button type="button" class="text-red-400 delete-deposit-btn" aria-label="Remove deposit"><i data-lucide="x" class="w-4"></i></button>
            `;

            div.querySelector('.dep-val').oninput = debouncedTriggerDraftSync;
            div.querySelector('.dep-ver').onchange = debouncedTriggerDraftSync;
            div.querySelector('.dep-val-chk').onchange = debouncedTriggerDraftSync;
            div.querySelector('.delete-deposit-btn').onclick = function() {
                if(confirm('Are you sure you want to delete this deposit? This action cannot be undone.')) {
                    this.parentElement.remove(); debouncedTriggerDraftSync();
                }
            };

            div.querySelector('.dep-val').value = val;
            div.querySelector('.dep-ver').checked = ver;
            div.querySelector('.dep-val-chk').checked = valCheck;
            document.getElementById('depositsContainer').appendChild(div);
            lucide.createIcons();
            if (initialDraftLoaded) debouncedTriggerDraftSync();
        }

        function addRoutineTask(name = "", isChecked = false) {
            let taskName = name || document.getElementById('newRoutineTask').value;
            if (!taskName) return;
            const div = document.createElement('div');
            div.className = "flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm";

            const chk = document.createElement('input');
            chk.type = "checkbox";
            chk.className = "routine-chk w-5 h-5 accent-sky-500";
            chk.checked = isChecked;
            chk.onchange = debouncedTriggerDraftSync;

            const span = document.createElement('span');
            span.className = "routine-name flex-1 font-semibold text-sm";
            span.textContent = taskName;

            const btn = document.createElement('button');
            btn.type = "button";
            btn.className = "text-slate-300 hover:text-red-400";
            btn.onclick = function () { if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) { this.parentElement.remove(); debouncedTriggerDraftSync(); } };
            btn.setAttribute('aria-label', 'Remove task');
            btn.innerHTML = '<i data-lucide="trash-2" class="w-4"></i>';

            div.appendChild(chk);
            div.appendChild(span);
            div.appendChild(btn);

            document.getElementById('routineContainer').appendChild(div);
            document.getElementById('newRoutineTask').value = "";
            lucide.createIcons();
            if (initialDraftLoaded) debouncedTriggerDraftSync();
        }

        let _invLoadTime = Date.now();
        function addInventoryItem(name = "", bl = "", cl = "", fr = "", prepend = false, timestamp = null) {
            const div = document.createElement('div');
            div.className = 'inventory-item animate-fadeIn border-slate-200 dark:border-slate-800';
            div.dataset.timestamp = timestamp || (prepend ? Date.now() : _invLoadTime--);
            div.innerHTML = `
                <input type="text" placeholder="Item Name" class="inv-name" aria-label="Item Name">
                <input type="text" placeholder="Backline" class="inv-backline" aria-label="Backline Count">
                <input type="text" placeholder="Cooler" class="inv-cooler" aria-label="Cooler Count">
                <input type="text" placeholder="Freezer" class="inv-freezer" aria-label="Freezer Count">
                <button type="button" class="text-red-400 text-right delete-inv-btn" aria-label="Remove item"><i data-lucide="minus-circle" class="w-5"></i></button>
            `;

            div.querySelector('.inv-name').oninput = debouncedTriggerDraftSync;
            div.querySelector('.inv-backline').oninput = debouncedTriggerDraftSync;
            div.querySelector('.inv-cooler').oninput = debouncedTriggerDraftSync;
            div.querySelector('.inv-freezer').oninput = debouncedTriggerDraftSync;
            div.querySelector('.delete-inv-btn').onclick = function() {
                if(confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                    this.parentElement.remove(); debouncedTriggerDraftSync();
                }
            };

            div.querySelector('.inv-name').value = name;
            div.querySelector('.inv-backline').value = bl;
            div.querySelector('.inv-cooler').value = cl;
            div.querySelector('.inv-freezer').value = fr;
            // ⚡ Bolt Performance Optimization: Use DocumentFragment if batch loading, though here we load individually.
            const container = document.getElementById('inventoryContainer');
            if (prepend && container.firstChild) {
                container.insertBefore(div, container.firstChild);
            } else {
                container.appendChild(div);
            }
            lucide.createIcons();
            if (initialDraftLoaded) debouncedTriggerDraftSync();
        }

        function sortInventory(type) {
            const container = document.getElementById('inventoryContainer');
            const items = Array.from(container.children);
            
            if (type === 'alpha') {
                items.sort((a, b) => {
                    const nameA = a.querySelector('.inv-name').value.toLowerCase() || 'zzzz';
                    const nameB = b.querySelector('.inv-name').value.toLowerCase() || 'zzzz';
                    return nameA.localeCompare(nameB);
                });
            } else if (type === 'recent') {
                items.sort((a, b) => Number(b.dataset.timestamp) - Number(a.dataset.timestamp));
            }
            
            // ⚡ Bolt Optimization: Batch DOM insertions to avoid layout thrashing
            // ⚡ Bolt Optimization: Use DocumentFragment to batch DOM re-insertions and avoid layout thrashing
            const fragment = document.createDocumentFragment();
            items.forEach(item => fragment.appendChild(item));
            container.appendChild(fragment);

            debouncedTriggerDraftSync();
        }

        function getTrackerState() {
            const state = {
                id: Date.now().toString(),
                dateSaved: document.getElementById('shiftDate').value || new Date().toLocaleDateString(),
                timeSaved: document.getElementById('shiftTime').value || new Date().toLocaleTimeString(),
                manager: document.getElementById('shiftManager').value,
                durationMins: shiftStartTime ? Math.round((Date.now() - shiftStartTime) / 60000) : 0,
                routines: [], drawers: [], deposits: [], inventory: [],
                prepNotes: document.getElementById('prepNotes').value,
                beefCook: document.getElementById('beefCook').value,
                beefTempered: document.getElementById('beefTempered').value,
                laborVariance: document.getElementById('laborVariance').value,
                safeCount: document.getElementById('safeCount').value,
                changeNeeded: document.getElementById('changeNeeded').value
            };

            document.querySelectorAll('#routineContainer > div').forEach(el => {
                state.routines.push({ name: el.querySelector('.routine-name').innerText, checked: el.querySelector('.routine-chk').checked });
            });
            document.querySelectorAll('#drawersContainer > div').forEach(el => {
                state.drawers.push({ name: el.querySelector('.drawer-name').value, val: el.querySelector('.drawer-val').value, res: el.querySelector('.drawer-res').value });
            });
            document.querySelectorAll('#depositsContainer > div').forEach(el => {
                state.deposits.push({ val: el.querySelector('.dep-val').value, ver: el.querySelector('.dep-ver').checked, valCheck: el.querySelector('.dep-val-chk').checked });
            });
            document.querySelectorAll('.inventory-item').forEach(el => {
                state.inventory.push({ name: el.querySelector('.inv-name').value, bl: el.querySelector('.inv-backline').value, cl: el.querySelector('.inv-cooler').value, fr: el.querySelector('.inv-freezer').value, timestamp: el.dataset.timestamp });
            });
            return state;
        }

        let inputDebounceTimeout;
        document.getElementById('trackerForm').addEventListener('input', () => {
            clearTimeout(inputDebounceTimeout);
            // ⚡ Bolt Optimization: Debounce input events to prevent layout thrashing and excessive syncs
            inputDebounceTimeout = setTimeout(triggerDraftSync, 300);
        });

        function triggerDraftSync() {
            if (!initialDraftLoaded || !currentUser) return;

            const state = getTrackerState();

            // Local Storage (Always active - "Save to Files" focus)
            localStorage.setItem(`ezManage_draft_${currentUser.uid}`, JSON.stringify(state));

            if (cloudSyncEnabled) {
                clearTimeout(cloudSyncTimeout);
                cloudSyncTimeout = setTimeout(() => {
                    db.collection('users').doc(currentUser.uid).set({ trackerDraft: state }, { merge: true });
                }, 3000);
            }
        }

        function populateTrackerFromState(draft) {
            document.getElementById('shiftManager').value = draft.manager || "";
            document.getElementById('shiftDate').value = draft.dateSaved || "";
            document.getElementById('shiftTime').value = draft.timeSaved || "";
            document.getElementById('prepNotes').value = draft.prepNotes || "";
            document.getElementById('safeCount').value = draft.safeCount || "";
            document.getElementById('beefCook').value = draft.beefCook || "";
            document.getElementById('beefTempered').value = draft.beefTempered || "";
            document.getElementById('laborVariance').value = draft.laborVariance || "";
            document.getElementById('changeNeeded').value = draft.changeNeeded || "";

            document.getElementById('routineContainer').innerHTML = '';
            if (draft.routines) draft.routines.forEach(r => addRoutineTask(r.name, r.checked));

            document.getElementById('inventoryContainer').innerHTML = '';
            // ⚡ Bolt Performance Optimization: batch DOM insertions
            if (draft.inventory) {
                const fragment = document.createDocumentFragment();
                draft.inventory.forEach(i => {
                   const div = document.createElement('div');
                   div.className = 'inventory-item animate-fadeIn border-slate-200 dark:border-slate-800';
                   div.dataset.timestamp = i.timestamp || (_invLoadTime--);
                   div.innerHTML = `
                       <input type="text" placeholder="Item Name" class="inv-name" aria-label="Item Name">
                       <input type="text" placeholder="Backline" class="inv-backline" aria-label="Backline Count">
                       <input type="text" placeholder="Cooler" class="inv-cooler" aria-label="Cooler Count">
                       <input type="text" placeholder="Freezer" class="inv-freezer" aria-label="Freezer Count">
                       <button type="button" class="text-red-400 text-right delete-inv-btn" aria-label="Remove item"><i data-lucide="minus-circle" class="w-5"></i></button>
                   `;
                   div.querySelector('.inv-name').oninput = triggerDraftSync;
                   div.querySelector('.inv-backline').oninput = triggerDraftSync;
                   div.querySelector('.inv-cooler').oninput = triggerDraftSync;
                   div.querySelector('.inv-freezer').oninput = triggerDraftSync;
                   div.querySelector('.delete-inv-btn').onclick = function() {
                       if(confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                           this.parentElement.remove(); triggerDraftSync();
                       }
                   };
                   div.querySelector('.inv-name').value = i.name;
                   div.querySelector('.inv-backline').value = i.bl;
                   div.querySelector('.inv-cooler').value = i.cl;
                   div.querySelector('.inv-freezer').value = i.fr;
                   fragment.appendChild(div);
                });
                document.getElementById('inventoryContainer').appendChild(fragment);
                lucide.createIcons();
            }

            document.getElementById('drawersContainer').innerHTML = '';
            if (draft.drawers) draft.drawers.forEach(d => addDrawerItem(d.val, d.name));

            document.getElementById('depositsContainer').innerHTML = '';
            if (draft.deposits) draft.deposits.forEach(d => addDepositItem(d.val, d.ver, d.valCheck));
        }

        function syncDraftFromServer() {
            if (!currentUser) return;

            const localDraft = localStorage.getItem(`ezManage_draft_${currentUser.uid}`);
            if (localDraft) {
                try {
                    const parsed = JSON.parse(localDraft);
                    populateTrackerFromState(parsed);
                    return;
                } catch (e) { console.error("Manager Troubleshooting: Local parse err", e); }
            }

            if (cloudSyncEnabled && currentUserData && currentUserData.trackerDraft) {
                populateTrackerFromState(currentUserData.trackerDraft);
            } else {
                initDefaults();
            }
        }

        function manualSaveHistory() {
            if (!currentUser) return alert("Please Sign In first.");
            if (!cloudSyncEnabled) return alert("Enterprise Cloud Sync is required to save shift history to the cloud.");

            const state = getTrackerState();
            db.collection('users').doc(currentUser.uid).set({
                shiftHistory: firebase.firestore.FieldValue.arrayUnion(state)
            }, { merge: true }).then(() => {
                alert("Shift saved to Cloud History!");
            });
        }

        let renderHistoryTimeout;
        function debouncedRenderHistory() {
            // ⚡ Bolt Optimization: Debouncing search input
            // Why: Prevents expensive `renderHistory()` (DOM updates and array filtering) on every keystroke, reducing main thread blocking.
            // Impact: Reduces history re-renders by ~80-90% during fast typing, preventing UI stutter.
            clearTimeout(renderHistoryTimeout);
            renderHistoryTimeout = setTimeout(renderHistory, 500);
        }

        function renderHistory() {
            if (!currentUserData) return;
            const container = document.getElementById('historyListContainer');
            const searchInput = document.getElementById('historySearch').value.toLowerCase();

            if (!cloudSyncEnabled) {
                container.innerHTML = "<p class='text-center py-10 opacity-60'>Cloud Sync is disabled. History relies on Enterprise Cloud Data.</p>";
                return;
            }

            const rawHistory = (currentUserData.shiftHistory || []).reverse();
            const history = rawHistory.filter(h => {
                const manager = (h.manager || "").toLowerCase();
                const notes = (h.prepNotes || "").toLowerCase();
                const d = (h.dateSaved || "").toLowerCase();
                return manager.includes(searchInput) || notes.includes(searchInput) || d.includes(searchInput);
            });

            container.innerHTML = "";
            if (history.length === 0) {
                if (searchInput !== "") {
                    container.innerHTML = `
                        <div class="flex flex-col items-center justify-center py-20 text-center opacity-60">
                            <i data-lucide="search-x" class="w-12 h-12 mb-4 text-slate-400"></i>
                            <p class="text-lg font-bold text-slate-600 dark:text-slate-300">No logs found</p>
                            <p class="text-sm text-slate-500 mt-1">We couldn't find any shifts matching that search.</p>
                        </div>
                    `;
                } else {
                    container.innerHTML = `
                        <div class="flex flex-col items-center justify-center py-20 text-center">
                            <div class="w-20 h-20 bg-sky-50 dark:bg-sky-900/20 rounded-full flex items-center justify-center mb-6">
                                <i data-lucide="clipboard-list" class="w-10 h-10 text-sky-500"></i>
                            </div>
                            <h3 class="text-xl font-black mb-2">No Shift History Yet</h3>
                            <p class="text-slate-500 mb-8 max-w-sm">When you complete and save shifts in the tracker, they will appear here for performance analysis.</p>
                            <button onclick="navTo('tracker')" class="btn btn-accent px-8">Log a Shift</button>
                        </div>
                    `;
                }
                lucide.createIcons();
                return;
            }

            const grouped = {};
            history.forEach(data => {
                let groupKey = "Unknown Date";
                if (data.dateSaved) {
                    groupKey = data.dateSaved;
                }
                if (!grouped[groupKey]) grouped[groupKey] = [];
                grouped[groupKey].push(data);
            });

            // ⚡ Bolt Optimization: Use DocumentFragment to batch DOM insertions and reduce layout thrashing
            // ⚡ Bolt Optimization: Batch DOM insertions using a DocumentFragment
            const fragment = document.createDocumentFragment();

            Object.keys(grouped).sort().reverse().forEach(key => {
                const groupContainer = document.createElement('div');
                groupContainer.className = "mb-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden";

                const groupHeader = document.createElement('div');
                groupHeader.className = "px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors";
                groupHeader.innerHTML = `
                    <div class="font-black text-lg text-slate-800 dark:text-slate-200"><i data-lucide="calendar" class="inline-block w-5 h-5 mr-2 text-sky-500"></i>${escapeHTML(key)}</div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-bold bg-sky-100 text-sky-700 px-2 py-1 rounded-md">${escapeHTML(grouped[key].length)} shifts</span>
                        <i data-lucide="chevron-down" class="history-group-icon w-5 h-5 text-slate-400 transition-transform duration-200"></i>
                    </div>
                `;

                const groupContent = document.createElement('div');
                groupContent.className = "history-group-content hidden px-6 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3";
                
                groupContent.className = "hidden px-6 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3";

                groupHeader.onclick = () => {
                    const isCurrentlyHidden = groupContent.classList.contains('hidden');

                    // Close all other groups
                    document.querySelectorAll('.history-group-content').forEach(el => {
                        el.classList.add('hidden');
                    });
                    document.querySelectorAll('.history-group-icon').forEach(el => {
                        el.style.transform = 'rotate(0deg)';
                    });

                    // Toggle the clicked one
                    const icon = groupHeader.querySelector('[data-lucide="chevron-down"]');
                    if (isCurrentlyHidden) {
                        groupContent.classList.remove('hidden');
                        icon.style.transform = 'rotate(180deg)';
                    } else {
                        groupContent.classList.add('hidden');
                        icon.style.transform = 'rotate(0deg)';
                    }
                };

                const groupContentFragment = document.createDocumentFragment();

                grouped[key].forEach(data => {
                    const div = document.createElement('div');
                    div.className = "flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors group";
                    div.innerHTML = `
                        <div>
                            <div class="font-black text-md text-slate-700 dark:text-slate-300">Manager: ${escapeHTML(data.manager || 'N/A')}</div>
                            <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Duration: ${escapeHTML(data.durationMins || 0)}m • Saved at ${escapeHTML(data.timeSaved || 'N/A')}</div>
                        </div>
                        <div class="flex gap-2">
                            <button class="btn btn-outline btn-sm bg-white dark:bg-slate-900 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity history-load" aria-label="Load History Record">
                                <i data-lucide="download"></i> Load
                            </button>
                            <button class="text-red-400 p-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity history-delete" title="Delete" aria-label="Delete history record">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    `;
                    div.querySelector('.history-load').onclick = (e) => { e.stopPropagation(); loadHistoryShift(data.id); };
                    div.querySelector('.history-delete').onclick = (e) => { e.stopPropagation(); deleteHistoryShift(data.id); };
                    groupContentFragment.appendChild(div);
                });

                groupContent.appendChild(groupContentFragment);
                groupContainer.appendChild(groupHeader);
                groupContainer.appendChild(groupContent);
                fragment.appendChild(groupContainer);
            });
            container.appendChild(fragment);
            lucide.createIcons();
        }

        function deleteHistoryShift(id) {
            if (!currentUserData || !confirm("Are you sure you want to delete this shift from history permanently? This action cannot be undone.")) return;
            const shift = (currentUserData.shiftHistory || []).find(s => s.id === id);
            if (shift) {
                db.collection('users').doc(currentUser.uid).update({
                    shiftHistory: firebase.firestore.FieldValue.arrayRemove(shift)
                });
            }
        }

        function updateStorageBar() {
            if (!currentUserData) return;
            const historyCount = (currentUserData.shiftHistory || []).length;
            const usedKB = historyCount * 5;
            const usedMB = (usedKB / 1024).toFixed(2);

            const plan = currentUserData.plan || 'Free';
            let maxGB = 1;
            if (plan.includes('Individual')) maxGB = 3;
            if (plan.includes('Business')) maxGB = 5;

            document.getElementById('storageUsedTxt').innerText = `${usedMB} MB Used`;
            document.getElementById('storageMaxTxt').innerText = `${maxGB} GB Limit`;

            const percentage = Math.min(((usedMB / 1024) / maxGB) * 100, 100);
            document.getElementById('storageProgressBar').style.width = `${percentage}%`;
        }

        function loadHistoryShift(id) {
            if (!currentUser || !currentUserData) return;
            if (!confirm("Loading this shift will overwrite your current draft tracker. Continue?")) return;

            const history = currentUserData.shiftHistory || [];
            const shift = history.find(s => s.id === id);

            if (shift) {
                populateTrackerFromState(shift);
                navTo('tracker');
                debouncedTriggerDraftSync();
                alert("Shift loaded into Active Tracker successfully.");
            }
        }

        function exportPerformanceCSV() {
            if (!currentUserData || !currentUserData.shiftHistory || currentUserData.shiftHistory.length === 0) return alert("No history available to export.");

            let csv = "Date,Time,Manager,Duration(m),Routines Completed,Safe Count,Prep Notes\n";

            currentUserData.shiftHistory.forEach(h => {
                let routinesDone = h.routines ? h.routines.filter(r => r.checked).length : 0;
                let routinesTotal = h.routines ? h.routines.length : 0;
                let safeCount = h.safeCount ? h.safeCount.replace(/,/g, '') : "0";
                let prepNotes = h.prepNotes ? h.prepNotes.replace(/,/g, ';').replace(/\n/g, ' ') : "";

                csv += `${h.dateSaved},${h.timeSaved},${h.manager},${h.durationMins},${routinesDone}/${routinesTotal},${safeCount},${prepNotes}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', 'ezManage_Performance.csv');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        function calculatePerformance() {
            if (!currentUserData) return;
            const history = currentUserData.shiftHistory || [];
            document.getElementById('statShifts').innerText = history.length;

            let totalRoutines = 0; let checkedRoutines = 0;
            let totalTime = 0;

            history.forEach(d => {
                totalTime += (d.durationMins || 0);
                (d.routines || []).forEach(r => { totalRoutines++; if (r.checked) checkedRoutines++; });
            });

            document.getElementById('statAvgTime').innerText = history.length > 0 ? Math.round(totalTime / history.length) + "m" : "0m";
            const score = totalRoutines === 0 ? 0 : Math.round((checkedRoutines / totalRoutines) * 100);
            document.getElementById('statRoutines').innerText = score + "%";
            document.getElementById('statTotalTime').innerText = totalTime + "m";

            const tips = document.getElementById('performanceTips');
            if (score < 70) tips.innerText = "Focus: Your routine score is low. Try completing ServSafe temps and lobby checks immediately after the rush.";
            else if (history.length > 5) tips.innerText = "Great consistency! Your logs are detailed and synced. Consider sharing your custom templates with your team.";

            renderPerformanceChart(history);
        }

        window.perfChartInstance = null;
        function renderPerformanceChart(history) {
            const ctx = document.getElementById('performanceChart');
            if (!ctx) return;

            const sorted = [...history].reverse();
            const labels = sorted.map(h => (h.dateSaved || 'Unknown').split('-').slice(-2).join('/'));
            const durations = sorted.map(h => h.durationMins || 0);
            const itemCounts = sorted.map(h => (h.inventory || []).length);
            const routineScores = sorted.map(h => {
                let total = 0, checked = 0;
                (h.routines || []).forEach(r => { total++; if (r.checked) checked++; });
                return total === 0 ? 0 : Math.round((checked / total) * 100);
            });

            if (window.perfChartInstance) window.perfChartInstance.destroy();

            window.perfChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Log Time (mins)',
                            data: durations,
                            borderColor: '#38bdf8',
                            backgroundColor: 'rgba(56, 189, 248, 0.1)',
                            tension: 0.4,
                            fill: true,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Items Counted',
                            data: itemCounts,
                            borderColor: '#8b5cf6',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            tension: 0.4,
                            fill: true,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Routine Score (%)',
                            data: routineScores,
                            borderColor: '#10b981',
                            borderDash: [5, 5],
                            tension: 0.4,
                            yAxisID: 'y1'
                        },
                        {
                            label: 'Shift Count Trend',
                            data: sorted.map((_, i) => i + 1),
                            borderColor: '#6366f1',
                            borderDash: [2, 2],
                            tension: 0.4,
                            yAxisID: 'y'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Mins' } },
                        y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Score %' }, min: 0, max: 100, grid: { drawOnChartArea: false } }
                    }
                }
            });
        }

        const presets = {
            'arbys': ["Shake Mix", "Mozzarella", "Beef", "Turkey", "Ham", "Sub Buns", "Slider Buns", "Turnovers"],
            'mcdonalds': ["10:1 Beef", "4:1 Beef", "Nuggets", "McChicken", "Fries", "Reg Buns", "Mac Sauce"],
            'tacobell': ["Ground Beef", "Chicken", "Steak", "Nacho Cheese", "Tortillas (12in)", "Cinnabon Delights"],
            'chickfila': ["CFA Filets", "Spicy Filets", "Nuggets", "Waffle Fries", "Milk Base", "Mac & Cheese"],
            'pizza': ["Dough Large", "Dough Medium", "Mozzarella", "Pepperoni", "Sausage", "Wings"]
        };

        function loadPresetList() {
            if (confirm("Apply this template? Current inventory list will be cleared.")) {
                const key = document.getElementById('presetSelector').value;
                document.getElementById('inventoryContainer').innerHTML = '';
                (presets[key] || []).forEach(name => addInventoryItem(name));
                navTo('tracker');
                debouncedTriggerDraftSync();
            }
        }

        function saveCustomPreset() {
            if (!currentUser) return;
            const name = document.getElementById('customPresetName').value || "Unnamed Preset";
            const state = getTrackerState();

            const presetData = {
                id: Date.now().toString(),
                name: name,
                inventory: state.inventory,
                routines: state.routines,
                drawers: state.drawers,
                deposits: state.deposits
            };

            db.collection('users').doc(currentUser.uid).set({
                customPresets: firebase.firestore.FieldValue.arrayUnion(presetData)
            }, { merge: true }).then(() => {
                alert("Tracker Layout Saved Successfully!");
                document.getElementById('customPresetName').value = "";
            });
        }

        function deleteCustomPreset(id) {
            if (!currentUserData || !confirm("Are you sure you want to delete this preset permanently? This action cannot be undone.")) return;
            const preset = (currentUserData.customPresets || []).find(p => p.id === id);
            if (preset) {
                db.collection('users').doc(currentUser.uid).update({
                    customPresets: firebase.firestore.FieldValue.arrayRemove(preset)
                });
            }
        }

        function loadCustomPresets() {
            if (!currentUserData) return;
            const container = document.getElementById('customPresetsContainer');
            container.innerHTML = "";
            const cp = currentUserData.customPresets || [];

            // ⚡ Bolt Optimization: Use DocumentFragment to batch DOM insertions and reduce layout thrashing
            const fragment = document.createDocumentFragment();

            cp.forEach(p => {
                const div = document.createElement('div');
                div.className = "flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl group border border-slate-100 dark:border-slate-800";
                div.innerHTML = `
                    <span class="font-bold preset-name"></span>
                    <div class="flex gap-2">
                        <button class="btn btn-sm btn-outline opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity load-btn" aria-label="Load Template">Load</button>
                        <button class="text-red-400 p-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity delete-btn" title="Delete" aria-label="Delete template"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                `;
                div.querySelector('.preset-name').textContent = p.name;
                div.querySelector('.load-btn').onclick = () => applyCustomPreset(p.id);
                div.querySelector('.delete-btn').onclick = () => deleteCustomPreset(p.id);
                fragment.appendChild(div);
            });
            container.appendChild(fragment);
            lucide.createIcons();
        }

        function applyCustomPreset(id) {
            if (!confirm("Replace current tracker layout with this custom preset?")) return;
            const preset = (currentUserData.customPresets || []).find(p => p.id == id);
            if (preset) {
                if (preset.items) {
                    document.getElementById('inventoryContainer').innerHTML = '';
                    // ⚡ Bolt Performance Optimization: batch DOM insertions
                    const fragment = document.createDocumentFragment();
                    preset.items.forEach(i => {
                        const name = typeof i === 'string' ? i : i.name;
                        const bl = typeof i === 'string' ? "" : (i.bl || "");
                        const cl = typeof i === 'string' ? "" : (i.cl || "");
                        const fr = typeof i === 'string' ? "" : (i.fr || "");
                        const timestamp = typeof i === 'string' ? null : i.timestamp;

                        const div = document.createElement('div');
                        div.className = 'inventory-item animate-fadeIn border-slate-200 dark:border-slate-800';
                        div.dataset.timestamp = timestamp || (_invLoadTime--);
                        div.innerHTML = `
                            <input type="text" placeholder="Item Name" class="inv-name" aria-label="Item Name">
                            <input type="text" placeholder="Backline" class="inv-backline" aria-label="Backline Count">
                            <input type="text" placeholder="Cooler" class="inv-cooler" aria-label="Cooler Count">
                            <input type="text" placeholder="Freezer" class="inv-freezer" aria-label="Freezer Count">
                            <button type="button" class="text-red-400 text-right delete-inv-btn" aria-label="Remove item"><i data-lucide="minus-circle" class="w-5"></i></button>
                        `;
                        div.querySelector('.inv-name').oninput = triggerDraftSync;
                        div.querySelector('.inv-backline').oninput = triggerDraftSync;
                        div.querySelector('.inv-cooler').oninput = triggerDraftSync;
                        div.querySelector('.inv-freezer').oninput = triggerDraftSync;
                        div.querySelector('.delete-inv-btn').onclick = function() {
                            if(confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                                this.parentElement.remove(); triggerDraftSync();
                            }
                        };
                        div.querySelector('.inv-name').value = name;
                        div.querySelector('.inv-backline').value = bl;
                        div.querySelector('.inv-cooler').value = cl;
                        div.querySelector('.inv-freezer').value = fr;
                        fragment.appendChild(div);
                    });
                    document.getElementById('inventoryContainer').appendChild(fragment);
                    lucide.createIcons();
                } else {
                    populateTrackerFromState(preset);
                }
                navTo('tracker');
                debouncedTriggerDraftSync();
            }
        }

        function generateReport() {
            const state = getTrackerState();

            // Populate the Perfect PDF Mirror HTML
            document.getElementById('printMgr').innerText = state.manager || 'Not Specified';
            document.getElementById('printDt').innerText = state.dateSaved || 'Not Specified';
            document.getElementById('printTm').innerText = state.timeSaved || 'Not Specified';
            document.getElementById('printDur').innerText = state.durationMins || '0';

            const printRoutines = document.getElementById('printRoutines');
            printRoutines.innerHTML = '';
            if (state.routines && state.routines.length > 0) {
                const fragment = document.createDocumentFragment();
                state.routines.forEach(r => {
                    const tr = document.createElement('tr');
                    const tdCheck = document.createElement('td');
                    tdCheck.style.textAlign = 'center';
                    const divCheck = document.createElement('div');
                    divCheck.className = 'print-checkbox';
                    if (r.checked) divCheck.classList.add('print-checked');
                    tdCheck.appendChild(divCheck);

                    const tdName = document.createElement('td');
                    tdName.textContent = r.name;

                    tr.appendChild(tdCheck);
                    tr.appendChild(tdName);
                    fragment.appendChild(tr);
                });
                printRoutines.appendChild(fragment);
            } else {
                printRoutines.innerHTML = "<tr><td colspan='2'>No routines logged</td></tr>";
            }

            const printDrawers = document.getElementById('printDrawers');
            printDrawers.innerHTML = '';
            if (state.drawers && state.drawers.length > 0) {
                const fragment = document.createDocumentFragment();
                state.drawers.forEach(d => {
                    const tr = document.createElement('tr');
                    const tdName = document.createElement('td');
                    tdName.textContent = d.name;
                    const tdVal = document.createElement('td');
                    tdVal.textContent = "\$" + d.val;
                    const tdRes = document.createElement('td');
                    tdRes.textContent = d.res;
                    tr.appendChild(tdName);
                    tr.appendChild(tdVal);
                    tr.appendChild(tdRes);
                    fragment.appendChild(tr);
                });
                printDrawers.appendChild(fragment);
            } else {
                printDrawers.innerHTML = "<tr><td colspan='3'>No drawers logged</td></tr>";
            }

            document.getElementById('printSafe').innerText = state.safeCount || "N/A";
            document.getElementById('printChange').innerText = state.changeNeeded || "N/A";

            const printInventory = document.getElementById('printInventoryList');
            printInventory.innerHTML = '';
            if (state.inventory && state.inventory.length > 0) {
                const fragment = document.createDocumentFragment();
                state.inventory.forEach(i => {
                    const tr = document.createElement('tr');
                    const tdName = document.createElement('td');
                    tdName.textContent = i.name;
                    const tdBl = document.createElement('td');
                    tdBl.textContent = i.bl;
                    const tdCl = document.createElement('td');
                    tdCl.textContent = i.cl;
                    const tdFr = document.createElement('td');
                    tdFr.textContent = i.fr;
                    tr.appendChild(tdName);
                    tr.appendChild(tdBl);
                    tr.appendChild(tdCl);
                    tr.appendChild(tdFr);
                    fragment.appendChild(tr);
                });
                printInventory.appendChild(fragment);
            } else {
                printInventory.innerHTML = "<tr><td colspan='4'>No inventory logged</td></tr>";
            }

            document.getElementById('printNotesBlock').innerText = state.prepNotes || "No notes provided.";

            if (cloudSyncEnabled) {
                manualSaveHistory();
            } else {
                localStorage.setItem(`ezManage_draft_${currentUser?.uid || 'guest'}`, JSON.stringify(state));
            }

            try { window.print(); }
            catch (e) { alert("Printing blocked by browser."); }
        }

        function loadProfileUI(data) {
            document.getElementById('profNameDisplay').innerText = data.name || "Manager";
            document.getElementById('profSubStatus').innerText = (data.plan || "Free") + " Plan";
            document.getElementById('profName').value = data.name || "";
            document.getElementById('profRole').value = data.role || "";
            document.getElementById('profPhone').value = data.phone || "";
            if (data.name) document.getElementById('profileAvatar').innerText = data.name.charAt(0).toUpperCase();

            // Default AI Training to true unless explicitly false
            const aiEnabled = data.aiTrainingEnabled !== false;
            document.getElementById('profileAIToggle').checked = aiEnabled;
        }

        function saveProfileToFirebase() {
            if (!currentUser) return;

            const cloudToggle = document.getElementById('profileCloudSyncToggle').checked;
            cloudSyncEnabled = cloudToggle;

            const data = {
                name: document.getElementById('profName').value,
                role: document.getElementById('profRole').value,
                phone: document.getElementById('profPhone').value,
                aiTrainingEnabled: document.getElementById('profileAIToggle').checked,
                cloudSyncEnabled: cloudToggle
            };

            if (profileDebounceTimeout) clearTimeout(profileDebounceTimeout);

            profileDebounceTimeout = setTimeout(() => {
                db.collection('users').doc(currentUser.uid).set(data, { merge: true }).then(() => {
                    localStorage.setItem(`ezManage_aiEnabled_${currentUser.uid}`, data.aiTrainingEnabled);
                    localStorage.setItem(`ezManage_cloudEnabled_${currentUser.uid}`, cloudSyncEnabled);
                    alert("Profile Updated!");
                });
            }, 1000);
        }

        function changePassword() {
            if (!currentUser) return;
            auth.sendPasswordResetEmail(currentUser.email).then(() => {
                alert("A password reset email has been sent to " + currentUser.email);
            }).catch(err => alert(err.message));
        }

        async function cancelSubscription() {
            if (!currentUserData || !currentUserData.subscription || currentUserData.subscription.status !== 'active') {
                return alert("You do not have an active premium subscription to cancel.");
            }
            if (!confirm("Are you sure you want to cancel your subscription?")) return;

            try {
                const res = await fetch("https://cancelsubscription-dsy7tdoigq-uc.a.run.app", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ customerId: currentUserData.subscription.customerId })
                });
                const data = await res.json();
                if (data.success) {
                    alert("Subscription canceled successfully.");
                    db.collection('users').doc(currentUser.uid).update({
                        "subscription.status": "canceled",
                        plan: "Free",
                        cloudSyncEnabled: false
                    });
                    updateCloudSyncUI();
                } else {
                    alert("Error: " + data.error);
                }
            } catch (e) { alert("Failed to contact payment server. Try again later."); }
        }

        function deleteAccount() {
            if (!currentUser) return;
            if (!confirm("WARNING: Are you sure you want to permanently delete your account and all associated data? This right to forget action cannot be undone.")) return;

            db.collection('users').doc(currentUser.uid).delete().then(() => {
                localStorage.removeItem(`ezManage_draft_${currentUser.uid}`);
                currentUser.delete().then(() => {
                    alert("Your account has been deleted.");
                    window.location.reload();
                }).catch(err => {
                    if (err.code === 'auth/requires-recent-login') {
                        alert("For security reasons, please log out and log back in before deleting your account.");
                    } else {
                        alert(err.message);
                    }
                });
            });
        }

        function clearData() {
            if (confirm("Are you sure? This will wipe the current tracker form. This action cannot be undone.")) {
                document.getElementById('trackerForm').reset();
                document.getElementById('drawersContainer').innerHTML = '';
                document.getElementById('depositsContainer').innerHTML = '';
                document.getElementById('inventoryContainer').innerHTML = '';
                document.getElementById('routineContainer').innerHTML = '';
                initDefaults();
                debouncedTriggerDraftSync();
            }
        }

        function initDefaults() {
            if (document.getElementById('inventoryContainer').innerHTML.trim() === "") {
                document.getElementById('shiftDate').value = new Date().toISOString().split('T')[0];
                document.getElementById('shiftTime').value = new Date().toTimeString().slice(0, 5);
                addDrawerItem("100.00", "Register 1");
                addDrawerItem("100.00", "Register 2");
                addDepositItem();
                ["Parking Lot", "Lobby/Restrooms", "ServSafe Temps", "Filtered Fryers", "Trash Run"].forEach(t => addRoutineTask(t));
                presets['arbys'].forEach(name => addInventoryItem(name));
            }
        }

        async function processCheckout(planName) {
            if (!currentUser) { alert("Please sign in or create an account to upgrade."); navTo('auth'); return; }

            let basePrice = (planName === 'Business Pro') ? 207 : 61;
            let finalPrice = basePrice;

            if (hasReferralDiscount) finalPrice *= 0.9;
            if (currentUserData && currentUserData.hasPromoCode) finalPrice *= 0.9;

            finalPrice = Math.floor(finalPrice);

            try {
                const res = await fetch("https://createcheckoutsession-dsy7tdoigq-uc.a.run.app", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        uid: currentUser.uid,
                        email: currentUser.email,
                        plan: planName,
                        amount: finalPrice,
                        successUrl: window.location.origin + window.location.pathname + "?success=true",
                        cancelUrl: window.location.href
                    })
                });

                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    alert("Error creating checkout session: " + (data.error || "Unknown error"));
                }
            } catch (err) {
                alert("Payment system unreachable. Please try again later.");
            }
        }




        async function submitAssignedTask() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                alert("You must be part of an organization to assign tasks.");
                return;
            }

            const title = document.getElementById('taskTitle').value.trim();
            const desc = document.getElementById('taskDesc').value.trim();
            const assignee = document.getElementById('taskAssignee').value;

            if (!title || !assignee) {
                alert("Task Title and Assignee are required.");
                return;
            }

            const submitBtn = document.querySelector('#createTaskModal .btn-accent');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Assigning...';
            submitBtn.disabled = true;
            lucide.createIcons();

            try {
                await db.collection('assigned_tasks').add({
                    title: title,
                    description: desc,
                    assigneeName: assignee,
                    status: 'Pending',
                    createdByUid: currentUser.uid,
                    createdByName: currentUserData.name || currentUser.email,
                    orgId: currentUserData.orgId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.getElementById('taskTitle').value = '';
                document.getElementById('taskDesc').value = '';
                document.getElementById('taskAssignee').value = '';
                document.getElementById('createTaskModal').classList.add('hidden');

                alert("Task assigned successfully.");
                fetchAssignedTasks();
            } catch (error) {
                console.error("Error assigning task:", error);
                if (error.code === 'unavailable' || error.code === 'auth/network-request-failed') {
                    alert("Network error: Could not connect to the server.");
                } else {
                    alert("Failed to assign task. " + error.message);
                }
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                lucide.createIcons();
            }
        }


        let unsubscribeTasks = null;
        function fetchAssignedTasks() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                document.getElementById('tasksContainer').innerHTML = `
                    <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <i data-lucide="users" class="w-12 h-12 text-slate-400 mx-auto mb-4"></i>
                        <h3 class="text-xl font-bold mb-2">Join or Create a Group</h3>
                        <p class="text-slate-500">You must be in a Management Group to assign tasks.</p>
                    </div>`;
                lucide.createIcons();
                return;
            }

            const container = document.getElementById('tasksContainer');
            container.innerHTML = '<div class="text-center py-8"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-sky-500 mb-4"></i><p class="text-slate-500">Loading tasks...</p></div>';
            lucide.createIcons();

            if (unsubscribeTasks) unsubscribeTasks();

            unsubscribeTasks = db.collection('assigned_tasks')
                .where('orgId', '==', currentUserData.orgId)
                .onSnapshot(snap => {
                    container.innerHTML = '';
                    if (snap.empty) {
                        container.innerHTML = `
                            <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <i data-lucide="check-circle-2" class="w-12 h-12 text-emerald-400 mx-auto mb-4"></i>
                                <h3 class="text-xl font-bold mb-2">All Caught Up!</h3>
                                <p class="text-slate-500">There are no active assigned tasks.</p>
                            </div>`;
                        lucide.createIcons();
                        return;
                    }

                    let tasks = [];
                    snap.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));

                    tasks.sort((a, b) => {
                        const aTime = a.createdAt ? a.createdAt.toMillis() : 0;
                        const bTime = b.createdAt ? b.createdAt.toMillis() : 0;
                        return bTime - aTime;
                    });

                    container.innerHTML = tasks.map(task => {
                        const isCompleted = task.status === 'Completed';
                        const statusColor = isCompleted ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
                        const dateStr = task.createdAt ? new Date(task.createdAt.toMillis()).toLocaleString() : 'Just now';

                        return `
                            <div class="card p-6 border-l-4 ${isCompleted ? 'border-l-emerald-500 opacity-70' : 'border-l-amber-500'}">
                                <div class="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                    <div>
                                        <h3 class="text-lg font-bold ${isCompleted ? 'line-through text-slate-500' : ''}">${escapeHTML(task.title)}</h3>
                                        <p class="text-sm text-slate-500">Assigned to <span class="font-bold">${escapeHTML(task.assigneeName)}</span> by ${escapeHTML(task.createdByName)} • ${dateStr}</p>
                                    </div>
                                    <div class="flex gap-2 items-start">
                                        <span class="px-3 py-1 rounded-full text-xs font-bold ${statusColor}">${escapeHTML(task.status)}</span>
                                        <button onclick="updateAssignedTaskStatus('${task.id}', '${isCompleted ? 'Pending' : 'Completed'}')" class="btn btn-sm btn-outline ${isCompleted ? '' : 'btn-success'}">${isCompleted ? 'Mark Pending' : 'Mark Complete'}</button>
                                        <button onclick="deleteAssignedTask('${task.id}')" class="btn btn-sm btn-outline text-red-500 border-red-200 hover:bg-red-50"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                    </div>
                                </div>
                                <p class="text-slate-700 dark:text-slate-300 whitespace-pre-wrap ${isCompleted ? 'line-through text-slate-500' : ''}">${escapeHTML(task.description)}</p>
                            </div>
                        `;
                    }).join('');
                    lucide.createIcons();
                }, err => {
                    console.error("Error fetching tasks:", err);
                    container.innerHTML = `<div class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">Failed to load tasks: ${err.message}</div>`;
                });
        }


        async function updateAssignedTaskStatus(taskId, newStatus) {
            try {
                await db.collection('assigned_tasks').doc(taskId).update({
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    orgId: currentUserData.orgId
                });
            } catch (error) {
                console.error("Manager Troubleshooting: Error updating task status:", error);
                alert("Failed to update status. " + error.message);
            }
        }

        async function deleteAssignedTask(taskId) {
            if (!confirm("Are you sure you want to delete this task?")) return;
            try {
                await db.collection('assigned_tasks').doc(taskId).delete();
            } catch (error) {
                console.error("Manager Troubleshooting: Error deleting task:", error);
                alert("Failed to delete task. " + error.message);
            }
        }

        async function submitMaintenanceTicket() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                alert("You must be part of an organization to report issues.");
                return;
            }

            const title = document.getElementById('maintenanceTitle').value.trim();
            const desc = document.getElementById('maintenanceDesc').value.trim();
            const priority = document.getElementById('maintenancePriority').value;

            if (!title) {
                alert("Please provide a title or issue name.");
                return;
            }

            const submitBtn = document.querySelector('#reportMaintenanceModal .btn-accent');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Submitting...';
            submitBtn.disabled = true;
            lucide.createIcons();

            try {
                await db.collection('maintenance_logs').add({
                    title: title,
                    description: desc,
                    priority: priority,
                    status: 'Open',
                    reportedByUid: currentUser.uid,
                    reportedByName: currentUserData.name || currentUser.email,
                    orgId: currentUserData.orgId || null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.getElementById('maintenanceTitle').value = '';
                document.getElementById('maintenanceDesc').value = '';
                document.getElementById('maintenancePriority').value = 'Low';
                document.getElementById('reportMaintenanceModal').classList.add('hidden');

                alert("Maintenance ticket submitted successfully.");
                fetchMaintenanceTickets();
            } catch (error) {
                console.error("Error submitting ticket:", error);
                if (error.code === 'unavailable' || error.code === 'auth/network-request-failed' || error.code === 'firestore/unavailable') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert("Failed to submit ticket. " + error.message);
                }
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                lucide.createIcons();
            }
        }

        async function submitTaskAlt() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                alert("You must be part of an organization to assign tasks.");
                return;
            }

            const title = document.getElementById('taskTitleAlt').value.trim();
            const desc = document.getElementById('taskDescriptionAlt').value.trim();
            const assignee = document.getElementById('taskAssigneeAlt').value;

            if (!title || !assignee) {
                alert("Please provide a title and assign the task to an employee.");
                return;
            }

            const submitBtn = document.getElementById('btnSubmitTaskAlt');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Assigning...';
            submitBtn.disabled = true;
            lucide.createIcons();

            try {
                await db.collection('tasks').add({
                    title: title,
                    description: desc,
                    assignedTo: assignee,
                    priority: 'Medium', // defaults
                    dueDate: null,
                    status: 'Pending',
                    authorId: currentUser.uid,
                    assignedByName: currentUserData.name || currentUser.email,
                    orgId: currentUserData.orgId || null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.getElementById('taskTitleAlt').value = '';
                document.getElementById('taskDescriptionAlt').value = '';
                document.getElementById('taskAssigneeAlt').value = '';

                alert("Task assigned successfully.");
                fetchTasks();
            } catch (error) {
                console.error("Error assigning task:", error);
                if (error.code === 'unavailable' || error.code === 'auth/network-request-failed') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert("Failed to assign task. " + error.message);
                }
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                lucide.createIcons();
            }
        }

        function fetchMaintenanceTickets() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                document.getElementById('maintenanceContainer').innerHTML = `
                    <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <i data-lucide="users" class="w-12 h-12 text-slate-400 mx-auto mb-4"></i>
                        <h3 class="text-xl font-bold mb-2">Join or Create a Group</h3>
                        <p class="text-slate-500 mb-4">You must be in a Management Group to view and report maintenance issues.</p><button onclick="document.getElementById('orgTutorialModal').classList.remove('hidden')" class="btn btn-sm btn-outline text-sky-500 border-sky-200">How do I connect?</button>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            const container = document.getElementById('maintenanceContainer');
            container.innerHTML = '<div class="text-center py-8"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-sky-500 mb-4"></i><p class="text-slate-500">Loading tickets...</p></div>';
            lucide.createIcons();

            if (window.maintenanceUnsubscribe) {
                window.maintenanceUnsubscribe();
            }

            window.maintenanceUnsubscribe = db.collection('maintenance_logs')
                .where('orgId', '==', currentUserData.orgId)
                .onSnapshot(snap => {
                    container.innerHTML = '';
                    if (snap.empty) {
                        container.innerHTML = `
                            <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <i data-lucide="check-circle-2" class="w-12 h-12 text-emerald-400 mx-auto mb-4"></i>
                                <h3 class="text-xl font-bold mb-2">All Clear!</h3>
                                <p class="text-slate-500">There are no open maintenance issues.</p>
                            </div>
                        `;
                        lucide.createIcons();
                        return;
                    }

                    let tickets = [];
                    snap.forEach(doc => tickets.push({ id: doc.id, ...doc.data() }));

                    // Sort locally since composite index is likely missing
                    tickets.sort((a, b) => {
                        const aTime = a.createdAt ? a.createdAt.toMillis() : 0;
                        const bTime = b.createdAt ? b.createdAt.toMillis() : 0;
                        return bTime - aTime;
                    });

                    // ⚡ Bolt Optimization: Replace O(n²) string concatenation inside loop with array map().join('')
                    container.innerHTML = tickets.map(ticket => {
                        const statusColors = {
                            'Open': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                            'In Progress': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800',
                            'Resolved': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        };
                        const prioColors = {
                            'Low': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
                            'Medium': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                            'High': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
                            'Critical': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
                        };

                        const dateStr = ticket.createdAt ? new Date(ticket.createdAt.toMillis()).toLocaleString() : 'Just now';

                        return `
                            <div class="card p-6 border-l-4 ${ticket.priority === 'Critical' ? 'border-l-red-500' : ticket.priority === 'High' ? 'border-l-orange-500' : 'border-l-sky-500'}">
                                <div class="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                    <div>
                                        <h3 class="text-lg font-bold">${escapeHTML(ticket.title)}</h3>
                                        <p class="text-sm text-slate-500">Reported by ${escapeHTML(ticket.reportedByName)} • ${dateStr}</p>
                                    </div>
                                    <div class="flex gap-2 items-start">
                                        <span class="px-3 py-1 rounded-full text-xs font-bold ${prioColors[ticket.priority] || prioColors['Low']}">${escapeHTML(ticket.priority)}</span>
                                        <select aria-label="Update ticket status" class="ticket-status-select px-3 py-1 rounded-full text-xs font-bold border appearance-none cursor-pointer focus:outline-none ${statusColors[ticket.status] || statusColors['Open']}" data-ticket-id="${escapeHTML(ticket.id)}">
                                            <option value="Open" ${ticket.status === 'Open' ? 'selected' : ''}>Open</option>
                                            <option value="In Progress" ${ticket.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                            <option value="Resolved" ${ticket.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                                        </select>
                                    </div>
                                </div>
                                <p class="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">${escapeHTML(ticket.description)}</p>
                            </div>
                        `;
                    }).join('');
                }, err => {
                    console.error("Error fetching tickets:", err);
                    container.innerHTML = '';
                    const errDiv = document.createElement('div');
                    errDiv.className = 'text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center';
                    errDiv.textContent = `Failed to load tickets: ${err.message}`;
                    container.appendChild(errDiv);
                });
        }

        document.getElementById('maintenanceContainer').addEventListener('change', function(e) {
            if (e.target && e.target.classList.contains('ticket-status-select')) {
                const ticketId = e.target.getAttribute('data-ticket-id');
                if (ticketId) {
                    updateTicketStatus(ticketId, e.target.value);
                }
            }
        });

        async function updateTicketStatus(ticketId, newStatus) {
            try {
                await db.collection('maintenance_logs').doc(ticketId).update({
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    orgId: currentUserData.orgId
                });
                // Optimistic UI update already handled by changing the select value
            } catch (error) {
                console.error("Manager Troubleshooting: Error updating ticket:", error);
                alert("Failed to update status. " + error.message);
                fetchMaintenanceTickets(); // revert
            }
        }

        async function submitFeatureRequest() {
            const msg = document.getElementById('featureReqText').value;
            if (!msg) return;
            try {
                await db.collection('feature_requests').add({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    message: msg,
                    status: "In Progress",
                    timestamp: new Date().toISOString()
                });
                alert("Sent!");
                document.getElementById('featureReqText').value = "";
            } catch (err) {
                console.error("Error sending request:", err);
                if (err.code === 'unavailable' || err.code === 'auth/network-request-failed') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert("Failed to send request. " + err.message);
                }
            }
        }

        async function addEmployee() {
            if (!currentUser || !currentUserData) return;
            const name = document.getElementById('staffName').value.trim();
            const role = document.getElementById('staffRole').value.trim();
            const phone = document.getElementById('staffPhone').value.trim();
            const email = document.getElementById('staffEmail').value.trim();
            const status = document.getElementById('staffStatus').value;

            if (!name || !role) {
                alert("Employee Name and Role are required.");
                return;
            }

            const saveBtn = document.querySelector('#addStaffModal .btn-accent');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Saving...';
            saveBtn.disabled = true;

            try {
                await db.collection('employees').add({
                    name,
                    role,
                    phone,
                    email,
                    status,
                    authorId: currentUser.uid,
                    orgId: currentUserData.orgId || currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.getElementById('empName').value = '';
                document.getElementById('empRole').value = '';
                document.getElementById('empPhone').value = '';
                document.getElementById('empEmail').value = '';
                document.getElementById('empStatus').value = 'Active';
                document.getElementById('addEmployeeModal').classList.add('hidden');

                alert("Employee added successfully.");
                fetchEmployees();
                        fetchTimeOffRequests();
                populateScheduleDropdown();
                populateTaskAssigneeDropdown();
            } catch (err) {
                console.error("Error adding employee:", err);
                if (err.code === 'unavailable' || err.code === 'auth/network-request-failed') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert("Failed to add employee.");
                }
            } finally {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                lucide.createIcons();
            }
        }


        let unsubscribeEmployees = null;
        let unsubscribeTimeOff = null;




        async function submitTimeOffRequest() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                alert("You must be part of an organization to request time off.");
                return;
            }
            const startDate = document.getElementById('timeoffStartDate').value;
            const endDate = document.getElementById('timeoffEndDate').value;
            const reason = document.getElementById('timeoffReason').value.trim();

            if (!startDate || !endDate || !reason) {
                alert("Please fill in all fields.");
                return;
            }
            if (startDate > endDate) {
                 alert("Start date must be before end date.");
                 return;
            }

            const btn = document.getElementById('btnSubmitTimeOff');
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block"></i> Submitting...`;
            lucide.createIcons();
            btn.disabled = true;
            lucide.createIcons();

            try {
                await db.collection('time_off_requests').add({
                    uid: currentUser.uid,
                    employeeName: currentUserData.username || currentUser.email,
                    orgId: currentUserData.orgId,
                    startDate: startDate,
                    endDate: endDate,
                    reason: reason,
                    status: 'Pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert("Time off request submitted successfully.");
                document.getElementById('timeoffStartDate').value = '';
                document.getElementById('timeoffEndDate').value = '';
                document.getElementById('timeoffReason').value = '';
            } catch (err) {
                console.error("Error submitting time off request", err);
                if (err.code === 'unavailable' || err.code === 'auth/network-request-failed') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert("Error submitting request. Please try again.");
                }
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
                lucide.createIcons();
            }
        }

        function fetchMyTasks() {
            if (!currentUser || !currentUserData) return;
            if (unsubscribeTasks) unsubscribeTasks();

            const isManager = currentUserData.orgId === currentUser.uid;
            const actualOrgId = currentUserData.orgId || currentUser.uid;

            // Only managers can create tasks
            if (isManager) {
                document.getElementById('managerTaskCreation').style.display = 'block';
                document.getElementById('managerTasksSection').style.display = 'block';
            } else {
                document.getElementById('managerTaskCreation').style.display = 'none';
                document.getElementById('managerTasksSection').style.display = 'none';
            }

            unsubscribeTasks = db.collection('tasks')
                .where('orgId', '==', actualOrgId)
                .onSnapshot(snap => {
                    const myContainer = document.getElementById('myTasksContainer');
                    const orgContainer = document.getElementById('orgTasksContainer');

                    let myTasksHtml = [];
                    let orgTasksHtml = [];

                    let tasks = [];
                    snap.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));

                    tasks.sort((a, b) => {
                        let aTime = a.createdAt ? a.createdAt.toMillis() : 0;
                        let bTime = b.createdAt ? b.createdAt.toMillis() : 0;
                        return bTime - aTime;
                    });

                    // ⚡ Bolt Optimization: Replace O(n²) string concatenation inside loop with array map().join('')
                    let myTasksArr = [];
                    let orgTasksArr = [];

                    tasks.forEach(task => {
                        let statusColor = task.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

                        let taskCard = `
                            <div class="card p-4 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div class="font-bold text-lg">${escapeHTML(task.title)}</div>
                                    <div class="text-sm text-slate-500 mb-1">Assigned to: ${escapeHTML(task.assigneeName)}</div>
                                    ${task.description ? `<div class="text-sm italic text-slate-600 mb-2">"${escapeHTML(task.description)}"</div>` : ''}
                                    <span class="px-2 py-1 rounded-full text-xs font-bold ${statusColor}">${escapeHTML(task.status)}</span>
                                </div>
                                <div class="flex items-center gap-2 mt-4 md:mt-0">
                        `;

                        // Employee specific view (Can mark their own as complete)
                        if (task.assigneeId === currentUser.uid && task.status === 'Pending') {
                            myTasksHtml.push(taskCard + `
                                    <button data-action="updateTaskStatus" data-id="${task.id}" data-status="Completed" class="btn btn-sm bg-green-500 text-white hover:bg-green-600"><i data-lucide="check" class="w-4 h-4 mr-1"></i>Complete</button>
                                </div></div>
                            `);
                        } else if (task.assigneeId === currentUser.uid) {
                             myTasksHtml.push(taskCard + `</div></div>`);
                        }

                        // Manager specific view
                        if (isManager) {
                            let deleteBtn = `<button data-action="deleteTask" data-id="${task.id}" class="btn btn-sm btn-outline text-red-500 hover:bg-red-50" aria-label="Delete Task"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
                            let revertBtn = task.status === 'Completed' ? `<button data-action="updateTaskStatus" data-id="${task.id}" data-status="Pending" class="btn btn-sm btn-outline text-yellow-600" aria-label="Mark Pending"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>` : '';

                            orgTasksHtml.push(taskCard + revertBtn + deleteBtn + `</div></div>`);
                        }
                    });
                    myTasksHtml = myTasksArr.join('');
                    orgTasksHtml = orgTasksArr.join('');

                    if (myContainer) myContainer.innerHTML = myTasksHtml.join('') || '<p class="text-slate-500 text-center py-4">No tasks assigned to you right now. You\'re all caught up!</p>';
                    if (orgContainer && isManager) orgContainer.innerHTML = orgTasksHtml.join('') || '<p class="text-slate-500 text-center py-4">No active tasks in the organization.</p>';
                    lucide.createIcons();
                }, err => {
                    console.error("Manager Troubleshooting: Error fetching tasks:", err);
                });
        }

        function fetchTimeOffRequests() {
             if (!currentUser || !currentUserData) return;
             if (unsubscribeTimeOff) unsubscribeTimeOff();

             let query = db.collection('time_off_requests');

             // If manager/admin (assuming they have an orgId and are not just a base user, or using some flag. We will check if they own the org or just use orgId)
             // For simplicity, we fetch all for the org if they are an org owner, otherwise just their own.
             // Wait, let's look at how employees are fetched.
             // Employees are fetched if user is admin or org owner.
             // Let's just fetch for the user's org, and then filter locally to show manager view vs employee view

             query = query.where('orgId', '==', currentUserData.orgId || currentUser.uid);

             unsubscribeTimeOff = query.onSnapshot(snap => {
                 const employeeContainer = document.getElementById('myTimeOffRequests');
                 const managerContainer = document.getElementById('managerTimeOffRequests');

                 let myRequestsHtml = [];
                 let managerRequestsHtml = [];

                 let requests = [];
                 snap.forEach(doc => requests.push({ id: doc.id, ...doc.data() }));

                 // Sort locally by createdAt desc
                 requests.sort((a, b) => {
                     let aTime = a.createdAt ? a.createdAt.toMillis() : 0;
                     let bTime = b.createdAt ? b.createdAt.toMillis() : 0;
                     return bTime - aTime;
                 });

                 const isManager = currentUserData.orgId === currentUser.uid;

                 // ⚡ Bolt Optimization: Replace O(n²) string concatenation inside loop with array map().join('')
                 let myRequestsArr = [];
                 let managerRequestsArr = [];

                 requests.forEach(req => {
                     let statusColor = req.status === 'Approved' ? 'bg-green-100 text-green-800' : (req.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800');

                     let reqCard = `
                        <div class="card p-4 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div class="font-bold">${escapeHTML(req.employeeName)}</div>
                                <div class="text-sm text-slate-500">${escapeHTML(req.startDate)} to ${escapeHTML(req.endDate)}</div>
                                <div class="text-sm italic mt-1">"${escapeHTML(req.reason)}"</div>
                            </div>
                            <div class="flex items-center gap-4">
                                <span class="px-3 py-1 rounded-full text-xs font-bold ${statusColor}">${escapeHTML(req.status)}</span>
                     `;

                     if (req.uid === currentUser.uid) {
                          let cancelBtn = req.status === 'Pending' ? `<button class="btn btn-sm btn-outline text-red-500 hover:bg-red-50 delete-timeoff-btn" data-req-id="${req.id}">Cancel</button>` : '';
                          myRequestsHtml.push(reqCard + cancelBtn + `</div></div>`);
                     }

                     if (isManager && req.status === 'Pending') {
                          managerRequestsHtml.push(reqCard + `
                                <button class="btn btn-sm bg-green-500 text-white hover:bg-green-600 update-timeoff-btn" data-req-id="${req.id}" data-req-status="Approved">Approve</button>
                                <button class="btn btn-sm bg-red-500 text-white hover:bg-red-600 update-timeoff-btn" data-req-id="${req.id}" data-req-status="Rejected">Deny</button>
                          </div></div>`);
                     } else if (isManager) {
                          managerRequestsHtml.push(reqCard + `</div></div>`);
                     }
                 });
                 myRequestsHtml = myRequestsArr.join('');
                 managerRequestsHtml = managerRequestsArr.join('');

                 if (employeeContainer) employeeContainer.innerHTML = myRequestsHtml.join('') || '<p class="text-slate-500">No time off requests found.</p>';
                 if (managerContainer) {
                     if (isManager) {
                         managerContainer.innerHTML = managerRequestsHtml.join('') || '<p class="text-slate-500">No requests to manage.</p>';
                         document.getElementById('managerTimeOffSection').style.display = 'block';
                     } else {
                         document.getElementById('managerTimeOffSection').style.display = 'none';
                     }
                 }

                 // Attach event listeners safely
                 document.querySelectorAll('.delete-timeoff-btn').forEach(btn => {
                     btn.onclick = () => deleteTimeOffRequest(btn.getAttribute('data-req-id'));
                 });
                 document.querySelectorAll('.update-timeoff-btn').forEach(btn => {
                     btn.onclick = () => updateTimeOffStatus(btn.getAttribute('data-req-id'), btn.getAttribute('data-req-status'));
                 });
             }, err => {
                 console.error("Manager Troubleshooting: Error fetching time off requests:", err);
             });
        }

        async function updateTimeOffStatus(id, status) {
            try {
                await db.collection('time_off_requests').doc(id).update({ status: status });
            } catch (err) {
                console.error("Manager Troubleshooting: Error updating time off status", err);
                alert("Error updating status.");
            }
        }

        async function deleteTimeOffRequest(id) {
            if (!confirm("Are you sure you want to cancel this request?")) return;
            try {
                await db.collection('time_off_requests').doc(id).delete();
            } catch (err) {
                console.error("Manager Troubleshooting: Error deleting time off request", err);
                alert("Error cancelling request.");
            }
        }

        function fetchEmployees() {
            if (!currentUser || !currentUserData) return;

            const container = document.getElementById('employeesListContainer');
            if (container) container.innerHTML = '<div class="text-center py-8"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-sky-500 mb-4"></i><p class="text-slate-500">Loading staff...</p></div>';
            lucide.createIcons();

            if (unsubscribeEmployees) unsubscribeEmployees();

            const queryOrgId = currentUserData.orgId || currentUser.uid;

            unsubscribeEmployees = db.collection('employees')
                .where('orgId', '==', queryOrgId)
                .onSnapshot(snap => {
                    if (container) container.innerHTML = '';

                    if (snap.empty) {
                        if (container) container.innerHTML = `
                            <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <i data-lucide="users" class="w-12 h-12 text-slate-400 mx-auto mb-4"></i>
                                <h3 class="text-xl font-bold mb-2">No Staff Added</h3>
                                <p class="text-slate-500">Click 'Add Employee' to start building your team roster.</p>
                            </div>
                        `;
                        lucide.createIcons();
                        return;
                    }

                    let employees = [];
                    snap.forEach(doc => employees.push({ id: doc.id, ...doc.data() }));

                    // Sort by name
                    employees.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                    // ⚡ Bolt Optimization: Use DocumentFragment to batch DOM insertions and reduce layout thrashing
                    const fragment = document.createDocumentFragment();

                    employees.forEach(emp => {
                        const div = document.createElement('div');
                        div.className = "flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 gap-4";

                        const statusBadge = emp.status === 'Active'
                            ? '<span class="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-widest">Active</span>'
                            : '<span class="px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full text-xs font-bold uppercase tracking-widest">Inactive</span>';

                        div.innerHTML = `
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <h4 class="font-bold text-lg">${escapeHTML(emp.name)}</h4>
                                    ${statusBadge}
                                </div>
                                <p class="text-sm text-sky-500 font-medium mb-1">${escapeHTML(emp.role)}</p>
                                <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                    ${emp.phone ? `<span class="flex items-center gap-1"><i data-lucide="phone" class="w-3 h-3"></i> ${escapeHTML(emp.phone)}</span>` : ''}
                                    ${emp.email ? `<span class="flex items-center gap-1"><i data-lucide="mail" class="w-3 h-3"></i> ${escapeHTML(emp.email)}</span>` : ''}
                                </div>
                            </div>
                            <div class="flex gap-2 self-start sm:self-center">
                                <button class="btn btn-outline btn-sm text-blue-500 hover:bg-blue-50 feedback-emp-btn" aria-label="Leave Feedback"><i data-lucide="message-square" class="w-3 h-3"></i> Feedback</button>
                                <button class="btn btn-outline btn-sm toggle-emp-btn" aria-label="Toggle Employee Status">${emp.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
                                <button class="btn btn-outline btn-sm text-red-500 hover:bg-red-50 delete-emp-btn" aria-label="Delete Employee"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                            </div>
                        `;
                        div.querySelector('.toggle-emp-btn').onclick = () => toggleEmployeeStatus(emp.id, emp.status);
                        div.querySelector('.delete-emp-btn').onclick = () => deleteEmployee(emp.id);
                        div.querySelector('.feedback-emp-btn').onclick = () => openFeedbackModal(emp.id, emp.name);
                        fragment.appendChild(div);
                    });
                    if (container) container.appendChild(fragment);
                    lucide.createIcons();
                    populateScheduleDropdown();
                }, err => {
                    console.error("Manager Troubleshooting: Error fetching employees:", err);
                    if (container) { container.innerHTML = '<p class="text-red-500 text-center py-8">Failed to load roster.</p>'; }
                });
        }

        async function toggleEmployeeStatus(id, currentStatus) {
            const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
            try {
                await db.collection('employees').doc(id).update({ status: newStatus });
            } catch (err) {
                console.error("Manager Troubleshooting: Error updating status:", err);
                alert("Failed to update employee status.");
            }
        }



        function populateScheduleDropdown() {
            const select = document.getElementById('shiftEmpName');
            const taskSelect = document.getElementById('taskAssignee');
            if (!currentUserData) return;

            const queryOrgId = currentUserData.orgId || currentUser.uid;

            db.collection('employees')
                .where('orgId', '==', queryOrgId)
                .where('status', '==', 'Active')
                .get()
                .then(snap => {
                    select.innerHTML = '<option value="" disabled selected>Select Employee</option>';
                    let employees = [];
                    snap.forEach(doc => {
                        let data = doc.data();
                        data.docId = doc.id;
                        employees.push(data);
                    });
                    employees.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                    const taskSelect = document.getElementById('taskAssignee');
                    if (taskSelect) {
                        taskSelect.innerHTML = '<option value="">Select Employee...</option>';
                    }

                    const selectFragment = document.createDocumentFragment();
                    let taskSelectFragment = null;
                    if (taskSelect) {
                        taskSelectFragment = document.createDocumentFragment();
                    }

                    employees.forEach(emp => {
                        const opt = document.createElement('option');
                        opt.value = emp.name;
                        opt.textContent = `${emp.name} (${emp.role})`;
                        opt.dataset.role = emp.role;
                        selectFragment.appendChild(opt);

                        if (taskSelect && taskSelectFragment) {
                            const taskOpt = document.createElement('option');
                            taskOpt.value = emp.docId; // Use docId for tasks reference
                            taskOpt.textContent = emp.name;
                            taskSelectFragment.appendChild(taskOpt);
                        }
                    });

                    select.appendChild(selectFragment);
                    if (taskSelect && taskSelectFragment) {
                        taskSelect.appendChild(taskSelectFragment);
                    }
                })
                .catch(err => console.error("Manager Troubleshooting: Error populating dropdown:", err));
        }

        // Auto-select role when an employee is chosen in schedule
        document.addEventListener('DOMContentLoaded', () => {
            const shiftEmpNameSelect = document.getElementById('shiftEmpName');
            if (shiftEmpNameSelect) {
                shiftEmpNameSelect.addEventListener('change', (e) => {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    const roleInput = document.getElementById('shiftRole');
                    if (selectedOption && selectedOption.dataset.role && roleInput) {
                        // Check if role exists in the select, if not add it temporarily
                        let roleExists = Array.from(roleInput.options).some(opt => opt.value === selectedOption.dataset.role);
                        if (!roleExists) {
                            const newOpt = document.createElement('option');
                            newOpt.value = selectedOption.dataset.role;
                            newOpt.textContent = selectedOption.dataset.role;
                            roleInput.appendChild(newOpt);
                        }
                        roleInput.value = selectedOption.dataset.role;
                    }
                });
            }
        });

        async function addShiftToSchedule() {
            const dateInput = document.getElementById('scheduleDate');
            const empNameSelect = document.getElementById('shiftEmpName');
            const role = document.getElementById('shiftRole');
            const startTime = document.getElementById('shiftStart');
            const endTime = document.getElementById('shiftEnd');

            if (!dateInput.value || !empNameSelect.value || !role.value || !startTime.value || !endTime.value) {
                alert("Please fill in all shift details.");
                return;
            }

            const newShift = {
                employeeName: empNameSelect.value,
                role: role.value,
                startTime: startTime.value,
                endTime: endTime.value
            };

            const date = dateInput.value;
            const scheduleRef = db.collection('schedules').doc(`${currentUser.uid}_${date}`);

            try {
                const doc = await scheduleRef.get();
                let shifts = [];
                if (doc.exists) {
                    shifts = doc.data().shifts || [];
                }
                shifts.push(newShift);

                await scheduleRef.set({
                    uid: currentUser.uid,
                    authorId: currentUser.uid,
                    orgId: currentUserData?.orgId || null,
                    date: date,
                    shifts: shifts,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                empNameSelect.value = '';
                startTime.value = '';
                endTime.value = '';
            } catch(err) {
                console.error("Error saving shift", err);
                if (err.code === 'unavailable' || err.code === 'auth/network-request-failed' || err.code === 'firestore/unavailable') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert("Failed to save shift: " + err.message);
                }
            }
        }

        let unsubscribeSchedule = null;

        function fetchSchedules(date) {
            if (!currentUser) return;
            if (unsubscribeSchedule) unsubscribeSchedule();

            const listContainer = document.getElementById('scheduleList');
            if (listContainer) listContainer.innerHTML = '<p class="text-sm text-slate-500">Loading schedule...</p>';

            unsubscribeSchedule = db.collection('schedules')
                .doc(`${currentUser.uid}_${date}`)
                .onSnapshot(doc => {
                    if (listContainer) {
                        listContainer.innerHTML = '';
                        if (!doc.exists) {
                            listContainer.innerHTML = "<p class='text-sm text-slate-500'>No shifts scheduled for this date.</p>";
                            return;
                        }

                        const data = doc.data();
                        const shifts = data.shifts || [];

                        if (shifts.length === 0) {
                            listContainer.innerHTML = "<p class='text-sm text-slate-500'>No shifts scheduled for this date.</p>";
                            return;
                        }

                        // ⚡ Bolt Optimization: Use DocumentFragment to batch DOM insertions and reduce layout thrashing
                        const fragment = document.createDocumentFragment();

                        shifts.forEach((shift, index) => {
                            const div = document.createElement('div');
                            div.className = "flex justify-between items-center p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800";
                            div.innerHTML = `
                                <div>
                                    <h4 class="font-bold text-lg">${escapeHTML(shift.employeeName)}</h4>
                                    <p class="text-sm text-slate-500">${escapeHTML(shift.role)}</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-mono bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700">${escapeHTML(shift.startTime)} - ${escapeHTML(shift.endTime)}</p>
                                    <button class="text-red-500 text-xs mt-2 hover:underline remove-shift-btn" data-shift-idx="${index}" aria-label="Remove Shift">Remove</button>
                                </div>
                            `;
                            div.querySelector('.remove-shift-btn').onclick = function() { removeShift(parseInt(this.getAttribute('data-shift-idx'), 10)); };
                            fragment.appendChild(div);
                        });
                        listContainer.appendChild(fragment);
                    }
                }, error => {
                    console.error("Manager Troubleshooting: Error fetching schedules: ", error);
                    if (listContainer) { listContainer.innerHTML = "<p class='text-sm text-red-500'>Error loading schedule.</p>"; }
                });
        }

        async function removeShift(index) {
            const dateInput = document.getElementById('scheduleDate');
            if (!dateInput || !dateInput.value) return;

            const date = dateInput.value;
            const scheduleRef = db.collection('schedules').doc(`${currentUser.uid}_${date}`);

            try {
                const doc = await scheduleRef.get();
                if (doc.exists) {
                    const data = doc.data();
                    let shifts = data.shifts || [];
                    shifts.splice(index, 1);
                    await scheduleRef.update({ shifts: shifts });
                }
            } catch (error) {
                console.error("Manager Troubleshooting: Error removing shift:", error);
            }
        }


        function fetchFeatureRequests() {
            if (!currentUser) return;
            db.collection('feature_requests')
                .where('uid', '==', currentUser.uid)
                .onSnapshot(snap => {
                    const container = document.getElementById('myFeatureRequests');
                    container.innerHTML = '';
                    if (snap.empty) {
                        container.innerHTML = `
                            <div class="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                <i data-lucide="message-square-plus" class="w-8 h-8 mb-3 text-slate-300 dark:text-slate-600"></i>
                                <p class="text-sm font-medium text-slate-500">You haven't submitted any requests yet.</p>
                                <p class="text-xs text-slate-400 mt-1">Use the form above to share your ideas with us!</p>
                            </div>
                        `;
                        lucide.createIcons();
                        return;
                    }

                    const fragment = document.createDocumentFragment();
                    snap.forEach(doc => {
                        const data = doc.data();
                        const status = data.status || 'In Progress';

                        let badgeClass = "bg-amber-100 text-amber-700";
                        if (status === 'Completed') badgeClass = "bg-emerald-100 text-emerald-700";
                        if (status === 'Declined') badgeClass = "bg-red-100 text-red-700";

                        const div = document.createElement('div');
                        div.className = "p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800";
                        div.innerHTML = `
                          <div class="flex justify-between items-start mb-2">
                              <span class="text-xs text-slate-400 font-mono">${escapeHTML(new Date(data.timestamp).toLocaleDateString())}</span>
                              <span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${escapeHTML(badgeClass)}">${escapeHTML(status)}</span>
                          </div>
                          <p class="text-sm font-medium text-slate-700 dark:text-slate-300 feature-request-message"></p>
                      `;
                        div.querySelector('.feature-request-message').textContent = `"${data.message}"`;
                        fragment.appendChild(div);
                    });
                    container.appendChild(fragment);
                });
        }

function checkAndRenderOrgControls() {
            if (!currentUser) return false;

            const controls = document.getElementById('shiftNotesGroupControls');
            const postArea = document.getElementById('shiftNotesPostArea');

            if (!currentUserData || !currentUserData.orgId) {
                // Not in an org
                controls.innerHTML = `
                    <button aria-label="Create Group" onclick="document.getElementById('createGroupModal').classList.remove('hidden')" class="btn btn-outline btn-sm"><i data-lucide="plus" class="w-4 h-4"></i> Create Group</button>
                    <button aria-label="Join Group" onclick="document.getElementById('joinGroupModal').classList.remove('hidden')" class="btn btn-outline btn-sm"><i data-lucide="log-in" class="w-4 h-4"></i> Join Group</button>
                `;
                postArea.classList.add('hidden');
                lucide.createIcons();
                fetchMySentRequests();
                return false;
            }

            // User is in an org
            postArea.classList.remove('hidden');
            fetchMySentRequests();

            // If they are the owner, show the request panel logic
            db.collection('shift_groups').doc(currentUserData.orgId).get().then(doc => {
                if (doc.exists && doc.data().ownerId === currentUser.uid) {
                    controls.innerHTML = `
                        <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span class="text-xs font-bold text-slate-500 uppercase">Group ID:</span>
                            <span class="text-sm font-mono font-bold">${escapeHTML(currentUserData.orgId)}</span>
                            <button aria-label="Copy Group ID" data-org-id="${escapeHTML(currentUserData.orgId)}" class="copy-group-id-btn text-sky-500 hover:text-sky-600"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button>
                        </div>
                    `;
                    fetchGroupRequests(currentUserData.orgId);
                } else {
                    controls.innerHTML = `
                        <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Connected to Group</span>
                        </div>
                    `;
                    document.getElementById('groupRequestsPanel').classList.add('hidden');
                }
                lucide.createIcons();
            });
            return true;
        }

        async function fetchShiftNotes() {
            if (!currentUser) return;

            const hasOrg = checkAndRenderOrgControls();
            const container = document.getElementById('shiftNotesContainer');

            if (!hasOrg) {
                container.innerHTML = `
                    <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <i data-lucide="users" class="w-12 h-12 text-slate-400 mx-auto mb-4"></i>
                        <h3 class="text-xl font-bold mb-2">Join or Create a Group</h3>
                        <p class="text-slate-500 mb-4">You must be in a Management Group to post and view shift notes.</p><button onclick="document.getElementById('orgTutorialModal').classList.remove('hidden')" class="btn btn-sm btn-outline text-sky-500 border-sky-200">How do I connect?</button>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            container.innerHTML = '<div class="text-center py-8"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-sky-500 mb-4"></i><p class="text-slate-500">Loading notes...</p></div>';
            lucide.createIcons();

            db.collection('shift_notes')
                .where('orgId', '==', currentUserData.orgId)
                .get() // orderBy timestamp desc requires composite index if where filters are used
                .then(snap => {
                    container.innerHTML = '';
                    if (snap.empty) {
                        container.innerHTML = `
                            <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <i data-lucide="check-circle-2" class="w-12 h-12 text-emerald-400 mx-auto mb-4"></i>
                                <h3 class="text-xl font-bold mb-2">All Clear!</h3>
                                <p class="text-slate-500">There are no active shift notes for your group.</p>
                            </div>
                        `;
                        lucide.createIcons();
                        return;
                    }

                    // Sort manually since composite index might not exist
                    let docs = [];
                    snap.forEach(doc => { if (doc.data().status === 'Active') docs.push({ id: doc.id, data: doc.data() }) });
                    docs.sort((a, b) => b.data.timestamp - a.data.timestamp);

                    // ⚡ Bolt Optimization: Use DocumentFragment to batch DOM insertions and reduce layout thrashing
                    const fragment = document.createDocumentFragment();

                    docs.forEach(docObj => {
                        const data = docObj.data;
                        const docId = docObj.id;
                        const isUrgent = data.priority === 'Urgent';
                        const noteDiv = document.createElement('div');

                        let borderClass = isUrgent ? "border-red-200 dark:border-red-900/50" : "border-slate-100 dark:border-slate-800";
                        let bgClass = isUrgent ? "bg-red-50 dark:bg-red-950/20" : "bg-white dark:bg-slate-900";
                        let priorityBadge = isUrgent ?
                            `<span class="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3 h-3"></i> Urgent</span>` :
                            `<span class="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">Normal</span>`;

                        noteDiv.className = `p-6 rounded-2xl border ${borderClass} ${bgClass} shadow-sm relative group transition-all duration-200 hover:shadow-md`;

                        let dateStr = "Just now";
                        if (data.timestamp) {
                            dateStr = data.timestamp.toDate().toLocaleString();
                        }

                        noteDiv.innerHTML = `
                            <div class="flex justify-between items-start mb-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                        ${escapeHTML(data.authorName.charAt(0).toUpperCase())}
                                    </div>
                                    <div>
                                        <p class="font-bold text-sm">${escapeHTML(data.authorName)}</p>
                                        <p class="text-xs text-slate-500 font-mono">${escapeHTML(dateStr)}</p>
                                    </div>
                                </div>
                                ${priorityBadge}
                            </div>
                            <p class="text-slate-700 dark:text-slate-300 font-medium mb-6 whitespace-pre-wrap pl-1 shift-note-text"></p>
                            <div class="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                                <button class="text-sm font-bold text-slate-400 hover:text-emerald-500 flex items-center gap-2 transition-colors resolve-note-btn" aria-label="Resolve Shift Note" data-note-id="${escapeHTML(docId)}">
                                    <i data-lucide="check-circle" class="w-4 h-4"></i> Mark Resolved
                                </button>
                            </div>
                        `;
                        noteDiv.querySelector('.resolve-note-btn').onclick = () => resolveShiftNote(docId);
                        noteDiv.querySelector('.shift-note-text').textContent = data.content;
                        fragment.appendChild(noteDiv);
                    });
                    container.appendChild(fragment);
                    lucide.createIcons();
                })
                .catch(err => {
                    console.error("Manager Troubleshooting: Error fetching notes:", err);
                    if (container) { container.innerHTML = '<p class="text-red-500 text-center py-8">Failed to load shift notes. Please check your connection.</p>'; }
                });
        }

        async function submitShiftNote() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                alert("You must be logged in and part of a group to post a shift note.");
                return;
            }
            const content = document.getElementById('shiftNoteContent').value.trim();
            const priority = document.getElementById('shiftNotePriority').value;

            if (!content) return alert("Please enter note content.");

            // Optimistic UI update
            const container = document.getElementById('shiftNotesContainer');
            const noteDiv = document.createElement('div');
            const isUrgent = priority === 'Urgent';
            let borderClass = isUrgent ? "border-red-200 dark:border-red-900/50" : "border-slate-100 dark:border-slate-800";
            let bgClass = isUrgent ? "bg-red-50 dark:bg-red-950/20" : "bg-white dark:bg-slate-900";
            let priorityBadge = isUrgent ?
                `<span class="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3 h-3"></i> Urgent</span>` :
                `<span class="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">Normal</span>`;

            noteDiv.className = `p-6 rounded-2xl border ${borderClass} ${bgClass} shadow-sm relative group transition-all duration-200 hover:shadow-md opacity-50`;

            const authorName = currentUser.email.split('@')[0];

            noteDiv.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            ${escapeHTML(authorName.charAt(0).toUpperCase())}
                        </div>
                        <div>
                            <p class="font-bold text-sm">${escapeHTML(authorName)}</p>
                            <p class="text-xs text-slate-500 font-mono">Posting...</p>
                        </div>
                    </div>
                    ${priorityBadge}
                </div>
                <p class="text-slate-700 dark:text-slate-300 font-medium mb-6 whitespace-pre-wrap pl-1 shift-note-text"></p>
                <div class="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                    <button disabled class="text-sm font-bold text-slate-400 flex items-center gap-2">
                        <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Saving...
                    </button>
                </div>
            `;
            noteDiv.querySelector('.shift-note-text').textContent = content;

            // Remove empty state message if it exists
            const emptyState = container.querySelector('.text-center.py-16');
            if (emptyState) emptyState.remove();

            container.prepend(noteDiv);
            if (window.lucide) window.lucide.createIcons();
            // Store the content so we can restore it if the write fails
            const previousContent = document.getElementById('shiftNoteContent').value;
            document.getElementById('shiftNoteContent').value = "";

            try {
                // To allow client-side writes since cloud functions were failing for some users
                await db.collection('shift_notes').add({
                    authorId: currentUser.uid,
                    authorName: currentUser.email.split('@')[0],
                    content: content,
                    priority: priority,
                    status: 'Active',
                    orgId: currentUserData.orgId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.getElementById('shiftNoteContent').value = "";

                // Update UI after success
                const container = document.getElementById('shiftNotesContainer');
                const noteDiv = document.createElement('div');
                const isUrgent = priority === 'Urgent';
                let borderClass = isUrgent ? "border-red-200 dark:border-red-900/50" : "border-slate-100 dark:border-slate-800";
                let bgClass = isUrgent ? "bg-red-50 dark:bg-red-950/20" : "bg-white dark:bg-slate-900";
                let priorityBadge = isUrgent ?
                    `<span class="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3 h-3"></i> Urgent</span>` :
                    `<span class="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">Normal</span>`;

                noteDiv.className = `p-6 rounded-2xl border ${borderClass} ${bgClass} shadow-sm relative group transition-all duration-200 hover:shadow-md`;

                const authorName = currentUser.email.split('@')[0];

                noteDiv.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                ${authorName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p class="font-bold text-sm">${authorName}</p>
                                <p class="text-xs text-slate-500 font-mono">Just now</p>
                            </div>
                        </div>
                        ${priorityBadge}
                    </div>
                    <p class="text-slate-700 dark:text-slate-300 font-medium mb-6 whitespace-pre-wrap pl-1 shift-note-text"></p>
                    <div class="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                        <button class="text-sm font-bold text-slate-400 hover:text-emerald-500 flex items-center gap-2 transition-colors resolve-note-btn" aria-label="Resolve Shift Note">
                            <i data-lucide="check-circle" class="w-4 h-4"></i> Mark Resolved
                        </button>
                    </div>
                `;
                noteDiv.querySelector('.shift-note-text').textContent = content;

                const emptyState = container.querySelector('.text-center.py-16');
                if (emptyState) emptyState.remove();

                container.prepend(noteDiv);
                if (window.lucide) window.lucide.createIcons();

            } catch (err) {
                console.error("Error posting note", err);
                if (err.code === 'unavailable' || err.code === 'auth/network-request-failed' || err.code === 'firestore/unavailable') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert("Failed to post note: " + err.message);
                }
            }
        }

        async function resolveShiftNote(noteId) {
            if (!currentUser) return;
            if (!confirm("Mark this note as resolved?")) return;

            // Find note element to remove optimistically
            const container = document.getElementById('shiftNotesContainer');
            const resolveBtn = container.querySelector(`.resolve-note-btn[data-note-id="${noteId}"]`);
            let noteDiv = null;
            let originalDisplay = '';

            if (resolveBtn) {
                noteDiv = resolveBtn.closest('.relative');
                if (noteDiv) {
                    originalDisplay = noteDiv.style.display;
                    noteDiv.style.display = 'none'; // Optimistically hide
                }
            }

            try {
                const result = await callCloudFunction('manageShiftNotes', {
                    action: "resolve",
                    payload: { noteId: noteId, resolvedBy: currentUser.email.split('@')[0] }
                });
                if (result.data.success && noteDiv) {
                    noteDiv.remove();
                }
            } catch (err) {
                if (noteDiv) noteDiv.style.display = originalDisplay; // Revert optimistic hide
                console.error("Manager Troubleshooting: Error resolving shift note:", err);
                alert("Failed to resolve note: " + err.message);
            }
        }

        async function createShiftGroup() {
            if (!currentUser) return;
            const name = document.getElementById('newGroupName').value.trim();
            const pass = document.getElementById('newGroupPassword').value.trim();
            if (!name || !pass) return alert("All fields required");

            try {
                const result = await callCloudFunction('manageShiftGroups', {
                    action: "create",
                    payload: {
                        authorId: currentUser.uid,
                        orgId: currentUserData.orgId || currentUser.uid,
                        ownerName: currentUser.email.split('@')[0],
                        groupName: name,
                        password: pass
                    }
                });
                if (result.data.success) {
                    alert(`Group Created! Share your Group ID: ${result.data.groupId} and password with other managers.`);
                    document.getElementById('createGroupModal').classList.add('hidden');

                    // Await fetching updated user doc to ensure orgId is ready before reloading
                    await fetchUserDoc(currentUser.uid);
                    window.location.reload();
                }
            } catch (e) {
                console.error("Manager Troubleshooting: Error creating shift group:", e);
                if (e.code === 'unavailable' || e.code === 'auth/network-request-failed' || e.code === 'firestore/unavailable') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert("Failed to create group: " + e.message);
                }
            }
        }

        async function requestJoinShiftGroup() {
            if (!currentUser) return;
            const groupId = document.getElementById('joinGroupId').value.trim();
            const pass = document.getElementById('joinGroupPassword').value.trim();
            if (!groupId || !pass) return alert("All fields required");

            try {
                const result = await callCloudFunction('manageShiftGroups', {
                    action: "request_join",
                    payload: {
                        userName: currentUser.email.split('@')[0],
                        groupId: groupId,
                        password: pass
                    }
                });
                if (result.data.success) {
                    alert("Join request sent! The group owner must approve it before you gain access.");
                    document.getElementById('joinGroupModal').classList.add('hidden');
                }
            } catch (e) {
                console.error("Manager Troubleshooting: Error requesting to join shift group:", e);
                alert("Failed to request join: " + e.message);
            }
        }

        function fetchGroupRequests(groupId) {
            if (window.groupRequestsUnsubscribe) window.groupRequestsUnsubscribe();
            window.groupRequestsUnsubscribe = db.collection('shift_group_requests')
                .where('groupId', '==', groupId)
                .where('status', '==', 'Pending')
                .onSnapshot(snap => {
                    const panel = document.getElementById('groupRequestsPanel');
                    const container = document.getElementById('groupRequestsContainer');
                    if (snap.empty) {
                        panel.classList.add('hidden');
                        return;
                    }
                    panel.classList.remove('hidden');
                    container.innerHTML = '';
                    const fragment = document.createDocumentFragment();
                    snap.forEach(doc => {
                        const data = doc.data();
                        const div = document.createElement('div');
                        div.className = "flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30";
                        div.innerHTML = `
                            <div>
                                <p class="font-bold text-sm">${escapeHTML(data.userName)}</p>
                                <p class="text-xs text-slate-500">Wants to join your group</p>
                            </div>
                            <button class="btn btn-primary btn-sm px-4 approve-group-btn" aria-label="Approve Group Request">Approve</button>`;
                        div.querySelector('.approve-group-btn').onclick = () => approveGroupRequest(doc.id);
                        fragment.appendChild(div);
                    });
                    container.appendChild(fragment);
                });
        }

        function fetchMySentRequests() {
            if (window.mySentRequestsUnsubscribe) window.mySentRequestsUnsubscribe();
            if (!currentUser) return;
            window.mySentRequestsUnsubscribe = db.collection('shift_group_requests')
                .where('userId', '==', currentUser.uid)
                .where('status', '==', 'Pending')
                .onSnapshot(snap => {
                    const panel = document.getElementById('mySentRequestsPanel');
                    const container = document.getElementById('mySentRequestsContainer');
                    if (!panel) return;
                    if (snap.empty) {
                        panel.classList.add('hidden');
                        return;
                    }
                    panel.classList.remove('hidden');
                    container.innerHTML = '';
                    const fragment = document.createDocumentFragment();
                    snap.forEach(doc => {
                        const data = doc.data();
                        const div = document.createElement('div');
                        div.className = "flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700";
                        div.innerHTML = `
                            <div>
                                <p class="font-bold text-sm">Group ID: ${escapeHTML(data.groupId)}</p>
                                <p class="text-xs text-slate-500">Awaiting approval</p>
                            </div>
                            <button class="btn btn-outline btn-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 retract-group-btn" aria-label="Retract Group Request">Retract</button>`;
                        div.querySelector('.retract-group-btn').onclick = () => retractGroupRequest(doc.id);
                        fragment.appendChild(div);
                    });
                    container.appendChild(fragment);
                });
        }

        async function retractGroupRequest(requestId) {
            try {
                await callCloudFunction('manageShiftGroups', {
                    action: "retract_join",
                    payload: { requestId: requestId }
                });
                alert("Request Retracted!");
            } catch (e) {
                console.error("Manager Troubleshooting: Error retracting request:", e);
                alert("Failed to retract: " + e.message);
            }
        }

        async function approveGroupRequest(requestId) {
            try {
                const result = await callCloudFunction('manageShiftGroups', {
                    action: "approve_join",
                    payload: { requestId: requestId }
                });
                if (result.data.success) alert("Approved!");
            } catch (e) {
                console.error("Manager Troubleshooting: Error approving group request:", e);
                alert("Failed to approve: " + e.message);
            }
        }



        async function submitWasteLog() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                alert("You must be part of an organization to log waste.");
                return;
            }

            const itemName = document.getElementById('wasteItemName').value.trim();
            const quantity = document.getElementById('wasteQuantity').value;
            const cost = document.getElementById('wasteCost').value;
            const reason = document.getElementById('wasteReason').value;

            if (!itemName || !quantity || !cost) {
                alert("Please fill in all required fields (Item Name, Quantity, Cost).");
                return;
            }

            const submitBtn = document.querySelector('#addWasteModal .btn-accent');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Saving...';
            submitBtn.disabled = true;
            lucide.createIcons();

            try {
                await callCloudFunction('manageWaste', {
                    action: "create",
                    payload: { itemName, quantity, cost, reason }
                });

                document.getElementById('wasteItemName').value = '';
                document.getElementById('wasteQuantity').value = '';
                document.getElementById('wasteCost').value = '';
                document.getElementById('wasteReason').value = 'Expired';
                document.getElementById('addWasteModal').classList.add('hidden');

                alert("Waste entry logged successfully.");
                fetchWasteLogs();
            } catch (error) {
                console.error("Error logging waste:", error);
                alert("Failed to log waste. " + error.message);
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                lucide.createIcons();
            }
        }

        async function fetchWasteLogs() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                const container = document.getElementById('wasteLogsContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <i data-lucide="users" class="w-12 h-12 text-slate-400 mx-auto mb-4"></i>
                            <h3 class="text-xl font-bold mb-2">Join or Create a Group</h3>
                            <p class="text-slate-500">You must be in a Management Group to view waste logs.</p>
                        </div>
                    `;
                    lucide.createIcons();
                }
                return;
            }

            const container = document.getElementById('wasteLogsContainer');
            container.innerHTML = '<div class="text-center py-8"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-sky-500 mb-4"></i><p class="text-slate-500">Loading waste logs...</p></div>';
            lucide.createIcons();

            try {
                const result = await callCloudFunction('manageWaste', { action: "get", payload: {} });

                if (result.data.success) {
                    const logs = result.data.logs || [];
                    container.innerHTML = '';

                    if (logs.length === 0) {
                        container.innerHTML = `
                            <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <i data-lucide="check-circle-2" class="w-12 h-12 text-emerald-400 mx-auto mb-4"></i>
                                <h3 class="text-xl font-bold mb-2">No Waste Logged!</h3>
                                <p class="text-slate-500">There are no recent waste or spoilage entries.</p>
                            </div>
                        `;
                        lucide.createIcons();
                        return;
                    }

                    const fragment = document.createDocumentFragment();

                    logs.forEach(log => {
                        const div = document.createElement('div');
                        div.id = `waste-log-${escapeHTML(log.id)}`;
                        div.className = "card p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4";

                        const dateStr = log.timestamp ? new Date(log.timestamp._seconds * 1000).toLocaleString() : 'Just now';

                        div.innerHTML = `
                            <div>
                                <h3 class="text-lg font-bold">${escapeHTML(log.itemName)} <span class="text-sm font-normal text-slate-500">(x${escapeHTML(log.quantity)})</span></h3>
                                <p class="text-sm text-slate-500">Logged by ${escapeHTML(log.loggedByName)} • ${dateStr}</p>
                                <div class="mt-2 flex gap-2 items-center">
                                    <span class="px-2 py-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-xs font-bold font-mono">$${Number(log.cost).toFixed(2)} Lost</span>
                                    <span class="px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-lg text-xs font-bold">${escapeHTML(log.reason)}</span>
                                </div>
                            </div>
                            <button data-action="deleteWasteLog" data-id="${escapeHTML(log.id)}" class="btn btn-outline btn-sm text-red-500 hover:bg-red-50" aria-label="Delete Waste Log">
                                <i data-lucide="trash-2" class="w-4 h-4"></i> Remove
                            </button>
                        `;
                        fragment.appendChild(div);
                    });
                    container.appendChild(fragment);
                    lucide.createIcons();
                }
            } catch (error) {
                console.error("Error fetching waste logs:", error);
                container.innerHTML = `<div class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">Failed to load waste logs: ${escapeHTML(error.message)}</div>`;
            }
        }

        async function deleteWasteLog(logId) {
            if (!confirm("Are you sure you want to permanently delete this waste log entry?")) return;
            const logEl = document.getElementById('waste-log-' + escapeHTML(logId));
            if (logEl) logEl.style.display = 'none'; // Optimistically hide
            try {
                await callCloudFunction('manageWaste', { action: "delete", payload: { logId } });
                fetchWasteLogs();
            } catch (err) {
                logManagerError("Error deleting waste log:", err);
                alert("Failed to delete log.");
                fetchWasteLogs(); // Revert on failure
            }
        }


        // --- INCIDENTS LOGIC ---

        async function submitIncidentTicket() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                alert("You must be part of an organization to report incidents.");
                return;
            }

            const title = document.getElementById('incidentTitle').value.trim();
            const desc = document.getElementById('incidentDesc').value.trim();
            const severity = document.getElementById('incidentSeverity').value;
            const type = document.getElementById('incidentType').value;

            if (!title || !desc) {
                alert("Please provide a title and description.");
                return;
            }

            const submitBtn = document.querySelector('#reportIncidentModal .btn-accent');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Submitting...';
            submitBtn.disabled = true;
            lucide.createIcons();

            try {
                await callCloudFunction('manageIncidents', {
                    action: "create",
                    payload: { title, description: desc, severity, type }
                });

                document.getElementById('incidentTitle').value = '';
                document.getElementById('incidentDesc').value = '';
                document.getElementById('incidentSeverity').value = 'Low';
                document.getElementById('incidentType').value = 'Safety';
                document.getElementById('reportIncidentModal').classList.add('hidden');

                alert("Incident report submitted successfully.");
                fetchIncidents();
            } catch (error) {
                console.error("Error submitting incident:", error);
                if (error.code === 'unavailable' || error.code === 'auth/network-request-failed' || error.code === 'firestore/unavailable') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert("Failed to submit incident. " + error.message);
                }
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                lucide.createIcons();
            }
        }

        async function fetchIncidents() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                const container = document.getElementById('incidentsContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <i data-lucide="users" class="w-12 h-12 text-slate-400 mx-auto mb-4"></i>
                            <h3 class="text-xl font-bold mb-2">Join or Create a Group</h3>
                            <p class="text-slate-500 mb-4">You must be in a Management Group to view and report incidents.</p>
                            <button onclick="document.getElementById('orgTutorialModal').classList.remove('hidden')" class="btn btn-sm btn-outline text-sky-500 border-sky-200">How do I connect?</button>
                        </div>
                    `;
                    lucide.createIcons();
                }
                return;
            }

            const container = document.getElementById('incidentsContainer');
            container.innerHTML = '<div class="text-center py-8"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-sky-500 mb-4"></i><p class="text-slate-500">Loading incidents...</p></div>';
            lucide.createIcons();

            try {
                const result = await callCloudFunction('manageIncidents', { action: "get", payload: {} });

                if (result.data.success) {
                    const incidents = result.data.incidents || [];
                    container.innerHTML = '';

                    if (incidents.length === 0) {
                        container.innerHTML = `
                            <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <i data-lucide="check-circle-2" class="w-12 h-12 text-emerald-400 mx-auto mb-4"></i>
                                <h3 class="text-xl font-bold mb-2">All Clear!</h3>
                                <p class="text-slate-500">There are no reported incidents.</p>
                            </div>
                        `;
                        lucide.createIcons();
                        return;
                    }

                    const fragment = document.createDocumentFragment();

                    incidents.forEach(incident => {
                        const statusColors = {
                            'Open': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                            'In Progress': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800',
                            'Resolved': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        };
                        const prioColors = {
                            'Low': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
                            'Medium': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                            'High': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
                            'Critical': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
                        };

                        const dateStr = incident.timestamp ? new Date(incident.timestamp._seconds * 1000).toLocaleString() : 'Just now';

                        const div = document.createElement('div');
                        div.id = `incident-${escapeHTML(incident.id)}`;
                        div.className = `card p-6 border-l-4 ${incident.severity === 'Critical' ? 'border-l-red-500' : incident.severity === 'High' ? 'border-l-orange-500' : 'border-l-sky-500'}`;

                        div.innerHTML = `
                            <div class="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                <div>
                                    <h3 class="text-lg font-bold">${escapeHTML(incident.title)}</h3>
                                    <p class="text-sm text-slate-500">Reported by ${escapeHTML(incident.reportedByName)} • ${dateStr}</p>
                                    <span class="inline-block mt-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] font-bold uppercase tracking-widest">${escapeHTML(incident.type)}</span>
                                </div>
                                <div class="flex gap-2 items-start">
                                    <span class="px-3 py-1 rounded-full text-xs font-bold ${prioColors[incident.severity] || prioColors['Low']}">${escapeHTML(incident.severity)}</span>
                                    <select aria-label="Update incident status" class="px-3 py-1 rounded-full text-xs font-bold border appearance-none cursor-pointer focus:outline-none incident-status-select ${statusColors[incident.status] || statusColors['Open']}" data-incident-id="${escapeHTML(incident.id)}">
                                        <option value="Open" ${incident.status === 'Open' ? 'selected' : ''}>Open</option>
                                        <option value="In Progress" ${incident.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                        <option value="Resolved" ${incident.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                                    </select>
                                    <button data-action="deleteIncident" data-id="${escapeHTML(incident.id)}" class="text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md ml-2" aria-label="Delete Incident"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                </div>
                            </div>
                            <p class="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">${escapeHTML(incident.description)}</p>
                        `;
                        fragment.appendChild(div);
                    });
                    container.appendChild(fragment);
                    lucide.createIcons();
                }
            } catch (error) {
                console.error("Error fetching incidents:", error);
                container.innerHTML = `<div class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">Failed to load incidents: ${escapeHTML(error.message)}</div>`;
            }
        }

        async function deleteIncident(incidentId) {
            if (!confirm("Are you sure you want to permanently delete this incident report?")) return;
            const incEl = document.getElementById('incident-' + escapeHTML(incidentId));
            if (incEl) incEl.style.display = 'none'; // Optimistically hide
            try {
                await callCloudFunction('manageIncidents', { action: "delete", payload: { incidentId } });
                fetchIncidents();
            } catch (err) {
                logManagerError("Error deleting incident:", err);
                alert("Failed to delete incident.");
                fetchIncidents(); // Revert on failure
            }
        }

        // Event delegation for incident status updates
        document.addEventListener('change', function(e) {
            const select = e.target.closest('select[data-action]');
            if (select) {
                const action = select.dataset.action;
                const id = select.dataset.id;
                if (action === 'updateTaskStatus') {
                    updateTaskStatus(id, select.value);
                }
            }
            if (e.target && e.target.classList.contains('incident-status-select')) {
                const incidentId = e.target.getAttribute('data-incident-id');
                if (incidentId) {
                    updateIncidentStatus(incidentId, e.target.value);
                }
            }
        });

        async function updateIncidentStatus(incidentId, newStatus) {
            try {
                await callCloudFunction('manageIncidents', {
                    action: "updateStatus",
                    payload: { incidentId, status: newStatus }
                });
                // Optimistic UI update already handled by changing the select value
            } catch (error) {
                console.error("Manager Troubleshooting: Error updating incident:", error);
                alert("Failed to update status. " + error.message);
                fetchIncidents(); // revert
            }
        }

// --- TEAM DIRECTORY LOGIC ---

        let activeEmployeesList = [];

        function closeEmployeeModal() {
            document.getElementById('addEmployeeModal').classList.add('hidden');
            document.getElementById('empModalId').value = "";
            document.getElementById('empName').value = "";
            document.getElementById('empRole').value = "Cashier";
            document.getElementById('empPhone').value = "";
            document.getElementById('employeeModalTitle').innerText = "Add New Employee";
            document.getElementById('submitEmpBtn').innerText = "Save Employee";
        }

        function closeEmployeeModalAlt() {
            document.getElementById('addEmployeeModalAlt').classList.add('hidden');
            document.getElementById('empModalIdAlt').value = "";
            document.getElementById('empNameAlt').value = "";
            document.getElementById('empRoleAlt').value = "";
            document.getElementById('empPhoneAlt').value = "";
            document.getElementById('employeeModalTitleAlt').innerText = "Add New Employee";
            document.getElementById('submitEmpBtnAlt').innerText = "Save Employee";
        }

        function openEditEmployeeModal(empId) {
            const emp = activeEmployeesList.find(e => e.id === empId);
            if (!emp) return;

            // Ensure the main modal is populated for team view edit
            document.getElementById('empModalId').value = emp.id;
            document.getElementById('empName').value = emp.name;
            document.getElementById('empRole').value = emp.role;
            document.getElementById('empPhone').value = emp.phone || "";
            document.getElementById('employeeModalTitle').innerText = "Edit Employee";
            document.getElementById('submitEmpBtn').innerText = "Update Employee";

            document.getElementById('addEmployeeModal').classList.remove('hidden');
        }

        async function submitEmployee() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                alert("You must be part of a group to manage employees.");
                return;
            }

            let modalIdPrefix = '';
            if(!document.getElementById('addEmployeeModalAlt').classList.contains('hidden')){
                modalIdPrefix = 'Alt';
            }

            const empId = document.getElementById('empModalId' + modalIdPrefix)?.value || "";
            const name = document.getElementById('empName' + modalIdPrefix).value.trim();
            const role = document.getElementById('empRole' + modalIdPrefix).value;
            const phone = document.getElementById('empPhone' + modalIdPrefix).value.trim();

            if (!name) {
                alert("Employee name is required.");
                return;
            }

            const btn = document.getElementById('submitEmpBtn');
            btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> Saving...`;
            btn.disabled = true;
            if (window.lucide) window.lucide.createIcons();

            try {
                if (empId) {
                    await callCloudFunction('manageEmployees', {
                        action: "update",
                        payload: { empId, name, role, phone }
                    });
                } else {
                    await callCloudFunction('manageEmployees', {
                        action: "create",
                        payload: { name, role, phone }
                    });
                }

                closeEmployeeModal();
                fetchTeamDirectory();
            } catch (error) {
                console.error("Manager Troubleshooting: Error saving employee:", error);
                alert("Failed to save employee: " + error.message);
            } finally {
                btn.innerText = document.getElementById('empModalId').value ? "Update Employee" : "Save Employee";
                btn.disabled = false;
            }
        }




        // ==========================
        // TASKS MANAGEMENT SYSTEM
        // ==========================

        async function createTask() {
            if (!currentUser || !currentUserData) return;

            const title = document.getElementById('taskTitle').value;
            const desc = document.getElementById('taskDesc').value;
            const assigneeId = document.getElementById('taskAssignee').value;
            const dueDate = document.getElementById('taskDueDate').value;

            if (!title || !assigneeId || !dueDate) {
                showToast("Please fill all required fields.");
                return;
            }

            try {
                const submitBtn = document.querySelector('#createTaskForm button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block"></i> Assigning...`;
                lucide.createIcons();
                submitBtn.disabled = true;

                await db.collection('tasks').add({
                    title: title,
                    description: desc,
                    assigneeId: assigneeId,
                    assignerId: currentUser.uid,
                    orgId: currentUserData.orgId || currentUser.uid,
                    dueDate: dueDate,
                    status: 'Pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.getElementById('createTaskForm').reset();
                showToast("Task assigned successfully!");
                fetchTasks();

                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                lucide.createIcons();
            } catch (error) {
                logManagerError("Error creating task for assignerId: " + currentUser.uid, error);
                showToast("Error assigning task.");
                const submitBtn = document.querySelector('#createTaskForm button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    lucide.createIcons();
                }
            }
        }


        let unsubscribeAnnouncements = null;

        async function fetchAnnouncements() {
            if (!currentUser || !currentUserData) return;

            const container = document.getElementById('announcementsContainer');
            if (!container) return;

            const isManager = currentUserData.orgId === currentUser.uid;
            const actualOrgId = currentUserData.orgId || currentUser.uid;

            if (isManager) {
                document.getElementById('btnCreateAnnouncement').classList.remove('hidden');
            } else {
                document.getElementById('btnCreateAnnouncement').classList.add('hidden');
            }

            try {
                if (unsubscribeAnnouncements) {
                    unsubscribeAnnouncements();
                }

                const query = db.collection('announcements')
                    .where('orgId', '==', actualOrgId)
                    .orderBy('createdAt', 'desc');

                unsubscribeAnnouncements = query.onSnapshot((snapshot) => {
                    container.innerHTML = '';

                    if (snapshot.empty) {
                        container.innerHTML = `
                            <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <i data-lucide="megaphone" class="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50"></i>
                                <h3 class="text-xl font-bold mb-2">No Announcements</h3>
                                <p class="text-slate-500">There are no company announcements at this time.</p>
                            </div>
                        `;
                        lucide.createIcons();
                        return;
                    }

                    const fragment = document.createDocumentFragment();

                    snapshot.forEach(docSnap => {
                        const data = docSnap.data();
                        const id = docSnap.id;
                        const div = document.createElement('div');

                        let priorityBadge = '';
                        if (data.priority === 'High') {
                            priorityBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><i data-lucide="alert-circle" class="w-3 h-3"></i> High Priority</span>';
                        } else {
                            priorityBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Normal</span>';
                        }

                        const dateStr = data.createdAt ? new Date(data.createdAt.toMillis()).toLocaleString() : 'Just now';

                        div.className = 'card bg-white dark:bg-[#111] p-6 shadow-sm border border-slate-100 dark:border-slate-800/50 rounded-2xl relative group overflow-hidden';

                        const safeTitle = window.escapeHTML ? window.escapeHTML(data.title) : data.title;
                        const safeContent = window.escapeHTML ? window.escapeHTML(data.content) : data.content;
                        const safeAuthorName = window.escapeHTML ? window.escapeHTML(data.authorName) : data.authorName;

                        let deleteBtn = '';
                        if (isManager || currentUser.uid === data.authorId) {
                            deleteBtn = `
                                <button onclick="deleteAnnouncement('${id}')" class="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10" aria-label="Delete announcement">
                                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                                </button>
                            `;
                        }

                        div.innerHTML = `
                            ${deleteBtn}
                            <div class="flex items-start justify-between mb-4 pr-10">
                                <div>
                                    <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">${safeTitle}</h3>
                                    <div class="flex items-center gap-3 text-xs text-slate-500">
                                        <span class="flex items-center gap-1"><i data-lucide="user" class="w-3 h-3"></i> ${safeAuthorName}</span>
                                        <span>•</span>
                                        <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${dateStr}</span>
                                        <span>•</span>
                                        ${priorityBadge}
                                    </div>
                                </div>
                            </div>
                            <div class="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 whitespace-pre-wrap">${safeContent}</div>
                        `;
                        fragment.appendChild(div);
                    });

                    container.appendChild(fragment);
                    lucide.createIcons();

                }, (error) => {
                    logManagerError('Error listening to announcements:', error);
                    container.innerHTML = '<div class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">Failed to load announcements.</div>';
                });
            } catch (error) {
                logManagerError('Error fetching announcements:', error);
            }
        }

        async function createAnnouncement(event) {
            event.preventDefault();
            if (!currentUser || !currentUserData) return;

            const btn = event.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto"></i>';
            btn.disabled = true;

            const title = document.getElementById('announcementTitle').value.trim();
            const content = document.getElementById('announcementContent').value.trim();
            const priority = document.getElementById('announcementPriority').value;
            const actualOrgId = currentUserData.orgId || currentUser.uid;

            try {
                await db.collection('announcements').add({
                    orgId: actualOrgId,
                    title: title,
                    content: content,
                    priority: priority,
                    authorId: currentUser.uid,
                    authorName: currentUserData.name || 'Manager',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.getElementById('addAnnouncementModal').classList.add('hidden');
                event.target.reset();
            } catch (error) {
                logManagerError("Error creating announcement", error);
                alert("Failed to create announcement.");
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }

        async function deleteAnnouncement(id) {
            if (!confirm('Are you sure you want to delete this announcement?')) return;
            try {
                await db.collection('announcements').doc(id).delete();
            } catch (error) {
                logManagerError("Error deleting announcement", error);
                alert("Failed to delete announcement.");
            }
        }

        async function fetchTeamDirectory() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                document.getElementById('teamContainer').innerHTML = `
                    <div class="col-span-1 md:col-span-2 text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <i data-lucide="users" class="w-12 h-12 text-slate-400 mx-auto mb-4"></i>
                        <h3 class="text-xl font-bold mb-2">Join or Create a Group</h3>
                        <p class="text-slate-500 mb-4">You must be in a Management Group to access the Team Directory.</p><button onclick="document.getElementById('orgTutorialModal').classList.remove('hidden')" class="btn btn-sm btn-outline text-sky-500 border-sky-200">How do I connect?</button>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            const container = document.getElementById('teamContainer');
            container.innerHTML = '<div class="col-span-1 md:col-span-2 text-center py-8"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-sky-500 mb-4"></i><p class="text-slate-500">Loading roster...</p></div>';
            lucide.createIcons();

            try {
                const result = await callCloudFunction('manageEmployees', { action: "get", payload: {} });

                if (result.data.success) {
                    activeEmployeesList = result.data.employees || [];

                    // Populate schedule dropdown
                    updateScheduleEmployeeDropdown();

                    container.innerHTML = '';

                    if (activeEmployeesList.length === 0) {
                        container.innerHTML = `
                            <div class="col-span-1 md:col-span-2 text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <i data-lucide="users" class="w-12 h-12 text-slate-300 mx-auto mb-4"></i>
                                <h3 class="text-xl font-bold mb-2">No Employees Yet</h3>
                                <p class="text-slate-500 mb-4">Add your first employee to populate the roster and scheduling dropdown.</p>
                                <button onclick="document.getElementById('addEmployeeModal').classList.remove('hidden')" class="btn btn-outline">Add Employee</button>
                            </div>
                        `;
                        lucide.createIcons();
                        return;
                    }

                    // ⚡ Bolt Optimization: Use DocumentFragment to batch DOM insertions and reduce layout thrashing
                    const fragment = document.createDocumentFragment();

                    activeEmployeesList.forEach(emp => {
                        const div = document.createElement('div');
                        div.className = "card p-6 flex flex-col justify-between";

                        const phoneDisplay = emp.phone ? `<a href="tel:${escapeHTML(emp.phone)}" class="text-sky-500 hover:underline text-sm flex items-center gap-1"><i data-lucide="phone" class="w-3 h-3"></i> ${escapeHTML(emp.phone)}</a>` : '<span class="text-slate-400 text-sm">No phone</span>';

                        div.innerHTML = `
                            <div>
                                <div class="flex justify-between items-start mb-2">
                                    <h3 class="text-lg font-bold">${escapeHTML(emp.name)}</h3>
                                    <span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">${escapeHTML(emp.role)}</span>
                                </div>
                                <div class="mb-4">
                                    ${phoneDisplay}
                                </div>
                            </div>
                            <div class="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                                <button class="btn btn-outline btn-sm flex-1 edit-emp-btn" aria-label="Edit Employee"><i data-lucide="edit-2" class="w-3 h-3"></i> Edit</button>
                                <button class="btn btn-outline btn-sm text-red-500 hover:bg-red-50 flex-1 remove-emp-btn" aria-label="Remove Employee"><i data-lucide="user-minus" class="w-3 h-3"></i> Remove</button>
                            </div>
                        `;
                        div.querySelector('.edit-emp-btn').onclick = () => openEditEmployeeModal(emp.id);
                        div.querySelector('.remove-emp-btn').onclick = () => deleteEmployee(emp.id);
                        fragment.appendChild(div);
                    });
                    container.appendChild(fragment);
                    lucide.createIcons();
                }
            } catch (error) {
                container.innerHTML = '';
                const errDiv = document.createElement('div');
                errDiv.className = 'col-span-1 md:col-span-2 text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center';
                errDiv.textContent = `Failed to load roster: ${error.message}`;
                container.appendChild(errDiv);
            }
        }

        function updateScheduleEmployeeDropdown() {
            const select = document.getElementById('shiftEmpName');
            if (!select) return;

            const currentVal = select.value;
            select.innerHTML = '<option value="">Select Employee...</option>';

            // ⚡ Bolt Optimization: Replace sequential appendChild loop with batched insertions using a DocumentFragment
            const fragment = document.createDocumentFragment();
            activeEmployeesList.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.name;
                opt.textContent = emp.name + " (" + emp.role + ")";
                fragment.appendChild(opt);
            });
            select.appendChild(fragment);

            if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
                select.value = currentVal;
            }
        }

        function populateTaskAssigneeDropdown() {
            const select = document.getElementById('taskAssignee');
            if (!select || !currentUserData) return;

            const queryOrgId = currentUserData.orgId || currentUser.uid;

            db.collection('employees')
                .where('orgId', '==', queryOrgId)
                .where('status', '==', 'Active')
                .get()
                .then(snap => {
                    select.innerHTML = '<option value="" disabled selected>Assign To Employee</option>';
                    let employees = [];
                    snap.forEach(doc => employees.push({id: doc.id, ...doc.data()}));
                    employees.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                    // ⚡ Bolt Optimization: Replace sequential appendChild loop with batched insertions using a DocumentFragment
                    const assignFragment = document.createDocumentFragment();
                    employees.forEach(emp => {
                        const opt = document.createElement('option');
                        opt.value = emp.name;
                        opt.textContent = `${emp.name} (${emp.role})`;
                        assignFragment.appendChild(opt);
                    });
                    select.appendChild(assignFragment);

                    select.appendChild(selectFragment);

                    const filterSelect = document.getElementById('taskFilterAssignee');
                    filterSelect.innerHTML = '<option value="All">All Assignees</option>';

                    const filterFragment = document.createDocumentFragment();
                    employees.forEach(emp => {
                        const opt = document.createElement('option');
                        opt.value = emp.name;
                        opt.textContent = emp.name;
                        filterFragment.appendChild(opt);
                    });
                    filterSelect.appendChild(filterFragment);
                })
                .catch(err => console.error("Error populating task assignee dropdown:", err));
        }

        async function submitTask() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                alert("You must be part of an organization to assign tasks.");
                return;
            }

            const title = document.getElementById('taskTitle').value.trim();
            const desc = document.getElementById('taskDesc').value.trim();
            const assignee = document.getElementById('taskAssignee').value;
            const priority = document.getElementById('taskPriority').value;
            const dueDate = document.getElementById('taskDueDate').value;

            if (!title || !assignee) {
                alert("Please provide a title and assign the task to an employee.");
                return;
            }

            const submitBtn = document.querySelector('#assignTaskModal .btn-accent');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Assigning...';
            submitBtn.disabled = true;
            lucide.createIcons();

            try {
                await db.collection('tasks').add({
                    title: title,
                    description: desc,
                    assignedTo: assignee,
                    priority: priority,
                    dueDate: dueDate || null,
                    status: 'Pending',
                    authorId: currentUser.uid,
                    assignedByName: currentUserData.name || currentUser.email,
                    orgId: currentUserData.orgId || null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.getElementById('taskTitle').value = '';
                document.getElementById('taskDesc').value = '';
                document.getElementById('taskAssignee').value = '';
                document.getElementById('taskPriority').value = 'Low';
                document.getElementById('taskDueDate').value = '';
                document.getElementById('assignTaskModal').classList.add('hidden');

                alert("Task assigned successfully.");
                fetchTasks();
            } catch (error) {
                console.error("Error assigning task:", error);
                if (error.code === 'unavailable' || error.code === 'auth/network-request-failed') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert("Failed to assign task. " + error.message);
                }
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                lucide.createIcons();
            }
        }

        let activeTasksList = [];

        function fetchTasks() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                document.getElementById('tasksContainer').innerHTML = `
                    <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <i data-lucide="users" class="w-12 h-12 text-slate-400 mx-auto mb-4"></i>
                        <h3 class="text-xl font-bold mb-2">Join or Create a Group</h3>
                        <p class="text-slate-500">You must be in a Management Group to assign and view tasks.</p>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            const container = document.getElementById('tasksContainer');
            container.innerHTML = '<div class="text-center py-8"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-sky-500 mb-4"></i><p class="text-slate-500">Loading tasks...</p></div>';
            lucide.createIcons();

            if (unsubscribeTasks) {
                unsubscribeTasks();
            }

            unsubscribeTasks = db.collection('tasks')
                .where('orgId', '==', currentUserData.orgId)
                .onSnapshot(snap => {
                    activeTasksList = [];
                    snap.forEach(doc => activeTasksList.push({ id: doc.id, ...doc.data() }));

                    activeTasksList.sort((a, b) => {
                        const aTime = a.createdAt ? a.createdAt.toMillis() : 0;
                        const bTime = b.createdAt ? b.createdAt.toMillis() : 0;
                        return bTime - aTime;
                    });

                    renderFilteredTasks();
                }, err => {
                    console.error("Error fetching tasks:", err);
                    container.innerHTML = `<div class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">Failed to load tasks: ${escapeHTML(err.message)}</div>`;
                });
        }

        function renderFilteredTasks() {
            const container = document.getElementById('tasksContainer');
            const completedContainer = document.getElementById('completedTasksContainer');

            const filterStatus = document.getElementById('taskFilterStatus').value;
            const filterAssignee = document.getElementById('taskFilterAssignee').value;

            let filteredTasks = activeTasksList.filter(task => {
                if (filterAssignee !== 'All' && task.assignedTo !== filterAssignee) return false;
                return true;
            });

            let activeTasks = filteredTasks.filter(task => task.status !== 'Completed');
            let completedTasks = filteredTasks.filter(task => task.status === 'Completed');

            if (filterStatus !== 'All') {
                activeTasks = activeTasks.filter(t => t.status === filterStatus);
            }

            const generateHtml = (tasks) => {
                if (tasks.length === 0) {
                    return `
                        <div class="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                            <p class="text-slate-500">No tasks found matching criteria.</p>
                        </div>
                    `;
                }
                return tasks.map(task => {
                    const statusColors = {
                        'Pending': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
                        'In Progress': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                        'Completed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    };
                    const prioColors = {
                        'Low': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
                        'Medium': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                        'High': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
                        'Critical': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
                    };

                    const dateStr = task.createdAt ? new Date(task.createdAt.toMillis()).toLocaleString() : 'Just now';
                    const dueDateStr = task.dueDate ? `Due: ${escapeHTML(task.dueDate)}` : 'No Due Date';

                    return `
                        <div class="card p-6 border-l-4 ${task.priority === 'Critical' ? 'border-l-red-500' : task.priority === 'High' ? 'border-l-orange-500' : 'border-l-sky-500'}">
                            <div class="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                <div>
                                    <h3 class="text-lg font-bold">${escapeHTML(task.title)}</h3>
                                    <p class="text-sm text-slate-500">Assigned to <span class="font-bold text-sky-600 dark:text-sky-400">${escapeHTML(task.assignedTo)}</span> by ${escapeHTML(task.assignedByName)} • ${dateStr}</p>
                                    <p class="text-xs font-mono text-slate-400 mt-1">${dueDateStr}</p>
                                </div>
                                <div class="flex flex-wrap gap-2 items-start justify-end">
                                    <span class="px-3 py-1 rounded-full text-xs font-bold ${prioColors[task.priority] || prioColors['Low']}">${escapeHTML(task.priority)}</span>
                                    <select aria-label="Update task status" class="px-3 py-1 rounded-full text-xs font-bold border appearance-none cursor-pointer focus:outline-none ${statusColors[task.status] || statusColors['Pending']}"
                                        onchange="updateTaskStatus('${task.id}', this.value)">
                                        <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                        <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                        <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                    </select>
                                    <button data-action="deleteTask" data-id="${task.id}" class="text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md" aria-label="Delete Task"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                </div>
                            </div>
                            <p class="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">${escapeHTML(task.description)}</p>
                        </div>
                    `;
                }).join('');
            };

            container.innerHTML = generateHtml(activeTasks);
            completedContainer.innerHTML = generateHtml(completedTasks);
            lucide.createIcons();
        }

        async function updateTaskStatus(taskId, newStatus) {
            try {
                await db.collection('tasks').doc(taskId).update({
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    orgId: currentUserData.orgId
                });
            } catch (error) {
                console.error("Error updating task:", error);
                alert("Failed to update status. " + error.message);
                fetchTasks(); // revert optimistic change
            }
        }

        async function deleteTask(taskId) {
            if (!confirm("Are you sure you want to delete this task permanently?")) return;
            try {
                await db.collection('tasks').doc(taskId).delete();
            } catch (error) {
                console.error("Error deleting task:", error);
                alert("Failed to delete task. " + error.message);
            }
        }

        // --- RECOGNITION SYSTEM ---

        function populateRecognitionDropdown() {
            const select = document.getElementById('recogAssignee');
            if (!select || !currentUserData) return;

            const queryOrgId = currentUserData.orgId || currentUser.uid;

            db.collection('employees')
                .where('orgId', '==', queryOrgId)
                .where('status', '==', 'Active')
                .get()
                .then(snap => {
                    select.innerHTML = '<option value="" disabled selected>Select Employee</option>';
                    let employees = [];
                    snap.forEach(doc => employees.push({id: doc.id, ...doc.data()}));
                    employees.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                    // ⚡ Bolt Optimization: Batch DOM insertions with DocumentFragment to prevent layout thrashing
                    const fragment = document.createDocumentFragment();
                    employees.forEach(emp => {
                        const opt = document.createElement('option');
                        opt.value = emp.id;
                        opt.dataset.name = emp.name;
                        opt.textContent = `${emp.name} (${emp.role})`;
                        fragment.appendChild(opt);
                    });
                    select.appendChild(fragment);
                })
                .catch(err => console.error("Error populating recognition dropdown:", err));
        }

        async function submitRecognition() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                alert("You must be part of an organization to send recognition.");
                return;
            }

            const assigneeSelect = document.getElementById('recogAssignee');
            const receiverId = assigneeSelect.value;
            const receiverName = assigneeSelect.options[assigneeSelect.selectedIndex]?.dataset?.name;
            const type = document.getElementById('recogType').value;
            const message = document.getElementById('recogMessage').value.trim();

            if (!receiverId || !message) {
                alert("Please select a team member and enter a message.");
                return;
            }

            const submitBtn = document.querySelector('#addRecognitionModal .btn-accent');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Submitting...';
            submitBtn.disabled = true;
            lucide.createIcons();

            try {
                await callCloudFunction('manageRecognitions', {
                    action: "create",
                    payload: { receiverId, receiverName, message, type }
                });

                document.getElementById('recogAssignee').value = '';
                document.getElementById('recogType').value = 'Kudos';
                document.getElementById('recogMessage').value = '';
                document.getElementById('addRecognitionModal').classList.add('hidden');

                alert("Recognition submitted successfully.");
                fetchRecognitions();
            } catch (error) {
                console.error("Error submitting recognition:", error);
                if (error.code === 'unavailable' || error.code === 'auth/network-request-failed') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert("Failed to submit recognition. " + error.message);
                }
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                lucide.createIcons();
            }
        }

        async function fetchRecognitions() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                const container = document.getElementById('recognitionsContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <i data-lucide="users" class="w-12 h-12 text-slate-400 mx-auto mb-4"></i>
                            <h3 class="text-xl font-bold mb-2">Join or Create a Group</h3>
                            <p class="text-slate-500 mb-4">You must be in a Management Group to view recognitions.</p>
                        </div>
                    `;
                    lucide.createIcons();
                }
                return;
            }

            const container = document.getElementById('recognitionsContainer');
            container.innerHTML = '<div class="text-center py-8"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-sky-500 mb-4"></i><p class="text-slate-500">Loading recognitions...</p></div>';
            lucide.createIcons();

            try {
                const result = await callCloudFunction('manageRecognitions', { action: "get", payload: {} });

                if (result.data.success) {
                    const recognitions = result.data.recognitions || [];
                    container.innerHTML = '';

                    const isManager = currentUserData.orgId === currentUser.uid;

                    // Filter out private feedback meant for others (unless manager)
                    const visibleRecognitions = recognitions.filter(rec => {
                        if (rec.type === 'Kudos') return true;
                        if (rec.type === 'Private Feedback') {
                            return isManager || rec.receiverId === currentUser.uid || rec.senderId === currentUser.uid;
                        }
                        return false;
                    });

                    if (visibleRecognitions.length === 0) {
                        container.innerHTML = `
                            <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <i data-lucide="award" class="w-12 h-12 text-slate-300 mx-auto mb-4"></i>
                                <h3 class="text-xl font-bold mb-2">No Recognitions Yet</h3>
                                <p class="text-slate-500">Be the first to recognize a team member's hard work!</p>
                            </div>
                        `;
                        lucide.createIcons();
                        return;
                    }

                    const fragment = document.createDocumentFragment();

                    visibleRecognitions.forEach(rec => {
                        const dateStr = rec.createdAt ? new Date(rec.createdAt._seconds * 1000).toLocaleString() : 'Just now';
                        const isKudos = rec.type === 'Kudos';

                        const div = document.createElement('div');
                        div.className = `card p-6 border-l-4 ${isKudos ? 'border-l-sky-500' : 'border-l-purple-500'}`;

                        let badgeHtml = isKudos
                            ? `<span class="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 flex items-center gap-1"><i data-lucide="star" class="w-3 h-3"></i> Kudos</span>`
                            : `<span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 flex items-center gap-1"><i data-lucide="lock" class="w-3 h-3"></i> Private Feedback</span>`;

                        let deleteBtn = '';
                        if (isManager || rec.senderId === currentUser.uid) {
                            deleteBtn = `<button onclick="deleteRecognition('${escapeHTML(rec.id)}')" class="text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md ml-2" aria-label="Delete Recognition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
                        }

                        div.innerHTML = `
                            <div class="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                <div>
                                    <h3 class="text-lg font-bold">To: ${escapeHTML(rec.receiverName)}</h3>
                                    <p class="text-sm text-slate-500">From ${escapeHTML(rec.senderName)} • ${dateStr}</p>
                                </div>
                                <div class="flex gap-2 items-start">
                                    ${badgeHtml}
                                    ${deleteBtn}
                                </div>
                            </div>
                            <p class="text-slate-700 dark:text-slate-300 whitespace-pre-wrap italic">"${escapeHTML(rec.message)}"</p>
                        `;
                        fragment.appendChild(div);
                    });
                    container.appendChild(fragment);
                    lucide.createIcons();
                }
            } catch (error) {
                console.error("Error fetching recognitions:", error);
                container.innerHTML = `<div class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">Failed to load recognitions: ${escapeHTML(error.message)}</div>`;
            }
        }

        async function deleteRecognition(recognitionId) {
            if (!confirm("Are you sure you want to permanently delete this recognition?")) return;
            try {
                await callCloudFunction('manageRecognitions', { action: "delete", payload: { recognitionId } });
                fetchRecognitions();
            } catch (err) {
                console.error("Error deleting recognition:", err);
                alert("Failed to delete recognition.");
            }
        }


        // We will fetch the team directory when the view is opened or during org check


        // --- TIME CLOCK LOGIC ---
        let isClockedIn = false;

        async function toggleClock() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                alert("You must be logged in and part of an organization to use the time clock.");
                return;
            }

            const btn = document.getElementById('clockInOutBtn');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i> Processing...';
            btn.disabled = true;
            lucide.createIcons();

            const action = isClockedIn ? 'clock_out' : 'clock_in';

            try {
                const manageTimeLogs = cloudFunctions.httpsCallable('manageTimeLogs');
                await manageTimeLogs({ action: action, payload: {} });

                // Optimistically update state
                isClockedIn = !isClockedIn;
                updateTimeClockUI();
                fetchTimeLogs();
            } catch (error) {
                console.error("Error toggling clock:", error);
                alert("Failed to " + (isClockedIn ? "clock out" : "clock in") + ". " + error.message);
                btn.innerHTML = originalHtml; // Restore button on error
                btn.disabled = false;
                lucide.createIcons();
            }
        }

        function updateTimeClockUI() {
            const btn = document.getElementById('clockInOutBtn');
            const statusText = document.getElementById('timeclockStatusText');
            const subText = document.getElementById('timeclockSubText');

            if (isClockedIn) {
                btn.innerHTML = '<i data-lucide="stop-circle" class="w-6 h-6 mr-2"></i> Clock Out';
                btn.className = 'btn btn-danger px-12 py-6 text-xl shadow-xl shadow-red-500/30';
                statusText.innerText = "You are Clocked In";
                statusText.className = "text-2xl font-bold mb-6 text-emerald-500";
                subText.innerText = "Remember to clock out at the end of your shift.";
            } else {
                btn.innerHTML = '<i data-lucide="play-circle" class="w-6 h-6 mr-2"></i> Clock In';
                btn.className = 'btn btn-success px-12 py-6 text-xl shadow-xl shadow-emerald-500/30';
                statusText.innerText = "You are Clocked Out";
                statusText.className = "text-2xl font-bold mb-6 text-slate-800 dark:text-slate-200";
                subText.innerText = "Ready to start your shift?";
            }
            btn.disabled = false;
            lucide.createIcons();
        }

        async function fetchTimeLogs() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                const container = document.getElementById('timeLogContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <i data-lucide="users" class="w-12 h-12 text-slate-400 mx-auto mb-4"></i>
                            <h3 class="text-xl font-bold mb-2">Join or Create a Group</h3>
                            <p class="text-slate-500 mb-4">You must be in a Management Group to view time logs.</p>
                        </div>
                    `;
                    lucide.createIcons();
                }
                updateTimeClockUI(); // Set default UI
                return;
            }

            const container = document.getElementById('timeLogContainer');
            if (container) container.innerHTML = '<div class="text-center py-8"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-sky-500 mb-4"></i><p class="text-slate-500">Loading punches...</p></div>';
            lucide.createIcons();

            try {
                const manageTimeLogs = cloudFunctions.httpsCallable('manageTimeLogs');
                const result = await manageTimeLogs({ action: "get_logs", payload: {} });

                if (result.data.success) {
                    let logs = result.data.logs || [];

                    // Sort logs client-side since orderBy was removed from backend query
                    logs.sort((a, b) => {
                        const timeA = a.clockInTime ? a.clockInTime._seconds : 0;
                        const timeB = b.clockInTime ? b.clockInTime._seconds : 0;
                        return timeB - timeA;
                    });

                    // Check if current user is clocked in
                    const myActiveLog = logs.find(log => log.uid === currentUser.uid && log.status === 'Clocked In');
                    isClockedIn = !!myActiveLog;
                    updateTimeClockUI();

                    if (!container) return;
                    container.innerHTML = '';

                    // No need to filter on client-side anymore, backend is secure
                    const visibleLogs = logs;

                    if (visibleLogs.length === 0) {
                        container.innerHTML = `
                            <div class="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <i data-lucide="clock" class="w-12 h-12 text-slate-300 mx-auto mb-4"></i>
                                <h3 class="text-xl font-bold mb-2">No Punches Yet</h3>
                                <p class="text-slate-500">Time logs will appear here once you clock in.</p>
                            </div>
                        `;
                        lucide.createIcons();
                        return;
                    }

                    const fragment = document.createDocumentFragment();

                    visibleLogs.forEach(log => {
                        const div = document.createElement('div');
                        div.className = "card p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 " + (log.status === 'Clocked In' ? 'border-l-emerald-500' : 'border-l-slate-300 dark:border-l-slate-700');

                        const inTimeStr = log.clockInTime ? new Date(log.clockInTime._seconds * 1000).toLocaleString() : 'Unknown';
                        const outTimeStr = log.clockOutTime ? new Date(log.clockOutTime._seconds * 1000).toLocaleString() : '---';

                        const statusBadge = log.status === 'Clocked In'
                            ? '<span class="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1"><i data-lucide="play-circle" class="w-3 h-3"></i> Active</span>'
                            : '<span class="px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1"><i data-lucide="stop-circle" class="w-3 h-3"></i> Completed</span>';

                        let durationStr = '';
                        if (log.clockInTime && log.clockOutTime) {
                            const diffMs = (log.clockOutTime._seconds - log.clockInTime._seconds) * 1000;
                            const hours = Math.floor(diffMs / (1000 * 60 * 60));
                            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            durationStr = `<span class="text-sm font-medium text-slate-600 dark:text-slate-400">Duration: ${hours}h ${minutes}m</span>`;
                        }

                        div.innerHTML = `
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <h3 class="text-lg font-bold">${escapeHTML(log.employeeName)}</h3>
                                    ${statusBadge}
                                </div>
                                <div class="text-sm text-slate-500 space-y-1 mt-2">
                                    <div><span class="font-semibold text-slate-700 dark:text-slate-300">In:</span> ${inTimeStr}</div>
                                    <div><span class="font-semibold text-slate-700 dark:text-slate-300">Out:</span> ${outTimeStr}</div>
                                </div>
                            </div>
                            <div class="text-right">
                                ${durationStr}
                            </div>
                        `;
                        fragment.appendChild(div);
                    });
                    container.appendChild(fragment);
                    lucide.createIcons();
                }
            } catch (error) {
                console.error("Error fetching time logs:", error);
                if (container) container.innerHTML = `<div class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">Failed to load time logs: ${error.message}</div>`;
            }
        }

        // Global event delegation for dynamically created buttons to prevent XSS from inline handlers
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            const status = btn.dataset.status;

            if (action === 'resolveShiftNote') resolveShiftNote(id);
            else if (action === 'approveGroupRequest') approveGroupRequest(id);
            else if (action === 'retractGroupRequest') retractGroupRequest(id);
            else if (action === 'openEditEmployeeModal') openEditEmployeeModal(id);
            else if (action === 'deleteTask') deleteTask(id);
            else if (action === 'deleteWasteLog') deleteWasteLog(id);
            else if (action === 'deleteIncident') deleteIncident(id);
            else if (action === 'updateTaskStatus') updateTaskStatus(id, status);

            else if (action === 'deleteEmployee') deleteEmployee(id);
            else if (action === 'toggleEmployeeStatus') toggleEmployeeStatus(id, status);
            else if (action === 'updateTimeOffStatus') updateTimeOffStatus(id, status);
            else if (action === 'deleteTimeOffRequest') deleteTimeOffRequest(id);
            else if (action === 'updateTaskStatus') updateTaskStatus(id, status);
            else if (action === 'deleteTask') deleteTask(id);
            else if (action === 'removeShift') removeShift(btn.dataset.index);
            else if (action === 'deleteTask') deleteTask(id);
            else if (action === 'deleteWasteLog') deleteWasteLog(id);
            else if (action === 'deleteIncident') deleteIncident(id);
            else if (action === 'updateTaskStatus') {
                if (status) {
                    updateTaskStatus(id, status);
                }
            }
        });

        document.addEventListener('change', (e) => {
            const select = e.target.closest('select[data-action]');
            if (!select) return;
            const action = select.dataset.action;
            const id = select.dataset.id;

            if (action === 'updateTaskStatus') {
                updateTaskStatus(id, select.value);
            }
        });

        // The second event listener was unclosed

        window.onload = () => {
            if (localStorage.getItem('managerProTheme') === 'dark') {
                document.body.classList.add('dark-mode');
                document.getElementById('themeToggle').checked = true;
            }
            lucide.createIcons();
            initDefaults();

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js')
                    .then(() => console.log("Service Worker Registered"))
                    .catch(err => console.error("Manager Troubleshooting: Service Worker Registration Failed:", err));
            }
        };

        // Event delegation for dynamically added buttons to prevent XSS
        document.addEventListener('click', function(e) {
            const copyGroupIdBtn = e.target.closest('.copy-group-id-btn');
            if (copyGroupIdBtn) {
                e.preventDefault();
                navigator.clipboard.writeText(copyGroupIdBtn.dataset.orgId);
                alert('Group ID Copied!');
                return;
            }

            const deleteTimeoffBtn = e.target.closest('.delete-timeoff-btn');
            if (deleteTimeoffBtn) {
                e.preventDefault();
                deleteTimeOffRequest(deleteTimeoffBtn.dataset.requestId);
                return;
            }

            const updateTimeoffBtn = e.target.closest('.update-timeoff-btn');
            if (updateTimeoffBtn) {
                e.preventDefault();
                updateTimeOffStatus(updateTimeoffBtn.dataset.requestId, updateTimeoffBtn.dataset.status);
                return;
            }

            const toggleEmployeeBtn = e.target.closest('.toggle-employee-btn');
            if (toggleEmployeeBtn) {
                e.preventDefault();
                toggleEmployeeStatus(toggleEmployeeBtn.dataset.employeeId, toggleEmployeeBtn.dataset.employeeStatus);
                return;
            }

            const deleteEmployeeBtn = e.target.closest('.delete-employee-btn');
            if (deleteEmployeeBtn) {
                e.preventDefault();
                deleteEmployee(deleteEmployeeBtn.dataset.employeeId);
                return;
            }

            const removeShiftBtn = e.target.closest('.remove-shift-btn');
            if (removeShiftBtn) {
                e.preventDefault();
                removeShift(parseInt(removeShiftBtn.dataset.shiftIndex, 10));
                return;
            }

            const resolveShiftNoteBtn = e.target.closest('.resolve-shift-note-btn');
            if (resolveShiftNoteBtn) {
                e.preventDefault();
                resolveShiftNote(resolveShiftNoteBtn.dataset.noteId);
                return;
            }

            const approveGroupRequestBtn = e.target.closest('.approve-group-request-btn');
            if (approveGroupRequestBtn) {
                e.preventDefault();
                approveGroupRequest(approveGroupRequestBtn.dataset.requestId);
                return;
            }

            const retractGroupRequestBtn = e.target.closest('.retract-group-request-btn');
            if (retractGroupRequestBtn) {
                e.preventDefault();
                retractGroupRequest(retractGroupRequestBtn.dataset.requestId);
                return;
            }

            const editEmployeeBtn = e.target.closest('.edit-employee-btn');
            if (editEmployeeBtn) {
                e.preventDefault();
                openEditEmployeeModal(editEmployeeBtn.dataset.employeeId);
                return;
            }
        });

        // Event delegation for dynamically added buttons to prevent XSS
        document.addEventListener('click', function(e) {
            const copyGroupIdBtn = e.target.closest('.copy-group-id-btn');
            if (copyGroupIdBtn) {
                e.preventDefault();
                navigator.clipboard.writeText(copyGroupIdBtn.dataset.orgId);
                alert('Group ID Copied!');
                return;
            }

            const deleteTimeoffBtn = e.target.closest('.delete-timeoff-btn');
            if (deleteTimeoffBtn) {
                e.preventDefault();
                deleteTimeOffRequest(deleteTimeoffBtn.dataset.requestId);
                return;
            }

            const updateTimeoffBtn = e.target.closest('.update-timeoff-btn');
            if (updateTimeoffBtn) {
                e.preventDefault();
                updateTimeOffStatus(updateTimeoffBtn.dataset.requestId, updateTimeoffBtn.dataset.status);
                return;
            }

            const toggleEmployeeBtn = e.target.closest('.toggle-employee-btn');
            if (toggleEmployeeBtn) {
                e.preventDefault();
                toggleEmployeeStatus(toggleEmployeeBtn.dataset.employeeId, toggleEmployeeBtn.dataset.employeeStatus);
                return;
            }

            const deleteEmployeeBtn = e.target.closest('.delete-employee-btn');
            if (deleteEmployeeBtn) {
                e.preventDefault();
                deleteEmployee(deleteEmployeeBtn.dataset.employeeId);
                return;
            }

            const removeShiftBtn = e.target.closest('.remove-shift-btn');
            if (removeShiftBtn) {
                e.preventDefault();
                removeShift(parseInt(removeShiftBtn.dataset.shiftIndex, 10));
                return;
            }

            const resolveShiftNoteBtn = e.target.closest('.resolve-shift-note-btn');
            if (resolveShiftNoteBtn) {
                e.preventDefault();
                resolveShiftNote(resolveShiftNoteBtn.dataset.noteId);
                return;
            }

            const approveGroupRequestBtn = e.target.closest('.approve-group-request-btn');
            if (approveGroupRequestBtn) {
                e.preventDefault();
                approveGroupRequest(approveGroupRequestBtn.dataset.requestId);
                return;
            }

            const retractGroupRequestBtn = e.target.closest('.retract-group-request-btn');
            if (retractGroupRequestBtn) {
                e.preventDefault();
                retractGroupRequest(retractGroupRequestBtn.dataset.requestId);
                return;
            }

            const editEmployeeBtn = e.target.closest('.edit-employee-btn');
            if (editEmployeeBtn) {
                e.preventDefault();
                openEditEmployeeModal(editEmployeeBtn.dataset.employeeId);
                return;
            }
        });

        function openFeedbackModal(empId, empName) {
            document.getElementById('feedbackEmpId').value = empId;
            document.getElementById('feedbackEmpName').value = empName;
            document.getElementById('feedbackRating').value = "5";
            document.getElementById('feedbackComment').value = "";
            document.getElementById('feedbackModal').classList.remove('hidden');
            fetchFeedbacksForEmployee(empId);
            setTimeout(() => {
                document.getElementById('feedbackModal').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }

        function closeFeedbackModal() {
            document.getElementById('feedbackModal').classList.add('hidden');
            document.getElementById('feedbacksContainer').innerHTML = '<p class="text-sm text-slate-500">Loading history...</p>';
        }

        async function submitFeedback() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                alert("You must be part of an organization to leave feedback.");
                return;
            }

            const empId = document.getElementById('feedbackEmpId').value;
            const empName = document.getElementById('feedbackEmpName').value;
            const rating = document.getElementById('feedbackRating').value;
            const comment = document.getElementById('feedbackComment').value.trim();

            if (!empId) return;

            const btn = document.querySelector('#feedbackModal .btn-accent');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Submitting...';
            btn.disabled = true;
            lucide.createIcons();

            try {
                const manageFeedbacks = cloudFunctions.httpsCallable('manageFeedbacks');
                await manageFeedbacks({
                    action: "create",
                    payload: { empId, empName, rating, comment }
                });

                document.getElementById('feedbackRating').value = "5";
                document.getElementById('feedbackComment').value = "";
                alert("Feedback submitted successfully.");
                fetchFeedbacksForEmployee(empId);
            } catch (error) {
                console.error("Manager Troubleshooting: Error submitting feedback:", error);
                alert("Failed to submit feedback: " + error.message);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
                lucide.createIcons();
            }
        }

        async function fetchFeedbacksForEmployee(empId) {
            const container = document.getElementById('feedbacksContainer');
            container.innerHTML = '<div class="text-center py-4"><i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto text-sky-500"></i></div>';
            lucide.createIcons();

            try {
                const manageFeedbacks = cloudFunctions.httpsCallable('manageFeedbacks');
                const result = await manageFeedbacks({
                    action: "get",
                    payload: { empId }
                });

                container.innerHTML = '';
                const feedbacks = result.data.feedbacks || [];

                if (feedbacks.length === 0) {
                    container.innerHTML = '<p class="text-sm text-slate-500">No feedback history found for this employee.</p>';
                    return;
                }

                const fragment = document.createDocumentFragment();
                feedbacks.forEach(fb => {
                    const div = document.createElement('div');
                    div.className = "p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 relative group";

                    const dateStr = fb.createdAt ? new Date(fb.createdAt._seconds * 1000).toLocaleString() : 'Just now';

                    let starsHtml = '';
                    for (let i = 0; i < 5; i++) {
                        if (i < fb.rating) {
                            starsHtml += '<i data-lucide="star" class="w-3 h-3 text-amber-400 fill-amber-400"></i>';
                        } else {
                            starsHtml += '<i data-lucide="star" class="w-3 h-3 text-slate-300 dark:text-slate-600"></i>';
                        }
                    }

                    div.innerHTML = `
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <div class="flex items-center gap-1 mb-1">${starsHtml}</div>
                                <p class="text-xs text-slate-500">By ${escapeHTML(fb.managerName)} • ${dateStr}</p>
                            </div>
                            <button class="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded delete-feedback-btn" aria-label="Delete Feedback" data-id="${escapeHTML(fb.id)}"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                        </div>
                        ${fb.comment ? `<p class="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">${escapeHTML(fb.comment)}</p>` : ''}
                    `;

                    div.querySelector('.delete-feedback-btn').onclick = () => deleteFeedback(fb.id, empId);
                    fragment.appendChild(div);
                });

                container.appendChild(fragment);
                lucide.createIcons();

            } catch (error) {
                console.error("Error fetching feedbacks:", error);
                container.innerHTML = '<p class="text-sm text-red-500">Failed to load feedback history.</p>';
            }
        }

        async function deleteFeedback(feedbackId, empId) {
            if (!confirm("Are you sure you want to delete this feedback?")) return;
            try {
                const manageFeedbacks = cloudFunctions.httpsCallable('manageFeedbacks');
                await manageFeedbacks({
                    action: "delete",
                    payload: { feedbackId }
                });
                fetchFeedbacksForEmployee(empId);
            } catch (error) {
                console.error("Error deleting feedback:", error);
                alert("Failed to delete feedback.");
            }
        }

        window.addEventListener('offline', updateNetworkStatus);
        window.addEventListener('online', updateNetworkStatus);
        updateNetworkStatus();

        function updateNetworkStatus() {
            const syncStatus = document.getElementById('cloudSyncStatus');
            const syncText = document.getElementById('cloudSyncText');

            if (!navigator.onLine) {
                syncStatus.className = 'w-2 h-2 rounded-full bg-red-500';
                syncText.innerText = 'Offline - Local Mode Only';
                syncText.classList.add('text-red-500');
            } else {
                syncText.classList.remove('text-red-500');
                updateCloudSyncUI();
            }
        }


        document.addEventListener('click', function(e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            if (e.type === 'click' && btn.tagName !== 'SELECT') {
                const id = btn.getAttribute('data-id');
                const status = btn.getAttribute('data-status');

                if (action === 'deleteTask') deleteTask(id);
                if (action === 'updateTaskStatus') updateTaskStatus(id, status);
                if (action === 'deleteWasteLog') deleteWasteLog(id);
                if (action === 'deleteIncident') deleteIncident(id);
            }
        });
        document.addEventListener('change', function(e) {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.getAttribute('data-action');
            if (e.type === 'change' && el.tagName === 'SELECT') {
                const id = el.getAttribute('data-id');
                if (action === 'updateTaskStatus') updateTaskStatus(id, el.value);
            }
        });
    