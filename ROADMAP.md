# Quoter Roadmap

## Visie
Quoter helpt bouwers niet alleen offertes te maken, maar ook **beter te worden in hun prijsvoorspellingen**. Door werkelijke kosten te vergelijken met offertes leren bouwers waar ze structureel te hoog of te laag zitten.

---

## Fase 1: Werkelijke kosten invoeren (v1 - gebouwd)
**Status: Gebouwd**

- "Werkelijke kosten" panel op de offerte-detailpagina
- Per regel werkelijke kosten invullen naast de offerteprijs
- Automatische berekening van verschil (bedrag + percentage)
- Visuele indicatoren: groen (onder budget), rood (over budget)
- Nieuwe quote status: `completed` (Afgerond)
- Zichtbaar in dashboard met blauwe badge

**Technisch:**
- `actual_cost` veld per line item in `json_data.result.lines[]`
- Nieuwe status `completed` naast `draft` en `final`
- Geen extra database tabellen nodig

---

## Fase 2: Vergelijking offerte vs werkelijk per post
**Status: Gepland**

- Samenvatting per categorie (bijv. "Tegelwerk: +18% over budget")
- Uitsplitsing naar materiaal vs arbeid afwijkingen
- Export van vergelijkingsrapport als PDF

---

## Fase 3: Dashboard met trends over meerdere projecten
**Status: Idee**

- Overzichtspagina met alle afgeronde projecten
- Gemiddelde afwijking per categorie over tijd
- Grafiek: "Je nauwkeurigheid verbetert" (of niet)
- Inzichten zoals: "Je onderschat tegelwerk structureel met ~20%"

---

## Fase 4: AI-correctiefactoren per gebruiker
**Status: Idee**

- AI past automatisch correctiefactoren toe op basis van historische data
- Per gebruiker, per categorie, per type werk
- "Op basis van je vorige 5 projecten voeg ik 15% toe aan tegelwerk"
- Opt-in: gebruiker kan correctie accepteren of negeren

---

## Fase 5: Benchmarking (geanonimiseerd)
**Status: Idee**

- Vergelijk je prijzen met andere bouwers (geanonimiseerd)
- "Jouw tegelwerk per m2: €85 — Gemiddeld: €72"
- Vereist voldoende gebruikers met data
- Privacy-first: alleen geaggregeerde data, nooit individueel

---

## Vergelijkingsmodule: Upload bestaande offerte
**Status: Idee**

- Upload een bestaande offerte (foto/PDF) van een concurrent of eigen oude offerte
- AI analyseert en vergelijkt met de Quoter-gegenereerde offerte
- Toont waar de verschillen zitten per post
- Kan als instap dienen vóór fase 1 (geen afgerond project nodig)

---

## Principes
1. **Simpel houden** — elke fase moet op zichzelf waarde leveren
2. **Geen onnodige complexiteit** — pas bouwen als er data is
3. **Bestaande structuur** — geen nieuwe tabellen tenzij strikt nodig
4. **Gebruiker centraal** — features alleen bouwen als ze daadwerkelijk gebruikt worden
