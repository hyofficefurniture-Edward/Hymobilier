import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const supplied=process.argv.find(a=>a.startsWith('--url='));
if(!supplied)throw Error('Supply --url=https://hymobilier.com/ or a local preview URL');
const base=new URL(supplied.slice(6));
if(!['https:','http:'].includes(base.protocol)||base.username||base.password||base.search||base.hash)throw Error('Use a plain HTTP(S) base URL without credentials');
if(!base.pathname.endsWith('/'))base.pathname+='/';
const production=base.hostname==='hymobilier.com';
if(production&&(base.protocol!=='https:'||base.pathname!=='/'))throw Error('Production must use the HTTPS root domain');
const routes=[...fs.readFileSync(path.join(root,'dist/sitemap.xml'),'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
const errors=[];
async function get(route){
  const url=new URL(route.replace(/^\//,''),base);
  const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
  return {response,text:await response.text(),url};
}
let checked=0;
for(let i=0;i<routes.length;i+=6){
  const results=await Promise.allSettled(routes.slice(i,i+6).map(async route=>{
    const {response,text,url}=await get(route);
    if(response.status!==200)throw Error(url+' returned '+response.status);
    if(!text.includes('<html lang="'+(route.startsWith('/en/')?'en':'fr')+'">'))throw Error(url+' incorrect language');
    if(!text.includes('rel="canonical" href="https://hymobilier.com'+route+'"'))throw Error(url+' incorrect canonical');
    if(production&&(/<meta[^>]+name="robots"[^>]+noindex/i.test(text)||/noindex/i.test(response.headers.get('x-robots-tag')||'')))throw Error(url+' blocks indexing');
    if(!text.includes('hreflang="fr"')||!text.includes('hreflang="en"'))throw Error(url+' missing language alternatives');
    if(route==='/contact/'||route==='/en/contact/'){
      if(!text.includes('id="project-form"')||!text.includes('mailto:hy@hysdfurniture.com')||!text.includes('wa.me/8613702279783'))throw Error(url+' missing inquiry controls');
    }
  }));
  for(const result of results)if(result.status==='fulfilled')checked++;else errors.push(String(result.reason));
}
for(const route of ['/styles.css','/site.js','/sitemap.xml','/robots.txt','/knowledge.json','/en/knowledge.json','/downloads/liste-mobilier-hotel.csv','/downloads/en-liste-mobilier-hotel.csv']){
  try{
    const {response,text}=await get(route);
    if(response.status!==200)throw Error(route+' returned '+response.status);
    if(production&&route==='/robots.txt'&&/Disallow:\s*\/\s*$/mi.test(text))throw Error('Production robots blocks all crawling');
    if(route.endsWith('knowledge.json')&&JSON.parse(text).entries.length!==30)throw Error(route+' unexpected public knowledge count');
  }catch(error){errors.push(String(error));}
}
try{const {response}=await get('/release-check-missing-page/');if(response.status!==404)errors.push('Missing page must return HTTP 404');}catch(error){errors.push(String(error));}
const report={checkedAt:new Date().toISOString(),base:base.href,production,pagesChecked:checked,errors,
  limits:'Does not prove mail delivery, DNS ownership, legal compliance, search indexing or live RAG answer quality.'};
fs.mkdirSync(path.join(root,'qa'),{recursive:true});
fs.writeFileSync(path.join(root,'qa/release-audit.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
if(errors.length)process.exit(1);
