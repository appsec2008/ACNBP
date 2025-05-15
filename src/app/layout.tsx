import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google'; // Using Geist from next/font/google as in original
import './globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Toaster } from '@/components/ui/toaster';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AgentConnect',
  description: 'Simulate and evaluate agent interactions and skill sets.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <main className="flex-1 flex flex-col overflow-auto">
            <div className="flex-1 p-6 md:p-8">
              {children}
            </div>
          </main>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
