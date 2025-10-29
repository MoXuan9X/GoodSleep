import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '安心睡眠伙伴 - 你的睡前思绪整理助手',
  description: '帮助你通过睡前对话整理思绪，促进安心入睡',
  icons: {
    icon: '/site-icon.png',
    shortcut: '/site-icon.png',
    apple: '/site-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
