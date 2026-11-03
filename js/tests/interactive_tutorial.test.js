import {
    TUTORIAL_STEPS,
    detectUserPlatform,
    isTutorialCompleted,
    getOnboardingBadge,
    persistTutorialCompletion
} from '../interactive-tutorial.js';

describe('Adobe CC-Style Interactive Tutorial & Platform Detector', () => {

    beforeEach(() => {
        localStorage.clear();
    });

    test('should define all 5 core guided manager onboarding steps in order', () => {
        expect(TUTORIAL_STEPS).toHaveLength(5);

        // Step 1: Shift Tracker
        expect(TUTORIAL_STEPS[0].step).toBe(1);
        expect(TUTORIAL_STEPS[0].id).toBe('step-tracker');
        expect(TUTORIAL_STEPS[0].viewId).toBe('tracker');
        expect(TUTORIAL_STEPS[0].title).toContain('Active Shift Tracker');

        // Step 2: Safe Sheet
        expect(TUTORIAL_STEPS[1].step).toBe(2);
        expect(TUTORIAL_STEPS[1].id).toBe('step-safe');
        expect(TUTORIAL_STEPS[1].title).toContain('Safe Sheet');

        // Step 3: Inventory & AI
        expect(TUTORIAL_STEPS[2].step).toBe(3);
        expect(TUTORIAL_STEPS[2].id).toBe('step-inventory');
        expect(TUTORIAL_STEPS[2].title).toContain('Inventory & AI');

        // Step 4: Announcements
        expect(TUTORIAL_STEPS[3].step).toBe(4);
        expect(TUTORIAL_STEPS[3].id).toBe('step-announcements');
        expect(TUTORIAL_STEPS[3].viewId).toBe('announcements');

        // Step 5: ServSafe & Multi-Chain
        expect(TUTORIAL_STEPS[4].step).toBe(5);
        expect(TUTORIAL_STEPS[4].id).toBe('step-servsafe');
        expect(TUTORIAL_STEPS[4].title).toContain('ServSafe');
    });

    test('should accurately detect macOS, Windows, iOS, and Android platforms', () => {
        // macOS
        const macUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
        const macPlatform = detectUserPlatform(macUA, 'MacIntel');
        expect(macPlatform.isMac).toBe(true);
        expect(macPlatform.isMobile).toBe(false);
        expect(macPlatform.platformName).toBe('macOS');

        // Windows
        const winUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        const winPlatform = detectUserPlatform(winUA, 'Win32');
        expect(winPlatform.isWindows).toBe(true);
        expect(winPlatform.isMobile).toBe(false);
        expect(winPlatform.platformName).toBe('Windows');

        // iOS
        const iosUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
        const iosPlatform = detectUserPlatform(iosUA, 'iPhone');
        expect(iosPlatform.isIOS).toBe(true);
        expect(iosPlatform.isMobile).toBe(true);
        expect(iosPlatform.platformName).toBe('iOS');

        // Android
        const androidUA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36';
        const androidPlatform = detectUserPlatform(androidUA, 'Linux armv8l');
        expect(androidPlatform.isAndroid).toBe(true);
        expect(androidPlatform.isMobile).toBe(true);
        expect(androidPlatform.platformName).toBe('Android');
    });

    test('should track tutorial completion status and prevent duplicate prompts', async () => {
        const uid = 'mgr_test_456';

        // Initially uncompleted
        expect(isTutorialCompleted(uid, null)).toBe(false);
        expect(getOnboardingBadge(uid, null)).toBeNull();

        // Complete tutorial
        await persistTutorialCompletion(uid);

        // Now completed
        expect(isTutorialCompleted(uid, null)).toBe(true);
        expect(getOnboardingBadge(uid, null)).toBe('Certified Shift Lead');

        // Also respects Firestore user document
        expect(isTutorialCompleted('other_user', { tutorialCompleted: true })).toBe(true);
        expect(getOnboardingBadge('other_user', { onboardingBadge: 'Certified Shift Lead' })).toBe('Certified Shift Lead');
    });
});
