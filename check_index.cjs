const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scripts = html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g);
if (scripts) {
  scripts.forEach((script, i) => {
    let code = script.replace(/<script[^>]*>|<\/script>/g, '');
    fs.writeFileSync(`test_script_${i}.js`, code);
    console.log(`Checking script ${i}`);
    try {
      require('child_process').execSync(`node -c test_script_${i}.js`, {stdio: 'inherit'});
    } catch(e) {
      console.error(`Error in script ${i}`);
    }
  });
}
