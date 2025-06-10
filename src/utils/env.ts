/**
 * env.ts - unified environment loader for local development and Deno Deploy
 */
import { config as loadEnv } from "../deps.ts";

let fileEnv: Record<string, string>;
try {
  fileEnv = await loadEnv();
} catch {
  fileEnv = {};
}

// In Deno Deploy, environment variables are provided via Deno.env
const denoEnv = Deno.env.toObject();

// Merge .env file values first, then runtime env overrides
export const env: Record<string, string> = {
  ...fileEnv,
  ...denoEnv,
}; 