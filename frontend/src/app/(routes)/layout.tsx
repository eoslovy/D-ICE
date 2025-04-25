import "./globals.css";

export const metadata = {
  title: 'D-Ice',
  description: '아이스브레이킹을 위한 게임 애플리케이션입니다.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
