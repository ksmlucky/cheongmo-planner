import {readFile,writeFile} from 'node:fs/promises';
const read = name => readFile(new URL(`./dist/${name}`,import.meta.url),'utf8');
const [html,css,logic,app,favicon] = await Promise.all(['index.html','styles.css','logic.js','app.js','favicon.svg'].map(read));
const bundledLogic=logic.replace(/^export /gm,'');
const bundledApp=app.replace(/^import .*?;\r?\n/,'');
// A single local HTML file, with no module fetches, fonts, or other network dependencies.
const result=html
  .replace('<link rel="icon" href="./favicon.svg" type="image/svg+xml">',`<link rel="icon" href="data:image/svg+xml;base64,${Buffer.from(favicon).toString('base64')}" type="image/svg+xml">`)
  .replace('<link rel="stylesheet" href="./styles.css">',`<style>\n${css.replace(/^@import[^\n]*\n/,'')}\n</style>`)
  .replace('<script type="module" src="./app.js"></script>',`<script type="module">\n${bundledLogic}\n${bundledApp}\n</script>`);
const destination=new URL('../청모.html',import.meta.url);
await writeFile(destination,result,'utf8');
console.log(`Standalone saved: ${destination.pathname}`);
