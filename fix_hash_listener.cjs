const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target = `    <script type="module">
        import { loadNavbar } from './js/navbar.js';
        import { loadFooter } from './js/footer.js';
        document.addEventListener('DOMContentLoaded', () => {
            loadNavbar();
            loadFooter();
        });
    </script>`;

const replacement = `    <script type="module">
        import { loadNavbar } from './js/navbar.js';
        import { loadFooter } from './js/footer.js';
        document.addEventListener('DOMContentLoaded', () => {
            loadNavbar();
            loadFooter();
            
            window.addEventListener('hashchange', () => {
                const hash = window.location.hash.replace('#', '');
                if (hash && typeof window.navTo === 'function') {
                    window.navTo(hash);
                }
            });
        });
    </script>`;

html = html.replace(target, replacement);
fs.writeFileSync('index.html', html);
