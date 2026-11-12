// Reexporta as regras de eventos, cuja fonte única fica junto das Edge Functions (Deno e Node usam o mesmo arquivo).
export * from '../supabase/functions/_shared/eventos';
