/**
 * ezManage Adobe CC-Style Guided Onboarding Tutorial & Platform Detector
 * Provides an interactive spotlight tour for new managers across core workflows:
 * 1. Shift Tracker, 2. Safe Sheet, 3. Inventory & AI, 4. Announcements, 5. ServSafe Checklists.
 * Handles user profile badge persistence and smart cross-platform OS detection (macOS, Windows, iOS, Android).
 */

export const TUTORIAL_STEPS = [
    {
        step: 1,
        id: 'step-tracker',
        viewId: 'tracker',
        targetSelector: '#section-routine',
        title: "Active Shift Tracker & Operations",
        category: "Operations",
        description: "Your daily shift mission control. Track operational routines, register drawers, safe drops, and live elapsed shift time with neural activity detection.",
        proTip: "The neural timer automatically pauses when you are away and records verified timestamps.",
        actionText: "Next: Safe Sheet →"
    },
    {
        step: 2,
        id: 'step-safe',
        viewId: 'tracker',
        targetSelector: '#btnSafeSheet',
        title: "Store Safe Sheet & Cash Audit",
        category: "Financials",
        description: "Audit daily opening and closing safe balances with structured denomination calculators, roll counts, and historical fiscal week logs.",
        proTip: "Click 'Safe Sheet' anytime next to the SAFE COUNT field to audit your cash drawers with immutable timestamps.",
        actionText: "Next: Inventory & AI →"
    },
    {
        step: 3,
        id: 'step-inventory',
        viewId: 'tracker',
        targetSelector: '#section-inventory',
        title: "Unified Inventory & AI Predictions",
        category: "Forecasting",
        description: "Track stock levels across Backline, Cooler, and Freezer with velocity forecasting, automated depletion predictions, and instant recall badges.",
        proTip: "Click '+ Add Item' to pick from your indexed catalog or log custom items that auto-sync to your inventory database.",
        actionText: "Next: Announcements →"
    },
    {
        step: 4,
        id: 'step-announcements',
        viewId: 'announcements',
        targetSelector: '#view-announcements',
        title: "Announcements & Store Tasks",
        category: "Team Coordination",
        description: "Broadcast urgent notices, delegate shift tasks to specific team members, and monitor live check-offs in real time.",
        proTip: "Mentioning keywords like 'recall' in announcements automatically flags that item across the app with a high-visibility badge.",
        actionText: "Next: ServSafe Checklists →"
    },
    {
        step: 5,
        id: 'step-servsafe',
        viewId: 'presets',
        targetSelector: '#view-presets',
        title: "ServSafe Standards & Multi-Chain Templates",
        category: "Compliance",
        description: "Stay 100% inspection-ready with commercial ServSafe checklists for 14 major QSR chains, danger zone monitoring, and temperature logs.",
        proTip: "Access cooling rules, sanitizer PPM tables, and official ServSafe portals directly from the sidebar Food Safety Hub.",
        actionText: "Complete Tour 🏆"
    }
];

let currentTourStepIndex = 0;
let isTourActive = false;

/**
 * Detects the user's operating platform accurately via modern userAgentData and fallback UA.
 */
export function detectUserPlatform(customUA = null, customPlatform = null) {
    const ua = customUA || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
    const platform = customPlatform || (typeof navigator !== 'undefined' ? (navigator.userAgentData?.platform || navigator.platform || '') : '');

    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isMobile = isIOS || isAndroid || /Mobi|Mobile/i.test(ua);
    const isMac = !isIOS && (/Macintosh|Mac OS X|macOS/i.test(ua) || /Mac/i.test(platform));
    const isWindows = !isMobile && (/Windows|Win32|Win64/i.test(ua) || /Win/i.test(platform));
    const isLinux = !isMobile && !isMac && !isWindows && /Linux/i.test(ua);

    let platformName = 'Desktop';
    if (isIOS) platformName = 'iOS';
    else if (isAndroid) platformName = 'Android';
    else if (isMac) platformName = 'macOS';
    else if (isWindows) platformName = 'Windows';
    else if (isLinux) platformName = 'Linux';

    return {
        isIOS,
        isAndroid,
        isMobile,
        isMac,
        isWindows,
        isLinux,
        platformName
    };
}

/**
 * Checks if the user has already completed the onboarding tutorial
 */
export function isTutorialCompleted(uid = 'guest', userDoc = null) {
    if (userDoc && userDoc.tutorialCompleted === true) return true;
    try {
        const stored = localStorage.getItem(`ezManage_tutorial_completed_${uid}`);
        return stored === 'true';
    } catch (e) {
        return false;
    }
}

/**
 * Returns the onboarding badge status for a user
 */
export function getOnboardingBadge(uid = 'guest', userDoc = null) {
    if (userDoc && userDoc.onboardingBadge) return userDoc.onboardingBadge;
    try {
        const stored = localStorage.getItem(`ezManage_onboarding_badge_${uid}`);
        return stored || (isTutorialCompleted(uid, userDoc) ? 'Certified Shift Lead' : null);
    } catch (e) {
        return null;
    }
}

/**
 * Records tutorial completion to Firestore and LocalStorage
 */
export async function persistTutorialCompletion(uid = 'guest', db = null) {
    try {
        localStorage.setItem(`ezManage_tutorial_completed_${uid}`, 'true');
        localStorage.setItem(`ezManage_onboarding_badge_${uid}`, 'Certified Shift Lead');
    } catch (e) {}

    if (db && uid && uid !== 'guest') {
        try {
            await db.collection('users').doc(uid).set({
                tutorialCompleted: true,
                onboardingBadge: 'Certified Shift Lead',
                tutorialCompletedAt: new Date().toISOString()
            }, { merge: true });
        } catch (err) {
            console.warn("Notice saving tutorial completion to Firestore:", err);
        }
    }
}

/**
 * Starts the Adobe CC-style Interactive Onboarding Tour
 */
export function startInteractiveTour(options = {}) {
    const { force = false, uid = 'guest', db = null, userDoc = null } = options;

    if (!force && isTutorialCompleted(uid, userDoc)) {
        return; // Already completed, avoid spamming
    }

    currentTourStepIndex = 0;
    isTourActive = true;

    ensureTourDOM();
    renderTourStep(currentTourStepIndex, { uid, db });
}

/**
 * Moves to the next tour step
 */
export function nextTourStep(options = {}) {
    const { uid = 'guest', db = null } = options;
    if (currentTourStepIndex < TUTORIAL_STEPS.length - 1) {
        currentTourStepIndex++;
        renderTourStep(currentTourStepIndex, { uid, db });
    } else {
        completeInteractiveTour({ uid, db });
    }
}

/**
 * Moves to the previous tour step
 */
export function prevTourStep(options = {}) {
    const { uid = 'guest', db = null } = options;
    if (currentTourStepIndex > 0) {
        currentTourStepIndex--;
        renderTourStep(currentTourStepIndex, { uid, db });
    }
}

/**
 * Skips the tour and writes completion flag to prevent future prompts
 */
export function skipInteractiveTour(options = {}) {
    const { uid = 'guest', db = null } = options;
    isTourActive = false;
    removeTourSpotlight();
    hideTourDOM();
    persistTutorialCompletion(uid, db);

    if (typeof window !== 'undefined' && typeof window.showModernToast === 'function') {
        window.showModernToast("Tour skipped. You can replay it anytime from Profile Settings.", "info");
    }
}

/**
 * Completes the tour, awards Certified Shift Lead badge, and updates state
 */
export async function completeInteractiveTour(options = {}) {
    const { uid = 'guest', db = null } = options;
    isTourActive = false;
    removeTourSpotlight();
    hideTourDOM();
    await persistTutorialCompletion(uid, db);

    if (typeof window !== 'undefined') {
        if (typeof window.showModernToast === 'function') {
            window.showModernToast("🎉 Onboarding complete! You've earned the Certified Shift Lead badge 🏆", "success");
        }
        if (typeof window.updateProfileBadgeUI === 'function') {
            window.updateProfileBadgeUI('Certified Shift Lead');
        }
    }
}

/**
 * Replays the tutorial anytime from Profile Settings
 */
export function replayInteractiveTutorial(options = {}) {
    startInteractiveTour({ force: true, ...options });
}

/**
 * Ensures the floating tour modal overlay exists in the DOM
 */
function ensureTourDOM() {
    if (typeof document === 'undefined') return;
    let overlay = document.getElementById('guidedTutorialOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'guidedTutorialOverlay';
        overlay.className = 'fixed inset-0 z-[10000] pointer-events-none transition-opacity duration-300';
        overlay.innerHTML = `
            <div id="tourBackdrop" class="absolute inset-0 bg-black/50 pointer-events-none"></div>
            <div id="tourCard" class="fixed z-[10010] bg-slate-900 border border-sky-500/60 shadow-2xl rounded-3xl p-6 text-white w-[92vw] max-w-md pointer-events-auto transition-all duration-300">
                <!-- Content populated via renderTourStep -->
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
}

function hideTourDOM() {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('guidedTutorialOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function removeTourSpotlight() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.tour-spotlight-active').forEach(el => {
        el.classList.remove('tour-spotlight-active', 'ring-4', 'ring-sky-500', 'ring-offset-4', 'ring-offset-slate-950');
    });
}

/**
 * Renders the active tour step UI card and spotlights the target element
 */
function renderTourStep(stepIndex, context = {}) {
    if (typeof document === 'undefined') return;
    const step = TUTORIAL_STEPS[stepIndex];
    if (!step) return;

    // Navigate to step's view
    if (typeof window !== 'undefined' && typeof window.navTo === 'function') {
        window.navTo(step.viewId);
    }

    removeTourSpotlight();

    // Spotlight target element
    setTimeout(() => {
        const targetEl = document.querySelector(step.targetSelector);
        if (targetEl) {
            targetEl.classList.add('tour-spotlight-active', 'ring-4', 'ring-sky-500', 'ring-offset-4', 'ring-offset-slate-950');
            try {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (e) {}
        }
    }, 100);

    const card = document.getElementById('tourCard');
    if (!card) return;

    // Position floating card safely in lower-right on desktop, bottom-center on mobile
    card.style.bottom = '24px';
    card.style.right = '24px';
    card.style.left = 'auto';
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
        card.style.left = '16px';
        card.style.right = '16px';
        card.style.bottom = '16px';
        card.style.width = 'calc(100vw - 32px)';
    }

    // Step indicator dots
    const dotsHtml = TUTORIAL_STEPS.map((_, i) => `
        <span class="w-2.5 h-2.5 rounded-full transition-colors ${i === stepIndex ? 'bg-sky-400 scale-125' : 'bg-slate-700'}"></span>
    `).join('');

    card.innerHTML = `
        <div class="flex items-center justify-between gap-2 mb-3">
            <div class="flex items-center gap-2">
                <span class="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800/60">
                    STEP ${step.step} OF ${TUTORIAL_STEPS.length}
                </span>
                <span class="text-xs font-bold text-slate-400">${step.category}</span>
            </div>
            <button type="button" id="btnTourDismiss" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors" aria-label="Dismiss tour">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>

        <h3 class="text-lg font-black text-white mb-2">${step.title}</h3>
        <p class="text-xs text-slate-300 leading-relaxed mb-4">${step.description}</p>

        <div class="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 mb-5 flex items-start gap-2.5">
            <span class="text-amber-400 text-sm">💡</span>
            <p class="text-[11px] text-slate-300 font-medium">${step.proTip}</p>
        </div>

        <div class="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div class="flex items-center gap-1.5">${dotsHtml}</div>
            <div class="flex items-center gap-2">
                <button type="button" id="btnTourSkip" class="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
                    Skip
                </button>
                ${stepIndex > 0 ? `
                    <button type="button" id="btnTourPrev" class="px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
                        Back
                    </button>
                ` : ''}
                <button type="button" id="btnTourNext" class="px-4 py-1.5 text-xs font-black bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl shadow-lg transition-all flex items-center gap-1">
                    ${step.actionText}
                </button>
            </div>
        </div>
    `;

    // Bind action listeners
    const nextBtn = card.querySelector('#btnTourNext');
    if (nextBtn) nextBtn.onclick = () => nextTourStep(context);

    const prevBtn = card.querySelector('#btnTourPrev');
    if (prevBtn) prevBtn.onclick = () => prevTourStep(context);

    const skipBtn = card.querySelector('#btnTourSkip');
    if (skipBtn) skipBtn.onclick = () => skipInteractiveTour(context);

    const dismissBtn = card.querySelector('#btnTourDismiss');
    if (dismissBtn) dismissBtn.onclick = () => skipInteractiveTour(context);

    if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

// Global browser export
if (typeof window !== 'undefined') {
    window.InteractiveTutorial = {
        TUTORIAL_STEPS,
        detectUserPlatform,
        isTutorialCompleted,
        getOnboardingBadge,
        persistTutorialCompletion,
        startInteractiveTour,
        nextTourStep,
        prevTourStep,
        skipInteractiveTour,
        completeInteractiveTour,
        replayInteractiveTutorial
    };
}
