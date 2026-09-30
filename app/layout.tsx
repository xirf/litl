import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lilt · Words in motion',
  description:
    'A visual lyric animation studio. Create character choreography, edit layered timelines, and export a standalone player for OBS.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
