import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client — stores session in both localStorage AND cookies so server actions can verify auth
export const supabase = createBrowserClient(url, key);
