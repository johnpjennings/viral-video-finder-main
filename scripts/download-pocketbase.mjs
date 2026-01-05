import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import https from "node:https";
import AdmZip from "adm-zip";

const VERSION = "0.24.0";

const platform = process.platform;
const arch = process.arch;

const platformMap = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows",
};

const archMap = {
  x64: "amd64",
  arm64: "arm64",
};

const mappedPlatform = platformMap[platform];
const mappedArch = archMap[arch];

if (!mappedPlatform || !mappedArch) {
  console.error(`Unsupported platform/arch: ${platform}/${arch}`);
  process.exit(1);
}

const binaryName = platform === "win32" ? "pocketbase.exe" : "pocketbase";
const binDir = path.resolve(process.cwd(), "bin");
const targetPath = path.join(binDir, binaryName);
const legacyPath = path.resolve(process.cwd(), binaryName);
const metaPath = path.join(binDir, ".pocketbase.json");

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

if (!fs.existsSync(targetPath) && fs.existsSync(legacyPath)) {
  fs.renameSync(legacyPath, targetPath);
}

const expectedMeta = {
  version: VERSION,
  platform: mappedPlatform,
  arch: mappedArch,
  binaryName,
};

function readMeta() {
  if (!fs.existsSync(metaPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(metaPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isMetaMatch(meta) {
  if (!meta) return false;
  return (
    meta.version === expectedMeta.version &&
    meta.platform === expectedMeta.platform &&
    meta.arch === expectedMeta.arch &&
    meta.binaryName === expectedMeta.binaryName
  );
}

function writeMeta() {
  fs.writeFileSync(metaPath, `${JSON.stringify(expectedMeta, null, 2)}\n`);
}

if (fs.existsSync(targetPath)) {
  const meta = readMeta();
  if (isMetaMatch(meta)) {
    if (platform !== "win32") {
      fs.chmodSync(targetPath, 0o755);
    }
    console.log(`${binaryName} already exists and matches this platform. Skipping download.`);
    process.exit(0);
  }

  console.log(
    meta
      ? "Existing PocketBase binary does not match this platform. Re-downloading."
      : "Existing PocketBase binary has unknown platform metadata. Re-downloading.",
  );
}

const fileName = `pocketbase_${VERSION}_${mappedPlatform}_${mappedArch}.zip`;
const url = `https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/${fileName}`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pocketbase-"));
const zipPath = path.join(tmpDir, fileName);

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error("Download failed: too many redirects"));
      return;
    }

    https
      .get(url, (res) => {
        const status = res.statusCode || 0;
        const location = res.headers.location;

        if ([301, 302, 303, 307, 308].includes(status) && location) {
          res.resume();
          download(location, dest, redirects + 1).then(resolve).catch(reject);
          return;
        }

        if (status !== 200) {
          reject(new Error(`Download failed: ${status}`));
          return;
        }

        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => reject(err));
  });
}

async function main() {
  console.log(`Downloading PocketBase ${VERSION}...`);
  await download(url, zipPath);

  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const binaryEntry = entries.find((entry) => entry.entryName === binaryName);

  if (!binaryEntry) {
    throw new Error(`Could not find ${binaryName} in archive.`);
  }

  zip.extractEntryTo(binaryEntry, binDir, false, true, false, binaryName);

  if (platform !== "win32") {
    fs.chmodSync(targetPath, 0o755);
  }

  writeMeta();
  console.log(`PocketBase installed at ${targetPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
