import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Bell, Search } from "lucide-react";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Podd",
  description: "Planera podden från idé till publicering.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#050505]">
        <div className="flex min-h-screen">
          <aside className="hidden w-64 shrink-0 border-r border-zinc-900 bg-[#050505] px-6 py-8 lg:block">
            <Link
              className="text-sm font-semibold tracking-[0.2em] text-[#1DB954] uppercase"
              href="/"
            >
              Podd
            </Link>

            <nav className="mt-10 flex flex-col gap-2">
              <Link
                className="rounded-lg px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-[#111111] hover:text-white"
                href="/"
              >
                Dashboard
              </Link>
              <Link
                className="rounded-lg px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-[#111111] hover:text-white"
                href="/episodes"
              >
                Avsnitt
              </Link>
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="flex h-20 items-center justify-between border-b border-zinc-900 bg-[#050505] px-6 sm:px-10 lg:px-16">
              <h1 className="text-lg font-semibold text-white">Podd</h1>

              <div className="flex items-center gap-3">
                <label className="hidden h-10 w-72 items-center gap-3 rounded-full bg-[#111111] px-4 text-zinc-500 ring-1 ring-zinc-900 sm:flex">
                  <Search size={18} strokeWidth={2} />
                  <input
                    className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
                    placeholder="Sök"
                    type="search"
                  />
                </label>

                <button
                  aria-label="Notiser"
                  className="flex size-10 items-center justify-center rounded-full bg-[#111111] text-zinc-300 ring-1 ring-zinc-900 transition hover:text-white"
                  type="button"
                >
                  <Bell size={18} strokeWidth={2} />
                </button>

                <div className="flex size-10 items-center justify-center rounded-full bg-[#1DB954] text-sm font-bold text-black">
                  O
                </div>
              </div>
            </header>

            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
