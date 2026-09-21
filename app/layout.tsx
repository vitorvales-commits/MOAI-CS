// Layout raiz mínimo, exigido pelo App Router por causa de app/login/page.tsx (a única rota
// que usa React de fato — o resto do app serve HTML puro direto de route.ts, ver app/route.ts).
// A rota "/" (app/route.ts) não passa por este layout, então o favicon dela é injetado direto
// no head de app/dashboard-html.ts — os ícones abaixo cobrem /login e qualquer página futura.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: '/apple-touch-icon-180x180.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  );
}
