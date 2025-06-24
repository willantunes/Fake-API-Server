/**
 * deps.ts - Central file for managing dependencies
 */

// Export Deno types without importing missing modules
export type Kv = Deno.Kv;

// Export other common utilities
export { 
  join, 
  dirname 
} from "https://deno.land/std@0.193.0/path/mod.ts";

export {
  basename
} from "https://deno.land/std@0.193.0/path/mod.ts";

export {
  Status,
  STATUS_TEXT
} from "https://deno.land/std@0.193.0/http/http_status.ts";

export {
  encode as encodeBase64,
  decode as decodeBase64
} from "https://deno.land/std@0.193.0/encoding/base64.ts";

export {
  format as formatDate
} from "https://deno.land/std@0.193.0/datetime/format.ts";

export { parse as parseYaml } from "https://deno.land/std@0.193.0/yaml/mod.ts"; 