'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { TEMA_CSS, FONTES_LINK } from '@/lib/ui/tema';

// Login no tema v3: só tokens, fontes, painel e botão. Não leva dock (ainda não há sessão).
const CSS_LOGIN = `
.login-main{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.login-card{width:340px;max-width:100%;padding:40px 36px;text-align:center}
.login-card img{height:24px;margin-bottom:28px}
.login-card h1{font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:700;margin:0 0 6px;letter-spacing:-0.02em}
.login-card p{font-size:12.5px;color:var(--ink3);margin:0 0 28px}
.login-card .btn{width:100%;height:42px;font-size:13.5px}
.login-card .btn[disabled]{opacity:.6;cursor:not-allowed}
.login-erro{margin:16px 0 0;font-size:12.5px;color:var(--red-ink);background:var(--red-soft);border-radius:10px;padding:10px 12px}
`;

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
    <>
      <div dangerouslySetInnerHTML={{ __html: FONTES_LINK }} />
      <style dangerouslySetInnerHTML={{ __html: TEMA_CSS + CSS_LOGIN }} />
      <main className="login-main">
        <div className="panel login-card">
          <Image src="/logo/moai-logo-black.png" alt="MOAI" width={563} height={181} style={{ width: 'auto' }} unoptimized priority />
          <h1>Painel de CS</h1>
          <p>Acesso restrito à equipe MOAI (@moaiclubedelideres.com)</p>
          <button type="button" className="btn pri" onClick={entrarComGoogle} disabled={loading}>
            {loading ? 'Abrindo o Google…' : 'Entrar com Google'}
          </button>
          {error && <p className="login-erro" role="alert">{error}</p>}
        </div>
      </main>
    </>
  );
}
