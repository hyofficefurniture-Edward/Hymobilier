import fs from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),directory=path.resolve(root,process.env.PREVIEW_OUTPUT_DIRECTORY||'dist'),base=process.env.PREVIEW_BASE_PATH;
if(fs.existsSync(path.join(root,'public/CNAME')))throw Error('Production custom domain is configured; use root-path production publishing.');
if(!base||!/^\/[A-Za-z0-9_.-]+$/.test(base))throw Error('Set PREVIEW_BASE_PATH to the GitHub project path, for example /hymobilier');
if(directory!==path.join(root,'dist')&&!directory.startsWith(path.join(root,'qa')+path.sep))throw Error('Preview output must stay in dist or task QA directory');
if(directory!==path.join(root,'dist'))fs.cpSync(path.join(root,'dist'),directory,{recursive:true});
for(const file of fs.readdirSync(directory,{recursive:true}).filter(s=>s.endsWith('.html'))){const local=path.join(directory,file);let html=fs.readFileSync(local,'utf8');html=html.replace(/(href|src)="\/(?!\/)/g,`$1="${base}/`).replace('<meta name="viewport"','<meta name="robots" content="noindex,nofollow"><meta name="viewport"');fs.writeFileSync(local,html);}
fs.writeFileSync(path.join(directory,'robots.txt'),'User-agent: *\nDisallow: /\n');console.log('Prepared non-indexable project preview at '+base+'; production canonical preserved.');
