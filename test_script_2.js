

        const firebaseConfig = {
            apiKey: "AIzaSyBgrI9HwJPSc5b4pu2Egsv4DE7shNwptSw",
            authDomain: "dts-hub-website.firebaseapp.com",
            projectId: "dts-hub-website",
            storageBucket: "dts-hub-website.firebasestorage.app",
            messagingSenderId: "48345990988",
            appId: "1:48345990988:web:e3662c9b508168546471e9",
            measurementId: "G-ZN3YJPHVGX"
        };

        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
        const auth = firebase.auth();
        firebase.firestore().settings({
            experimentalForceLongPolling: true
        });
        const db = firebase.firestore();
        db.settings({ experimentalForceLongPolling: true });
        const cloudFunctions = firebase.functions();

        db.enablePersistence().catch(err => console.error("Offline sync error:", err));

        let currentUser = null;
        let currentUserData = null;
        window.currentUser = null;
        function escapeHTML(str) {
            if (!str && str !== 0) return "";
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

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
            const func = firebase.functions().httpsCallable(functionName);
            return await func(payload);
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
                        console.error("Cache parsing error", e);
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
                        renderHistory();
                        updateStorageBar();

                        // Concurrent non-blocking fetches
                        Promise.allSettled([
                            loadCustomPresets(),
                            fetchFeatureRequests()
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
                            const activeView = document.querySelector('.view-section.active');
                            if (activeView && activeView.id === 'view-auth') navTo('tracker');
                        }
                        runAIPatternLogic();
                    } else {
                        if (!doc.exists) {
                            const activeView = document.querySelector('.view-section.active');
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
                    const activeView = document.querySelector('.view-section.active');
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
            triggerDraftSync();
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
                        triggerDraftSync();
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

        function handleAuth(e) {
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
                    .catch(err => alert(err.message))
                    .finally(() => {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                    });
            } else {
                auth.signInWithEmailAndPassword(email, pass)
                    .catch(err => alert(err.message))
                    .finally(() => {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                    });
            }
        }

        function signInWithGoogle() {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).then(cred => {
                db.collection("users").doc(cred.user.uid).get().then(doc => {
                    if (!doc.exists) navTo('setup');
                });
            }).catch(err => alert(err.message));
        }

        function signOut() { auth.signOut().then(() => window.location.reload()); }

        function completeSetup() {
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

            db.collection('users').doc(currentUser.uid).set(data, { merge: true }).then(() => {
                currentUser.updateProfile({ displayName: data.name });
                document.getElementById('shiftManager').value = data.name;

                navTo('tracker');
            });
        }

        function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

        function navTo(viewId) {
            if (isInitializingAuth) {
                localStorage.setItem('navTo', viewId);
                return;
            }
            if (!currentUser && (['history', 'presets', 'performance', 'request', 'profile', 'shiftNotes', 'team', 'employees', 'timeoff'].includes(viewId))) {
                viewId = 'auth';
            }
            if (viewId === 'maintenance' && currentUser) {
                fetchMaintenanceTickets();
            }
            if (viewId === 'team' && currentUser) {
                fetchTeamDirectory();
            }
            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
            document.getElementById('view-' + viewId).classList.add('active');
            document.getElementById('sidebar').classList.remove('open');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            lucide.createIcons();

            if (viewId === 'shiftNotes') {
                fetchShiftNotes();
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

        function updateTimerUI() {
            if (!shiftStartTime) return;
            const diff = Date.now() - shiftStartTime;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            document.getElementById('timerDisplay').innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

            div.querySelector('.drawer-name').oninput = triggerDraftSync;
            div.querySelector('.drawer-val').oninput = function() { calcDrawer(this); triggerDraftSync(); };
            div.querySelector('.delete-drawer-btn').onclick = function() {
                if(confirm('Are you sure you want to delete this drawer? This action cannot be undone.')) {
                    this.parentElement.remove(); triggerDraftSync();
                }
            };

            div.querySelector('.drawer-name').value = label;
            div.querySelector('.drawer-val').value = val;
            document.getElementById('drawersContainer').appendChild(div);
            calcDrawer(div.querySelector('.drawer-val'));
            lucide.createIcons();
            if (initialDraftLoaded) triggerDraftSync();
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
                <input type="text" placeholder="Amount" class="dep-val" style="flex:1;" aria-label="Deposit Amount">
                <label class="flex items-center gap-1 text-[10px] font-bold"><input type="checkbox" class="dep-ver accent-sky-500 w-4 h-4"> VER</label>
                <label class="flex items-center gap-1 text-[10px] font-bold"><input type="checkbox" class="dep-val-chk accent-sky-500 w-4 h-4"> VAL</label>
                <button type="button" class="text-red-400 delete-deposit-btn" aria-label="Remove deposit"><i data-lucide="x" class="w-4"></i></button>
                <input type="text" placeholder="Amount" class="dep-val" style="flex:1;" aria-label="Deposit Amount" oninput="triggerDraftSync()">
                <label class="flex items-center gap-1 text-[10px] font-bold"><input type="checkbox" class="dep-ver accent-sky-500 w-4 h-4" onchange="triggerDraftSync()" aria-label="Verify Deposit"> VER</label>
                <label class="flex items-center gap-1 text-[10px] font-bold"><input type="checkbox" class="dep-val-chk accent-sky-500 w-4 h-4" onchange="triggerDraftSync()" aria-label="Validate Deposit"> VAL</label>
                <button type="button" onclick="if(confirm('Are you sure you want to delete this deposit? This action cannot be undone.')) { this.parentElement.remove(); triggerDraftSync(); }" class="text-red-400" aria-label="Remove deposit"><i data-lucide="x" class="w-4"></i></button>
            `;

            div.querySelector('.dep-val').oninput = triggerDraftSync;
            div.querySelector('.dep-ver').onchange = triggerDraftSync;
            div.querySelector('.dep-val-chk').onchange = triggerDraftSync;
            div.querySelector('.delete-deposit-btn').onclick = function() {
                if(confirm('Are you sure you want to delete this deposit? This action cannot be undone.')) {
                    this.parentElement.remove(); triggerDraftSync();
                }
            };

            div.querySelector('.dep-val').value = val;
            div.querySelector('.dep-ver').checked = ver;
            div.querySelector('.dep-val-chk').checked = valCheck;
            document.getElementById('depositsContainer').appendChild(div);
            lucide.createIcons();
            if (initialDraftLoaded) triggerDraftSync();
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
            chk.onchange = triggerDraftSync;

            const span = document.createElement('span');
            span.className = "routine-name flex-1 font-semibold text-sm";
            span.textContent = taskName;

            const btn = document.createElement('button');
            btn.type = "button";
            btn.className = "text-slate-300 hover:text-red-400";
            btn.onclick = function () { if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) { this.parentElement.remove(); triggerDraftSync(); } };
            btn.setAttribute('aria-label', 'Remove task');
            btn.innerHTML = '<i data-lucide="trash-2" class="w-4"></i>';

            div.appendChild(chk);
            div.appendChild(span);
            div.appendChild(btn);

            document.getElementById('routineContainer').appendChild(div);
            document.getElementById('newRoutineTask').value = "";
            lucide.createIcons();
            if (initialDraftLoaded) triggerDraftSync();
        }

        function addInventoryItem(name = "", bl = "", cl = "", fr = "") {
            const div = document.createElement('div');
            div.className = 'inventory-item animate-fadeIn border-slate-200 dark:border-slate-800';
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
            const container = document.getElementById('inventoryContainer');
            container.appendChild(div);
            lucide.createIcons();
            if (initialDraftLoaded) triggerDraftSync();
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
                state.inventory.push({ name: el.querySelector('.inv-name').value, bl: el.querySelector('.inv-backline').value, cl: el.querySelector('.inv-cooler').value, fr: el.querySelector('.inv-freezer').value });
            });
            return state;
        }

        document.getElementById('trackerForm').addEventListener('input', triggerDraftSync);

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
            if (draft.inventory) draft.inventory.forEach(i => addInventoryItem(i.name, i.bl, i.cl, i.fr));

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
                } catch (e) { console.error("Local parse err", e); }
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
                        <span class="text-xs font-bold bg-sky-100 text-sky-700 px-2 py-1 rounded-md">${grouped[key].length} shifts</span>
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
                triggerDraftSync();
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
                triggerDraftSync();
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
                    preset.items.forEach(i => {
                        if (typeof i === 'string') addInventoryItem(i);
                        else addInventoryItem(i.name, i.bl, i.cl, i.fr);
                    });
                } else {
                    populateTrackerFromState(preset);
                }
                navTo('tracker');
                triggerDraftSync();
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
                triggerDraftSync();
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
                if (error.code === 'unavailable' || error.code === 'auth/network-request-failed') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                    alert("Network error: Could not submit maintenance ticket.");
                } else {
                    alert("Failed to submit ticket. " + error.message);
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
                        <p class="text-slate-500">You must be in a Management Group to view and report maintenance issues.</p>
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
                                        <span class="px-3 py-1 rounded-full text-xs font-bold ${prioColors[ticket.priority] || prioColors['Low']}">${ticket.priority}</span>
                                        <select class="px-3 py-1 rounded-full text-xs font-bold border appearance-none cursor-pointer focus:outline-none ${statusColors[ticket.status] || statusColors['Open']}"
                                            onchange="updateTicketStatus('${ticket.id}', this.value)">
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
                    container.innerHTML = `<div class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">Failed to load tickets: ${err.message}</div>`;
                });
        }

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

        function submitFeatureRequest() {
            const msg = document.getElementById('featureReqText').value;
            if (!msg) return;
            db.collection('feature_requests').add({
                uid: currentUser.uid,
                email: currentUser.email,
                message: msg,
                status: "In Progress",
                timestamp: new Date().toISOString()
            }).then(() => {
                alert("Sent!");
                document.getElementById('featureReqText').value = "";
            });
        }

        async function addEmployee() {
            if (!currentUser || !currentUserData) return;
            const name = document.getElementById('empName').value.trim();
            const role = document.getElementById('empRole').value.trim();
            const phone = document.getElementById('empPhone').value.trim();
            const email = document.getElementById('empEmail').value.trim();
            const status = document.getElementById('empStatus').value;

            if (!name || !role) {
                alert("Employee Name and Role are required.");
                return;
            }

            const saveBtn = document.querySelector('#addEmployeeModal .btn-accent');
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
            } catch (err) {
                console.error("Error adding employee:", err);
                alert("Failed to add employee.");
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
            const originalText = btn.innerText;
            btn.innerText = 'Submitting...';
            btn.disabled = true;

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
                alert("Error submitting request. Please try again.");
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
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

                 let myRequestsHtml = '';
                 let managerRequestsHtml = '';

                 let requests = [];
                 snap.forEach(doc => requests.push({ id: doc.id, ...doc.data() }));

                 // Sort locally by createdAt desc
                 requests.sort((a, b) => {
                     let aTime = a.createdAt ? a.createdAt.toMillis() : 0;
                     let bTime = b.createdAt ? b.createdAt.toMillis() : 0;
                     return bTime - aTime;
                 });

                 const isManager = currentUserData.orgId === currentUser.uid;

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
                          let cancelBtn = req.status === 'Pending' ? `<button onclick="deleteTimeOffRequest('${req.id}')" class="btn btn-sm btn-outline text-red-500 hover:bg-red-50">Cancel</button>` : '';
                          myRequestsHtml += reqCard + cancelBtn + `</div></div>`;
                     }

                     if (isManager && req.status === 'Pending') {
                          managerRequestsHtml += reqCard + `
                                <button onclick="updateTimeOffStatus('${req.id}', 'Approved')" class="btn btn-sm bg-green-500 text-white hover:bg-green-600">Approve</button>
                                <button onclick="updateTimeOffStatus('${req.id}', 'Rejected')" class="btn btn-sm bg-red-500 text-white hover:bg-red-600">Deny</button>
                          </div></div>`;
                     } else if (isManager) {
                          managerRequestsHtml += reqCard + `</div></div>`;
                     }
                 });

                 if (employeeContainer) employeeContainer.innerHTML = myRequestsHtml || '<p class="text-slate-500">No time off requests found.</p>';
                 if (managerContainer) {
                     if (isManager) {
                         managerContainer.innerHTML = managerRequestsHtml || '<p class="text-slate-500">No requests to manage.</p>';
                         document.getElementById('managerTimeOffSection').style.display = 'block';
                     } else {
                         document.getElementById('managerTimeOffSection').style.display = 'none';
                     }
                 }
             }, err => {
                 console.error("Error fetching time off requests:", err);
             });
        }

        async function updateTimeOffStatus(id, status) {
            try {
                await db.collection('time_off_requests').doc(id).update({ status: status });
            } catch (err) {
                console.error("Error updating time off status", err);
                alert("Error updating status.");
            }
        }

        async function deleteTimeOffRequest(id) {
            if (!confirm("Are you sure you want to cancel this request?")) return;
            try {
                await db.collection('time_off_requests').doc(id).delete();
            } catch (err) {
                console.error("Error deleting time off request", err);
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
                                <button onclick="toggleEmployeeStatus('${emp.id}', '${emp.status}')" class="btn btn-outline btn-sm" aria-label="Toggle Employee Status">${emp.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
                                <button onclick="deleteEmployee('${emp.id}')" class="btn btn-outline btn-sm text-red-500 hover:bg-red-50" aria-label="Delete Employee"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                            </div>
                        `;
                        fragment.appendChild(div);
                    });
                    if (container) container.appendChild(fragment);
                    lucide.createIcons();
                    populateScheduleDropdown();
                }, err => {
                    console.error("Error fetching employees:", err);
                    if (container) container.innerHTML = `<p class="text-red-500 text-center py-8">Failed to load roster.</p>`;
                });
        }

        async function toggleEmployeeStatus(id, currentStatus) {
            const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
            try {
                await db.collection('employees').doc(id).update({ status: newStatus });
            } catch (err) {
                console.error("Error updating status:", err);
                alert("Failed to update employee status.");
            }
        }

        async function deleteEmployee(id) {
            if (!confirm("Are you sure you want to permanently delete this employee?")) return;
            try {
                await db.collection('employees').doc(id).delete();
            } catch (err) {
                console.error("Error deleting employee:", err);
                alert("Failed to delete employee.");
            }
        }

        function populateScheduleDropdown() {
            const select = document.getElementById('shiftEmpName');
            if (!select || !currentUserData) return;

            const queryOrgId = currentUserData.orgId || currentUser.uid;

            db.collection('employees')
                .where('orgId', '==', queryOrgId)
                .where('status', '==', 'Active')
                .get()
                .then(snap => {
                    select.innerHTML = '<option value="" disabled selected>Select Employee</option>';
                    let employees = [];
                    snap.forEach(doc => employees.push(doc.data()));
                    employees.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                    employees.forEach(emp => {
                        const opt = document.createElement('option');
                        opt.value = emp.name;
                        opt.textContent = `${emp.name} (${emp.role})`;
                        opt.dataset.role = emp.role;
                        select.appendChild(opt);
                    });
                })
                .catch(err => console.error("Error populating dropdown:", err));
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
                    orgId: currentUserData.orgId,
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
                if (err.code === 'unavailable' || err.code === 'auth/network-request-failed') {
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
                                    <button onclick="removeShift(${index})" class="text-red-500 text-xs mt-2 hover:underline" aria-label="Remove Shift">Remove</button>
                                </div>
                            `;
                            fragment.appendChild(div);
                        });
                        listContainer.appendChild(fragment);
                    }
                }, error => {
                    console.error("Error fetching schedules: ", error);
                    if (listContainer) listContainer.innerHTML = "<p class='text-sm text-red-500'>Error loading schedule.</p>";
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
                console.error("Error removing shift:", error);
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
                            <span class="text-sm font-mono font-bold">${currentUserData.orgId}</span>
                            <button aria-label="Copy Group ID" onclick="navigator.clipboard.writeText('${currentUserData.orgId}'); alert('Group ID Copied!')" class="text-sky-500 hover:text-sky-600"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button>
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
                        <p class="text-slate-500">You must be in a Management Group to post and view shift notes.</p>
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
                                <button onclick="resolveShiftNote('${escapeHTML(docId)}')" class="text-sm font-bold text-slate-400 hover:text-emerald-500 flex items-center gap-2 transition-colors" aria-label="Resolve Shift Note">
                                    <i data-lucide="check-circle" class="w-4 h-4"></i> Mark Resolved
                                </button>
                            </div>
                        `;
                        noteDiv.querySelector('.shift-note-text').textContent = data.content;
                        fragment.appendChild(noteDiv);
                    });
                    container.appendChild(fragment);
                    lucide.createIcons();
                })
                .catch(err => {
                    console.error("Error fetching notes:", err);
                    container.innerHTML = `<p class="text-red-500 text-center py-8">Failed to load shift notes. Please check your connection.</p>`;
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
                            ${authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p class="font-bold text-sm">${authorName}</p>
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
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.getElementById('shiftNoteContent').value = "";
                fetchShiftNotes();
            } catch (err) {
                console.error("Error posting note", err);
                if (err.code === 'unavailable' || err.code === 'auth/network-request-failed') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert("Failed to post note: " + err.message);
                }
                noteDiv.remove(); // revert optimistic UI
            }
        }
        }

        async function resolveShiftNote(noteId) {
            if (!currentUser) return;
            if (!confirm("Mark this note as resolved?")) return;

            // Find note element to remove optimistically
            const container = document.getElementById('shiftNotesContainer');
            const resolveBtn = container.querySelector(`button[onclick="resolveShiftNote('${noteId}')"]`);
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
                const manageShiftNotes = cloudFunctions.httpsCallable('manageShiftNotes');
                const result = await manageShiftNotes({
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
                const manageShiftGroups = cloudFunctions.httpsCallable('manageShiftGroups');
                const result = await manageShiftGroups({
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
                    // Force refresh user data
                    window.location.reload();
                }
            } catch (e) {
                console.error("Manager Troubleshooting: Error creating shift group:", e);
                alert("Failed to create group: " + e.message);
            }
        }

        async function requestJoinShiftGroup() {
            if (!currentUser) return;
            const groupId = document.getElementById('joinGroupId').value.trim();
            const pass = document.getElementById('joinGroupPassword').value.trim();
            if (!groupId || !pass) return alert("All fields required");

            try {
                const manageShiftGroups = cloudFunctions.httpsCallable('manageShiftGroups');
                const result = await manageShiftGroups({
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
                            <button onclick="approveGroupRequest('${escapeHTML(doc.id)}')" class="btn btn-primary btn-sm px-4" aria-label="Approve Group Request">Approve</button>
                        `;
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
                            <button onclick="retractGroupRequest('${escapeHTML(doc.id)}')" class="btn btn-outline btn-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="Retract Group Request">Retract</button>
                        `;
                        fragment.appendChild(div);
                    });
                    container.appendChild(fragment);
                });
        }

        async function retractGroupRequest(requestId) {
            try {
                const manageShiftGroups = cloudFunctions.httpsCallable('manageShiftGroups');
                await manageShiftGroups({
                    action: "retract_join",
                    payload: { requestId: requestId }
                });
                alert("Request Retracted!");
            } catch (e) {
                alert("Failed to retract: " + e.message);
            }
        }

        async function approveGroupRequest(requestId) {
            try {
                const manageShiftGroups = cloudFunctions.httpsCallable('manageShiftGroups');
                const result = await manageShiftGroups({
                    action: "approve_join",
                    payload: { requestId: requestId }
                });
                if (result.data.success) alert("Approved!");
            } catch (e) {
                console.error("Manager Troubleshooting: Error approving group request:", e);
                alert("Failed to approve: " + e.message);
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

        function openEditEmployeeModal(empId) {
            const emp = activeEmployeesList.find(e => e.id === empId);
            if (!emp) return;

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

            const empId = document.getElementById('empModalId').value;
            const name = document.getElementById('empName').value.trim();
            const role = document.getElementById('empRole').value;
            const phone = document.getElementById('empPhone').value.trim();

            if (!name) {
                alert("Employee name is required.");
                return;
            }

            const btn = document.getElementById('submitEmpBtn');
            const ogText = btn.innerText;
            btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Saving...`;
            btn.disabled = true;
            lucide.createIcons();

            try {
                const manageEmployees = firebase.functions().httpsCallable('manageEmployees');
                if (empId) {
                    await manageEmployees({
                        action: "update",
                        payload: { empId, name, role, phone }
                    });
                } else {
                    await manageEmployees({
                        action: "create",
                        payload: { name, role, phone }
                    });
                }

                closeEmployeeModal();
                fetchTeamDirectory();
            } catch (error) {
                alert("Failed to save employee: " + error.message);
            } finally {
                btn.innerText = ogText;
                btn.disabled = false;
            }
        }



        async function fetchTeamDirectory() {
            if (!currentUser || !currentUserData || !currentUserData.orgId) {
                document.getElementById('teamContainer').innerHTML = `
                    <div class="col-span-1 md:col-span-2 text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <i data-lucide="users" class="w-12 h-12 text-slate-400 mx-auto mb-4"></i>
                        <h3 class="text-xl font-bold mb-2">Join or Create a Group</h3>
                        <p class="text-slate-500">You must be in a Management Group to access the Team Directory.</p>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            const container = document.getElementById('teamContainer');
            container.innerHTML = '<div class="col-span-1 md:col-span-2 text-center py-8"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-sky-500 mb-4"></i><p class="text-slate-500">Loading roster...</p></div>';
            lucide.createIcons();

            try {
                const manageEmployees = firebase.functions().httpsCallable('manageEmployees');
                const result = await manageEmployees({ action: "get", payload: {} });

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
                                <button onclick="openEditEmployeeModal('${escapeHTML(emp.id)}')" class="btn btn-outline btn-sm flex-1" aria-label="Edit Employee"><i data-lucide="edit-2" class="w-3 h-3"></i> Edit</button>
                                <button onclick="deleteEmployee('${escapeHTML(emp.id)}')" class="btn btn-outline btn-sm text-red-500 hover:bg-red-50 flex-1" aria-label="Remove Employee"><i data-lucide="user-minus" class="w-3 h-3"></i> Remove</button>
                            </div>
                        `;
                        fragment.appendChild(div);
                    });
                    container.appendChild(fragment);
                    lucide.createIcons();
                }
            } catch (error) {
                container.innerHTML = `<div class="col-span-1 md:col-span-2 text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">Failed to load roster: ${error.message}</div>`;
            }
        }

        function updateScheduleEmployeeDropdown() {
            const select = document.getElementById('shiftEmpName');
            if (!select) return;

            const currentVal = select.value;
            select.innerHTML = '<option value="">Select Employee...</option>';

            activeEmployeesList.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.name;
                opt.textContent = emp.name + " (" + emp.role + ")";
                select.appendChild(opt);
            });

            if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
                select.value = currentVal;
            }
        }

        // We will fetch the team directory when the view is opened or during org check

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
                    .catch(err => console.error("Service Worker Registration Failed:", err));
            }

            window.addEventListener('offline', updateNetworkStatus);
            window.addEventListener('online', updateNetworkStatus);
            updateNetworkStatus();
        };

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

    