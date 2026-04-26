import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "战役沙盘动画模拟",
  description: "基于 Next.js、GSAP 和 PixiJS 的古今中外知名战役沙盘模拟原型"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
