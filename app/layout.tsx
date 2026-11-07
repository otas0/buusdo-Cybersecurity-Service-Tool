import type { Metadata } from 'next';
import '../shared/tokens.css';
import './globals.css';
import './shield.css';

const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const siteUrl = explicitSiteUrl || (vercelHost ? `https://${vercelHost}` : 'http://localhost:3000');

const FORMAL = 'buusdo Cybersecurity Service Tool';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: FORMAL,
  description: `${FORMAL}. Check a website before you trust it.`,
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/brand/apple-touch-icon.png' }],
  },
  openGraph: {
    title: FORMAL,
    description: 'Check a website before you trust it.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: FORMAL }],
  },
  twitter: {
    card: 'summary_large_image',
    title: FORMAL,
    description: 'Check a website before you trust it.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
