const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';

// CSP conservadora, mas compatível com o restante do app: o dashboard (app/dashboard-html.ts) e
// a página de login usam <script>/<style> inline, então script-src/style-src precisam de
// 'unsafe-inline' — não dá pra migrar pra nonce sem reescrever a template de HTML puro do
// dashboard. connect-src/form-action liberam só o próprio projeto Supabase (login + REST).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  `connect-src 'self' ${SUPABASE_URL}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  `form-action 'self' ${SUPABASE_URL}`,
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Reaproveita as env vars server-only já configuradas na Vercel (SUPABASE_URL,
  // SUPABASE_ANON_KEY) como as variantes NEXT_PUBLIC_*, expostas no bundle do navegador — só a
  // página de login precisa delas (pra abrir o redirect do OAuth do Google). A anon key é pública
  // por design do Supabase (só é segura porque RLS está habilitado em todas as tabelas), então
  // não há necessidade de cadastrar variáveis novas na Vercel.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  },
  // Garante que nenhuma camada (CDN da Vercel, proxy, navegador) guarde em cache as respostas
  // das rotas /api/* — elas já são force-dynamic no código, mas sem esse header explícito uma
  // resposta antiga podia ficar presa em algum cache intermediário e mostrar dado desatualizado
  // (foi essa a causa do time de CS errado continuar aparecendo mesmo depois de corrigir o banco
  // e de dar hard refresh).
  async headers() {
    return [
      // Headers de segurança em toda rota (CSP, anti-clickjacking, etc.) — inclui /login e
      // /auth/*, únicas rotas que lidam com a sessão de autenticação.
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
        ],
      },
      // A própria página (rota "/", que devolve o HTML+JS do dashboard) também precisa desse
      // header — sem ele, o documento HTML em si podia ficar preso num cache intermediário
      // (CDN da Vercel ou do navegador) e mostrar uma versão antiga da tela inteira, mesmo com
      // as chamadas de API já sem cache. As fotos, logos e emblemas em /public continuam fora
      // dessa regra de propósito — esses sim devem ser cacheados normalmente pelo navegador.
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
        ],
      },
    ];
  },
};

export default nextConfig;
