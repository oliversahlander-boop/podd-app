const episodes = [
  {
    title: "Pilotavsnitt",
    status: "Planering",
    description: "Sätt riktning, ton och första ämnet för poddens start.",
    date: "Datum kommer",
  },
  {
    title: "Rivaler & historier",
    status: "Idé",
    description: "Samla berättelser, konflikter och vinklar att bygga vidare på.",
    date: "Datum kommer",
  },
  {
    title: "Gästidéer",
    status: "Research",
    description: "Lista möjliga gäster och koppla dem till kommande avsnitt.",
    date: "Datum kommer",
  },
];

export default function EpisodesPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-6 py-8 text-zinc-100 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-6 border-b border-zinc-900 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-[#1DB954] uppercase">
              Podd-app
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Avsnitt
            </h1>
          </div>
          <button className="w-full rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] sm:w-auto">
            Skapa nästa avsnitt
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {episodes.map((episode) => (
            <article
              className="rounded-lg border border-zinc-800 bg-[#181818] p-6"
              key={episode.title}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-[#1DB954] px-3 py-1 text-xs font-bold text-black">
                  {episode.status}
                </span>
                <span className="text-sm text-zinc-500">{episode.date}</span>
              </div>

              <h2 className="mt-6 text-xl font-semibold text-white">
                {episode.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {episode.description}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
