// Builds www/ (what Capacitor packages). --dev skips minifying; --preview also
// writes preview/index.html, one self-contained file for testing in a browser.
import { mkdir, writeFile, readFile, copyFile, rm } from 'node:fs/promises';
import * as sass from 'sass';
import postcss from 'postcss';
import presetEnv from 'postcss-preset-env';
import cssnano from 'cssnano';
import * as esbuild from 'esbuild';

const dev = process.argv.includes('--dev');
const preview = process.argv.includes('--preview');
const out = 'www';

await rm(out, { recursive: true, force: true });
await mkdir(`${out}/css`, { recursive: true });
await mkdir(`${out}/js`, { recursive: true });
await mkdir(`${out}/fonts`, { recursive: true });

const fonts = [
  'bricolage-grotesque/files/bricolage-grotesque-latin-500-normal.woff2',
  'bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff2',
  'space-mono/files/space-mono-latin-400-normal.woff2',
  'space-mono/files/space-mono-latin-700-normal.woff2',
  'inter/files/inter-latin-400-normal.woff2',
  'inter/files/inter-latin-600-normal.woff2',
  'inter/files/inter-latin-800-normal.woff2',
  'bebas-neue/files/bebas-neue-latin-400-normal.woff2'
];
for (const f of fonts) await copyFile(`node_modules/@fontsource/${f}`, `${out}/fonts/${f.split('/').pop()}`);

const scss = sass.compile('src/scss/main.scss', { style: 'expanded' });
const plugins = [presetEnv({ stage: 2 })];
if (!dev) plugins.push(cssnano());
const css = (await postcss(plugins).process(scss.css, { from: undefined })).css;
await writeFile(`${out}/css/main.css`, css);

const js = await esbuild.build({
  entryPoints: ['src/js/main.js'], bundle: true, format: 'iife', target: 'es2018',
  minify: !dev, sourcemap: dev ? 'inline' : false, write: false
});
const jsText = js.outputFiles[0].text;
await writeFile(`${out}/js/main.js`, jsText);

const html = await readFile('index.html', 'utf8');
await writeFile(`${out}/index.html`, html);

if (preview) {
  let inlineCss = css;
  for (const f of fonts) {
    const name = f.split('/').pop();
    const b64 = (await readFile(`${out}/fonts/${name}`)).toString('base64');
    inlineCss = inlineCss.split(`../fonts/${name}`).join(`data:font/woff2;base64,${b64}`);
  }
  const page = html
    .replace('<link rel="stylesheet" href="css/main.css">', () => `<style>${inlineCss}</style>`)
    .replace('<script src="js/main.js"></script>', () => `<script>${jsText.replace(/<\/script/gi, '<\\/script')}</script>`)
    .replace('<title>5×5</title>', '<title>5×5 Tracker</title>');
  await mkdir('preview', { recursive: true });
  await writeFile('preview/index.html', page);
  console.log('preview/index.html', Math.round(page.length / 1024) + ' KB');
}
console.log('built www/');
