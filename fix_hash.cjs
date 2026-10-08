const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target = `                        const pendingNavTo = localStorage.getItem('navTo');
                        if (pendingNavTo) {
                            localStorage.removeItem('navTo');
                            setTimeout(() => navTo(pendingNavTo), 100);
                        } else {
                            activeView = document.querySelector('.view-section.active');
                            if (activeView && activeView.id !== 'view-auth' && activeView.id !== 'view-tracker') navTo('auth');
                        }`;

const replacement = `                        const pendingNavTo = localStorage.getItem('navTo');
                        const hashNav = window.location.hash.replace('#', '');
                        if (pendingNavTo) {
                            localStorage.removeItem('navTo');
                            setTimeout(() => navTo(pendingNavTo), 100);
                        } else if (hashNav && document.getElementById('view-' + hashNav)) {
                            setTimeout(() => navTo(hashNav), 100);
                        } else {
                            activeView = document.querySelector('.view-section.active');
                            if (activeView && activeView.id !== 'view-auth' && activeView.id !== 'view-tracker') navTo('auth');
                        }`;

html = html.replace(target, replacement);

const target2 = `                const pendingNavTo = localStorage.getItem('navTo');
                if (pendingNavTo) {
                    localStorage.removeItem('navTo');
                    navTo(pendingNavTo);
                } else {
                    activeView = document.querySelector('.view-section.active');
                    if (activeView && activeView.id !== 'view-auth' && activeView.id !== 'view-tracker') navTo('auth');
                }`;

const replacement2 = `                const pendingNavTo = localStorage.getItem('navTo');
                const hashNav = window.location.hash.replace('#', '');
                if (pendingNavTo) {
                    localStorage.removeItem('navTo');
                    navTo(pendingNavTo);
                } else if (hashNav && document.getElementById('view-' + hashNav)) {
                    navTo(hashNav);
                } else {
                    activeView = document.querySelector('.view-section.active');
                    if (activeView && activeView.id !== 'view-auth' && activeView.id !== 'view-tracker') navTo('auth');
                }`;

html = html.replace(target2, replacement2);

fs.writeFileSync('index.html', html);
