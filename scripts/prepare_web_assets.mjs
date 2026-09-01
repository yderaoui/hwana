import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const STAGE = path.join(ROOT, ".public-build");
const CATALOG = path.join(ROOT, "src", "data", "catalog.json");
const CAMPAIGN_MEDIA = path.join(ROOT, "src", "data", "campaign-media.json");
const ASSET_PATTERN = /\/assets\/[A-Za-z0-9._~!$&()+,;=@%/-]+\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm|woff2?|ttf|otf)/gi;


function nestedStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(nestedStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(nestedStrings);
  return [];
}


function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const current = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(current);
    return /\.(?:css|ts|tsx)$/i.test(entry.name) ? [current] : [];
  });
}


function runtimeAssetPaths() {
  const assets = new Set();
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  for (const product of catalog) {
    for (const color of product.colors ?? []) {
      if (color.image) assets.add(color.image);
      if (color.lifestyleImage) assets.add(color.lifestyleImage);
    }
    if (typeof product.fallbackImage === "string") assets.add(product.fallbackImage);
  }

  const campaign = JSON.parse(fs.readFileSync(CAMPAIGN_MEDIA, "utf8"));
  for (const value of nestedStrings(campaign)) {
    if (value.startsWith("/assets/")) assets.add(value);
  }

  const textFiles = [path.join(ROOT, "index.html"), ...sourceFiles(path.join(ROOT, "src"))];
  for (const source of textFiles) {
    const matches = fs.readFileSync(source, "utf8").match(ASSET_PATTERN) ?? [];
    for (const asset of matches) assets.add(asset);
  }
  return assets;
}


fs.rmSync(STAGE, { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });

let copied = 0;
let totalBytes = 0;
const missing = [];
for (const asset of [...runtimeAssetPaths()].sort()) {
  const source = path.resolve(PUBLIC, asset.replace(/^\//, ""));
  if (!source.startsWith(PUBLIC + path.sep) || !fs.existsSync(source) || !fs.statSync(source).isFile()) {
    missing.push(asset);
    continue;
  }
  const destination = path.join(STAGE, asset.replace(/^\//, ""));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  copied += 1;
  totalBytes += fs.statSync(source).size;
}

for (const entry of fs.readdirSync(PUBLIC, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const source = path.join(PUBLIC, entry.name);
  fs.copyFileSync(source, path.join(STAGE, entry.name));
  copied += 1;
  totalBytes += fs.statSync(source).size;
}

if (missing.length) throw new Error(`Missing runtime assets:\n${missing.join("\n")}`);
console.log(JSON.stringify({
  files: copied,
  sizeMB: Number((totalBytes / 1024 / 1024).toFixed(2)),
  stage: STAGE,
}));
