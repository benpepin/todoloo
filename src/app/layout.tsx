import type { Metadata } from "next";
import { Inter, Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SupabaseProvider } from "@/components/SupabaseProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Todoloo - Quick Todos for me and yous",
  description: "A time-aware todo app with drag-and-drop prioritization and real-time tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geist.variable} ${instrumentSerif.variable} antialiased`}>
        <SupabaseProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
