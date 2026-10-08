const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Fix the event delegation
const statusDelg = `
            if (e.target && e.target.classList.contains('lostitem-status-select')) {
                const itemId = e.target.getAttribute('data-item-id');
                if (itemId) {
                    updateLostItemStatus(itemId, e.target.value);
                }
            }
`;

if (!html.includes('updateLostItemStatus(itemId, e.target.value);')) {
    html = html.replace(
        'if (e.target && e.target.classList.contains(\'incident-status-select\')) {',
        statusDelg + '\n            if (e.target && e.target.classList.contains(\'incident-status-select\')) {'
    );
}

// Fix the mangled else if block
const badElseIf = `else
                if (action === 'deleteLostItem') deleteLostItem(id);
                if (action === 'deleteIncident') deleteIncident(id);`;

const goodElseIf = `else if (action === 'deleteLostItem') deleteLostItem(id);
            else if (action === 'deleteIncident') deleteIncident(id);`;

html = html.replace(badElseIf, goodElseIf);

fs.writeFileSync('index.html', html);
