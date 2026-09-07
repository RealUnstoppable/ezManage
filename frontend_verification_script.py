from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000")
    page.wait_for_timeout(500)

    # Force show incidents view
    page.evaluate("document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));")
    page.evaluate("document.getElementById('view-incidents').classList.add('active');")
    page.evaluate("document.getElementById('view-incidents').style.display = 'block';")
    page.wait_for_timeout(1000)

    # Click Report Incident button
    page.get_by_role("button", name="Report Incident").click(force=True)
    page.wait_for_timeout(1000)

    # Fill out the form
    page.get_by_placeholder("Incident Title").fill("Slip and Fall in Kitchen", force=True)
    page.wait_for_timeout(500)
    page.get_by_placeholder("Describe what happened...").fill("Employee slipped on wet floor near the fryers.", force=True)
    page.wait_for_timeout(500)

    # Select severity and type
    page.locator("#incidentSeverity").select_option("High")
    page.wait_for_timeout(500)
    page.locator("#incidentType").select_option("Safety")
    page.wait_for_timeout(500)

    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()  # MUST close context to save the video
            browser.close()
