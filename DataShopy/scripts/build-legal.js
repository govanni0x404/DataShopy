// Generates docs/privacy.html and docs/terms.html from src/constants/legal.js
// (the public URLs Google Play requires). Run: npm run build:legal
const fs = require('fs');
const path = require('path');
const { LEGAL_DOCS } = require('../src/constants/legal');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const page = (doc) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.title)} - DataShopy</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:720px;margin:0 auto;padding:24px 16px;line-height:1.6;color:#1c1b22;background:#fff}
  h1{font-size:26px;margin-bottom:4px} h2{font-size:18px;margin-top:28px}
  .updated{color:#777;font-size:13px} li{margin:6px 0}
  @media (prefers-color-scheme: dark){body{background:#15141a;color:#eceaf3}.updated{color:#999}}
</style>
</head>
<body>
<h1>${esc(doc.title)}</h1>
<p class="updated">DataShopy · Última actualización: ${esc(doc.updated)}</p>
<p>${esc(doc.intro)}</p>
${doc.sections.map((s) => `<h2>${esc(s.heading)}</h2>\n<ul>\n${s.items.map((i) => `<li>${esc(i)}</li>`).join('\n')}\n</ul>`).join('\n')}
</body>
</html>
`;

const outDir = path.join(__dirname, '..', 'docs');
fs.mkdirSync(outDir, { recursive: true });
for (const [name, doc] of Object.entries(LEGAL_DOCS)) {
  fs.writeFileSync(path.join(outDir, `${name}.html`), page(doc));
  console.log(`docs/${name}.html`);
}
