import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (name) =>
  JSON.parse(await readFile(path.join(root, "content", name), "utf8"));

const [site, research, projects, speaking] = await Promise.all([
  readJson("site.json"),
  readJson("research.json"),
  readJson("projects.json"),
  readJson("speaking.json")
]);

const output = research.outputs[0];
const currentYear = new Date().getFullYear();
const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const escapeXml = escapeHtml;
const isExternal = (href = "") => /^https?:\/\//.test(href);
const hrefFrom = (href, prefix = "") => (isExternal(href) || href.startsWith("#") ? href : `${prefix}${href}`);
const linkClass = (href) => (isExternal(href) ? "" : "internal-link");

const navItems = [
  ["Home", "", "home"],
  ["Research", "research/", "research"],
  ["Publications", "publications/", "publications"],
  ["Projects", "projects/", "projects"],
  ["Speaking", "speaking/", "speaking"],
  ["About", "about/", "about"],
  ["CV", "cv/", "cv"]
];

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  url: `${site.baseUrl}/`,
  image: `${site.baseUrl}/${site.photo}`,
  jobTitle: ["Machine Learning Engineer", "Independent Researcher", "Technology Entrepreneur"],
  sameAs: Object.values(site.links),
  alumniOf: site.education.map((item) => ({
    "@type": "EducationalOrganization",
    name: item.institution
  })),
  knowsAbout: research.areas
};

const renderHeader = (prefix, current) => `
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <header class="site-header">
    <div class="nav-shell">
      <a class="wordmark" href="${prefix}" aria-label="${escapeHtml(site.name)} — home">
        ${escapeHtml(site.name)} <span class="wordmark-mark">OGM</span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-navigation" data-nav-toggle>
        <span class="visually-hidden">Toggle navigation</span>
        <span class="nav-toggle-line"></span><span class="nav-toggle-line"></span><span class="nav-toggle-line"></span>
      </button>
      <nav class="site-nav" id="site-navigation" aria-label="Primary navigation" data-site-nav>
        <ul>
          ${navItems
            .map(
              ([label, href, key]) => `<li><a href="${prefix}${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a></li>`
            )
            .join("")}
        </ul>
      </nav>
    </div>
  </header>`;

const renderFooter = (prefix) => `
  <footer class="site-footer">
    <div class="shell">
      <div class="footer-grid">
        <div>
          <p class="footer-title">${escapeHtml(site.name)}</p>
          <p>${escapeHtml(site.statement)}</p>
        </div>
        <div class="footer-links" aria-label="Professional links">
          <a href="${site.links.github}" target="_blank">GitHub</a>
          <a href="${site.links.linkedin}" target="_blank">LinkedIn</a>
          <a href="${prefix}feed.xml">Atom feed</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${currentYear} ${escapeHtml(site.name)}</span>
        <span>Independent research and professional work; employer endorsement is not implied.</span>
      </div>
    </div>
  </footer>`;

const renderPage = ({
  title,
  description,
  pathname,
  prefix = "",
  current,
  content,
  schema = personSchema,
  ogType = "website"
}) => {
  const canonical = `${site.baseUrl}${pathname}`;
  const fullTitle = title === site.name ? title : `${title} · ${site.name}`;
  const schemas = Array.isArray(schema) ? schema : [schema];
  const document = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="${escapeHtml(site.name)}">
  <meta name="theme-color" content="#f4f0e8">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" type="application/atom+xml" title="${escapeHtml(site.name)} research outputs" href="${site.baseUrl}/feed.xml">
  <link rel="icon" href="${prefix}owgee.png" type="image/png">
  <link rel="stylesheet" href="${prefix}assets/css/site.css">
  <meta property="og:type" content="${ogType}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${site.baseUrl}/${site.photo}">
  <meta property="og:image:alt" content="Portrait of ${escapeHtml(site.name)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${schemas.map((entry) => `<script type="application/ld+json">${JSON.stringify(entry)}</script>`).join("\n  ")}
  <script src="${prefix}assets/js/site.js" defer></script>
</head>
<body>
${renderHeader(prefix, current)}
<main id="main-content">
${content}
</main>
${renderFooter(prefix)}
</body>
</html>`;
  return document.replace(/[ \t]+\n/g, "\n");
};

const sectionHeading = (kicker, title, copy = "") => `
  <div class="section-heading">
    <p class="section-kicker">${escapeHtml(kicker)}</p>
    <div><h2>${escapeHtml(title)}</h2>${copy ? `<p>${escapeHtml(copy)}</p>` : ""}</div>
  </div>`;

const pageHero = (kicker, title, lede, meta = "") => `
  <section class="page-hero">
    <div class="shell page-hero-grid">
      <p class="section-kicker">${escapeHtml(kicker)}</p>
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p class="lede">${escapeHtml(lede)}</p>
        ${meta}
      </div>
    </div>
  </section>`;

const linksFor = (item, prefix = "") => {
  const links = [];
  if (item.href) links.push(`<a class="${linkClass(item.href)}" href="${hrefFrom(item.href, prefix)}"${isExternal(item.href) ? ' target="_blank"' : ""}>${escapeHtml(item.linkLabel || "Learn more")}</a>`);
  if (item.secondaryHref) links.push(`<a href="${item.secondaryHref}" target="_blank">${escapeHtml(item.secondaryLabel || "Related link")}</a>`);
  return links.length ? `<div class="link-row">${links.join("")}</div>` : "";
};

const homeContent = `
  <section class="hero">
    <div class="shell hero-grid">
      <div>
        <p class="eyebrow">Tanzania · Atlanta · Independent inquiry</p>
        <h1>${escapeHtml(site.name)}</h1>
        <p class="hero-role">${escapeHtml(site.roles)}</p>
        <p class="hero-statement">${escapeHtml(site.statement)}</p>
        <div class="actions">
          <a class="button" href="research/">Explore research</a>
          <a class="button button-secondary" href="projects/">View selected work</a>
          <a class="button button-secondary" href="output/pdf/owden-godson-mwangama-cv.pdf" download>Download CV</a>
        </div>
      </div>
      <figure class="portrait-frame">
        <img src="${site.photo}" width="300" height="294" alt="Portrait of ${escapeHtml(site.name)}">
        <figcaption>Machine learning engineering · independent research · public-interest technology</figcaption>
      </figure>
    </div>
  </section>

  <section class="section" aria-labelledby="research-focus-heading">
    <div class="shell">
      ${sectionHeading("01 · Research focus", "Governable systems that can be examined, challenged, and improved.", "Research centered on the evidence and authority boundaries that make autonomous systems accountable in practice.")}
      <h2 class="visually-hidden" id="research-focus-heading">Research focus areas</h2>
      <ol class="research-focus">
        ${research.areas.map((area, index) => `<li><span class="list-number">0${index + 1}</span>${escapeHtml(area)}</li>`).join("")}
      </ol>
    </div>
  </section>

  <section class="section section-soft" aria-labelledby="featured-research">
    <div class="shell">
      ${sectionHeading("02 · Featured research", "EvoHakiki", "A two-phase program on auditable, evidence-governed agent evolution.")}
      <article class="feature-panel">
        <div class="feature-panel-aside">
          <span class="status">${escapeHtml(output.status)}</span>
          <p>Developed through ${escapeHtml(output.architectureVersion)} under the historical project name ${escapeHtml(output.historicalName)}.</p>
        </div>
        <div class="feature-panel-body">
          <h3 id="featured-research">${escapeHtml(output.title)}</h3>
          <p>${escapeHtml(output.summary)}</p>
          <p class="boundary-note">Phase I is an architecture-and-methods contribution. Longitudinal capability improvement and safety claims remain questions for Phase II.</p>
          <div class="text-links">
            <a class="arrow-link internal-link" href="research/evohakiki/">Explore the research program</a>
            <a class="arrow-link internal-link" href="publications/evohakiki/">Read the output record</a>
          </div>
        </div>
      </article>
    </div>
  </section>

  <section class="section" aria-labelledby="selected-work-heading">
    <div class="shell">
      ${sectionHeading("03 · Selected systems", "Systems built for institutions, public services, and production use.", "Work across research, production AI, digital public infrastructure, and entrepreneurship.")}
      <h2 class="visually-hidden" id="selected-work-heading">Selected work</h2>
      <ol class="editorial-list">
        ${projects.filter((item) => item.featured && item.title !== "EvoHakiki" && item.homepageFeatured !== false).slice(0, 4).map((item, index) => `
          <li class="editorial-item">
            <div><span class="list-number">0${index + 1}</span><span class="group-label">${escapeHtml(item.group)}</span></div>
            <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.system)}</p>${linksFor(item)}</div>
          </li>`).join("")}
      </ol>
      <p class="text-links"><a class="arrow-link internal-link" href="projects/">View all selected projects</a></p>
    </div>
  </section>

  <section class="section section-soft" aria-labelledby="home-speaking-heading">
    <div class="shell">
      ${sectionHeading("04 · Scholarly engagement", "Speaking, mentorship, and international engagement.", "Talks, workshops, and mentorship connecting production practice, international learning, and technology education.")}
      <h2 class="visually-hidden" id="home-speaking-heading">Selected speaking engagements</h2>
      <ol class="editorial-list">
        ${speaking.filter((item) => item.featured).slice(0, 3).map((item, index) => `
          <li class="editorial-item">
            <div><span class="list-number">0${index + 1}</span><span class="group-label">${escapeHtml(item.year)}</span></div>
            <div><h3>${escapeHtml(item.institution)}</h3><p class="meta-line">${escapeHtml(item.role)} · ${escapeHtml(item.subject)}</p><p>${escapeHtml(item.detail)}</p>${linksFor(item)}</div>
          </li>`).join("")}
      </ol>
      <p class="text-links"><a class="arrow-link internal-link" href="speaking/">View speaking and teaching</a></p>
    </div>
  </section>

  <section class="section" aria-labelledby="home-about-heading">
    <div class="shell prose-grid">
      <p class="section-kicker">05 · Biography</p>
      <div class="prose">
        <h2 id="home-about-heading">Research informed by systems that must work beyond the lab.</h2>
        <p>Owden Godson Mwangama is a Tanzanian-born machine learning engineer, independent researcher, and technology entrepreneur based in Atlanta. His work connects computer science and statistics, graduate training in business analytics, production machine-learning engineering, and the delivery of technology for institutions and communities in Africa.</p>
        <p>His current independent research asks how persistent agent change can remain auditable, contestable, and subject to human authority.</p>
        <div class="text-links">
          <a class="arrow-link internal-link" href="about/">Read the full biography</a>
          <a class="arrow-link" href="${site.links.github}" target="_blank">GitHub</a>
          <a class="arrow-link" href="${site.links.linkedin}" target="_blank">LinkedIn</a>
        </div>
      </div>
    </div>
  </section>`;

const researchContent = `
  ${pageHero("Research", "Governable AI systems", "Research on agentic AI, evaluation, persistent change, and the evidence and authority structures required for trustworthy autonomy.")}
  <section class="section">
    <div class="shell prose-grid">
      <p class="section-kicker">Research thesis</p>
      <div class="prose">
        <blockquote class="pull-quote">${escapeHtml(research.thesis[0])}</blockquote>
        <p>${escapeHtml(research.thesis[1])}</p>
      </div>
    </div>
  </section>
  <section class="section section-soft">
    <div class="shell">
      ${sectionHeading("Current program", "EvoHakiki", output.summary)}
      <article class="feature-panel">
        <div class="feature-panel-aside"><span class="status">${escapeHtml(output.status)}</span><p>${escapeHtml(output.researchArea)}</p></div>
        <div class="feature-panel-body">
          <h3>${escapeHtml(output.title)}</h3>
          <p>Phase I is anchored exactly to ${escapeHtml(output.architectureVersion)}. Phase II begins from v0.11 or an explicitly versioned successor and remains future work.</p>
          <div class="text-links"><a class="arrow-link internal-link" href="evohakiki/">Research program and phase boundaries</a><a class="arrow-link internal-link" href="../publications/evohakiki/">Output record and abstract</a></div>
        </div>
      </article>
    </div>
  </section>
  <section class="section">
    <div class="shell">
      ${sectionHeading("Research areas", "Questions under active investigation")}
      <ol class="research-focus">${research.areas.map((area, index) => `<li><span class="list-number">0${index + 1}</span>${escapeHtml(area)}</li>`).join("")}</ol>
    </div>
  </section>`;

const phaseList = (items) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

const evoResearchContent = `
  ${pageHero("Featured research program", output.title, output.summary, `<div class="text-links"><span class="status">${escapeHtml(output.status)}</span><span class="status">Phase I · ${escapeHtml(output.architectureVersion)}</span></div>`)}
  <section class="section">
    <div class="shell prose-grid">
      <aside>
        <p class="section-kicker">Program lineage</p>
        <p>Developed through ${escapeHtml(output.architectureVersion)} under the historical project name <strong>${escapeHtml(output.historicalName)}</strong>.</p>
      </aside>
      <div class="prose">
        <h2>Research proposition</h2>
        <p>${escapeHtml(research.thesis[0])}</p>
        <p>${escapeHtml(research.thesis[1])}</p>
        <div class="notice"><p><strong>Evidence boundary:</strong> Phase I describes architecture and methods. It does not establish longitudinal improvement, metacognition, complete containment, or safe autonomous promotion.</p></div>
      </div>
    </div>
  </section>
  <section class="section section-soft">
    <div class="shell">
      ${sectionHeading("Two-phase program", "Architecture first; empirical claims only after matched evaluation.")}
      <div class="phase-grid">
        <article class="phase phase-boundary">
          <span class="status">${escapeHtml(output.phaseOne.status)}</span>
          <h2>${escapeHtml(output.phaseOne.label)}</h2>
          <p class="meta-line">${escapeHtml(output.phaseOne.version)}</p>
          <h3>Focus</h3>${phaseList(output.phaseOne.focus)}
          <h3>Claim boundaries</h3>${phaseList(output.phaseOne.boundaries)}
        </article>
        <article class="phase">
          <span class="status">${escapeHtml(output.phaseTwo.status)}</span>
          <h2>${escapeHtml(output.phaseTwo.label)}</h2>
          <p class="meta-line">${escapeHtml(output.phaseTwo.version)}</p>
          <h3>Planned evaluation</h3>${phaseList(output.phaseTwo.focus)}
          <p class="boundary-note">Preliminary v0.11 observations will not be presented as Phase I evidence or completed empirical results.</p>
        </article>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="shell prose-grid">
      <p class="section-kicker">Research resources</p>
      <div>
        <ul class="resource-list">
          <li><span>Manuscript</span><span class="resource-state">In preparation</span></li>
          <li><span>PDF</span><span class="resource-state">Not yet released</span></li>
          <li><span>DOI / Zenodo</span><span class="resource-state">Not yet assigned</span></li>
          <li><span>Source repository</span><span class="resource-state">Not yet supplied</span></li>
          <li><span>Reproducibility artifacts</span><span class="resource-state">Not yet released</span></li>
          <li><span>Recommended citation</span><span class="resource-state">Not yet finalized</span></li>
          <li><span>Version history</span><span class="resource-state">v0.10.0 Phase I anchor · v0.11+ planned Phase II</span></li>
        </ul>
        <div class="text-links"><a class="arrow-link internal-link" href="../../publications/evohakiki/">Read the research-output record and complete abstract</a></div>
      </div>
    </div>
  </section>`;

const groupedOutputs = research.outputs.reduce((groups, item) => {
  groups[item.category] ??= [];
  groups[item.category].push(item);
  return groups;
}, {});

const publicationsContent = `
  ${pageHero("Research outputs", "Publications", "An index of published work, preprints, technical reports, and manuscripts, labeled by current status.")}
  <section class="section">
    <div class="shell">
      <div class="notice"><p>Unreleased work is not described as published. DOI, PDF, citation, and repository links appear only after those resources exist.</p></div>
      ${Object.entries(groupedOutputs).map(([category, items]) => `
        <section class="group" aria-labelledby="${category.toLowerCase().replaceAll(" ", "-")}">
          <div class="group-heading"><span class="group-label">Output status</span><h2 id="${category.toLowerCase().replaceAll(" ", "-")}">${escapeHtml(category)}</h2></div>
          <ol class="project-list">
            ${items.map((item) => `<li class="output-item"><div><span class="status">${escapeHtml(item.status)}</span><p>${escapeHtml(item.statusDate)}</p></div><div><h3><a href="${item.slug}/">${escapeHtml(item.title)}</a></h3><p>${item.authors.map(escapeHtml).join(", ")}</p><p>${escapeHtml(item.summary)}</p><a class="arrow-link internal-link" href="${item.slug}/">Full output record</a></div></li>`).join("")}
          </ol>
        </section>`).join("")}
    </div>
  </section>`;

const outputSchema = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: output.title,
  author: output.authors.map((name) => ({ "@type": "Person", name })),
  url: `${site.baseUrl}/publications/${output.slug}/`,
  dateModified: "2026-08-22",
  creativeWorkStatus: output.status,
  abstract: output.abstract.join(" "),
  about: output.researchArea
};

const outputContent = `
  ${pageHero("Research output", output.title, output.summary, `<div class="page-meta"><p><span class="meta-label">Authors</span><strong>${output.authors.map(escapeHtml).join(", ")}</strong></p><p><span class="meta-label">Status</span><strong>${escapeHtml(output.status)}</strong></p><p><span class="meta-label">Status date</span><strong>${escapeHtml(output.statusDate)}</strong></p></div>`)}
  <section class="section">
    <div class="shell prose-grid">
      <aside>
        <p class="section-kicker">Research area</p><p>${escapeHtml(output.researchArea)}</p>
        <p class="section-kicker">Architecture anchor</p><p>${escapeHtml(output.architectureVersion)}</p>
      </aside>
      <article class="prose">
        <h2>Abstract</h2>
        ${output.abstract.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        <h2>Availability and citation</h2>
        <ul class="resource-list">
          <li><span>Recommended citation</span><span class="resource-state">Not yet finalized</span></li>
          <li><span>DOI</span><span class="resource-state">Not yet assigned</span></li>
          <li><span>Direct PDF</span><span class="resource-state">Not yet released</span></li>
          <li><span>Source and artifacts</span><span class="resource-state">Not yet supplied</span></li>
        </ul>
        <h2>Version and correction information</h2>
        <ul>
          ${output.versions.map((item) => `<li><strong>${escapeHtml(item.version)}:</strong> ${escapeHtml(item.role)}</li>`).join("")}
        </ul>
        <p>No corrections have been posted because the manuscript has not been released. When a searchable-text PDF becomes available, this page is prepared to add direct PDF, DOI, citation, and Highwire Press metadata without changing its permanent URL.</p>
        <div class="notice"><p>This manuscript-in-preparation record intentionally uses <code>CreativeWork</code>, not <code>ScholarlyArticle</code>, and does not emit Highwire citation tags. Released-paper metadata will be enabled only after a genuine paper and searchable-text PDF exist.</p></div>
        <div class="text-links"><a class="arrow-link internal-link" href="../../research/evohakiki/">Research program and phase boundaries</a></div>
      </article>
    </div>
  </section>`;

const projectGroups = [...new Set(projects.map((item) => item.group))];
const projectsContent = `
  ${pageHero("Selected work", "Projects", "Research systems, production AI and data work, digital public infrastructure, and entrepreneurship.")}
  <section class="section">
    <div class="shell">
      ${projectGroups.map((group, groupIndex) => `
        <section class="group" aria-labelledby="project-group-${groupIndex}">
          <div class="group-heading"><span class="group-label">0${groupIndex + 1}</span><h2 id="project-group-${groupIndex}">${escapeHtml(group)}</h2></div>
          <ol class="project-list">
            ${projects.filter((item) => item.group === group).map((item) => `
              <li class="project-item">
                <div><span class="status">${escapeHtml(item.role)}</span></div>
                <article>
                  <h3>${escapeHtml(item.title)}</h3>
                  <div class="project-facts">
                    <div><span class="meta-label">Problem</span><p>${escapeHtml(item.problem)}</p></div>
                    <div><span class="meta-label">System or intervention</span><p>${escapeHtml(item.system)}</p></div>
                    <div><span class="meta-label">Role</span><p>${escapeHtml(item.role)}</p></div>
                    <div><span class="meta-label">Outcome or significance</span><p>${escapeHtml(item.outcome)}</p></div>
                  </div>
                  ${linksFor(item, "../")}
                </article>
              </li>`).join("")}
          </ol>
        </section>`).join("")}
    </div>
  </section>`;

const speakingContent = `
  ${pageHero("Scholarly engagement", "Speaking and international engagement", "Talks, mentorship, workshops, and international seminars in technology, education, and sustainable development.")}
  <section class="section">
    <div class="shell">
      <ol class="engagement-list">
        ${speaking.map((item, index) => `<li class="engagement"><div><span class="list-number">0${index + 1}</span><span class="status">${escapeHtml(item.year)}</span></div><article><h2>${escapeHtml(item.institution)}</h2><p class="meta-line">${escapeHtml(item.role)} · ${escapeHtml(item.subject)}</p><p>${escapeHtml(item.detail)}</p>${linksFor(item)}</article></li>`).join("")}
      </ol>
    </div>
  </section>`;

const aboutContent = `
  ${pageHero("Biography", "About", "A career connecting Tanzania and Atlanta, technical systems and institutional impact, and production engineering with independent research.")}
  <section class="section">
    <div class="shell prose-grid">
      <p class="section-kicker">Narrative</p>
      <article class="prose">
        <h2>Systems, institutions, and accountable change.</h2>
        <p>Owden Godson Mwangama is a Tanzanian-born machine learning engineer, independent researcher, and technology entrepreneur based in Atlanta. He earned a Bachelor of Science with Computer Science, with Honours, Second Class (Upper Division), from the University of Dar es Salaam. Graduate study in business analytics at Emory University later added deeper work in machine learning, data systems, distributed computing, and organizational decision-making.</p>
        <p>His engineering work spans production machine-learning and agentic systems, data platforms, payment infrastructure, and digital services for institutions and communities. In Tanzania, he has contributed to technology ventures in education, healthcare, government services, and climate-smart agriculture. In the United States, he works on production machine-learning systems while continuing independent research.</p>
        <p>That research examines governable autonomy: how agents can propose persistent change while evidence, adjudication, and external-action authority remain inspectable and separable. The goal is not autonomy as spectacle, but systems whose behavior and evolution can be audited, challenged, and responsibly governed.</p>
        <p>Speaking, mentorship, advisory work, and educational outreach extend the same concern: technology should create durable institutional and public value, with claims proportionate to the evidence available.</p>
        <div class="text-links"><a class="arrow-link" href="${site.links.github}" target="_blank">GitHub</a><a class="arrow-link" href="${site.links.linkedin}" target="_blank">LinkedIn</a><a class="arrow-link internal-link" href="../cv/">Curriculum vitae</a></div>
      </article>
    </div>
  </section>`;

const timelineItems = (items, yearKey, titleKey, orgKey, detailKey) => `<ol class="timeline">${items.map((item) => `<li><${yearKey === "period" ? "span" : "time"}>${escapeHtml(item[yearKey])}</${yearKey === "period" ? "span" : "time"}><div><h3>${escapeHtml(item[titleKey])}</h3><p class="meta-line">${escapeHtml(item[orgKey])}</p>${item[detailKey] ? `<p>${escapeHtml(item[detailKey])}</p>` : ""}${linksFor(item)}</div></li>`).join("")}</ol>`;

const cvContent = `
  ${pageHero("Curriculum vitae", site.name, site.roles, `<div class="actions no-print"><a class="button" href="../output/pdf/owden-godson-mwangama-cv.pdf" download>Download PDF</a><button class="button button-secondary" type="button" onclick="window.print()">Print this page</button></div>`)}
  <section class="section">
    <div class="shell">
      <div class="cv-header"><h2>Selected research</h2><span class="status">${escapeHtml(output.status)}</span></div>
      <article class="output-item"><div><span class="meta-label">${escapeHtml(output.statusDate)}</span></div><div><h3><a href="../publications/evohakiki/">${escapeHtml(output.title)}</a></h3><p>${escapeHtml(output.summary)}</p></div></article>
    </div>
  </section>
  <section class="section section-soft"><div class="shell"><div class="cv-header"><h2>Professional experience</h2></div>${timelineItems(site.experience, "period", "role", "organization", "summary")}</div></section>
  <section class="section"><div class="shell"><div class="cv-header"><h2>Education</h2></div>${timelineItems(site.education, "year", "credential", "institution", "detail")}<div class="cv-header" style="margin-top: 4rem"><h2>Certificates</h2></div>${timelineItems(site.certificates, "year", "credential", "institution", "detail")}</div></section>
  <section class="section section-soft"><div class="shell"><div class="cv-header"><h2>Selected systems and projects</h2></div><ol class="editorial-list">${projects.filter((item) => item.featured).map((item, index) => `<li class="editorial-item"><div><span class="list-number">${String(index + 1).padStart(2, "0")}</span><span class="group-label">${escapeHtml(item.group)}</span></div><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.system)}</p></div></li>`).join("")}</ol></div></section>
  <section class="section"><div class="shell"><div class="cv-header"><h2>Speaking, mentorship, and international engagement</h2></div><ol class="timeline">${speaking.map((item) => `<li><time>${escapeHtml(item.year)}</time><div><h3>${escapeHtml(item.institution)}</h3><p class="meta-line">${escapeHtml(item.role)} · ${escapeHtml(item.subject)}</p></div></li>`).join("")}</ol></div></section>
  <section class="section section-soft"><div class="shell prose-grid"><p class="section-kicker">Leadership and advisory</p><div class="prose"><p>Founder of Owden Consulting; co-founder and board advisor at EMET Healthcare; former co-founder and Chief Creative Officer at INETS; co-founder of ShuleSoft.</p><h2>Selected recognition</h2><ul>${site.recognition.map((item) => `<li><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.detail)}</li>`).join("")}</ul></div></div></section>
  <section class="section"><div class="shell"><div class="cv-header"><h2>Technical capabilities</h2></div><div class="phase-grid">${site.capabilities.map((group) => `<div class="phase"><h3>${escapeHtml(group.label)}</h3><ul class="tag-list">${group.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`).join("")}</div></div></section>
  <section class="section section-soft"><div class="shell prose-grid"><p class="section-kicker">Professional identifiers</p><div><ul class="resource-list"><li><span>GitHub</span><a href="${site.links.github}" target="_blank">@owgee</a></li><li><span>LinkedIn</span><a href="${site.links.linkedin}" target="_blank">Owden Godson</a></li></ul></div></div></section>`;

const notFoundContent = `
  <section class="error-page">
    <div class="shell">
      <p class="eyebrow">Page not found</p>
      <h1>404</h1>
      <p>The requested page may have moved. Research outputs and project records remain available through the permanent indexes.</p>
      <div class="actions" style="justify-content:center"><a class="button" href="/">Return home</a><a class="button button-secondary" href="/research/">Explore research</a></div>
    </div>
  </section>`;

const pages = [
  ["index.html", renderPage({ title: site.name, description: site.description, pathname: "/", current: "home", content: homeContent, ogType: "profile" })],
  ["research/index.html", renderPage({ title: "Research", description: "Research by Owden Godson Mwangama on agentic AI, evaluation, trustworthy AI, governable autonomy, and evidence governance.", pathname: "/research/", prefix: "../", current: "research", content: researchContent })],
  ["research/evohakiki/index.html", renderPage({ title: "EvoHakiki research program", description: output.summary, pathname: "/research/evohakiki/", prefix: "../../", current: "research", content: evoResearchContent })],
  ["publications/index.html", renderPage({ title: "Publications", description: "Research-output index for Owden Godson Mwangama with precise status labels and permanent records.", pathname: "/publications/", prefix: "../", current: "publications", content: publicationsContent })],
  ["publications/evohakiki/index.html", renderPage({ title: output.title, description: output.summary, pathname: "/publications/evohakiki/", prefix: "../../", current: "publications", content: outputContent, schema: [personSchema, outputSchema] })],
  ["projects/index.html", renderPage({ title: "Projects", description: "Selected research systems, production AI, data platforms, digital public infrastructure, and social-impact technology by Owden Godson Mwangama.", pathname: "/projects/", prefix: "../", current: "projects", content: projectsContent })],
  ["speaking/index.html", renderPage({ title: "Speaking", description: "Selected speaking, teaching, mentorship, and educational outreach by Owden Godson Mwangama.", pathname: "/speaking/", prefix: "../", current: "speaking", content: speakingContent })],
  ["about/index.html", renderPage({ title: "About", description: site.description, pathname: "/about/", prefix: "../", current: "about", content: aboutContent, ogType: "profile" })],
  ["cv/index.html", renderPage({ title: "Curriculum vitae", description: `Accessible curriculum vitae for ${site.name}.`, pathname: "/cv/", prefix: "../", current: "cv", content: cvContent, ogType: "profile" })],
  ["404.html", renderPage({ title: "Page not found", description: `The requested page was not found on ${site.name}'s website.`, pathname: "/404.html", prefix: "/", content: notFoundContent })]
];

for (const [relativePath, html] of pages) {
  const destination = path.join(root, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${html}\n`);
}

const sitemapPaths = ["/", "/research/", "/research/evohakiki/", "/publications/", "/publications/evohakiki/", "/projects/", "/speaking/", "/about/", "/cv/"];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPaths.map((item) => `  <url><loc>${site.baseUrl}${item}</loc></url>`).join("\n")}
</urlset>\n`;

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${site.baseUrl}/sitemap.xml\n`;
const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(site.name)} · Research outputs</title>
  <id>${site.baseUrl}/publications/</id>
  <link href="${site.baseUrl}/feed.xml" rel="self"/>
  <link href="${site.baseUrl}/publications/"/>
  <updated>2026-08-22T00:00:00Z</updated>
  <author><name>${escapeXml(site.name)}</name></author>
  <entry>
    <title>${escapeXml(output.title)}</title>
    <id>${site.baseUrl}/publications/${output.slug}/</id>
    <link href="${site.baseUrl}/publications/${output.slug}/"/>
    <updated>2026-08-22T00:00:00Z</updated>
    <category term="${escapeXml(output.status)}"/>
    <summary>${escapeXml(output.summary)}</summary>
  </entry>
</feed>\n`;

await Promise.all([
  writeFile(path.join(root, "sitemap.xml"), sitemap),
  writeFile(path.join(root, "robots.txt"), robots),
  writeFile(path.join(root, "feed.xml"), feed)
]);

console.log(`Built ${pages.length} HTML pages plus sitemap.xml, robots.txt, and feed.xml.`);
