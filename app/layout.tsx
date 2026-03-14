import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { Sidebar } from "@/components/layout/sidebar";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Denver Urban Pulse",
  description:
    "Public analytical dashboard built on live Denver open data — crime, traffic crashes, 311 requests, and air quality.",
  openGraph: {
    title: "Denver Urban Pulse",
    description:
      "Live BI dashboard tracking crime, crashes, 311 requests, and air quality across Denver neighborhoods.",
    type: "website",
    locale: "en_US",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ibmPlexSans.variable} antialiased`}>
        <div className="flex min-h-screen">
          <Sidebar />
          {children}
        </div>
      </body>
    </html>
  );
}
