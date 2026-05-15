import type { Metadata } from 'next';
import '@ant-design/v5-patch-for-react-19';
import './globals.css';

export const metadata: Metadata = {
  title: 'Keco Simulation',
  description: 'Economy and battle simulation tools',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
