import type { Metadata } from "next";
import { PrivacyAnalytics } from "@/components/privacy-analytics";
import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://analyst-rating-radar.vercel.app"),
  title: {
    default: "Analyst Rating Radar",
    template: "%s · Analyst Rating Radar",
  },
  description: "Explore the latest Wall Street analyst rating changes, multi-firm agreement, and market disagreement.",
  applicationName: "Analyst Rating Radar",
  openGraph: {
    title: "Analyst Rating Radar",
    description: "A transparent daily workbench for Wall Street rating changes.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<PrivacyAnalytics /></body>
    </html>
  );
}
