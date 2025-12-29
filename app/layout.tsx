import type { Metadata } from "next";
import { Inter } from "next/font/google"; 
import "./globals.css"; // Caminho correto, pois estão na mesma pasta
import { ToastProvider } from "@/components/ToastContext"; 

const inter = Inter({ 
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Finance SaaS",
  description: "Gestão financeira inteligente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <ToastProvider>
           {children}
        </ToastProvider>
      </body>
    </html>
  );
}