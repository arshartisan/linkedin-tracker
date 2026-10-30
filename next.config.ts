import { execSync } from "node:child_process";
import type { NextConfig } from "next";

/*
  One id per deploy, inlined into both the client bundle and the server, so an
  open window can ask the server which version is live and offer a reload when
  it's behind (UpdatePrompt.tsx). The commit is stable across build workers,
  unlike a timestamp, which would differ every time this file is evaluated.
*/
function appVersion(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  env: { APP_VERSION: appVersion() },
};

export default nextConfig;
