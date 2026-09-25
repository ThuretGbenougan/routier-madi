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

function runBun(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.platform === "win32" ? "bun.exe" : "bun", args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`bun exited with code ${code ?? "unknown"}`));
    });
  });
}

function requireEnvironment(names, operation) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required when ${operation}.`);
  }
}

const isProduction = process.env.VERCEL_ENV === "production";
const runMigration = process.env.RUN_MIGRATION === "true" && isProduction;
const runSeed = process.env.RUN_SEED === "true" && isProduction;

if (runMigration) {
  requireEnvironment(["DIRECT_URL"], "RUN_MIGRATION=true in a production Vercel deployment");
  console.log("Running Prisma production migration.");
  await run("prisma", ["migrate", "deploy"]);
} else {
  console.log("Prisma migration skipped. Set RUN_MIGRATION=true only for the Vercel Production environment.");
}

await run("prisma", ["generate"]);

if (runSeed) {
  requireEnvironment(
    ["DATABASE_URL", "SESSION_SECRET", "DEMO_PASSWORD"],
    "RUN_SEED=true in a production Vercel deployment",
  );
  console.log("Running one-time demo database seed. Existing demo data will be replaced.");
  await runBun(["prisma/seed.ts"]);
} else {
  console.log("Demo seed skipped. Set RUN_SEED=true only for one Vercel Production deployment.");
}

await run("vite", ["build"]);
