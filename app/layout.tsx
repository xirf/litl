import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lilt · Words in motion',
  description:
    'A visual lyric animation studio. Create character choreography, edit layered timelines, and export a standalone player for OBS.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-zinc-950 has-[.obs-overlay]:bg-transparent">
      <head>
        <link rel="stylesheet" href="/lilt/fonts.css" />
      </head>
      <body className="m-0 bg-zinc-950 font-sans text-zinc-100 antialiased [color-scheme:dark] has-[.obs-overlay]:bg-transparent">
        {children}
      </body>
    </html>
  );
}
