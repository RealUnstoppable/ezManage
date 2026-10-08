const fs = require('fs');
let content = fs.readFileSync('js/auth.js', 'utf8');

// Replace level with escaped
content = content.replace(/membershipStatusContainer\.innerHTML = `<span class="membership-status \$\{level\}">\$\{level\}<\/span>`;/g, 'membershipStatusContainer.innerHTML = `<span class="membership-status ${escapeHTML(level)}">${escapeHTML(level)}</span>`;');

// Make sure escapeHTML is imported
if (!content.includes('escapeHTML')) {
  content = content.replace(/import \{ getFirebaseErrorMessage, logManagerError \} from '\.\/utils\.js';/g, "import { getFirebaseErrorMessage, logManagerError, escapeHTML } from './utils.js';");
}

fs.writeFileSync('js/auth.js', content);
