import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Overclocking Cake Factory",
  description: "Interactive DVFS Educational Minigame demonstrating dynamic voltage and frequency scaling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}

