import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const assetsDir = path.join(root, "assets");
const categoriesDir = path.join(root, "categories");
const distDir = path.join(root, "dist");

const headerPath = path.join(assetsDir, "header.txt");
const outputPath = path.join(distDir, "my-filter.txt");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatVersion(date) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return `${map.year}${map.month}${map.day}${map.hour}${map.minute}`;
}

function formatLastModified(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return `${map.weekday}, ${map.day} ${map.month} ${map.year} ${map.hour}:${map.minute}:${map.second} +0700`;
}

function readHeader() {
  const now = new Date();
  const header = fs.readFileSync(headerPath, "utf8");

  return header
    .replaceAll("{{VERSION}}", formatVersion(now))
    .replaceAll("{{LAST_MODIFIED}}", formatLastModified(now));
}

function getCategoryFiles() {
  if (!fs.existsSync(categoriesDir)) {
    return [];
  }

  return fs
    .readdirSync(categoriesDir)
    .filter((file) => file.endsWith(".txt"))
    .sort((a, b) => a.localeCompare(b));
}

function isEmpty(line) {
  return line.trim() === "";
}

function isComment(line) {
  return line.trim().startsWith("!");
}

function normalizeLine(line) {
  return line.trim();
}

function build() {
  ensureDir(distDir);

  const header = readHeader();
  const files = getCategoryFiles();
  const seenRules = new Set();

  const sections = [];

  for (const file of files) {
    const filePath = path.join(categoriesDir, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/);

    const sectionLines = [];
    let hasRealRule = false;

    for (const line of lines) {
      if (isEmpty(line)) continue;

      const normalized = normalizeLine(line);

      if (isComment(normalized)) {
        sectionLines.push(normalized);
        continue;
      }

      if (seenRules.has(normalized)) {
        continue;
      }

      seenRules.add(normalized);
      sectionLines.push(normalized);
      hasRealRule = true;
    }

    if (sectionLines.length > 0) {
      const block = [`! ===== ${file} =====`, ...sectionLines].join("\n");
      sections.push(block);

      if (!hasRealRule) {
        console.warn(`Warning: ${file} has no actual rules, only comments.`);
      }
    }
  }

  const output = [header, "", ...sections].join("\n\n").trim() + "\n";

  fs.writeFileSync(outputPath, output, "utf8");

  console.log(`Built: ${outputPath}`);
  console.log(`Files: ${files.length}`);
  console.log(`Unique rules: ${seenRules.size}`);
}

build();
