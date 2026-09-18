import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz', 'SOFT'],
});

export const metadata: Metadata = {
  title: 'Clenzy',
  description: 'Laundry, dry-cleaning & fabric care — Srinagar.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f9f8' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1310' },
  ],
};

/**
 * Runs before first paint: applies the stored theme, else the OS preference,
 * to <html data-theme>. Inline + blocking so there is no light-mode flash for
 * dark-theme users. The attribute (not a class) drives the token swap in
 * styles/tokens.css; `suppressHydrationWarning` covers the server (light,
 * no attribute) vs client (possibly dark) difference on <html> itself.
 */
const themeInitScript = `(function(){try{var s=localStorage.getItem('clenzy-theme');var t=s==='dark'||s==='light'?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
