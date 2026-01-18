import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { stackServerApp } from "@/stack/server";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { Suspense } from "react";
import { LogLineLogo } from "@/components/landing/logo";


// Elegant serif for headlines - distinctive, editorial feel
const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

// Clean sans for body - readable and modern
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Monospace for code
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "FullEvent - Don't Panic. Just Query.",
  description: "The infinite improbability event analytics platform. Ingest everything. Query anything. Towel not included.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-black">
            <LogLineLogo size={48} animated={true} variant="stream" autoPlay={true} />
          </div>
        }>
          <StackProvider app={stackServerApp}>
            <StackTheme>
              <Providers>
                {children}
              </Providers>
            </StackTheme>
          </StackProvider>
        </Suspense>
      </body>
    </html>
  );
}
