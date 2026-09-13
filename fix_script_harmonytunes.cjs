const fs = require('fs');
let content = fs.readFileSync('js/harmonytunes.js', 'utf8');

if (!content.includes('escapeHTML')) {
  content = content.replace(/import \{ showToast \} from '\.\/utils\.js';/g, "import { showToast, escapeHTML } from './utils.js';");
}

content = content.replace(/\$\{song\.title\}/g, '${escapeHTML(song.title)}');
content = content.replace(/\$\{song\.artist\}/g, '${escapeHTML(song.artist)}');
content = content.replace(/\$\{tk\.title\}/g, '${escapeHTML(tk.title)}');
content = content.replace(/\$\{tk\.author\}/g, '${escapeHTML(tk.author)}');
content = content.replace(/\$\{pl\.title\}/g, '${escapeHTML(pl.title)}');
content = content.replace(/\$\{pl\.desc\}/g, '${escapeHTML(pl.desc)}');
content = content.replace(/\$\{song\.duration\}/g, '${escapeHTML(song.duration)}');


fs.writeFileSync('js/harmonytunes.js', content);
