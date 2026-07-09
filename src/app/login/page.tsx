"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function authErrorMessage(errorMessage: string) {
    const normalizedMessage = errorMessage.toLowerCase();

    if (normalizedMessage.includes("invalid login credentials")) {
      return "Fel e-post eller lösenord.";
    }

    if (normalizedMessage.includes("user already registered")) {
      return "Användaren finns redan.";
    }

    if (normalizedMessage.includes("email not confirmed")) {
      return "E-postadressen är inte bekräftad.";
    }

    if (normalizedMessage.includes("password")) {
      return "Lösenordet är inte giltigt.";
    }

    return "Något gick fel. Försök igen.";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setMessage("Ange e-post och lösenord.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const { error } =
        mode === "login"
          ? await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password,
            })
          : await supabase.auth.signUp({
              email: normalizedEmail,
              password,
            });

      setMessage(
        error
          ? authErrorMessage(error.message)
          : mode === "login"
            ? "Inloggad."
            : "Konto skapat. Kontrollera din e-post vid behov.",
      );
    } catch {
      setMessage(
        "Kunde inte ansluta till Supabase. Kontrollera internetanslutningen och starta om utvecklingsservern.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function switchMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setMessage("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-6 text-zinc-100 sm:px-6 sm:py-10">
      <section className="w-full max-w-md rounded-2xl bg-[#111111] p-5 shadow-2xl shadow-black/40 ring-1 ring-zinc-900 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1DB954]">
          Podd
        </p>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
          {mode === "login" ? "Logga in" : "Skapa konto"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {mode === "login"
            ? "Fortsätt till poddpanelen."
            : "Skapa ett konto för att börja planera."}
        </p>

        <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/10"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-post"
            required
            type="email"
            value={email}
          />
          <input
            className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/10"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Lösenord"
            required
            minLength={6}
            type="password"
            value={password}
          />

          {message ? (
            <p className="rounded-xl bg-[#181818] p-4 text-sm leading-6 text-zinc-400">
              {message}
            </p>
          ) : null}

          <button
            className="rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition duration-200 hover:scale-[1.02] hover:bg-[#22d760] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading
              ? "Vänta..."
              : mode === "login"
                ? "Logga in"
                : "Skapa konto"}
          </button>
          <button
            className="rounded-full bg-[#181818] px-6 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition duration-200 hover:bg-[#202020] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => switchMode(mode === "login" ? "signup" : "login")}
            type="button"
          >
            {mode === "login" ? "Skapa konto" : "Logga in"}
          </button>
        </form>
      </section>
    </main>
  );
}
