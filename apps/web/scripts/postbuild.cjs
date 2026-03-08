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

// Alguns hosts (ou configurações) não fazem rewrite para SPA em rotas "limpas".
// Para evitar 404 em refresh/deep-link, criamos `/<rota>/index.html` apontando para o mesmo `index.html`.
const routes = [
  'entrar',
  'criar-conta',
  'forgot-password',
  'reset-password',
  'termos',
  'inicio',
  'lancamentos',
  'diagnostico',
  'relatorios',
  'perfil',
];

for (const route of routes) {
  const routeDir = path.join(distDir, route);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.copyFileSync(indexPath, path.join(routeDir, 'index.html'));
}

console.log(
  '[postbuild] Fallback SPA gerado: dist/404.html, dist/200.html e páginas para rotas (deep-link).',
);
