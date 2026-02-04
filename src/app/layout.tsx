import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-sans',
  display: 'swap',
});
const waheedFont = localFont({
  src: './fonts/MVAWaheed.ttf',
  variable: '--font-waheed',
  display: 'swap',
});

const farumaFont = localFont({
  src: './fonts/faruma-abul.ttf',
  variable: '--font-faruma',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "SHMC Forms",
  description: "Milandhoo Council",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} ${waheedFont.variable} ${farumaFont.variable}`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
