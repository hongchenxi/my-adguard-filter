import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const assetsDir = path.join(root, "assets");
const categoriesDir = path.join(root, "categories");
const distDir = path.join(root, "dist");

const headerPath = path.join(assetsDir, "header.txt");
const outputPath = path.join(distDir, "my-filter.txt");
const ublockPath = path.join(distDir, "ublock.txt");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function formatDateForVersion(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes())
  );
}

function formatDateForHeader(date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return `${map.day} ${map.month} ${map.year} ${map.hour}:${map.minute}`;
}

function readHeader() {
  const now = new Date();
  const version = formatDateForVersion(now);
  const lastModified = formatDateForHeader(now);

  return fs
    .readFileSync(headerPath, "utf8")
    .replaceAll("{{VERSION}}", version)
    .replaceAll("{{LAST_MODIFIED}}", lastModified);
}

function collectCategoryFiles() {
  return fs
    .readdirSync(categoriesDir)
    .filter((name) => name.endsWith(".txt"))
    .sort();
}

function buildMainFilter() {
  const files = collectCategoryFiles();
  const header = readHeader();

  let body = "";
  for (const file of files) {
    if (file === "ublock.txt") continue;
    const fullPath = path.join(categoriesDir, file);
    const content = fs.readFileSync(fullPath, "utf8").trim();
    if (!content) continue;
    body += `\n! ===== ${file} =====\n`;
    body += content + "\n";
  }

  const ublockDirective = `
!#if ext_ublock
!#include ublock.txt
!#endif
`.trim();

  return `${header}\n\n${body}\n${ublockDirective}\n`;
}

function copyUblockFile() {
  const src = path.join(categoriesDir, "ublock.txt");
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, ublockPath);
  }
}

function main() {
  ensureDir(distDir);
  const finalText = buildMainFilter();
  fs.writeFileSync(outputPath, finalText, "utf8");
  copyUblockFile();
  console.log("Build complete:", outputPath);
}

main();
