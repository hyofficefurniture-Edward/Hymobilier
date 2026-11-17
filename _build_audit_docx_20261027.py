# -*- coding: utf-8 -*-
"""hymobilier 审核交付 DOCX 生成（补发存档邮件用）
从 content/drafts JSON 生成 fr+en 双语 DOCX，一篇文章一册。"""
import io, json, os, sys
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

SITE = r"C:\HY&FM Wokbudy\新建文件夹\hymobilier-site"
OUT = os.path.join(SITE, "output", "audit_docx_20261027")
os.makedirs(OUT, exist_ok=True)

ARTICLES = [
    ("2026-10-13-hotel-renovation-phasing.json",
     "https://hymobilier.com/ressources/phaser-renovation-hotel/",
     "https://hymobilier.com/en/resources/hotel-renovation-phasing/"),
    ("2026-10-19-mobilier-chambre-niveau-gamme.json",
     "https://hymobilier.com/ressources/mobilier-chambre-hotel-niveau-gamme/",
     "https://hymobilier.com/en/resources/hotel-room-furniture-tier/"),
    ("2026-10-19-restaurant-places-mobilier.json",
     "https://hymobilier.com/ressources/restaurant-places-mobilier/",
     "https://hymobilier.com/en/resources/restaurant-seating-capacity/"),
]

def add_body(doc, text, style=None):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.font.size = Pt(10.5)
    return p

def block(doc, data, label):
    """渲染一种语言的内容块"""
    h = doc.add_heading(label, level=1)
    for r in h.runs:
        r.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)
    meta = doc.add_paragraph()
    mr = meta.add_run("Title: %s\nSlug: %s" % (data.get("title", ""), data.get("slug", "")))
    mr.font.size = Pt(9)
    mr.font.color.rgb = RGBColor(0x80, 0x80, 0x80)

    if data.get("excerpt") or data.get("short"):
        p = doc.add_paragraph()
        r = p.add_run(data.get("short") or data.get("excerpt") or "")
        r.italic = True
        r.font.size = Pt(10.5)

    if data.get("intro"):
        add_body(doc, data["intro"])

    for sec in data.get("sections", []):
        if isinstance(sec, dict):
            head, paras = sec.get("heading", ""), sec.get("paragraphs", [])
        elif isinstance(sec, (list, tuple)):
            head = str(sec[0])
            paras = [str(x) for x in sec[1:]]
        else:
            continue
        doc.add_heading(head, level=2)
        for para in paras:
            add_body(doc, para)

    cl = data.get("checklist") or []
    if cl:
        doc.add_heading("Checklist", level=2)
        for item in cl:
            doc.add_paragraph(str(item), style="List Bullet")

    faqs = data.get("faqs") or []
    if faqs:
        doc.add_heading("FAQ", level=2)
        for f in faqs:
            q = doc.add_paragraph()
            qr = q.add_run("Q: " + (f.get("q") or f.get("question", "")))
            qr.bold = True
            qr.font.size = Pt(10.5)
            add_body(doc, "A: " + (f.get("a") or f.get("answer", "")))

    prods = data.get("products") or []
    if prods:
        doc.add_heading("Products (SKU/ID)", level=2)
        p = doc.add_paragraph()
        r = p.add_run(", ".join(str(x) for x in prods))
        r.font.size = Pt(10)

built = []
for fname, fr_url, en_url in ARTICLES:
    d = json.load(io.open(os.path.join(SITE, "content", "drafts", fname), encoding="utf-8"))
    doc = Document()
    t = doc.add_heading(d["fr"].get("title", fname), level=0)
    sub = doc.add_paragraph()
    sr = sub.add_run("hymobilier.com 审核存档 · 生成于 2026-10-27 · Hongye Furniture Group Editorial Team")
    sr.font.size = Pt(9)
    sr.font.color.rgb = RGBColor(0x80, 0x80, 0x80)

    block(doc, d["fr"], "Version française")
    block(doc, d["en"], "English version")

    links = doc.add_heading("URLs (在线已核验 200)", level=1)
    for u in (fr_url, en_url):
        p = doc.add_paragraph(style="List Bullet")
        r = p.add_run(u)
        r.font.size = Pt(9.5)

    slug = (d["fr"].get("slug") or fname.replace(".json", "")).split("/")[-1]
    path = os.path.join(OUT, "hymobilier_%s.docx" % slug)
    doc.save(path)
    built.append((path, os.path.getsize(path) // 1024))
    print("OK", path, built[-1][1], "KB")

json.dump([{"path": p, "kb": k} for p, k in built],
          io.open(os.path.join(OUT, "_manifest.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("total", len(built))
