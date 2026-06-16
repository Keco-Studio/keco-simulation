import type { Metadata } from 'next';
import '@ant-design/v5-patch-for-react-19';
import AntdRegistry from '@/components/AntdRegistry';
import './globals.css';

export const metadata: Metadata = {
  title: 'Keco Simulation',
  description: 'Economy and battle simulation tools',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
