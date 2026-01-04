import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dataDir = path.resolve(process.cwd(), "Uploads");
const dbPath = path.join(dataDir, "data.db");

const bin = process.platform === "win32" ? "pocketbase.exe" : "pocketbase";
const binPath = path.resolve(process.cwd(), "bin", bin);

if (!fs.existsSync(binPath)) {
  console.error("PocketBase binary not found. Run npm install again.");
  process.exit(1);
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (fs.existsSync(dbPath)) {
  console.log("PocketBase data.db exists. Applying pending migrations.");
} else {
  console.log("PocketBase data.db missing. Creating and applying migrations.");
}

const result = spawnSync(
  binPath,
  ["migrate", "up", "--dir", "Uploads", "--migrationsDir", "pb_migrations"],
  { stdio: "inherit" }
);

process.exit(result.status ?? 1);
