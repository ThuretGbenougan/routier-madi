import { spawn } from "node:child_process";
import { join } from "node:path";

function localBinary(name) {
  return join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? `${name}.exe` : name);
}

function run(name, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(localBinary(name), args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} exited with code ${code ?? "unknown"}`));
    });
  });
}

const runMigration = process.env.RUN_MIGRATION === "true" && process.env.VERCEL_ENV === "production";

if (runMigration) {
  if (!process.env.DIRECT_URL) {
    throw new Error("DIRECT_URL is required when RUN_MIGRATION=true in a production Vercel deployment.");
  }
  console.log("Running Prisma production migration.");
  await run("prisma", ["migrate", "deploy"]);
} else {
  console.log("Prisma migration skipped. Set RUN_MIGRATION=true only for the Vercel Production environment.");
}

await run("prisma", ["generate"]);
await run("vite", ["build"]);
