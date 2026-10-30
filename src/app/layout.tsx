import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ParticleBackground } from "@/components/effects/ParticleBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pandas Lab — Data Analysis & Feature Engineering",
  description:
    "An interactive learning platform for data analysis and feature engineering using Pandas. Travel from raw data to a validated, machine-learning-ready analytical dataset through interactive lessons, practical Python examples, statistical explanations, and real-world analytics workflows.",
  keywords: [
    "Pandas", "Data Analysis", "Feature Engineering", "Python",
    "Machine Learning", "Data Science", "Exploratory Data Analysis",
    "Feature Selection", "Scikit-learn",
  ],
  authors: [{ name: "Pandas Lab" }],
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
  openGraph: {
    title: "Pandas Lab — Data Analysis & Feature Engineering",
    description: "Interactive lessons, practical Python examples, statistical explanations, and real-world analytics workflows.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pandas Lab — Data Analysis & Feature Engineering",
    description: "Interactive lessons, practical Python examples, statistical explanations, and real-world analytics workflows.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ParticleBackground />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
