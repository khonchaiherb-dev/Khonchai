import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const publicDir=fileURLToPath(new URL('../public/',import.meta.url));
const clean=v=>String(v).split('?')[0].replace(/^https?:\/\/[^/]+/,'');
const allowed=new Set([
  '/tshop-v04.css','/tshop-v04.js','/tshop-v05.css','/tshop-v05.js','/tshop-v06.css','/tshop-v06.js',
  '/tshop-v07.css','/tshop-v07.js','/tshop-v08.css','/tshop-v08.js','/tshop-v09.css','/tshop-v09.js',
  '/tshop-v10.css','/tshop-v10.js','/tshop-v11.css','/tshop-v11.js','/tshop-v12.css','/tshop-v12.js','/tshop-v121.js',
  '/tshop-v13.css','/tshop-v13.js','/tshop-v14.css','/tshop-v14.js','/tshop-v15.css','/tshop-v15.js',
  '/tshop-v16.css','/tshop-v16.js','/tshop-v161-hotfix.js','/tshop-v17.css','/tshop-v17.js','/tshop-v18.css','/tshop-v18.js',
  '/tshop-v19.css','/tshop-v19.js','/tshop-v110.css','/tshop-v110.js','/tshop-v111.css','/tshop-v111.js',
  '/tshop-v112.css','/tshop-v112.js','/tshop-v113.css','/tshop-v113.js','/tshop-v114.css','/tshop-v114.js',
  '/tshop-v115.css','/tshop-v115.js','/tshop-v116.css','/tshop-v116.js','/tshop-v117.css','/tshop-v117.js',
  '/tshop-v118.css','/tshop-v118.js','/tshop-v119.css','/tshop-v119.js','/tshop-v120.css','/tshop-v120.js',
  '/tshop-v120-customer.css','/tshop-v124-readable-thai.css','/tshop-v125-nav-dedupe.css',
  '/tshop-v126-footer-readable.css','/tshop-v127-footer-premium.css','/tshop-v128-future-standard.css',
  '/tshop-v129-readable-future.css','/tshop-v130-koonchaishop.css','/tshop-v131-top-conversion.css',
  '/tshop-v132-conversion-storefront.css','/tshop-v1321-search-visibility-fix.css','/tshop-v133-readable-storefront.css',
  '/tshop-v134-structural-storefront.css','/tshop-v1341-header-dedupe.css','/tshop-v135-lower-standard.css'
]);

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(p));
    else if(/\.(?:html|js|css)$/i.test(entry.name))out.push(p);
  }
  return out;
}

const refs=[];
for(const file of walk(publicDir)){
  const text=fs.readFileSync(file,'utf8');
  const rel=path.relative(publicDir,file).replaceAll('\\','/');
  for(const match of text.matchAll(/(?:^|["'`(=\s])((?:\/)?tshop-v[0-9A-Za-z-]+\.(?:css|js)(?:\?[^"'`\s)]*)?)/g)){
    const ref=clean(match[1].startsWith('/')?match[1]:`/${match[1]}`);
    refs.push({file:rel,ref});
  }
}

const unexpected=refs.filter(x=>!allowed.has(x.ref));
if(unexpected.length){
  console.error('Legacy asset growth detected. New storefront work must use consolidated kch-* modules; no new tshop-v* layer is allowed.');
  for(const x of unexpected)console.error(`${x.file}: ${x.ref}`);
  process.exit(1);
}

const html=fs.readFileSync(path.join(publicDir,'index.html'),'utf8');
const staticRefs=[...html.matchAll(/(?:href|src)=["']([^"']*tshop-v[^"']+\.(?:css|js)(?:\?[^"']*)?)["']/g)].map(m=>clean(m[1]));
if(new Set(staticRefs).size!==staticRefs.length){
  console.error('Duplicate legacy asset reference detected in public/index.html');
  process.exit(1);
}

const revenueFiles=['kch-revenue-core.js'];
for(const name of revenueFiles){
  if(!fs.existsSync(path.join(publicDir,name)))throw new Error(`Missing consolidated storefront module: ${name}`);
}
console.log(`Legacy asset contract frozen across ${walk(publicDir).length} storefront source files (${refs.length} references checked). New work must use kch-* modules.`);
