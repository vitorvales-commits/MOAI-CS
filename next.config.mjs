/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Garante que nenhuma camada (CDN da Vercel, proxy, navegador) guarde em cache as respostas
  // das rotas /api/* — elas já são force-dynamic no código, mas sem esse header explícito uma
  // resposta antiga podia ficar presa em algum cache intermediário e mostrar dado desatualizado
  // (foi essa a causa do time de CS errado continuar aparecendo mesmo depois de corrigir o banco
  // e de dar hard refresh).
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
        ],
      },
    ];
  },
};

export default nextConfig;
