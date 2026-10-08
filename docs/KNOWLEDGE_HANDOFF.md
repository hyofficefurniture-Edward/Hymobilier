# Public knowledge handoff

The French `/knowledge.json` and English `/en/knowledge.json` exports contain 30 public entries each, derived from the same source copy as the website. They include summaries, sections, procurement checklists, product discussion questions, product references, business scope and related source URLs. This export is a retrieval input; a live chatbot and model service are not connected.

## Retrieval and answer rules

1. Select the visitor's language and keep French and English sources separate. Prefer the market page for destination questions, a service page for supply responsibilities, and a product page for product selection.
2. Split sections into chunks while retaining `id`, `source`, `language`, `updated`, `scope` and the section heading. Keep product references and questions attached to the relevant product entry.
3. Answer only from retrieved public evidence and cite the source page. A procurement question is a point to confirm with the team, never an established specification.
4. If evidence is missing, ask for the project brief and refer the visitor to the contact page. Do not infer prices, stock, minimum order quantities, lead times, certification, warranties or local installation capacity.
5. Keep visual references distinct from verified delivered projects. No published entry establishes a local French factory or shop.
6. Customer drawings, quotations, names and order documents do not belong in this public export. A future private retrieval service requires access controls and an agreed retention policy.

## Acceptance examples for a future retrieval service

| Visitor question | Evidence and expected behaviour |
| --- | --- |
| What information is needed for a hotel furniture request? | Hotel project page and hotel procurement guide; cite plans, quantities and documented scope. |
| Can I buy residential furniture through Fenmi Casa? | Residential pages and relevant home collection; distinguish the residential brief from professional procurement. |
| What is the price or lead time of this hotel room set? | Product page gives discussion questions; request quantities, dimensions and finishes, and refer to the team for confirmation. |
| Is on-site installation included in Morocco? | Morocco and delivery pages; responsibilities are defined in the agreed scope. |
| Have you delivered this photographed interior in France? | Reference page; image is a group visual reference, not a verified local delivery claim. |

## Verified export status

On 2026-10-09, both languages were checked against their generated visible page text: 285 evidence fields per language and 66 related source URLs per language passed. Each language contains 10 product entries. Local QA reports are excluded from version control and deployment. These checks confirm public evidence alignment, not live model answer accuracy or search-engine inclusion.

Refresh the export by running the normal build after approved content edits. Advance the content modification date only when page copy changes. Public canonical source URLs refer to the intended production domain; production availability remains a separate deployment check.
