# Testning

Kör alltid lint, TypeScript, build och relevanta tester.

## Manuella flöden

1. Skapa podd; verifiera ägarskap och aktiv podd.
2. Lägg till medlem via e-post; ändra roll och verifiera owner/admin/editor/viewer.
3. Skapa avsnitt; redigera översikt, manus, segment, anteckningar och checklistor; refresh.
4. Ladda upp material; sök, sortera, preview, öppna i annan webbläsare och radera.
5. Studio: spela in minst 10 minuter, pausa/fortsätt/stoppa, invänta `Sparat`, refresh och spela.
6. Avbryt flik under inspelning och verifiera lokal återställning.
7. Öppna samma Studio-projekt som två medlemmar; flytta/radera clips och verifiera Realtime utan eget eko.
8. Duplicera/upprepa; verifiera samma `source_file_id` och ingen extra Storage-fil.
9. Exportera WAV och verifiera header, längd, mute/solo och uppladdning.
10. Verifiera notiser, lässtatus och mål-länkar.
11. Verifiera viewer read-only och att utomstående saknar data/Storage-åtkomst.
12. Logga ut/in och testa annan webbläsare/enhet.
13. Simulera misslyckad uppladdning; verifiera lokal Blob, retry och stabila ID:n.
14. Gå offline, redigera, verifiera `Offline`/`Sparat lokalt`, återanslut och refresh.
