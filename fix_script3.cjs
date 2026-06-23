const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// removeShift interpolation
content = content.replace(
    /onclick="removeShift\(\$\{index\}\)"/g,
    `data-action="removeShift" data-index="\${index}"`
);

// We need to add it to the event listener
content = content.replace(
    /else if \(action === 'deleteTimeOffRequest'\) deleteTimeOffRequest\(id\);/g,
    `else if (action === 'deleteTimeOffRequest') deleteTimeOffRequest(id);
            else if (action === 'removeShift') removeShift(btn.dataset.index);`
);

fs.writeFileSync('index.html', content);
