import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const roots=['public','functions','tests'];
const files=[];
function walk(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(/\.(?:js|mjs)$/.test(entry.name))files.push(p)}}
roots.forEach(walk);files.sort();
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0){process.stderr.write(`Syntax check failed: ${file}\n${r.stderr||r.stdout}`);process.exit(r.status||1)}}
console.log(`syntax check: OK (${files.length} files)`);
