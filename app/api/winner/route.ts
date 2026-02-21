import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data } = await supabase
    .from("proposals")
    .select("*")
    .order("vote_count", { ascending: false })
    .limit(1)
    .single();

  return Response.json(data);
}
