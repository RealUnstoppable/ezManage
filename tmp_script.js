
        // --- Firebase Configuration ---
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
        const db = firebase.firestore();
        db.settings({ experimentalForceLongPolling: true });

        



        // --- Navigation ---
        function navTo(viewId) {
            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
            document.getElementById('view-' + viewId).classList.add('active');

            document.querySelectorAll('.nav-link').forEach(el => {
                if (el.getAttribute('onclick').includes(viewId)) el.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-indigo-600', 'dark:text-indigo-400');
                else el.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-indigo-600', 'dark:text-indigo-400');
            });

            if (viewId === 'register') {
                resetOnboarding();
            }

            if (viewId === 'overview') {
                fetchDashboardData();
            }
        }

        let isRegistering = false;

        // --- Auth State ---
        auth.onAuthStateChanged(async (user) => {
            currentUser = user;
            if (user) {
                document.getElementById('authContainer').innerHTML = `
                    <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-200 dark:border-indigo-800">
                        ${user.email.charAt(0).toUpperCase()}
                    </div>
                `;
                if (!isRegistering) {
                    document.getElementById('view-login').classList.remove('active');
                    document.getElementById('view-register').classList.remove('active');

                    await initializeCorporateWorkspace(user);
                }
            } else {
                document.getElementById('authContainer').innerHTML = `<button onclick="navTo('login')" class="btn btn-outline btn-sm">Login</button>`;
                document.getElementById('dashboard-shell').classList.add('hidden');
                navTo('login');
            }
        });

        // --- Login & Registration ---
        async function handleLogin(e) {
            if (e) e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPass').value;
            if (!email || !pass) return alert("Required fields missing");

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block"></i> Signing In...`;
            btn.disabled = true;
            lucide.createIcons();

            try {
                const cred = await auth.signInWithEmailAndPassword(email, pass);
                document.getElementById('view-login').classList.remove('active');
                await initializeCorporateWorkspace(cred.user);
            } catch (error) {
                alert("Login failed: " + error.message);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }

        // --- Onboarding Logic ---
        let onboardingFlow = ['step-1', 'step-2', 'step-3', 'step-4', 'step-5'];
        let currentStepIndex = 0;

        function resetOnboarding() {
            if (currentUser) {
                onboardingFlow = ['step-2', 'step-workers', 'step-plan', 'step-roles', 'step-config', 'step-loading', 'step-tutorial'];
            } else {
                onboardingFlow = ['step-1', 'step-2', 'step-3', 'step-4', 'step-5'];
            }
            currentStepIndex = 0;

            document.querySelectorAll('.onboarding-step').forEach(el => {
                el.classList.add('hidden', 'opacity-0', '-translate-x-full', 'absolute', 'top-0');
                el.classList.remove('opacity-100', 'translate-x-0');
            });

            const firstStep = document.getElementById(onboardingFlow[0]);
            firstStep.classList.remove('hidden', 'opacity-0', '-translate-x-full', 'absolute', 'top-0');
            firstStep.classList.add('opacity-100', 'translate-x-0');

            document.getElementById('regOrgName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPass').value = '';

            document.getElementById('onboardingLoadingState').classList.remove('hidden');
            document.getElementById('onboardingSuccessState').classList.add('hidden');

            updateProgressBar();
        }

        function updateProgressBar() {
            const progressContainer = document.getElementById('onboardingProgressContainer');
            const progressBar = document.getElementById('onboardingProgressBar');

            const currentStepId = onboardingFlow[currentStepIndex];
            if (['step-1', 'step-5', 'step-loading', 'step-tutorial'].includes(currentStepId)) {
                progressContainer.classList.add('hidden');
            } else {
                progressContainer.classList.remove('hidden');
                const functionalSteps = onboardingFlow.filter(id => !['step-1', 'step-5', 'step-loading', 'step-tutorial'].includes(id));
                const functionalIndex = functionalSteps.indexOf(currentStepId);
                const progress = Math.max(0, Math.min(100, (functionalIndex / Math.max(1, functionalSteps.length - 1)) * 100));
                progressBar.style.width = `${progress}%`;
            }
        }

        function advanceOnboarding() {
            const currentStepId = onboardingFlow[currentStepIndex];

            // Validation
            if (currentStepId === 'step-2') {
                const name = document.getElementById('regOrgName').value.trim();
                if (!name) return alert("Please enter an organization name.");
            }
            if (currentStepId === 'step-3') {
                const email = document.getElementById('regEmail').value.trim();
                if (!email || !email.includes('@')) return alert("Please enter a valid email.");
            }
            if (currentStepId === 'step-4') {
                const pass = document.getElementById('regPass').value;
                if (!pass || pass.length < 6) return alert("Password must be at least 6 characters.");
                // Legacy flow registration
                executeRegistration();
                return;
            }
            if (currentStepId === 'step-workers') {
                const workers = document.getElementById('regWorkers').value;
                if (!workers) return alert("Please select a team size.");
            }
            if (currentStepId === 'step-plan') {
                if (!selectedPlan) return alert("Please select a plan.");
            }
            if (currentStepId === 'step-config') {
                const terms = document.getElementById('termsCheck').checked;
                if (!terms) return alert("You must accept the terms of service.");
                executeLoggedInRegistration();
                return;
            }

            if (currentStepIndex >= onboardingFlow.length - 1) return;

            const nextStepId = onboardingFlow[currentStepIndex + 1];
            transitionSteps(currentStepId, nextStepId);
            currentStepIndex++;
            updateProgressBar();
        }

        // Maintain backward compatibility for hardcoded onclicks
        function nextOnboardingStep(stepNumber) {
            advanceOnboarding();
        }

        function transitionSteps(currentStepId, nextStepId) {
            const currentEl = document.getElementById(currentStepId);
            currentEl.classList.remove('translate-x-0', 'opacity-100');
            currentEl.classList.add('-translate-x-full', 'opacity-0');

            setTimeout(() => {
                currentEl.classList.add('hidden');
                currentEl.classList.remove('absolute', 'top-0');

                const nextEl = document.getElementById(nextStepId);
                nextEl.classList.remove('hidden');
                nextEl.classList.add('absolute', 'top-0', 'translate-x-full');

                void nextEl.offsetWidth;

                nextEl.classList.remove('absolute', 'top-0', 'translate-x-full');
                nextEl.classList.add('translate-x-0', 'opacity-100');

                const input = nextEl.querySelector('input');
                if (input) input.focus();
            }, 300);
        }

        function triggerConfetti() {
            if (typeof confetti === 'function') {
                const duration = 3 * 1000;
                const end = Date.now() + duration;

                (function frame() {
                    confetti({
                        particleCount: 5,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0 },
                        colors: ['#6366f1', '#8b5cf6', '#ec4899']
                    });
                    confetti({
                        particleCount: 5,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1 },
                        colors: ['#6366f1', '#8b5cf6', '#ec4899']
                    });

                    if (Date.now() < end) {
                        requestAnimationFrame(frame);
                    }
                }());
            }
        }

        async function executeRegistration() {
            const orgName = document.getElementById('regOrgName').value;
            const email = document.getElementById('regEmail').value;
            const pass = document.getElementById('regPass').value;

            isRegistering = true;
            try {
                const cred = await auth.createUserWithEmailAndPassword(email, pass);

                // Ensure auth state is completely fresh before making the cloud function call
                await cred.user.getIdToken(true);

                // Initialize user doc FIRST so the Cloud Function can update it
                await db.collection('users').doc(cred.user.uid).set({
                    email: email,
                    role: "CorporateAdmin",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    name: orgName + " Admin" // Helpful default
                });

                // For a Corporate Workspace, we create a shift_group and make them the owner
                const manageShiftGroups = firebase.functions().httpsCallable('manageShiftGroups');
                await manageShiftGroups({
                const result = await callFunction('manageShiftGroups', {
                    action: "create",
                    payload: {
                        ownerName: email.split('@')[0],
                        groupName: orgName,
                        password: pass
                    }
                });

                // Update the user doc with the returned orgId just in case
                if (result && result.data && result.data.groupId) {
                    await db.collection('users').doc(cred.user.uid).set({
                        orgId: result.data.groupId
                    }, { merge: true });
                }

                // Show celebration
                document.getElementById('onboardingLoadingState').classList.add('hidden');
                document.getElementById('onboardingSuccessState').classList.remove('hidden');
                triggerConfetti();

                // Redirect to dashboard after celebration
                setTimeout(() => {
                    isRegistering = false;
                    document.getElementById('view-register').classList.remove('active');
                    initializeCorporateWorkspace(cred.user);
                }, 2500);

            } catch (e) {
                isRegistering = false;
                alert("Registration failed: " + e.message);
                // Go back to step 4
                document.getElementById(`step-5`).classList.add('hidden');
                document.getElementById(`step-4`).classList.remove('hidden', '-translate-x-full', 'opacity-0', 'absolute', 'top-0');
                document.getElementById(`step-4`).classList.add('translate-x-0', 'opacity-100');
                currentStepIndex = onboardingFlow.indexOf('step-4');
                updateProgressBar();
            }
        }

        // --- Logged-In Flow Additions ---
        let selectedPlan = 'Free';
        function selectPlan(planName) {
            selectedPlan = planName;
            document.querySelectorAll('.plan-card').forEach(card => {
                card.classList.remove('border-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/20');
                card.classList.add('border-slate-100', 'dark:border-slate-800', 'bg-white', 'dark:bg-slate-900');
                if (card.id === `plan-${planName}`) {
                    card.classList.remove('border-slate-100', 'dark:border-slate-800', 'bg-white', 'dark:bg-slate-900');
                    card.classList.add('border-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/20');
                }
            });
        }

        let onboardingRoles = [];
        function addOnboardingRole() {
            const email = document.getElementById('roleEmail').value.trim();
            const priority = document.getElementById('rolePriority').value;
            if (!email || !email.includes('@')) return alert("Enter valid email");

            onboardingRoles.push({ email, priority });
            document.getElementById('roleEmail').value = '';

            renderOnboardingRoles();
        }

        function renderOnboardingRoles() {
            const container = document.getElementById('onboardingRoleList');
            container.innerHTML = onboardingRoles.map((role, i) => `
                <div class="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
                    <span class="font-bold text-sm">${escapeHTML(role.email)}</span>
                    <div class="flex items-center gap-3">
                        <span class="text-xs uppercase tracking-widest font-black text-slate-400">${escapeHTML(role.priority)}</span>
                        <button onclick="removeOnboardingRole(${i})" aria-label="Remove role" class="text-red-400 hover:text-red-500"><i data-lucide="x" class="w-4 h-4"></i></button>
                    </div>
                </div>
            `).join('');
            lucide.createIcons();
        }

        function removeOnboardingRole(index) {
            onboardingRoles.splice(index, 1);
            renderOnboardingRoles();
        }

        async function executeLoggedInRegistration() {
            if (isRegistering) return;
            isRegistering = true;

            const orgName = document.getElementById('regOrgName').value.trim();
            const workers = document.getElementById('regWorkers').value;
            const aiEnabled = document.getElementById('configAi').checked;

            // Guard: org name must be present
            if (!orgName) {
                isRegistering = false;
                alert("Please enter a workspace name.");
                transitionSteps('step-config', 'step-2');
                currentStepIndex = onboardingFlow.indexOf('step-2');
                updateProgressBar();
                return;
            }

            // Go to loading screen and sync the step index
            transitionSteps('step-config', 'step-loading');
            currentStepIndex = onboardingFlow.indexOf('step-loading');

            // Start simulated loading animation
            const bar = document.getElementById('tutorialProgressBar');
            const status = document.getElementById('loadingStatusText');
            let progress = 0;
            const sim = setInterval(() => {
                progress += 2;
                if (progress <= 95) bar.style.width = `${progress}%`;
                if (progress === 30) status.innerText = "Creating shift groups...";
                if (progress === 60) status.innerText = "Provisioning AI features...";
                if (progress === 90) status.innerText = "Finalizing workspace...";
            }, 100);

            try {
                // Always pull from auth.currentUser (never the potentially-stale module var)
                const activeUser = auth.currentUser;
                if (!activeUser) throw new Error("Session expired. Please refresh and log in again.");

                // Force-refresh the ID token and give the SDK 500ms to propagate it
                await activeUser.getIdToken(true);
                await new Promise(resolve => setTimeout(resolve, 500));

                // Pre-create / ensure the user document exists so the Cloud Function
                // can use .update() on it without throwing "No document to update".
                await db.collection('users').doc(activeUser.uid).set({
                    email: activeUser.email,
                    role: 'CorporateAdmin',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Generate a random password for the group
                const generatedPassword = Math.random().toString(36).slice(-8);

                const result = await callFunction('manageShiftGroups', {
                    action: "create",
                    payload: {
                        ownerName: activeUser.displayName || activeUser.email.split('@')[0],
                        groupName: orgName,
                        password: generatedPassword
                    }
                });

                const groupId = result.data.groupId;

                // Update user document with orgId, plan, and workers
                await db.collection('users').doc(activeUser.uid).set({
                    orgId: groupId,
                    plan: selectedPlan,
                    workersCount: workers,
                    aiEnabled: aiEnabled
                }, { merge: true });

                // Invite roles if any
                for (let role of onboardingRoles) {
                    await db.collection('invites').add({
                        groupId: groupId,
                        email: role.email,
                        priority: role.priority,
                        status: 'Pending',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                clearInterval(sim);
                bar.style.width = '100%';
                status.innerText = "Complete!";

                // Update currentUser module var to stay in sync
                currentUser = activeUser;

                setTimeout(() => {
                    transitionSteps('step-loading', 'step-tutorial');
                    currentStepIndex = onboardingFlow.indexOf('step-tutorial');
                    runTutorialAnimation();
                }, 1000);

            } catch (e) {
                // Reset state so the user can retry
                isRegistering = false;
                clearInterval(sim);
                console.error("Workspace creation error:", e);
                alert("Failed to create workspace: " + e.message);
                transitionSteps('step-loading', 'step-config');
                currentStepIndex = onboardingFlow.indexOf('step-config');
                updateProgressBar();
            }
        }

        function runTutorialAnimation() {
            const icon = document.getElementById('tutorialIcon');
            const title = document.getElementById('tutorialTitle');
            const text = document.getElementById('tutorialText');

            setTimeout(() => {
                icon.innerHTML = `<i data-lucide="bar-chart-2" class="w-12 h-12 text-emerald-500"></i>`;
                icon.className = "w-24 h-24 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-emerald-200 dark:border-emerald-800 transition-all duration-500 transform scale-110";
                title.innerText = "Real-time Metrics.";
                text.innerText = "Instantly see labor saved, shift performance, and manager leaderboards all dynamically reacting to your timeline.";
                lucide.createIcons();
            }, 3000);

            setTimeout(() => {
                icon.innerHTML = `<i data-lucide="users" class="w-12 h-12 text-fuchsia-500"></i>`;
                icon.className = "w-24 h-24 bg-fuchsia-100 dark:bg-fuchsia-900/50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-fuchsia-200 dark:border-fuchsia-800 transition-all duration-500 transform scale-100";
                title.innerText = "Manager Directory.";
                text.innerText = "Seamlessly invite and manage access for your shift managers directly from the grid.";
                lucide.createIcons();
            }, 6000);
        }

        function finishTutorial() {
            // Use auth.currentUser to avoid relying on the potentially-stale module var.
            // Also clear isRegistering so future auth state changes work normally.
            isRegistering = false;
            const userToInit = auth.currentUser || currentUser;
            document.getElementById('view-register').classList.remove('active');
            initializeCorporateWorkspace(userToInit);
        }


        // --- Workspace Initialization ---
        async function initializeCorporateWorkspace(user) {
            try {
                // Find the group this user owns
                const groupSnap = await db.collection('shift_groups').where('ownerId', '==', user.uid).limit(1).get();
                if (groupSnap.empty) {
                    navTo('register');
                    return;
                }

                const orgDoc = groupSnap.docs[0];
                activeOrgId = orgDoc.id;
                activeOrgPass = orgDoc.data().password;

                document.getElementById('orgNameDisplayBento').innerText = orgDoc.data().groupName;
                document.getElementById('orgIdDisplayBento').innerText = `ID: ${activeOrgId}`;
                document.getElementById('shareGroupId').innerText = activeOrgId;
                document.getElementById('shareGroupPass').innerText = activeOrgPass;

                document.getElementById('dashboard-shell').classList.remove('hidden');
                navTo('overview');
            } catch (e) {
                console.error(e);
                alert("Error loading workspace data.");
            }
        }

        // --- Data Fetching ---
        async function fetchGlobalData() {
            if(!activeOrgId) return;

            
            // 1. Fetch active notes
            db.collection('shift_notes').where('orgId', '==', activeOrgId).where('status', '==', 'Active')
              .onSnapshot(snap => {
                  document.getElementById('statNotesCount').innerText = snap.size;
                  const container = document.getElementById('globalNotesContainer');
                  if(snap.empty) {
                      container.innerHTML = `<div class="text-center py-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400 font-bold">No active notes across stores.</div>`;
                      return;
                  }

                  
                  // ⚡ Bolt Optimization: Replace O(n²) string concatenation inside loop with array map().join('')
                  container.innerHTML = snap.docs.map(doc => {
                      const data = doc.data();
                      const isUrgent = data.priority === 'Urgent';
                      const color = isUrgent ? 'red' : 'indigo';
                      return `
                        <div class="p-4 bg-white dark:bg-slate-900 rounded-xl border border-${color}-100 dark:border-${color}-900/50 shadow-sm flex items-start gap-4">
                            <div class="w-10 h-10 rounded-full bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center text-${color}-500 flex-shrink-0 mt-1">
                                <i data-lucide="${isUrgent ? 'alert-triangle' : 'message-square'}"></i>
        // --- Bento Dashboard Logic ---

        // Helper: Generate consistent colors from names/emails
        const managerColors = ['#f43f5e', '#ec4899', '#d946ef', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#f59e0b', '#f97316'];
        function getManagerColor(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
            return managerColors[Math.abs(hash) % managerColors.length];
        }

        // Initialize date picker to today
        document.addEventListener("DOMContentLoaded", () => {
            const picker = document.getElementById('dashboardDatePicker');
            if (picker) picker.value = new Date().toISOString().split('T')[0];
        });

        async function fetchDashboardData() {
            if (!activeOrgId) return;
            const selectedDate = document.getElementById('dashboardDatePicker').value || new Date().toISOString().split('T')[0];

            // Fetch Managers & Metrics
            db.collection('users').where('orgId', '==', activeOrgId).onSnapshot(snap => {
                const tbody = document.getElementById('managersTableBody');
                const indivContainer = document.getElementById('individualPerformanceContainer');

                if (snap.empty) {
                    tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400 font-bold">No managers found.</td></tr>`;
                    indivContainer.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 font-bold">No performance data yet.</div>`;
                    return;
                }

                let htmlManagers = '';
                let htmlIndiv = '';
                let allShifts = [];

                snap.forEach(doc => {
                    const d = doc.data();
                    const isOwner = doc.id === currentUser.uid;
                    const displayName = d.name || d.email.split('@')[0];
                    const color = getManagerColor(displayName);

                    // 1. Manager Directory
                    htmlManagers += `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td class="px-6 py-3">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shadow-sm" style="background-color: ${color}">
                                    ${escapeHTML(displayName.substring(0, 2).toUpperCase())}
                                </div>
                                <div class="font-black text-slate-800 dark:text-slate-200">
                                    ${escapeHTML(displayName)} ${isOwner ? '<span class="ml-2 text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-widest">Admin</span>' : ''}
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-3 text-slate-500 text-xs font-bold">${escapeHTML(d.email || 'N/A')}</td>
                        <td class="px-6 py-3">
                            <select class="bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-xs font-bold focus:ring-0 text-slate-600 dark:text-slate-300 py-1" onchange="alert('Permission update coming soon')">
                                <option ${isOwner ? 'selected' : ''}>Admin</option>
                                <option ${!isOwner ? 'selected' : ''}>Manager</option>
                            </select>
                        </td>
                        <td class="px-6 py-3 text-right">
                            ${!isOwner ? `<button onclick="removeManager('${escapeHTML(doc.id)}')" class="text-slate-400 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : `<span class="text-slate-300">-</span>`}
                            ${!isOwner ? `<button onclick="removeManager('${doc.id}')" aria-label="Remove manager" class="text-slate-400 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : `<span class="text-slate-300">-</span>`}
                        </td>
                    </tr>`;

                    // Aggregate shifts for charts
                    const h = d.shiftHistory || [];
                    allShifts = allShifts.concat(h);

                    // 2. Individual Performance for Selected Date
                    const todayShift = h.find(s => s.dateSaved === selectedDate);
                    let score = 0;
                    if (todayShift && todayShift.routines && todayShift.routines.length > 0) {
                        const checked = todayShift.routines.filter(r => r.checked).length;
                        score = Math.round((checked / todayShift.routines.length) * 100);
                    }

                    htmlIndiv += `
                    <div class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-black shadow-sm" style="background-color: ${color}">
                                ${escapeHTML(displayName.substring(0, 2).toUpperCase())}
                            </div>
                            <div class="font-black text-sm">${escapeHTML(displayName)}</div>
                        </div>
                      `;
                  }).join('');
                  lucide.createIcons();
              });

            // 2. Count Managers
            db.collection('users').where('orgId', '==', activeOrgId).get().then(snap => {
                document.getElementById('statManagersCount').innerText = snap.size;
                        <div class="text-right">
                            <div class="text-xl font-black ${score === 100 ? 'text-emerald-500' : (score > 0 ? 'text-indigo-500' : 'text-slate-400')}">${score}%</div>
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completion</div>
                        </div>
                    </div>`;
                });

                tbody.innerHTML = htmlManagers;
                indivContainer.innerHTML = htmlIndiv;
                lucide.createIcons();

                renderGlobalPerformanceChart(allShifts);
            });

        function fetchManagers() {
            if(!activeOrgId) return;
            db.collection('users').where('orgId', '==', activeOrgId)
              .onSnapshot(snap => {
                  const tbody = document.getElementById('managersTableBody');
                  if(snap.empty) {
                      tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400 font-bold">No managers found.</td></tr>`;
                      return;
                  }
                  // ⚡ Bolt Optimization: Replace O(n²) string concatenation inside loop with array map().join('')
                  tbody.innerHTML = snap.docs.map(doc => {
                      const d = doc.data();
                      const isOwner = doc.id === currentUser.uid;
                      return `
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td class="px-6 py-4 font-black">${d.name || d.email.split('@')[0]} ${isOwner ? '<span class="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full uppercase tracking-widest">Admin</span>' : ''}</td>
                            <td class="px-6 py-4 text-slate-500">${d.email || 'N/A'}</td>
                            <td class="px-6 py-4"><span class="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full">Active</span></td>
                            <td class="px-6 py-4 text-right">
                                ${!isOwner ? `<button onclick="removeManager('${doc.id}')" class="text-red-400 hover:text-red-500 font-bold text-sm">Remove</button>` : `<span class="text-slate-300">-</span>`}
                            </td>
                        </tr>
                      `;
                  }).join('');
              });
        }
            // Fetch Notes & Calculate Labor Saved for selected date
            db.collection('shift_notes').where('orgId', '==', activeOrgId).onSnapshot(snap => {
                const container = document.getElementById('globalNotesContainer');
                let notesCount = 0;
                let htmlNotes = '';

                snap.forEach(doc => {
                    const data = doc.data();
                    // Basic date filter (assuming timestamp is stored, or filtering by a date field if present)
                    // If no explicit date field exists, we just show all or try to derive. Let's show all for demo if no date.

                    const isUrgent = data.priority === 'Urgent';
                    const color = isUrgent ? 'red' : 'indigo';
                    const authorColor = getManagerColor(data.authorName || 'Unknown');

                    notesCount++;
                    htmlNotes += `
                    <div class="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-4 hover:border-${color}-200 dark:hover:border-${color}-800 transition-colors">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 mt-1 font-black shadow-sm" style="background-color: ${authorColor}">
                            ${escapeHTML((data.authorName || 'U').substring(0, 1).toUpperCase())}
                        </div>
                        <div class="flex-grow">
                            <div class="flex justify-between items-start mb-1">
                                <div class="font-black text-slate-900 dark:text-white text-sm">${escapeHTML(data.authorName)}</div>
                                ${isUrgent ? `<span class="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center"><i data-lucide="alert-triangle" class="w-3 h-3 mr-1"></i> Urgent</span>` : ''}
                            </div>
                            <div class="text-sm text-slate-600 dark:text-slate-400 mb-2">${escapeHTML(data.content)}</div>
                            <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status: ${escapeHTML(data.status)}</div>
                        </div>
                    </div>`;
                });

                document.getElementById('statNotesCount').innerText = `${notesCount} notes`;
                container.innerHTML = notesCount > 0 ? htmlNotes : `<div class="text-center py-8 text-slate-400 font-bold">No notes for this date.</div>`;

                // Calculate Labor Saved: 15 mins per note
                const totalMinutesSaved = notesCount * 15;
                const hoursSaved = (totalMinutesSaved / 60).toFixed(1);
                document.getElementById('laborSavedCount').innerText = `${hoursSaved}h`;

                lucide.createIcons();
            });

            // Fetch Pending Requests
            db.collection('shift_group_requests').where('groupId', '==', activeOrgId).where('status', '==', 'Pending')
              .onSnapshot(snap => {
                  const section = document.getElementById('pendingRequestsSection');
                  const container = document.getElementById('pendingRequestsContainer');
                  if(snap.empty) {
                      section.classList.add('hidden');
                      return;
                  }
                  section.classList.remove('hidden');
                  // ⚡ Bolt Optimization: Replace O(n²) string concatenation inside loop with array map().join('')
                  container.innerHTML = snap.docs.map(doc => {
                      return `
                        <div class="flex justify-between items-center p-4 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-xl">
                .onSnapshot(snap => {
                    const section = document.getElementById('pendingRequestsSection');
                    const container = document.getElementById('pendingRequestsContainer');
                    const badge = document.getElementById('pendingRequestsBadge');

                    if (snap.empty) {
                        section.classList.add('hidden');
                        badge.classList.add('hidden');
                        return;
                    }

                    badge.innerText = snap.size;
                    badge.classList.remove('hidden');

                    let html = '';
                    snap.forEach(doc => {
                        html += `
                        <div class="flex justify-between items-center p-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/50 rounded-xl shadow-sm">
                            <div>
                                <div class="font-black text-slate-900 dark:text-white text-sm">${escapeHTML(doc.data().userName)}</div>
                                <div class="text-[10px] font-bold uppercase tracking-widest text-amber-500">Requested Access</div>
                            </div>
                            <button onclick="approveRequest('${escapeHTML(doc.id)}')" class="btn btn-accent btn-sm py-1 px-4 text-xs">Approve</button>
                        </div>
                      `;
                  }).join('');
              });
                    });
                    container.innerHTML = html;
                });
        }

        function togglePendingRequests() {
            document.getElementById('pendingRequestsSection').classList.toggle('hidden');
        }

        function showInviteModal() {
            alert(`Invite Managers by having them download the ezManage app and entering:\nGroup ID: ${activeOrgId}\nPassword: ${activeOrgPass}`);
        }

        async function approveRequest(requestId) {
            try {
                const manageShiftGroups = firebase.functions().httpsCallable('manageShiftGroups');
                await manageShiftGroups({
                    action: "approve_join",
                    payload: { requestId: requestId }
                });
                alert("Manager Approved!");
            } catch(e) { alert("Failed: " + e.message); }
                await callFunction('manageShiftGroups', { action: "approve_join", payload: { requestId } });
            } catch (e) { alert("Failed: " + e.message); }
        }

        async function removeManager(userId) {
            if (!confirm("Remove this manager from the organization?")) return;
            try {
                await db.collection('users').doc(userId).update({ orgId: null });
                alert("Manager removed successfully.");
            } catch(e) {
                console.error(e);
                alert("Failed to remove manager: " + e.message);
            }
                await callFunction('manageShiftGroups', { action: "remove_manager", payload: { userId, groupId: activeOrgId } });
            } catch (e) { alert("Failed: " + e.message); }
        }

        function renderGlobalPerformanceChart(allShifts) {
            const ctx = document.getElementById('globalPerformanceChart');
            if (!ctx || allShifts.length === 0) {
                document.getElementById('statAvgScore').innerText = '0%';
                return;
            }

            // Group by date
            const grouped = {};
            allShifts.forEach(s => {
                if (!s.dateSaved) return;
                if (!grouped[s.dateSaved]) grouped[s.dateSaved] = { totalRoutines: 0, checkedRoutines: 0, count: 0 };
                grouped[s.dateSaved].count++;
                (s.routines || []).forEach(r => {
                    grouped[s.dateSaved].totalRoutines++;
                    if (r.checked) grouped[s.dateSaved].checkedRoutines++;
                });
            });

            const sortedDates = Object.keys(grouped).sort();
            const labels = sortedDates.map(d => d.split('-').slice(-2).join('/')); // MM/DD
            const scores = sortedDates.map(d => {
                const g = grouped[d];
                return g.totalRoutines === 0 ? 0 : Math.round((g.checkedRoutines / g.totalRoutines) * 100);
            });

            // Overall average score
            const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            document.getElementById('statAvgScore').innerText = overallScore + '%';

            if (globalChartInstance) globalChartInstance.destroy();

            const isDark = document.documentElement.classList.contains('dark-mode');
            const textColor = isDark ? '#94a3b8' : '#64748b';
            const gridColor = isDark ? '#334155' : '#f1f5f9';

            globalChartInstance = new Chart(ctx, {
                type: 'line', // Switched to line for better timeline view
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Completion %',
                        data: scores,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: '#6366f1',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { color: textColor, font: { weight: 'bold' } },
                            grid: { color: gridColor }
                        },
                        x: {
                            ticks: { color: textColor, font: { weight: 'bold' } },
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        window.fetchGlobalMetrics = async function() {
            if (!currentUser) return;
            const snap = await db.collection('users').where('orgId', '==', currentUser.uid).get();
            let totalShifts = 0;
            let totalScore = 0;
            let totalLogsWithScores = 0;

            const tbody = document.getElementById('managerTableBody');
            if(tbody) tbody.innerHTML = '';

            if (snap.empty) {
                if(tbody) tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center">No managers found in this organization.</td></tr>';
            }

            snap.forEach(doc => {
                const data = doc.data();
                const history = data.shiftHistory || [];
                totalShifts += history.length;

                history.forEach(h => {
                    let rTotal = 0, rChecked = 0;
                    (h.routines || []).forEach(r => { rTotal++; if (r.checked) rChecked++; });
                    if (rTotal > 0) {
                        totalScore += (rChecked / rTotal) * 100;
                        totalLogsWithScores++;
                    }
                });

                if(tbody) {
                    const tr = document.createElement('tr');
                    tr.className = 'border-b border-slate-100 dark:border-slate-800';
                    tr.innerHTML = `
                        <td class="p-3 font-medium">${escapeHTML(data.email || 'Unknown')}</td>
                        <td class="p-3">${escapeHTML(data.role || 'Manager')}</td>
                        <td class="p-3 text-right">
                            <button onclick="removeManager('${escapeHTML(doc.id)}')" class="btn btn-outline btn-sm text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                }
            });

            document.getElementById('globalShifts').innerText = totalShifts;
            document.getElementById('globalRoutineScore').innerText = totalLogsWithScores > 0 ? Math.round(totalScore / totalLogsWithScores) + "%" : "0%";
            if(window.lucide) lucide.createIcons();
        }

        async function removeManager(uid) {
            if(!confirm("Are you sure you want to remove this manager from your organization?")) return;
            try {
                await db.collection('users').doc(uid).update({ orgId: firebase.firestore.FieldValue.delete() });
                window.fetchGlobalMetrics();
            } catch(e) {
                alert("Error removing manager: " + e.message);
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const form = document.getElementById('createManagerForm');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const email = document.getElementById('newManagerEmail').value.trim();
                    if (!email) return;

                    try {
                        const newUid = db.collection('users').doc().id;
                        await db.collection('users').doc(newUid).set({
                            email: email,
                            role: 'Manager',
                            orgId: currentUser.uid,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        document.getElementById('newManagerEmail').value = '';
                        window.fetchGlobalMetrics();
                    } catch(err) {
                        alert("Error adding manager: " + err.message);
                    }
                });
            }
        });

