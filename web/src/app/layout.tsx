import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth";
import { VoteProvider } from "@/components/voting/VoteButtons";
import { PreferencesProvider } from "@/components/preferences/PreferencesProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flare - Trending from Everywhere",
  description: "Aggregate trending content from Reddit, Hacker News, Twitter, and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <PreferencesProvider>
            <VoteProvider>
              {children}
            </VoteProvider>
          </PreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
