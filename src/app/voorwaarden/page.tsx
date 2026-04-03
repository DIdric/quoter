import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Algemene voorwaarden Quoter – Offertesoftware voor aannemers",
  description:
    "Lees de algemene voorwaarden van Quoter. We hebben ze zo duidelijk mogelijk gehouden.",
  alternates: {
    canonical: "https://quoter.nu/voorwaarden",
  },
};

export default function VoorwaardenPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <a href="/" className="text-sm text-slate-400 hover:text-slate-600 transition mb-8 inline-block">
          ← Terug naar home
        </a>

        <p className="text-sm text-slate-400 mb-2">Versie 1.0 · april 2025</p>
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Algemene voorwaarden</h1>

        <div className="space-y-8 text-slate-700 leading-relaxed">

          <p>
            Welkom bij Quoter. Door gebruik te maken van ons platform ga je akkoord met deze algemene
            voorwaarden. Lees ze even door — we hebben geprobeerd het zo duidelijk mogelijk te houden.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Artikel 1 – Definities</h2>
            <ul className="space-y-1">
              <li><strong>Quoter:</strong> het platform en de dienst aangeboden via quoter.nu</li>
              <li><strong>Gebruiker:</strong> de persoon of het bedrijf dat een account aanmaakt en gebruikmaakt van Quoter</li>
              <li><strong>Account:</strong> de persoonlijke omgeving waarmee de gebruiker toegang krijgt tot het platform</li>
              <li><strong>Content:</strong> alle informatie, offertes en gegevens die de gebruiker invoert of genereert via Quoter</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Artikel 2 – Gebruik van het platform</h2>
            <p>
              Quoter biedt een AI-gedreven platform waarmee aannemers en vaklieden professionele offertes
              kunnen opstellen. Je mag het platform uitsluitend gebruiken voor wettige doeleinden en in
              overeenstemming met deze voorwaarden.
            </p>
            <p className="mt-3">Het is niet toegestaan om:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Het platform te gebruiken voor het verspreiden van misleidende of frauduleuze informatie</li>
              <li>Geautomatiseerde aanvragen te sturen die de werking van het platform verstoren</li>
              <li>Toegang te proberen verkrijgen tot delen van het systeem waartoe je niet geautoriseerd bent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Artikel 3 – Account en toegang</h2>
            <p>
              Je bent zelf verantwoordelijk voor het geheimhouden van je inloggegevens. Bij vermoed misbruik
              van je account ben je verplicht dit direct te melden via{" "}
              <a href="mailto:support@quoter.nu" className="text-green-600 hover:underline">support@quoter.nu</a>.
              Quoter is niet aansprakelijk voor schade die voortvloeit uit ongeautoriseerd gebruik van jouw account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Artikel 4 – Abonnementen en betaling</h2>
            <p>
              Quoter biedt een gratis plan en een betaald Pro-abonnement aan. De actuele prijzen staan
              vermeld op quoter.nu/prijzen.
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Betaling vindt maandelijks vooraf plaats via Stripe</li>
              <li>Een abonnement wordt automatisch verlengd tenzij je het opzegt vóór het einde van de lopende periode</li>
              <li>Opzeggen kan op elk moment via je accountinstellingen; toegang blijft actief tot het einde van de betaalde periode</li>
              <li>Restitutie wordt niet verleend voor gedeeltelijk gebruikte periodes, tenzij wettelijk anders vereist</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Artikel 5 – Intellectueel eigendom</h2>
            <p>
              Alle rechten op het platform, de software, de vormgeving en de door Quoter ontwikkelde content
              berusten bij Quoter. Jij behoudt alle rechten op de content die jij invoert, zoals jouw
              offerteteksten, klantgegevens en projectinformatie.
            </p>
            <p className="mt-3">
              Door gebruik te maken van het platform geef je Quoter toestemming om jouw content te verwerken
              voor zover noodzakelijk voor het leveren van de dienst — zoals het genereren van offertes via AI.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Artikel 6 – Beschikbaarheid en onderhoud</h2>
            <p>
              Quoter streeft naar een zo hoog mogelijke beschikbaarheid van het platform. We kunnen de dienst
              tijdelijk onderbreken voor onderhoud of updates. We informeren gebruikers bij voorkeur vooraf
              over geplande onderbrekingen.
            </p>
            <p className="mt-3">
              Quoter garandeert geen ononderbroken of foutloze werking van het platform en is niet aansprakelijk
              voor schade als gevolg van tijdelijke onbeschikbaarheid.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Artikel 7 – Aansprakelijkheid</h2>
            <p>Quoter is niet aansprakelijk voor:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Onjuistheden in door AI gegenereerde offertecontent — controleer offertes altijd voor verzending</li>
              <li>Indirecte schade, gederfde inkomsten of gevolgschade</li>
              <li>Schade door gebruik van externe diensten die via Quoter worden aangeboden</li>
            </ul>
            <p className="mt-3">
              De aansprakelijkheid van Quoter is in alle gevallen beperkt tot het bedrag dat de gebruiker
              in de drie maanden voorafgaand aan de schade heeft betaald.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Artikel 8 – Wijzigingen</h2>
            <p>
              Quoter kan deze voorwaarden wijzigen. We sturen je minstens 14 dagen van tevoren een bericht
              als er belangrijke wijzigingen plaatsvinden. Door na de ingangsdatum gebruik te blijven maken
              van het platform, accepteer je de nieuwe voorwaarden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Artikel 9 – Toepasselijk recht</h2>
            <p>
              Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de
              bevoegde rechter in Nederland.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Contact</h2>
            <p>
              Vragen over deze voorwaarden? Neem contact op via{" "}
              <a href="mailto:support@quoter.nu" className="text-green-600 hover:underline">support@quoter.nu</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
