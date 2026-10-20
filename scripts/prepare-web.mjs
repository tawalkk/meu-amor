import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const webSource = 'web';
const assetVersion = 39;
const files = ['index.html', 'manifest.webmanifest', 'service-worker.js', 'assets', 'pages'];
if (!process.argv.includes('--android')) files.push('downloads');
await rm('www', { recursive: true, force: true });
await mkdir('www', { recursive: true });
for (const file of files) await cp(`${webSource}/${file}`, `www/${file}`, { recursive: true });
await build({
  entryPoints: ['scripts/native-notifications.mjs'],
  bundle: true,
  format: 'iife',
  outfile: 'www/assets/js/native-notifications.js',
});
await build({
  entryPoints: ['scripts/couple-interactions.mjs'],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: 'www/assets/js/couple-interactions.js',
});
await build({
  entryPoints: ['scripts/site-auth.mjs'],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: 'www/assets/js/site-auth.js',
});
await build({
  entryPoints: ['scripts/shared-features.mjs'],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: 'www/assets/js/shared-features.js',
});
await build({
  entryPoints: ['scripts/home-moments.mjs'],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: 'www/assets/js/home-moments.js',
});

for (const page of ['www/index.html', ...['carta', 'chuva', 'conversa', 'historia', 'login', 'momentos', 'playlist', 'teste-relogio', 'espaco', 'linha-do-tempo', 'cartinhas', 'diario', 'planos', 'desejos', 'recadinhos', 'perguntas', 'calendario'].map((name) => `www/pages/${name}.html`)]) {
  const html = (await readFile(page, 'utf8'))
    .replaceAll('site-auth.js"', `site-auth.js?v=${assetVersion}"`)
    .replace(/script\.js(?:\?v=\d+)?"/g, `script.js?v=${assetVersion}"`)
    .replace(/modern\.css(?:\?v=\d+)?"/g, `modern.css?v=${assetVersion}"`)
    .replace(/letter\.css(?:\?v=\d+)?"/g, `letter.css?v=${assetVersion}"`)
    .replace(/auth\.css(?:\?v=\d+)?"/g, `auth.css?v=${assetVersion}"`)
    .replace(/special-pages\.css(?:\?v=\d+)?"/g, `special-pages.css?v=${assetVersion}"`)
    .replace(/home-moments\.js(?:\?v=\d+)?"/g, `home-moments.js?v=${assetVersion}"`)
    .replace(/(couple-interactions|shared-features)\.js(?:\?v=\d+)?"/g, `$1.js?v=${assetVersion}"`)
    .replace(/(couple|shared-features)\.css(?:\?v=\d+)?"/g, `$1.css?v=${assetVersion}"`)
    .replace(/\s*<link rel="(?:icon|apple-touch-icon)"[^>]*>/g, '');
  const assetPrefix = page.includes('/pages/') ? '../assets/' : 'assets/';
  const icons = `    <link rel="icon" type="image/png" href="${assetPrefix}images/icon_appandsite.png" />\n    <link rel="apple-touch-icon" href="${assetPrefix}images/icon_appandsite.png" />\n`;
  const scripts = `<script src="${assetPrefix}js/native-notifications.js"></script>`;
  const designSystem = `    <link rel="stylesheet" href="${assetPrefix}css/design-system.css?v=${assetVersion}" />\n`;
  await writeFile(page, html.replace('</head>', `${designSystem}${icons}${scripts}\n  </head>`));
}

const serviceWorkerPath = 'www/service-worker.js';
const serviceWorker = await readFile(serviceWorkerPath, 'utf8');
await writeFile(serviceWorkerPath, serviceWorker.replace("'./assets/js/script.js',", "'./assets/js/script.js', './assets/js/home-moments.js', './assets/js/native-notifications.js',"));
console.log('Arquivos do app preparados em www/.');
