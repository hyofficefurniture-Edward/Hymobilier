// Article system adapter.
// Reads content/drafts/*.json, validates slug/route/case-permission constraints,
// then regenerates src/articles.mjs which src/content.mjs and src/content-en.mjs merge in.
//
// Usage: node scripts/apply-articles.mjs
// Fails closed: if permission files are unreadable or any check fails, nothing is written.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const draftsDir = path.join(root, 'content/drafts');
const outFile = path.join(root, 'src/articles.mjs');
const projectLibrary = JSON.parse(fs.readFileSync(path.join(root, 'src/project-library.json'), 'utf8'));

// ---- machine-only permission sources (gitignored, never uploaded) ----
let caseDb = null, blocklist = null;
try {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'content/sources.local.json'), 'utf8'));
  caseDb = JSON.parse(fs.readFileSync(cfg.caseDatabase, 'utf8'));
  blocklist = JSON.parse(fs.readFileSync(cfg.blocklist, 'utf8'));
} catch (e) {
  console.error('ABORT: permission sources unreadable (' + e.message + '). Article generation must not proceed without a case-permission check.');
  process.exit(1);
}

const BLOCKED_NAMES = (blocklist.blocked_cases || []).flatMap(c => [c.internal_name, c.client_name_on_request, ...(c.aliases || [])]).filter(Boolean).map(s => s.toLowerCase());
const caseById = new Map((caseDb.cases || []).map(c => [c.id.toUpperCase(), c]));

// ---- collect existing slugs from source (text scan, avoids import cycles) ----
const frSource = fs.readFileSync(path.join(root, 'src/content.mjs'), 'utf8');
const enSource = fs.readFileSync(path.join(root, 'src/content-en.mjs'), 'utf8');
const existingFrSlugs = new Set([...frSource.matchAll(/slug:'([^']+)'/g)].map(m => m[1]));
const existingRoutes = new Set([...enSource.matchAll(/'([^']+)':'([^']+)'(?=[,}])/g)].map(m => m[1]));
const productsSeg = frSource.slice(frSource.indexOf('export const products'), frSource.indexOf('export const services'));
const collectionIds = new Set([...productsSeg.matchAll(/^\['([a-z0-9-]+)',/gm)].map(m => m[1]));
const articleProjectIds = new Set(projectLibrary.map(c => c.id));

const errors = [];
const warn = [];
const drafts = [];

const files = fs.readdirSync(draftsDir).filter(f => f.endsWith('.json')).sort();
for (const f of files) {
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(draftsDir, f), 'utf8')); }
  catch (e) { errors.push(`${f}: invalid JSON (${e.message})`); continue; }
  drafts.push({ file: f, d });
}

if (!drafts.length) { console.error('ABORT: no drafts found in ' + draftsDir); process.exit(1); }

// ---- per-draft validation ----
const seenFr = new Set(), seenEn = new Set();
const frSlugByFile = new Map(), enSlugByFile = new Map();

for (const { file, d } of drafts) {
  const fr = d.fr || {}, en = d.en || {};
  frSlugByFile.set(file, fr.slug); enSlugByFile.set(file, en.slug);

  const put = (msg) => errors.push(`${file}: ${msg}`);
  if (!fr.slug || !fr.slug.startsWith('ressources/')) put(`fr.slug "${fr.slug}" must start with ressources/`);
  if (!en.slug || !en.slug.startsWith('resources/')) put(`en.slug "${en.slug}" must start with resources/`);
  if (seenFr.has(fr.slug)) put(`duplicate fr.slug ${fr.slug}`); seenFr.add(fr.slug);
  if (seenEn.has(en.slug)) put(`duplicate en.slug ${en.slug}`); seenEn.add(en.slug);
  if (existingFrSlugs.has(fr.slug)) put(`fr.slug ${fr.slug} already exists in src/content.mjs`);
  if (existingRoutes.has(fr.slug)) put(`fr.slug ${fr.slug} already mapped in src/content-en.mjs routes`);
  if ((d.routeMapping || {})[fr.slug] !== en.slug) put(`routeMapping must map "${fr.slug}" -> "${en.slug}"`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.reviewedAt || ''))) put('reviewedAt must be an ISO date (YYYY-MM-DD)');
  if (d.reviewStatus !== 'pending' && d.reviewStatus !== 'approved') put(`reviewStatus "${d.reviewStatus}" must be pending or approved`);
  if (d.status !== 'draft-not-published') put(`status "${d.status}" must remain draft-not-published until release verification`);

  for (const [lang, o] of [['fr', fr], ['en', en]]) {
    for (const k of ['slug', 'title', 'short', 'description', 'intro']) if (!o[k] || typeof o[k] !== 'string') put(`${lang}.${k} missing/empty`);
    if (!Array.isArray(o.sections) || o.sections.length < 3) put(`${lang}.sections needs at least 3 [h2, body] pairs`);
    for (const s of o.sections || []) {
      if (!Array.isArray(s) || s.length !== 2 || !s[0] || !s[1]) { put(`${lang}.sections entries must be [h2, body]`); break; }
    }
    if (!Array.isArray(o.checklist) || o.checklist.length < 4) put(`${lang}.checklist needs at least 4 items`);
  }

  // internal link targets must resolve in the FR content graph (EN links are derived from FR by routes)
  for (const l of fr.links || []) if (!existingFrSlugs.has(l)) put(`fr.links target "${l}" not found in src/content.mjs`);
  const derivedEnLinks = (fr.links || []).map(s => { const m = enSource.match(new RegExp(`'${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':'([^']+)'`)); return m ? m[1] : null; });
  if (derivedEnLinks.includes(null)) put('a fr.links target has no EN route mapping');
  if ((en.links || []).join('|') !== derivedEnLinks.join('|')) put(`en.links should be the derived mapping [${derivedEnLinks.join(', ')}]`);

  for (const p of fr.products || []) if (!collectionIds.has(p)) put(`fr.products "${p}" is not a known collection id`);
  if ((en.products || []).join('|') !== (fr.products || []).join('|')) put('en.products is derived from fr.products; remove the duplicate field');

  if (fr.image && !fs.existsSync(path.join(root, 'public', fr.image))) put(`fr.image "${fr.image}" not present in public/`);
  if (fr.image && (!fr.imageAlt || !fr.imageCaption)) put('an article image requires imageAlt and imageCaption (matching/attributed)');

  // ---- case permission gate ----
  const ids = [...new Set([...(d.caseIds || []), ...(fr.projectLinks || [])])];
  if (!ids.length) put('at least one caseIds entry is required (or an explicit "no case reference" flag)');
  for (const raw of ids) {
    const id = String(raw).toUpperCase();
    const rec = caseById.get(id);
    if (!rec) { put(`case "${raw}" not found in case_study_database.json`); continue; }
    if (BLOCKED_NAMES.some(n => String(rec.name || '').toLowerCase().includes(n))) put(`case "${raw}" name matches a blocklist entry`);
    if (rec.public_level === 'L0') { put(`case "${raw}" is L0 (blocked)`); continue; }
    if (!(rec.allowed_usage || []).includes('L3') && rec.public_level !== 'L3') put(`case "${raw}" is ${rec.public_level}; named project cards require L3`);
    if (!articleProjectIds.has(id.toLowerCase())) put(`case "${raw}" has no page in src/project-library.json`);
  }

  // ---- forbidden-term scan over all user-facing strings ----
  const texts = JSON.stringify([fr, en]);
  for (const bad of BLOCKED_NAMES) if (texts.toLowerCase().includes(bad)) put(`blocked case name "${bad}" appears in the draft text`);
  for (const bad of ['弘业', 'replica', 'knockoff', 'dupe', '高仿', '复刻', '同款']) if (texts.toLowerCase().includes(bad)) put(`forbidden term "${bad}" appears in the draft text`);
}

// cross-draft: en slugs must not collide with each other's fr slugs and vice versa
for (const s of seenFr) if (seenEn.has(s.replace('ressources/', 'resources/'))) warn(`fr slug ${s} mirrors an en slug; verify routes are distinct`);

if (errors.length) {
  console.error('ABORT — ' + errors.length + ' validation error(s):');
  for (const e of errors) console.error('  ✗ ' + e);
  if (warn.length) for (const w of warn) console.error('  ⚠ ' + w);
  process.exit(1);
}

// ---- generate src/articles.mjs ----
const P = v => JSON.stringify(v);
let src = `// AUTO-GENERATED by scripts/apply-articles.mjs — do not edit by hand.\n`;
src += `// Edit content/drafts/*.json instead, then re-run: node scripts/apply-articles.mjs\n`;
src += `// Every entry below passed the case-permission gate (blocklist + case database) on generation.\n\n`;
src += `export const frGuides = [\n`;
for (const { file, d } of drafts) {
  const fr = d.fr;
  const g = {
    slug: fr.slug, title: fr.title, short: fr.short, description: fr.description,
    image: fr.image || undefined, imageAlt: fr.imageAlt, imageCaption: fr.imageCaption,
    intro: fr.intro, sections: fr.sections, checklist: fr.checklist,
    faqs: fr.faqs && fr.faqs.length ? fr.faqs : undefined,
    download: fr.download || undefined, products: fr.products, links: fr.links,
    projectLinks: fr.projectLinks, caseNote: fr.caseNote, reviewedAt: d.reviewedAt
  };
  for (const k of Object.keys(g)) if (g[k] === undefined) delete g[k];
  src += P(g) + ',\n';
}
src += `];\n\n`;
src += `export const enRoutes = {\n`;
for (const { d } of drafts) src += `${P(d.fr.slug)}: ${P(d.en.slug)},\n`;
src += `};\n\n`;
src += `export const enCopy = {\n`;
for (const { d } of drafts) {
  const e = d.en;
  src += `${P(d.fr.slug)}: [${P(e.title)}, ${P(e.short)}, ${P(e.description)}, ${P(e.intro)}, ${P(e.sections)}, ${P(e.checklist)}, ${P(e.faqs || [])}],\n`;
}
src += `};\n\n`;
src += `// per-language overrides applied after the copy tuple (image attribution, case note)\n`;
src += `export const enExtra = {\n`;
for (const { d } of drafts) {
  const e = d.en, extra = {};
  if (e.imageAlt) extra.imageAlt = e.imageAlt;
  if (e.imageCaption) extra.imageCaption = e.imageCaption;
  if (e.caseNote) extra.caseNote = e.caseNote;
  if (Object.keys(extra).length) src += `${P(d.fr.slug)}: ${P(extra)},\n`;
}
src += `};\n`;

fs.writeFileSync(outFile, src);
const n = drafts.length;
console.log(`OK — ${n} article pair(s) validated and written to src/articles.mjs`);
for (const { file, d } of drafts) {
  const ids = [...new Set([...(d.caseIds || []), ...(d.fr.projectLinks || [])])].map(x => {
    const r = caseById.get(String(x).toUpperCase());
    return `${x}(${r ? r.public_level : '?'})`;
  }).join(', ');
  console.log(`  ${d.fr.slug} -> ${d.en.slug} | reviewedAt ${d.reviewedAt} | cases: ${ids || 'none'}`);
}
