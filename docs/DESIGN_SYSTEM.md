# Designsystem

## Principer

Spotify-inspirerat, mörkt, kompakt, professionellt, tydligt och lugnt. Stark hierarki, minimalt visuellt brus, svensk UI och ingen generisk AI-dashboard. Studio är en separat desktop-editor.

## Semantiska färger

`background #050505`, `surface #111111`, `surfaceRaised #181818`, `surfaceHover #202020`, `border #27272a`, `borderStrong #3f3f46`, `textPrimary #f4f4f5`, `textSecondary #a1a1aa`, `textMuted #71717a`, `primary #1db954`, `primaryHover #22d760`, `danger #ef4444`, `warning #facc15`, `success #1db954`, `focus rgba(29,185,84,.18)`.

## Mått

Spacing: 4, 8, 12, 16, 24, 32, 48, 64 px. Radius: small 8, medium 14, large 20, pill 9999 px. Undvik andra värden om tekniken inte kräver dem.

## Typografi

Sidtitel 32–48/semibold, sektionsrubrik 24/semibold, kortrubrik 16/semibold, body 15/normal, small 13, caption 11, label 13/semibold. Undvik överdimensionerade rubriker.

## Komponenter

Använd `Button`, `IconButton`, `Card`, `Section`, `PageHeader`, `Input`, `Textarea`, `Select`, `Label`, `Badge`, `StatusBadge`, `Avatar`, `Progress`, `Tabs`, `Dialog`, `DropdownMenu`, `Tooltip`, `EmptyState`, `SaveStatus`, `Skeleton`, `Toast` från `src/components/ui`.

Button-varianter: primary, secondary, ghost, danger. Storlekar: small, medium, large. Card-varianter: default, subtle, elevated, danger.

## Formulär och layout

Synlig label krävs; placeholder ersätter aldrig label. Enhetlig fokusmarkering och feltext. Spara längst ned till höger. Otillgängliga åtgärder ska vara disabled med förklaring. Standardsidor använder gemensamt sidskal/maxbredd och sidebarbredd. Avsnitt använder tydlig 70/30-hierarki. Responsiv stapling krävs. Studio behåller fullskärmslayout.
