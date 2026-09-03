import fs from 'node:fs';

const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const clean=v=>v.split('?')[0];
const css=[...html.matchAll(/href=["']([^"']*tshop-v[^"']+\.css(?:\?[^"']*)?)["']/g)].map(m=>clean(m[1]));
const js=[...html.matchAll(/src=["']([^"']*tshop-v[^"']+\.js(?:\?[^"']*)?)["']/g)].map(m=>clean(m[1]));

const allowedCss=new Set([
  '/tshop-v04.css','/tshop-v05.css','/tshop-v06.css','/tshop-v07.css','/tshop-v08.css','/tshop-v09.css',
  '/tshop-v10.css','/tshop-v11.css','/tshop-v12.css','/tshop-v13.css','/tshop-v14.css','/tshop-v15.css','/tshop-v16.css',
  '/tshop-v17.css','/tshop-v18.css','/tshop-v19.css','/tshop-v110.css','/tshop-v111.css','/tshop-v112.css','/tshop-v113.css',
  '/tshop-v114.css','/tshop-v115.css','/tshop-v116.css','/tshop-v117.css','/tshop-v118.css'
]);
const allowedJs=new Set([
  '/tshop-v04.js','/tshop-v05.js','/tshop-v06.js','/tshop-v07.js','/tshop-v08.js','/tshop-v09.js',
  '/tshop-v10.js','/tshop-v11.js','/tshop-v12.js','/tshop-v121.js','/tshop-v13.js','/tshop-v14.js','/tshop-v15.js','/tshop-v16.js',
  '/tshop-v17.js','/tshop-v18.js','/tshop-v19.js','/tshop-v110.js','/tshop-v111.js','/tshop-v112.js','/tshop-v113.js','/tshop-v114.js',
  '/tshop-v161-hotfix.js','/tshop-v115.js','/tshop-v116.js','/tshop-v117.js','/tshop-v118.js'
]);

const unexpectedCss=css.filter(x=>!allowedCss.has(x));
const unexpectedJs=js.filter(x=>!allowedJs.has(x));
if(unexpectedCss.length||unexpectedJs.length){
  console.error('Legacy asset growth detected. New storefront work must use consolidated kch-* assets, not another tshop-v* layer.');
  if(unexpectedCss.length)console.error('Unexpected CSS:',unexpectedCss);
  if(unexpectedJs.length)console.error('Unexpected JS:',unexpectedJs);
  process.exit(1);
}
if(new Set(css).size!==css.length||new Set(js).size!==js.length){
  console.error('Duplicate legacy asset reference detected in public/index.html');
  process.exit(1);
}
console.log(`Legacy storefront asset baseline frozen: ${css.length} CSS / ${js.length} JS references. No new tshop-v* layers allowed.`);
