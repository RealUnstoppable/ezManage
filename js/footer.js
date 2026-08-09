

export function loadFooter() {
    const footerHTML = `
        <div class="footer-container">
            <div class="footer-grid">
                <div class="footer-column">
                    <h5>Navigate</h5>
                    <ul>
                        <li><a href="index.html#welcome" onclick="if(window.navTo){event.preventDefault();window.navTo('welcome');}">Home</a></li>
                        <li><a href="index.html#tracker" onclick="if(window.navTo){event.preventDefault();window.navTo('tracker');}">Active Tracker</a></li>
                        <li><a href="index.html#schedule" onclick="if(window.navTo){event.preventDefault();window.navTo('schedule');}">Shift Schedule</a></li>
                        <li><a href="index.html#announcements" onclick="if(window.navTo){event.preventDefault();window.navTo('announcements');}">Notices</a></li>
                        <li><a href="index.html#tasks" onclick="if(window.navTo){event.preventDefault();window.navTo('tasks');}">Task Manager</a></li>
                        <li><a href="easy-ai.html">AI Predictor</a></li>
                        <li><a href="index.html#pricing" onclick="if(window.navTo){event.preventDefault();window.navTo('pricing');}">Pricing Plans</a></li>
                    </ul>
                </div>
                <div class="footer-column">
                    <h5>Connect</h5>
                    <ul>
                        <li><a href="https://www.youtube.com/@Unstoppab1e" target="_blank" rel="noopener noreferrer">YouTube</a></li>
                        <li><a href="https://www.tiktok.com/@harmonytunesofficial" target="_blank" rel="noopener noreferrer">TikTok</a></li>
                        <li><a href="https://x.com/harmonytun16586?s=21" target="_blank" rel="noopener noreferrer">Twitter / X</a></li>
                        <li><a href="https://discord.gg/6zdH5De3ab" target="_blank" rel="noopener noreferrer">Discord</a></li>
                    </ul>
                </div>
                <div class="footer-column">
                    <h5>Company</h5>
                    <ul>
                        <li><a href="company.html">Corporate Portal</a></li>
                        <li><a href="panel-ai-admin.html">Admin Intelligence</a></li>
                        <li><a href="admin.html">Dashboard</a></li>
                        <li><a href="index.html#incidents" onclick="if(window.navTo){event.preventDefault();window.navTo('incidents');}">Incident Reports</a></li>
                        <li><a href="mailto:unstoppableplays2016@hotmail.com">Contact Support</a></li>
                    </ul>
                </div>
                <div class="footer-column footer-newsletter">
                    <h5>Stay in the Loop</h5>
                    <p>Sign up for news, announcements, and exclusive beta access for ezManage features.</p>
                    <form class="signup-form">
                        <input type="email" placeholder="your.email@example.com" required aria-label="Email for newsletter">
                        <button type="submit">Sign Up</button>
                    </form>
                    <div class="newsletter-message" style="margin-top: 10px; font-size: 0.9rem; display: none;"></div>
                </div>
            </div>

            <div class="footer-bottom">
                <p>&copy; 2026 Unstoppable LLC. All Rights Reserved. ezManage Store Management System.</p>
                <p>Designed in collaboration with Unstoppable Design, LLC.</p>
            </div>
        </div>
    `;

    const footer = document.querySelector('.main-footer');
    if (footer) {
        footer.innerHTML = footerHTML;
    }
}