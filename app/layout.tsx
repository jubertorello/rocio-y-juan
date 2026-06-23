import type {Metadata} from 'next';
import { Overlock, Outfit } from 'next/font/google';
import './globals.css';

const handlee = Overlock({
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-serif',
});

const cause = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
});

import { weddingConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: `${weddingConfig.shortNames} · ${weddingConfig.weddingDay}.${weddingConfig.weddingMonth === 'Septiembre' ? '09' : '10'}.${weddingConfig.weddingYear}`,
  description: `¡Nos casamos! El ${weddingConfig.weddingDateText} celebramos el día más importante de nuestra vida y nos encantaría que nos acompañes.`,
  openGraph: {
    title: `${weddingConfig.shortNames} · ${weddingConfig.weddingDay}.${weddingConfig.weddingMonth === 'Septiembre' ? '09' : '10'}.${weddingConfig.weddingYear}`,
    description: `¡Nos casamos! El ${weddingConfig.weddingDateText} celebramos el día más importante de nuestra vida y nos encantaría que nos acompañes.`,
    type: 'website',
    locale: 'es_ES',
    images: [
      {
        url: 'https://res.cloudinary.com/djqtkbyez/image/upload/v1782215811/Disen%CC%83o_sin_ti%CC%81tulo_8_rsgpql.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: `${weddingConfig.shortNames} · Boda ${weddingConfig.weddingDateText}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${weddingConfig.shortNames} · ${weddingConfig.weddingDay}.${weddingConfig.weddingMonth === 'Septiembre' ? '09' : '10'}.${weddingConfig.weddingYear}`,
    description: `¡Nos casamos! El ${weddingConfig.weddingDateText} celebramos el día más importante de nuestra vida y nos encantaría que nos acompañes.`,
    images: ['https://res.cloudinary.com/djqtkbyez/image/upload/v1782215811/Disen%CC%83o_sin_ti%CC%81tulo_8_rsgpql.png'],
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es" className={`scroll-smooth ${handlee.variable} ${cause.variable} [--font-handwritten:var(--font-serif)]`}>
      <body suppressHydrationWarning className="text-accent">
        {/* Global Background */}
        <div 
          className="fixed inset-0 pointer-events-none z-[-1] bg-[#fbf9f4]" 
          style={{ 
            backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1777711072/texturapapel-limoncello-scaled_cgfzov.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        {children}
      </body>
    </html>
  );
}
