const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const search = `                  if (submitBtn) {
                      submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Posting...';
                      submitBtn.disabled = true;
                  }`;
const replace = `                  if (_submitBtn) {
                      _submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Posting...';
                      _submitBtn.disabled = true;
                  }`;

if (html.includes(search)) {
    html = html.replace(search, replace);
    fs.writeFileSync('index.html', html);
    console.log("Replaced successfully!");
} else {
    console.log("Search string not found!");
}
