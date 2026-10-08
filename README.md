# HY Mobilier

French project furniture site for hymobilier.com. Professional Hongye and residential Fenmi Casa paths are separate.

French content is at the root; 42 complete English equivalents are under `/en/`. Country-specific France and Morocco project pages share this domain. Each page has reciprocal language alternatives and a matching language switch.

## Build

Requires Node 22 or later; no package installation is needed.

```sh
npm run build
npm run check
npm run dev
```

Content lives in `src/content.mjs`. Assets and blank procurement templates live in `public/`. Selected asset provenance is recorded in `docs/asset-provenance.json`; source specifications, certificates, prices, guarantees and local case claims are intentionally not imported.

English copy and route mapping live in `src/content-en.mjs`. The build produces a public knowledge export from the same page copy, keeping internal customer documents and quotations out of this export.

The contact flow prepares a real email in the visitor's mail client, or downloads the brief. It does not claim server delivery. Do not replace this with a fake success message; a future backend must verify delivery, destination and privacy terms.

Deployment uses GitHub Pages. Configure the custom domain only after repository authorization, domain verification and DNS readiness. Never publish secrets in this repository.

Until the repository variable `PRODUCTION_DOMAIN` is set to `hymobilier.com`, CI prepares a non-indexable project-path preview so CSS, images and links work on the default GitHub Pages address. Set that variable only after configuring and verifying the production domain, then redeploy. The production build itself remains indexable; local checks apply to it before preview transformation.

Content modification dates come from src/release.mjs and remain stable across deployment runs. Update them when public content changes. Article publication dates are omitted until actual publication is verified.
