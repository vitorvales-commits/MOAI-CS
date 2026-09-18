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
