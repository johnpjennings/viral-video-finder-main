import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase client with service role
export function getSupabaseClient() {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
}

// Verify session token from Authorization header
export async function verifySession(req: Request): Promise<{ valid: boolean; error?: Response }> {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      valid: false,
      error: new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }
  
  const token = authHeader.replace("Bearer ", "");
  
  if (!token || token.length !== 64) { // Our tokens are 64 hex chars
    return {
      valid: false,
      error: new Response(
        JSON.stringify({ error: "Invalid token format" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }
  
  const supabase = getSupabaseClient();
  
  const { data: session, error } = await supabase
    .from("sessions")
    .select("id, expires_at")
    .eq("token", token)
    .neq("user_agent", "failed_attempt") // Exclude failed attempt markers
    .maybeSingle();
  
  if (error) {
    console.error("Session verification error:", error);
    return {
      valid: false,
      error: new Response(
        JSON.stringify({ error: "Session verification failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }
  
  if (!session) {
    return {
      valid: false,
      error: new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }
  
  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    return {
      valid: false,
      error: new Response(
        JSON.stringify({ error: "Session expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }
  
  return { valid: true };
}
