import type { Metadata } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const bodyFont = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Firebreak -- Wildfire Smoke Exposure Risk",
  description: "Personalized wildfire smoke risk from live AQI, sky-photo smoke estimation, and community coverage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Header />
        {children}
      </body>
    </html>
  );
}
