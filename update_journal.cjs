const fs = require('fs');

const journalEntry = `
## 2024-05-27 - Loading States on Optimistic UI Actions
**Learning:** Even when performing an optimistic UI update (like appending a shift note to the DOM immediately), the originating button ("Post Note") still requires an explicitly visible loading state to prevent users from rapidly multi-clicking if network latency delays the resolution. A spinner and explicit \`disabled:opacity-70 disabled:cursor-not-allowed\` styling provides unambiguous system status.
**Action:** Always wrap async actions that utilize optimistic UI updates with immediate visual button disablement and loading states, explicitly restoring them in a \`finally\` block in case of both success and failure.
`;

const path = '.Jules/palette.md';
let content = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
content += journalEntry;
fs.writeFileSync(path, content);
