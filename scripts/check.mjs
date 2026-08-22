import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = [
  "index.html",
  "research/index.html",
  "research/evohakiki/index.html",
  "publications/index.html",
  "publications/evohakiki/index.html",
  "projects/index.html",
  "speaking/index.html",
  "about/index.html",
  "cv/index.html",
  "404.html"
];

const errors = [];
const stripSuffix = (value) => value.split("#")[0].split("?")[0];

for (const relativePath of htmlFiles) {
  const filePath = path.join(root, relativePath);
  const html = await readFile(filePath, "utf8");
  const required = ["<title>", 'name="description"', 'rel="canonical"', "<main", "application/ld+json"];
  for (const token of required) {
    if (!html.includes(token)) errors.push(`${relativePath}: missing ${token}`);
  }

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) errors.push(`${relativePath}: duplicate IDs ${[...new Set(duplicateIds)].join(", ")}`);

  for (const match of html.matchAll(/<(?:a|link|script|img)\b[^>]*(?:href|src)="([^"]+)"/g)) {
    const value = stripSuffix(match[1]);
    if (!value || value.startsWith("http") || value.startsWith("mailto:") || value.startsWith("data:")) continue;
    const absolute = value.startsWith("/") ? path.join(root, value) : path.resolve(path.dirname(filePath), value);
    let candidate = absolute;
    if (value.endsWith("/") || path.extname(value) === "") candidate = path.join(absolute, "index.html");
    try {
      await access(candidate);
    } catch {
      errors.push(`${relativePath}: broken local reference ${match[1]}`);
    }
  }

  for (const image of html.matchAll(/<img\b([^>]*)>/g)) {
    if (!/\balt="[^"]*"/.test(image[1])) errors.push(`${relativePath}: image missing alt text`);
    if (!/\bwidth="\d+"/.test(image[1]) || !/\bheight="\d+"/.test(image[1])) errors.push(`${relativePath}: image missing intrinsic dimensions`);
  }
}

for (const requiredFile of ["robots.txt", "sitemap.xml", "feed.xml", "CNAME", "output/pdf/owden-godson-mwangama-cv.pdf"]) {
  try {
    await access(path.join(root, requiredFile));
  } catch {
    errors.push(`missing required file ${requiredFile}`);
  }
}

const outputPage = await readFile(path.join(root, "publications/evohakiki/index.html"), "utf8");
if (outputPage.includes('name="citation_')) errors.push("manuscript-in-preparation page must not emit Highwire citation tags");
if (outputPage.includes('"@type":"ScholarlyArticle"')) errors.push("unreleased manuscript must not claim ScholarlyArticle schema");
if (!outputPage.includes("<h2>Abstract</h2>")) errors.push("output page is missing a visible abstract heading");

if (errors.length) {
  console.error(errors.map((error) => `• ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML pages: metadata, IDs, local links, images, scholarly status, and site files are valid.`);
