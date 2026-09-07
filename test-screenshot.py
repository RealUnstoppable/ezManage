from playwright.sync_api import sync_playwright

def run_cuj(page):
    # Navigate to local file since this is a vanilla JS app
    page.goto("file:///app/index.html")
    page.wait_for_timeout(1000)

    # Mock window variables to simulate logged in manager and group
    page.evaluate('''
        window.isInitializingAuth = false;
        window.currentUser = { uid: "test-uid", email: "manager@test.com" };
        window.currentUserData = {
            name: "Test Manager",
            orgId: "test-uid",
            plan: "Business Pro"
        };
        // Mock team roster so schedule dropdown populates
        window.activeEmployeesList = [
            { id: '1', name: 'Alice Adams', role: 'Cashier' },
            { id: '2', name: 'Bob Burger', role: 'Cook' },
            { id: '3', name: 'Charlie Chips', role: 'Shift Leader' }
        ];
    ''')

    # Navigate to Schedule View
    page.evaluate("navTo('schedule')")
    page.wait_for_timeout(1000)

    # Focus the employee dropdown to show it's interactive
    # Since our merge diff replaced duplicate IDs, let's wait for the element
    # and use a strict selector based on the parent structure we fixed
    page.locator("label:has-text('Employee Name') + select#shiftEmpName").focus()
    page.wait_for_timeout(500)

    # Take screenshot at the key moment
    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)  # Hold final state for the video

if __name__ == "__main__":
    import os
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos",
            viewport={"width": 1280, "height": 720}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()  # MUST close context to save the video
            browser.close()
