"use client";

import { FormEvent, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  display_name: string | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser();

      setUser(userData.user);

      if (!userData.user) {
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id,display_name")
        .eq("id", userData.user.id)
        .maybeSingle();

      const profile = data as Profile | null;
      setDisplayName(profile?.display_name || "");
    }

    loadProfile();
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    const nextDisplayName = displayName.trim();
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        display_name: nextDisplayName || null,
        id: user.id,
        updated_at: new Date().toISOString(),
      })
      .select("id,display_name")
      .single();

    if (error) {
      console.error("Profile save failed:", error);
      setMessage(error.message);
    } else {
      setMessage("Profil sparad.");
      window.dispatchEvent(
        new CustomEvent("profile-changed", {
          detail: {
            display_name: data.display_name,
            id: data.id,
          },
        }),
      );
    }

    setIsSaving(false);
  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-8 text-zinc-100 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="border-b border-zinc-900 pb-6">
          <p className="text-sm font-semibold tracking-[0.2em] text-[#1DB954] uppercase">
            Profil
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Din profil
          </h1>
          <p className="mt-4 text-sm text-zinc-400">
            {user?.email || "Laddar..."}
          </p>
        </header>

        <section className="rounded-lg bg-[#181818] p-6">
          <form className="grid gap-4 sm:grid-cols-[1fr_auto]" onSubmit={saveProfile}>
            <input
              className="rounded-lg border border-zinc-800 bg-[#111111] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Visningsnamn"
              type="text"
              value={displayName}
            />
            <button
              className="rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || !user}
              type="submit"
            >
              {isSaving ? "Sparar..." : "Spara profil"}
            </button>
          </form>

          {message ? (
            <p className="mt-4 text-sm leading-6 text-zinc-400">{message}</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
