
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Import Inter font
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppLayout } from '@/components/app-layout'; // Import the AppLayout
import { QueryProvider } from '@/providers/query-provider'; // Import QueryProvider
import { AuthProvider } from '@/providers/auth-provider'; // Import AuthProvider

// Initialize Inter font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // Define CSS variable for Inter
});

export const metadata: Metadata = {
  title: 'Jal Seva Kendra', // Updated App Name
  description: 'Water Hishab for Rural Farmers', // Updated Description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Apply the Inter font variable to the body */}
      <body className={`${inter.variable} antialiased`}>
          <QueryProvider>
             <AuthProvider> {/* Wrap everything with AuthProvider */}
               {/* AppLayout is now rendered conditionally inside its component based on auth state */}
               {/* Keep AppLayout wrapping children to provide the overall structure */}
               <AppLayout>
                 {children}
               </AppLayout>
               <Toaster />
             </AuthProvider>
          </QueryProvider>
      </body>
    </html>
  );
}
