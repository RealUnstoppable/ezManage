const fs = require('fs');

let rules = fs.readFileSync('firestore.rules', 'utf8');

const regexShiftNotes = /match \/shift_notes\/\{noteId\} \{[\s\S]*?allow create: if request\.auth != null[\s\S]*?&&\s*request\.resource\.data\.get\('authorId', null\) == request\.auth\.uid[\s\S]*?&&\s*request\.resource\.data\.get\('orgId', null\) == get\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)\.data\.get\('orgId', null\);\s*allow update: if request\.auth != null && \(\s*resource\.data\.get\('authorId', null\) == request\.auth\.uid \|\|\s*\(resource\.data\.get\('orgId', null\) != null && resource\.data\.get\('orgId', null\) == get\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)\.data\.get\('orgId', null\)\) \|\|\s*isAdmin\(\)\s*\);/;

const rules2 = rules;
fs.writeFileSync('firestore.rules.fixed', rules2, 'utf8');
