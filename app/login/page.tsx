'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrarComGoogle() {
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <img src="/logo/moai-logo-black.png" alt="MOAI" style={styles.logo} />
        <h1 style={styles.title}>Painel de CS</h1>
        <p style={styles.subtitle}>Acesso restrito à equipe MOAI (@moaiclubedelideres.com)</p>
        <button style={styles.button} onClick={entrarComGoogle} disabled={loading}>
          {loading ? 'Abrindo o Google…' : 'Entrar com Google'}
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5F5F5',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  card: {
    background: '#fff',
    border: '0.75pt solid #D8D5D5',
    borderRadius: 26,
    padding: '40px 36px',
    width: 320,
    textAlign: 'center',
  },
  logo: { height: 24, marginBottom: 28 },
  title: { fontSize: 20, fontWeight: 800, color: '#1A1A1A', margin: '0 0 6px' },
  subtitle: { fontSize: 12.5, color: '#807E7E', margin: '0 0 28px' },
  button: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '0.75pt solid #D8D5D5',
    background: '#1A1A1A',
    color: '#fff',
    fontWeight: 700,
    fontSize: 13.5,
    cursor: 'pointer',
  },
  error: { fontSize: 12, color: '#C0392B', marginTop: 16 },
};
