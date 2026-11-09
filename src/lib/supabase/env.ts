export function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Variáveis SUPABASE_URL e SUPABASE_ANON_KEY não configuradas.",
    );
  }

  return { url, anonKey };
}
