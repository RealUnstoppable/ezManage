for file in *.html; do
  if ! grep -q "Content-Security-Policy" "$file"; then
    echo "Adding CSP to $file"
    sed -i 's|<head>|<head>\n    <!-- 🛡️ Sentinel: Added Content Security Policy for defense-in-depth -->\n    <meta http-equiv="Content-Security-Policy" content="default-src '\'self\''; script-src '\'self\'' '\'unsafe-inline\'' '\'unsafe-eval\'' https://cdn.tailwindcss.com https://unpkg.com https://www.gstatic.com; style-src '\'self\'' '\'unsafe-inline\'' https://fonts.googleapis.com; font-src '\'self\'' https://fonts.gstatic.com; img-src '\'self\'' data: https:; connect-src '\'self\'' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com;">|' "$file"
  fi
done
