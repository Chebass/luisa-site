import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Private pages and availability read fresh Supabase data; no ISR store is needed.
export default defineCloudflareConfig();
