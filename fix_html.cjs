const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');
const search = `<div class="download-section mt-8 flex flex-col items-center">
                        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">Prefer a native desktop
                            experience?</p>
                        <a href="https://github.com/RealUnstoppable/ezManage/raw/main/downloads/ezManage-1.0.0.dmg"
                            download="ezManage-Mac.dmg"
                            class="btn btn-outline text-sm px-8 py-3 border-sky-500 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20">
                            <i data-lucide="download"></i> Download for macOS
                        </a>
                    </div>
                </div>
            <section class="py-24 bg-white dark:bg-slate-950">`;

const replace = `<div class="download-section mt-8 flex flex-col items-center">
                        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">Prefer a native desktop
                            experience?</p>
                        <a href="https://github.com/RealUnstoppable/ezManage/raw/main/downloads/ezManage-1.0.0.dmg"
                            download="ezManage-Mac.dmg"
                            class="btn btn-outline text-sm px-8 py-3 border-sky-500 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20">
                            <i data-lucide="download"></i> Download for macOS
                        </a>
                    </div>
                </div>
            </section>
            <section class="py-24 bg-white dark:bg-slate-950">`;
content = content.replace(search, replace);
fs.writeFileSync('index.html', content);
