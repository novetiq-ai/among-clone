import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  applicationName: 'Nebula Deception',
  title: 'Nebula Deception',
  description: 'Ein browserbasiertes Social-Deduction-Spiel für private Runden.',
  openGraph: {
    title: 'Nebula Deception',
    description: 'Täuschung, Teamwork und Sabotage in einer privaten Browser-Runde.',
    type: 'website',
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nebula Deception',
    description: 'Täuschung, Teamwork und Sabotage in einer privaten Browser-Runde.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="de">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
