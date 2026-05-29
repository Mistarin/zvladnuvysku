import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

let publicServerClient: ReturnType<typeof createClient<Database>> | null = null;

export function createPublicServerClient() {
  if (publicServerClient) {
    return publicServerClient;
  }

  publicServerClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return publicServerClient;
}
