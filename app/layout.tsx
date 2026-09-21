// Layout raiz mínimo, exigido pelo App Router por causa de app/login/page.tsx (a única rota
// que usa React de fato — o resto do app serve HTML puro direto de route.ts, ver app/route.ts).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  );
}
