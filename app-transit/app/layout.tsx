import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DoveVado — Pianifica il tuo viaggio a Milano",
  description: "Pianificatore di percorsi per il trasporto pubblico di Milano",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
