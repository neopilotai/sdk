import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Triggers - AI-powered GitHub Issue Triage',
    template: '%s | Triggers',
  },
  description:
    'AI-powered issue and PR labeling for GitHub. Works with your existing labels out of the box.',
  keywords: [
    'github',
    'automation',
    'issue triage',
    'pr labeling',
    'ai',
    'bot',
    'github app',
  ],
  authors: [{ name: 'Triggers' }],
  creator: 'Triggers',
  metadataBase: new URL('https://triggers.xyz'),
  alternates: {
    canonical: 'https://triggers.xyz',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://triggers.xyz',
    siteName: 'Triggers',
    title: 'Triggers - AI-powered GitHub Issue Triage',
    description:
      'AI-powered issue and PR labeling for GitHub. Works with your existing labels out of the box.',
    images: [
      {
        url: 'https://triggers.xyz/og.png',
        width: 1200,
        height: 630,
        alt: 'Triggers - AI-powered GitHub Issue Triage',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Triggers - AI-powered GitHub Issue Triage',
    description:
      'AI-powered issue and PR labeling for GitHub. Works with your existing labels out of the box.',
    images: ['https://triggers.xyz/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0c0a09',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Triggers',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  description:
    'AI-powered issue and PR labeling for GitHub. Works with your existing labels out of the box.',
  url: 'https://triggers.xyz',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
