const fs = require('node:fs');
const path = require('node:path');

const distDir = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error(`[postbuild] Arquivo não encontrado: ${indexPath}`);
  process.exit(1);
}

for (const name of ['404.html', '200.html']) {
  const outPath = path.join(distDir, name);
  fs.copyFileSync(indexPath, outPath);
}

console.log('[postbuild] Fallback SPA gerado: dist/404.html e dist/200.html');