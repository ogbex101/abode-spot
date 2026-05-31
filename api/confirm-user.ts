// api/confirm-user.ts
// Vercel serverless function — runs server-side only.
// Uses the service role key (never exposed to the browser) to
// mark a newly-registered user's email as confirmed so they can
// sign in immediately without clicking a confirmation link.

import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate env vars are present
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    return new Response(
      JSON.stringify({ error: "Server misconfiguration — missing env vars" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse body
  let userId: string | undefined;
  try {
    const body = await req.json();
    userId = body?.userId;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!userId || typeof userId !== "string") {
    return new Response(JSON.stringify({ error: "Missing or invalid userId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create admin client — service role key bypasses RLS and can update auth.users
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Confirm the user's email
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (error) {
    console.error("Failed to confirm user:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
