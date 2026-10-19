import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const files = ['index.html', 'manifest.webmanifest', 'service-worker.js', 'assets', 'pages'];
await rm('www', { recursive: true, force: true });
await mkdir('www', { recursive: true });
for (const file of files) await cp(file, `www/${file}`, { recursive: true });
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
  outfile: 'www/assets/js/couple-interactions.js',
});

for (const page of ['www/index.html', ...['carta', 'chuva', 'historia', 'momentos', 'playlist', 'teste-relogio'].map((name) => `www/pages/${name}.html`)]) {
  const html = await readFile(page, 'utf8');
  const assetPrefix = page.includes('/pages/') ? '../assets/' : 'assets/';
  const scripts = [
    `<script src="${assetPrefix}js/couple-config.js"></script>`,
    `<script src="${assetPrefix}js/couple-interactions.js"></script>`,
    `<script src="${assetPrefix}js/native-notifications.js"></script>`,
  ].join('\n  ');
  await writeFile(page, html.replace('</body>', `  ${scripts}\n  </body>`));
}

const serviceWorkerPath = 'www/service-worker.js';
const serviceWorker = await readFile(serviceWorkerPath, 'utf8');
await writeFile(serviceWorkerPath, serviceWorker.replace("'./assets/js/script.js',", "'./assets/js/script.js', './assets/js/native-notifications.js',"));
console.log('Arquivos do app preparados em www/.');
