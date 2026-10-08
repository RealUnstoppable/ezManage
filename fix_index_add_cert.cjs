const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// Add deleteCert to the listeners
code = code.replace(
    /else if \(action === 'deleteTask'\) deleteTask\(id\);/g, 
    "else if (action === 'deleteTask') deleteTask(id);\n            else if (action === 'deleteCert') deleteCertification(id);\n            else if (action === 'updateAssignedTaskStatus') updateAssignedTaskStatus(id, status);\n            else if (action === 'deleteAssignedTask') deleteAssignedTask(id);"
);

code = code.replace(
    /if \(action === 'deleteTask'\) deleteTask\(id\);/g,
    "if (action === 'deleteTask') deleteTask(id);\n                if (action === 'deleteCert') deleteCertification(id);\n                if (action === 'updateAssignedTaskStatus') updateAssignedTaskStatus(id, status);\n                if (action === 'deleteAssignedTask') deleteAssignedTask(id);"
);

fs.writeFileSync('index.html', code);
