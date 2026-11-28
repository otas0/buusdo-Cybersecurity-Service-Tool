import type { Metadata } from 'next';
import '../shared/tokens.css';
import './globals.css';
import './shield.css';

import { ChinaWorkersStayBoot } from '../components/ChinaMainlandForceRedirect';
import productionSite from '../shared/production-site.json';

const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
/** Prefer deploy env, then committed production origin (custom domain after `production:origin`). */
const siteUrl =
  explicitSiteUrl ||
  (vercelHost ? `https://${vercelHost}` : '') ||
  String(productionSite.productionOrigin || '').replace(/\/$/, '') ||
  'http://localhost:3000';

const FORMAL = 'buusdo Cybersecurity Service Tool';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: FORMAL,
  description: `${FORMAL}. Check a website before you trust it.`,
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180' }],
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

/**
 * Theme + wordmark boot. Never re-assign img.src to the same asset — that aborts the
 * in-flight SVG and briefly paints alt text ("文字版 logo") on every refresh.
 */
const THEME_BOOT =
  "(function(){function sameSrc(img,next){var cur=img.getAttribute('src')||'';if(cur===next)return true;try{return new URL(cur,location.href).pathname===new URL(next,location.href).pathname;}catch(_){return cur.endsWith(next)||next.endsWith(cur);}}function apply(t){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;var img=document.querySelector('[data-brand-wordmark]');if(!img)return;var d=img.getAttribute('data-src-dark')||'/brand/buusdo-wordmark.svg';var l=img.getAttribute('data-src-light')||'/brand/buusdo-wordmark-on-light.svg';var next=t==='light'?l:d;if(!sameSrc(img,next))img.setAttribute('src',next);}try{var k='buusdocst-ui-theme';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){if(t!=null){try{localStorage.removeItem(k);}catch(_){}}t='dark';}apply(t);document.addEventListener('DOMContentLoaded',function(){apply(t);});}catch(e){apply('dark');document.addEventListener('DOMContentLoaded',function(){apply('dark');});}})();";

/**
 * Critical instrument CSS inlined so a missing /_next/static/*.css (404) cannot
 * leave UA-blue Run. One wordmark img — theme swaps src (no dual-hide pair).
 */
const CRITICAL_CSS = `
.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.shell{max-width:920px;margin:0 auto;padding:28px 28px 48px;color:var(--text,#f3f1ea)}
.shell .top{display:flex;align-items:center;justify-content:space-between;gap:28px;padding:0 0 26px;border-bottom:1px solid rgba(243,241,234,.16);background:var(--bg,#0e0e0e)}
.shell .brand-lockup{display:flex;align-items:center;margin:0}
.shell .brand-logo{display:block;height:40px;width:auto;min-width:72px;min-height:32px;max-width:min(220px,55vw);aspect-ratio:405/138;object-fit:contain;background:transparent;border:0}
.shell .primary-button{background:#ff4d00;color:#0e0e0e;border:0;border-radius:0;padding:0 18px;min-height:2.5rem;font-family:ui-monospace,Menlo,monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
.shell a,.shell .text-button{color:inherit;text-decoration:none}
.shell .top-nav{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.shell .nav-link{font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted,#8d897f);background:transparent;border:0;cursor:pointer;padding:4px 6px}
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <ChinaWorkersStayBoot />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
