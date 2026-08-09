

export function loadFooter() {
    const footerHTML = `
        <div class="footer-container">
            <div class="footer-grid">
                <div class="footer-column">
                    <h5>Navigate</h5>
                    <ul>
                        <li><a href="index.html#bento">Overview</a></li>
                        <li><a href="unstoppable.html">Unstoppable</a></li>
                        <li><a href="dreamstimeskip.html">Dreams TimeSkip</a></li>
                        <li><a href="harmonytunes.html">HarmonyTunes</a></li>
                        <li><a href="shop.html">Shop</a></li>
                        <li><a href="memberships.html">Memberships</a></li>
                        <li><a href="blog.html">Blog</a></li>
                        <li><a href="portfolio.html">About Me</a></li>
                        <li><a href="uds.html">UDS</a></li>
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
                        <li><a href="tracker.html">About Us</a></li>
                        <li><a href="blog.html">Blog</a></li>
                        <li><a href="shop.html">Shop</a></li>
                        <li><a href="mailto:unstoppableplays2016@hotmail.com">Contact</a></li>
                    </ul>
                </div>
                <div class="footer-column footer-newsletter">
                    <h5>Stay in the Loop</h5>
                    <p>Sign up for news, announcements, and exclusive beta access.</p>
                    <form class="signup-form">
                        <input type="email" placeholder="your.email@example.com" required aria-label="Email for newsletter">
                        <button type="submit">Sign Up</button>
                    </form>
                    <div class="newsletter-message" style="margin-top: 10px; font-size: 0.9rem; display: none;"></div>
                </div>
            </div>

            <div class="footer-bottom">
                <p>&copy; 2026 Unstoppable LLC. All Rights Reserved.</p>
                <p>Designed in collaboration with Unstoppable Design, LLC.</p>
            </div>
        </div>
    `;

    const footer = document.querySelector('.main-footer');
    if (footer) {
        footer.innerHTML = footerHTML;
    }
}