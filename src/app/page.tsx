import Link from "next/link";

const cards = [
  {
    title: "Idéer",
    description: "Samla uppslag, vinklar och research innan de blir avsnitt.",
  },
  {
    title: "Avsnitt",
    description: "Planera manus, inspelning och status för varje produktion.",
  },
  {
    title: "Publicering",
    description: "Håll koll på deadlines, kanaler och sista kontrollen.",
  },
];

const checklist = [
  "Bestäm namn",
  "Skapa idé",
  "Planera pilot",
  "Publicera",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] px-6 py-8 text-zinc-100 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex items-center justify-between border-b border-zinc-900 pb-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-[#1DB954] uppercase">
              Podd
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Planera podden från idé till publicering.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
              Välkommen
            </p>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-lg border border-zinc-900 bg-[#111111] p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Din poddresa börjar här
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Starta produktionen
                </h2>
              </div>
              <Link
                className="w-full rounded-full bg-[#1DB954] px-6 py-3 text-center text-sm font-bold text-black transition hover:bg-[#22d760] sm:w-auto"
                href="/episodes"
              >
                Skapa nästa avsnitt
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {cards.map((card) => (
                <article
                  className="rounded-lg border border-zinc-800 bg-[#181818] p-5"
                  key={card.title}
                >
                  <h3 className="text-lg font-semibold text-white">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {card.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-zinc-900 bg-[#111111] p-6 sm:p-8">
            <p className="text-sm font-medium text-zinc-500">
              Checklista
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Från start till publicering
            </h2>

            <ul className="mt-8 space-y-4">
              {checklist.map((item) => (
                <li className="flex items-center gap-3" key={item}>
                  <span className="flex size-6 items-center justify-center rounded-full border border-[#1DB954] text-xs font-bold text-[#1DB954]">
                    ✓
                  </span>
                  <span className="text-sm font-medium text-zinc-200">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </section>
      </div>
    </main>
  );
}
