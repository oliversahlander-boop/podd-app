"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Upload } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  avatar_url: string | null;
  display_name: string | null;
  theme: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [theme, setTheme] = useState("dark");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser();

      setUser(userData.user);

      if (!userData.user) {
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url,theme")
        .eq("id", userData.user.id)
        .maybeSingle();

      const nextProfile = data as Profile | null;
      setProfile(nextProfile);
      setDisplayName(nextProfile?.display_name || "");
      setTheme(nextProfile?.theme || "dark");
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
        avatar_url: profile?.avatar_url || null,
        display_name: nextDisplayName || null,
        id: user.id,
        theme,
        updated_at: new Date().toISOString(),
      })
      .select("id,display_name,avatar_url,theme")
      .single();

    if (error) {
      console.error("Profile save failed:", error);
      setMessage(error.message);
    } else {
      setProfile(data);
      setMessage("Profil sparad.");
      window.dispatchEvent(
        new CustomEvent("profile-changed", {
          detail: {
            avatar_url: data.avatar_url,
            display_name: data.display_name,
            id: data.id,
            theme: data.theme,
          },
        }),
      );
    }

    setIsSaving(false);
  }

  async function uploadAvatar(file: File | null) {
    if (!file || !user) {
      return;
    }

    setIsUploading(true);
    setMessage("");

    const filePath = `profiles/${user.id}/avatar-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("episodes-material")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Avatar upload failed:", uploadError);
      setMessage(uploadError.message);
      setIsUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("episodes-material")
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        avatar_url: publicUrlData.publicUrl,
        display_name: displayName.trim() || null,
        id: user.id,
        theme,
        updated_at: new Date().toISOString(),
      })
      .select("id,display_name,avatar_url,theme")
      .single();

    if (error) {
      console.error("Avatar save failed:", error);
      setMessage(error.message);
    } else {
      setProfile(data);
      setMessage("Profilbild sparad.");
      window.dispatchEvent(
        new CustomEvent("profile-changed", {
          detail: {
            avatar_url: data.avatar_url,
            display_name: data.display_name,
            id: data.id,
            theme: data.theme,
          },
        }),
      );
    }

    setIsUploading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const label = displayName || user?.email || "Profil";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] px-4 py-5 text-zinc-100 sm:px-10 sm:py-10 lg:px-14">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 sm:gap-8">
        <header className="rounded-2xl bg-[#111111] p-5 shadow-2xl shadow-black/30 ring-1 ring-zinc-900 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
            <div className="relative size-24 shrink-0 sm:size-36">
              {profile?.avatar_url ? (
                <img
                  alt=""
                  className="size-24 rounded-full object-cover shadow-2xl shadow-black/50 sm:size-36"
                  src={profile.avatar_url}
                />
              ) : (
                <div className="flex size-24 items-center justify-center rounded-full bg-[#1DB954] text-4xl font-bold text-black shadow-2xl shadow-black/50 sm:size-36 sm:text-6xl">
                  {label.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1DB954]">
                Profil
              </p>
              <h1 className="mt-3 truncate text-2xl font-semibold tracking-tight text-white sm:text-6xl">
                {label}
              </h1>
              <p className="mt-4 text-sm text-zinc-400">
                {user?.email || "Laddar..."}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Profilbild</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Används i toppmenyn och framtida teamvyer.
            </p>
            <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#181818] px-5 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition duration-200 hover:bg-[#202020] hover:text-white has-disabled:cursor-not-allowed has-disabled:opacity-60">
              <Upload size={16} />
              {isUploading ? "Laddar upp..." : "Ladda upp profilbild"}
              <input
                accept="image/*"
                className="sr-only"
                disabled={isUploading || !user}
                onChange={(event) =>
                  uploadAvatar(event.target.files?.[0] || null)
                }
                type="file"
              />
            </label>
          </article>

          <article className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Information</h2>
            <form className="mt-6 grid gap-4" onSubmit={saveProfile}>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Visningsnamn
                </span>
                <input
                  className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/10"
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Visningsnamn"
                  type="text"
                  value={displayName}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  E-post
                </span>
                <input
                  className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-zinc-500 outline-none"
                  disabled
                  type="email"
                  value={user?.email || ""}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Tema
                </span>
                <select
                  className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none transition focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/10"
                  onChange={(event) => setTheme(event.target.value)}
                  value={theme}
                >
                  <option className="bg-[#181818] text-white" value="dark">
                    Mörkt
                  </option>
                </select>
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition duration-200 hover:scale-[1.02] hover:bg-[#22d760] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving || !user}
                  type="submit"
                >
                  {isSaving ? "Sparar..." : "Spara profil"}
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-[#181818] px-6 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition duration-200 hover:bg-[#202020] hover:text-white"
                  onClick={signOut}
                  type="button"
                >
                  <LogOut size={16} />
                  Logga ut
                </button>
              </div>
            </form>

            {message ? (
              <p className="mt-5 rounded-xl bg-[#181818] p-4 text-sm leading-6 text-zinc-400">
                {message}
              </p>
            ) : null}
          </article>
        </section>
      </div>
    </main>
  );
}
