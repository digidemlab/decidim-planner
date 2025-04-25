# Mermaid → Formulär

Detta repo genererar automatiskt ett interaktivt formulär från en Mermaid-diagramfil (`form-definition.mmd`) och publicerar resultatet med GitHub Pages.

## Så fungerar det

- Ändra i `form-definition.mmd` (exempel: ett answer tree).
- Kör `npm run build` eller pusha till GitHub – en GitHub Action bygger automatiskt formuläret.
- Resultatet publiceras på `https://<användarnamn>.github.io/<repo>`.

## Exempel på Mermaid-kod

```mermaid
graph LR
    Q1[1 Typ av process] --> B{Har processen tidsbestämda steg?}
    B -->|Ja| C[Skapa en Process]
    B -->|Nej| D[Skapa ett Samråd]
