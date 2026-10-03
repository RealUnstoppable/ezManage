const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

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

// I should just use replace on the current state of index.html for deleteLostItem
// It currently looks like:
/*
                if (action === 'deleteLostItem') deleteLostItem(id);
                if (action === 'deleteIncident') deleteIncident(id);
*/
// It doesn't have an else before it, let's check
fs.writeFileSync('index.html', html);
