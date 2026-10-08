const fs = require('fs');

const files = [
    'js/auth.js', 'js/checkout.js', 'js/harmonytunes.js', 'js/navbar.js',
    'js/newsletter.js', 'js/script.js', 'js/shop.js', 'js/theme-loader.js',
    'functions/checkUser.js', 'functions/index.js', 'functions/trainGlobalAI.js'
];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    let insideTry = 0;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('try {')) insideTry++;
        if (lines[i].includes('} catch')) insideTry = Math.max(0, insideTry - 1);

        if (lines[i].includes('await ') && insideTry === 0) {
            console.log(`Potential uncaught await in ${file}:${i+1} -> ${lines[i].trim()}`);
        }
    }
});
