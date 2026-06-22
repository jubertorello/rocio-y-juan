import type {Metadata} from 'next';
import { Handlee, Outfit } from 'next/font/google';
import './globals.css';

const handlee = Handlee({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-serif',
});

const cause = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Mariu & Nacho · 12.09.2026',
  description: '¡Nos casamos! El 12 de septiembre de 2026 celebramos el día más importante de nuestra vida y nos encantaría que nos acompañes.',
  openGraph: {
    title: 'Mariu & Nacho · 12.09.2026',
    description: '¡Nos casamos! El 12 de septiembre de 2026 celebramos el día más importante de nuestra vida y nos encantaría que nos acompañes.',
    type: 'website',
    locale: 'es_ES',
    images: [
      {
        url: 'https://res.cloudinary.com/djqtkbyez/image/upload/f_jpg,w_1200,h_630,c_fill,q_auto/v1780238506/Disen%CC%83o_sin_ti%CC%81tulo_6_wnd34x.png',
        width: 1200,
        height: 630,
        type: 'image/jpeg',
        alt: 'Mariu & Nacho · Boda 12 de Septiembre 2026',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mariu & Nacho · 12.09.2026',
    description: '¡Nos casamos! El 12 de septiembre de 2026 celebramos el día más importante de nuestra vida y nos encantaría que nos acompañes.',
    images: ['https://res.cloudinary.com/djqtkbyez/image/upload/f_jpg,w_1200,h_630,c_fill,q_auto/v1780238506/Disen%CC%83o_sin_ti%CC%81tulo_6_wnd34x.png'],
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
