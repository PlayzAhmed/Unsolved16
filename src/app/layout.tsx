import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EnergyTwin AI",
  description: "Zero-Hardware Solar Energy Transition Evaluator for Egyptian SMEs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-900 text-slate-100">
        {children}
      </body>
    </html>
  );
}
