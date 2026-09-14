

export function loadFooter() {
    const footerHTML = `
        <div class="footer-container max-w-7xl mx-auto px-6 py-12">
            <div class="footer-top-brand flex flex-col md:flex-row justify-between items-start md:items-center pb-10 mb-10 border-b border-slate-800/80 gap-6">
                <div class="flex items-center gap-4">
                    <div class="relative group cursor-pointer" onclick="if(window.navTo) window.navTo('welcome');">
                        <img src="ManagerPro.jpg" alt="ezManage Logo" class="w-12 h-12 rounded-2xl shadow-lg border border-slate-700 object-cover">
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-2xl font-black tracking-tight text-black bg-white px-3 py-1 rounded-xl shadow-md uppercase">ezManage</span>
                            <span class="text-[10px] font-black uppercase tracking-widest bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2.5 py-1 rounded-full">Store OS</span>
                        </div>
                        <p class="text-xs text-slate-400 font-medium mt-0.5">The #1 Zero-Latency Floor Management & Shift Tracking Platform</p>
                    </div>
                </div>
                <div class="flex items-center gap-3 bg-slate-900/90 border border-slate-800/80 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 shadow-inner">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>System Status: <strong class="text-white font-bold">All Engines Operational</strong></span>
                </div>
            </div>

            <div class="footer-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                <div class="footer-column">
                    <h5 class="text-xs font-black uppercase tracking-[0.2em] text-sky-400 mb-4 flex items-center gap-2">
                        <i data-lucide="layout-grid" class="w-4 h-4"></i> Navigate
                    </h5>
                    <ul class="space-y-2.5 text-sm font-medium text-slate-300">
                        <li><a href="index.html#welcome" onclick="if(window.navTo){event.preventDefault();window.navTo('welcome');}">Overview & Home</a></li>
                        <li><a href="index.html#tracker" onclick="if(window.navTo){event.preventDefault();window.navTo('tracker');}">Active Shift Tracker</a></li>
                        <li><a href="index.html#schedule" onclick="if(window.navTo){event.preventDefault();window.navTo('schedule');}">Shift Schedule & Roster</a></li>
                        <li><a href="index.html#announcements" onclick="if(window.navTo){event.preventDefault();window.navTo('announcements');}">Team Notices</a></li>
                        <li><a href="index.html#tasks" onclick="if(window.navTo){event.preventDefault();window.navTo('tasks');}">Task Manager</a></li>
                        <li><a href="index.html#presets" onclick="if(window.navTo){event.preventDefault();window.navTo('presets');}">Routine Presets</a></li>
                    </ul>
                </div>

                <div class="footer-column">
                    <h5 class="text-xs font-black uppercase tracking-[0.2em] text-sky-400 mb-4 flex items-center gap-2">
                        <i data-lucide="cpu" class="w-4 h-4"></i> Connect
                    </h5>
                    <ul class="space-y-2.5 text-sm font-medium text-slate-300">
                        <li><a href="easy-ai.html">AI Demand Predictor</a></li>
                        <li><a href="company.html">Corporate Multi-Store Portal</a></li>
                        <li><a href="panel-ai-admin.html">Admin Intelligence Panel</a></li>
                        <li><a href="admin.html">Shift Lead Dashboard</a></li>
                        <li><a href="account.html">Account & Cloud Sync</a></li>
                        <li><a href="index.html#pricing" onclick="if(window.navTo){event.preventDefault();window.navTo('pricing');}">Pricing & Licenses</a></li>
                    </ul>
                </div>

                <div class="footer-column">
                    <h5 class="text-xs font-black uppercase tracking-[0.2em] text-sky-400 mb-4 flex items-center gap-2">
                        <i data-lucide="shield-check" class="w-4 h-4"></i> Company
                    </h5>
                    <ul class="space-y-2.5 text-sm font-medium text-slate-300">
                        <li><a href="index.html#incidents" onclick="if(window.navTo){event.preventDefault();window.navTo('incidents');}">Incident & Audit Reports</a></li>
                        <li><a href="#" onclick="event.preventDefault(); if(document.getElementById('tosModal')) document.getElementById('tosModal').classList.remove('hidden');">Terms & Security Policy</a></li>
                        <li><a href="#" onclick="event.preventDefault(); if(document.getElementById('orgTutorialModal')) document.getElementById('orgTutorialModal').classList.remove('hidden');">Store Connection Guide</a></li>
                        <li><a href="mailto:unstoppableplays2016@hotmail.com">Contact Support</a></li>
                    </ul>
                </div>

                <div class="footer-column footer-newsletter">
                    <h5 class="text-xs font-black uppercase tracking-[0.2em] text-sky-400 mb-4 flex items-center gap-2">
                        <i data-lucide="send" class="w-4 h-4"></i> Stay in the Loop
                    </h5>
                    <p class="text-xs text-slate-400 leading-relaxed mb-4">
                        Sign up for news, announcements, and exclusive beta access for ezManage features.
                    </p>
                    <form class="signup-form flex gap-2">
                        <input type="email" placeholder="manager@store.com" required aria-label="Email for newsletter" class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 flex-1">
                        <button type="submit" class="bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-md">Sign Up</button>
                    </form>
                    <div class="newsletter-message" style="margin-top: 10px; font-size: 0.8rem; display: none;"></div>
                </div>
            </div>

            <div class="footer-bottom pt-8 mt-10 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
                <p>&copy; 2026 Unstoppable LLC. All Rights Reserved. ezManage™ Store Floor OS.</p>
                <p>Designed in collaboration with Unstoppable Design, LLC.</p>
            </div>
        </div>
    `;

    const footer = document.querySelector('.main-footer');
    if (footer) {
        footer.innerHTML = footerHTML;
        if (window.lucide) window.lucide.createIcons();
    }
}