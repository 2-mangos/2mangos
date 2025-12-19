import type { Metadata } from "next";
import { Inter } from "next/font/google"; 
import "./globals.css";
import { ToastProvider } from "../components/ToastContext";

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
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased bg-[#09090b] text-zinc-100`}>
        <ToastProvider>
           {children}
        </ToastProvider>
      </body>
    </html>
  );
}