import './globals.css';

export const metadata = {
  title: 'Scribble Studio — your own comics',
  description: 'Draw your own characters, build a toy box, and make comics. You draw everything — the helper only brings the words.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
