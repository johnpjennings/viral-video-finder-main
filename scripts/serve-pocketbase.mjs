import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const bin = process.platform === "win32" ? "pocketbase.exe" : "pocketbase";
const binPath = path.resolve(process.cwd(), "bin", bin);
const envPath = path.resolve(process.cwd(), ".env");

const envFromFile = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envFromFile[key] = value;
  }
}

const hasYoutubeKey = Boolean(envFromFile.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY);
console.log(`PocketBase env: YOUTUBE_API_KEY ${hasYoutubeKey ? "set" : "missing"}`);

const child = spawn(binPath, ["serve", "--dir", "Uploads"], {
  stdio: "inherit",
  env: { ...process.env, ...envFromFile },
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
