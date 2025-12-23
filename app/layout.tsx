import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Whop AutoMod - Content Moderation',
  description: 'Configurable content moderation for Whop forums and chats',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Allow embedding in iframes for Whop */}
        <meta httpEquiv="X-Frame-Options" content="ALLOWALL" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}

