import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { QueryProvider } from "@/components/QueryProvider";
import { AuthProvider } from "@/lib/auth/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gitify — GitHub PR ops",
  description:
    "Organize and visualize GitHub Pull Requests by base branch and stack hierarchy.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="bg-bg text-textP font-sans">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
