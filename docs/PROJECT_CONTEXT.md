# Projektkontext

Podd är en samarbetsprodukt för poddteam som planerar, spelar in, redigerar, godkänner och publicerar avsnitt. Huvudflödet är **idé → research → manus → inspelning → redigering → godkännande → publicering**.

## Sidor

- Start: sammanställning, pågående arbete, deadlines, filer, statistik och aktivitet.
- Avsnitt: lista, sökning, filtrering och skapande.
- Avsnittsdetalj: översikt, manus, segment, anteckningar, checklistor, produktion, material och publicering.
- Material: gemensamt filbibliotek.
- Studio: fullskärmsinspelning och icke-destruktiv tidslinjeredigering.
- Inställningar: podd, medlemmar, roller och radering.
- Profil: personlig profil och avatar.

## Roller och samarbete

Owner äger och kan radera podden. Admin och editor kan redigera gemensamt innehåll. Viewer kan läsa, spela och ladda ned. Realtime uppdaterar viktiga delade ändringar och ignorerar den egna klientens eko.

## Terminologi

Använd svenska ord: Avsnitt, Manus, Segment, Anteckningar, Material, Inspelning, Redigering, Godkänd, Publicerad, Ansvarig, Förlopp och Senaste händelser.

## Produktregler

Fungerande inspelning, uppladdning, redigering, publicering, behörigheter och återställning får aldrig tas bort. Studio ska vara tät och editorlik; standardsidor ska vara lugna och navigerbara.

## Arkitektur och risker

Supabase Database är delad metadata-källa och Storage filkälla. IndexedDB är endast återställning/offlinekö. Riskområden är konfliktlösning, idempotenta uppladdningar, signerade Storage-URL:er, långa webbläsarinspelningar, Realtime-ekon och äldre lokala IndexedDB-poster.
