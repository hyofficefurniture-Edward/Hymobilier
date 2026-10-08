// Public evidence only: source pages remain the authority for any retrieved answer.
export function knowledge(all, {site, language, updated}) {
  const prefix=language==='en'?'/en/':'/';
  const source=slug=>site+prefix+slug+'/';
  const slugs=new Set(all.map(p=>p.slug));
  return {schemaVersion:2, version:updated, language, organization:'HY Mobilier',
    entries:all.map(p=>({id:p.slug, source:source(p.slug), title:p.title,
      summary:p.intro||p.description, sections:p.sections||[],
      checklist:p.checklist||[], questions:p.questions||[],
      scope:p.category||p.slug.split('/')[0],
      brand:p.source?(p.category==='home'?'Fenmi Casa':'Hongye Furniture Group'):null,
      productReference:p.source||null,
      relatedSources:[...(p.links||[]),...(p.products||[])].map(s=>slugs.has(s)?s:'collections/'+s).filter(s=>slugs.has(s)).map(source),
      updated, visibility:'public'
    }))};
}
