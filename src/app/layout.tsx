import type { Metadata } from "next";
import { Fraunces, Geist, Vazirmatn } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Geist({ subsets: ["latin"], variable: "--font-geist" });
const vazir = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-vazir" });

export const metadata: Metadata = {
  title: "RoomLab",
  description: "Design your space before you move a thing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${vazir.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
