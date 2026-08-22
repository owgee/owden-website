# Owden Godson Mwangama — personal website

Static, dependency-free website for `owden.site`, generated from structured content and designed for GitHub Pages.

## Local workflow

```bash
npm run build
npm run check
python3 -m http.server 4173
```

`npm test` rebuilds the generated HTML and runs the full local validation suite.

## Content model

- `content/site.json` — canonical identity, education, experience, capabilities, and recognition
- `content/research.json` — research areas and output records
- `content/projects.json` — curated project records
- `content/speaking.json` — speaking, teaching, and mentorship records
- `scripts/build.mjs` — static page, metadata, sitemap, robots, and Atom generation
- `scripts/build_cv_pdf.py` — downloadable CV PDF generation
- `scripts/check.mjs` — metadata, local-link, image, scholarly-status, and required-file checks

Generated HTML is committed so search engines and GitHub Pages can serve all core content without client-side JavaScript.

## Publication status

EvoHakiki is currently represented as a manuscript in preparation. Its permanent output page intentionally omits Highwire Press metadata and `ScholarlyArticle` JSON-LD until a genuine released paper and searchable-text PDF exist. Add finalized DOI, citation, PDF, repository, and artifact links to `content/research.json`, then update the generator to emit released-paper metadata.

## Deployment

The existing `CNAME` and static GitHub Pages architecture are preserved. Deployment is intentionally not performed by the build or check scripts.
