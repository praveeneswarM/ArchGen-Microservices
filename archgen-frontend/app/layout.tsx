import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "../components/ErrorBoundary";

export const metadata: Metadata = {
  title: "ArchGen AI | Enterprise Architecture Studio",
  description: "A premium black-and-white SaaS workflow for architecture planning, Terraform synthesis, and cloud review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
