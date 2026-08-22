import json
import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "owden-godson-mwangama-cv.pdf"


def load_json(name):
    with (ROOT / "content" / name).open(encoding="utf-8") as handle:
        return json.load(handle)


site = load_json("site.json")
research = load_json("research.json")
projects = load_json("projects.json")
speaking = load_json("speaking.json")
output = research["outputs"][0]


def ascii_text(value):
    replacements = {
        "–": "-",
        "—": "-",
        "‑": "-",
        "·": " | ",
        "’": "'",
        "“": '"',
        "”": '"',
        "…": "...",
    }
    text = str(value)
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text


INK = colors.HexColor("#172523")
MUTED = colors.HexColor("#596462")
ACCENT = colors.HexColor("#155f5b")
BRONZE = colors.HexColor("#9a653d")
RULE = colors.HexColor("#cfc7ba")
PAPER = colors.HexColor("#f7f4ee")

styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="CVName",
        parent=styles["Title"],
        fontName="Times-Roman",
        fontSize=27,
        leading=29,
        textColor=INK,
        alignment=TA_LEFT,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="CVRole",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=ACCENT,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="CVIntro",
        parent=styles["Normal"],
        fontName="Times-Roman",
        fontSize=11,
        leading=15,
        textColor=INK,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="CVSection",
        parent=styles["Heading2"],
        fontName="Times-Bold",
        fontSize=15,
        leading=18,
        textColor=INK,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        name="CVItem",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=10.3,
        leading=13,
        textColor=INK,
        spaceAfter=2,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        name="CVMeta",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=ACCENT,
        spaceAfter=2,
    )
)
styles.add(
    ParagraphStyle(
        name="CVBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.3,
        leading=11.3,
        textColor=MUTED,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="CVSmall",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.2,
        leading=9.7,
        textColor=MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="CVCenter",
        parent=styles["CVSmall"],
        alignment=TA_CENTER,
    )
)


def p(text, style="CVBody"):
    return Paragraph(ascii_text(text), styles[style])


def section(title):
    return [
        Spacer(1, 2),
        Paragraph(ascii_text(title), styles["CVSection"]),
        HRFlowable(width="100%", thickness=0.65, color=RULE, spaceAfter=7),
    ]


def record(period, title, organization, summary):
    left = p(period, "CVMeta")
    right = [p(title, "CVItem"), p(organization, "CVMeta")]
    if summary:
        right.append(p(summary, "CVBody"))
    table = Table([[left, right]], colWidths=[1.12 * inch, 5.55 * inch], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return KeepTogether([table])


def project_record(item):
    details = item.get("cvSummary", f"{item['role']}. {item['system']} {item['outcome']}")
    return record(item["group"], item["title"], "Selected system or intervention", details)


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.5)
    canvas.line(doc.leftMargin, 0.48 * inch, width - doc.rightMargin, 0.48 * inch)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(doc.leftMargin, 0.29 * inch, ascii_text(site["name"]))
    canvas.drawRightString(width - doc.rightMargin, 0.29 * inch, f"Curriculum vitae | {doc.page}")
    canvas.restoreState()


class CVDocTemplate(BaseDocTemplate):
    def afterPage(self):
        pass


OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = CVDocTemplate(
    str(OUTPUT),
    pagesize=letter,
    leftMargin=0.68 * inch,
    rightMargin=0.68 * inch,
    topMargin=0.6 * inch,
    bottomMargin=0.63 * inch,
    title=ascii_text(f"{site['name']} - Curriculum Vitae"),
    author=ascii_text(site["name"]),
    subject="Machine learning engineering, independent research, and technology entrepreneurship",
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
doc.addPageTemplates([PageTemplate(id="cv", frames=[frame], onPage=header_footer)])

story = [
    Paragraph(ascii_text(site["name"]), styles["CVName"]),
    Paragraph(ascii_text(site["roles"]), styles["CVRole"]),
    Paragraph(ascii_text(site["statement"]), styles["CVIntro"]),
    Paragraph(
        f'<link href="{site["links"]["github"]}" color="#155f5b">github.com/owgee</link>'
        f' &nbsp;&nbsp;|&nbsp;&nbsp; <link href="{site["links"]["linkedin"]}" color="#155f5b">linkedin.com/in/owden-godson</link>',
        styles["CVSmall"],
    ),
]

story += section("Profile")
story.append(
    p(
        "Tanzanian-born machine learning engineer, independent researcher, and technology entrepreneur based in Atlanta. Work spanning production agentic systems, AI evaluation, data platforms, digital public infrastructure, and technology ventures serving institutions and communities in Africa. Current independent research focuses on evidence governance, auditability, and authority boundaries in persistent agent change."
    )
)

story += section("Selected research")
story.append(record(output["statusDate"], output["title"], f"{output['status']} | Phase I anchored to {output['architectureVersion']}", output["summary"]))
story.append(p("Phase I is an architecture-and-methods contribution. Phase II longitudinal empirical evaluation from v0.11 or a versioned successor remains future work.", "CVSmall"))

story += section("Professional experience")
for item in site["experience"]:
    story.append(record(item["period"], item["role"], item["organization"], item["summary"]))

story += section("Education")
for item in site["education"]:
    story.append(record(item["year"], item["credential"], item["institution"], item["detail"]))
for item in site["certificates"]:
    certificate_detail = item.get("detail", "Professional certificate")
    if item.get("href"):
        certificate_detail += f'<br/><link href="{item["href"]}" color="#155f5b">View verified credential</link>'
    story.append(record(item["year"], item["credential"], item["institution"], certificate_detail))

story += section("Selected systems and projects")
for item in [project for project in projects if project.get("featured") and project.get("cvFeatured", True)]:
    story.append(project_record(item))

story += section("Speaking, mentorship, and international engagement")
for item in [entry for entry in speaking if entry.get("cvFeatured", True)]:
    story.append(record(item["year"], item["institution"], f"{item['role']} | {item['subject']}", item["detail"]))

story += section("Leadership and advisory work")
story.append(
    p(
        "Founder, Owden Consulting; co-founder and board advisor, EMET Healthcare; former co-founder and Chief Creative Officer, INETS; co-founder, ShuleSoft."
    )
)

story += section("Selected recognition")
for recognition in site["recognition"]:
    story.append(p(f'<b>{recognition["title"]}</b> - {recognition["detail"]}', "CVBody"))

story += section("Technical capabilities")
for group in site["capabilities"]:
    story.append(p(group["label"], "CVItem"))
    story.append(p(" | ".join(group["items"]), "CVBody"))

doc.build(story)
print(f"Created {OUTPUT}")
