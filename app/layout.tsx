import type { Metadata, Viewport } from "next";
import { Inter, Tajawal } from "next/font/google";
import "./globals.css";
import { CinematicBackdrop } from "@/components/CinematicBackdrop";
import { Navbar } from "@/components/Navbar";
import { FriendCameo } from "@/components/FriendCameo";
import { JoinRatingBanner } from "@/components/JoinRatingBanner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "فقرة الموفي",
  description: "تقييم أفلام فقرة الموفي — كل واحد من جواله، والكل ينكشف مع بعض",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${inter.variable} ${tajawal.variable} h-full antialiased`}
    >
      <body
        className="min-h-full font-[family-name:var(--font-tajawal)]"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <CinematicBackdrop />
        <FriendCameo />
        <div className="relative z-10 flex min-h-screen flex-col">
          <Navbar />
          {children}
        </div>
        <JoinRatingBanner />
      </body>
    </html>
  );
}
