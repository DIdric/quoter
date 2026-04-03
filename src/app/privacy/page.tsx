import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacybeleid Quoter – Hoe wij omgaan met jouw gegevens",
  description:
    "Quoter respecteert jouw privacy. In dit privacybeleid leggen we in begrijpelijke taal uit welke gegevens we verzamelen, waarom we dat doen en hoe we daarmee omgaan.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <a href="/" className="text-sm text-slate-400 hover:text-slate-600 transition mb-8 inline-block">
          ← Terug naar home
        </a>

        <p className="text-sm text-slate-400 mb-2">Laatst bijgewerkt: april 2025</p>
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Privacybeleid</h1>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">

          <p>
            Quoter respecteert jouw privacy. In dit privacybeleid leggen we in begrijpelijke taal uit welke
            gegevens we verzamelen, waarom we dat doen en hoe we daarmee omgaan. We verwerken persoonsgegevens
            in overeenstemming met de Algemene Verordening Gegevensbescherming (AVG).
          </p>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Wie is verantwoordelijk voor jouw gegevens?</h2>
            <p>
              Quoter is verantwoordelijk voor de verwerking van jouw persoonsgegevens zoals beschreven in dit
              beleid. Heb je vragen of wil je een recht uitoefenen? Neem contact op via{" "}
              <a href="mailto:support@quoter.nu" className="text-green-600 hover:underline">support@quoter.nu</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Welke gegevens verzamelen we?</h2>
            <p>We verzamelen alleen de gegevens die nodig zijn om de dienst goed te laten werken:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Naam en e-mailadres (bij aanmelden en gebruik van het platform)</li>
              <li>Bedrijfsnaam en contactgegevens (voor offertes en facturatie)</li>
              <li>Inhoud van offertes en projectbeschrijvingen die je invoert</li>
              <li>Technische gebruiksgegevens zoals IP-adres, browsertype en sessiedata</li>
              <li>Betalingsinformatie (verwerkt via onze betalingsprovider Stripe — Quoter slaat geen betaalgegevens op)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Waarom verwerken we jouw gegevens?</h2>
            <p>We verwerken jouw gegevens voor de volgende doeleinden:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Het leveren en verbeteren van de Quoter-dienst</li>
              <li>Het verwerken van betalingen en beheren van abonnementen</li>
              <li>Het sturen van relevante berichten, zoals updates of support-reacties</li>
              <li>Het naleven van wettelijke verplichtingen</li>
            </ul>
            <p className="mt-3">We gebruiken jouw gegevens nooit voor ongerichte advertenties of verkoop aan derden.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Hoe lang bewaren we jouw gegevens?</h2>
            <p>
              We bewaren jouw gegevens zolang je een actief account hebt, of zolang dat nodig is voor de
              doeleinden waarvoor ze zijn verzameld. Na het opzeggen van je account worden persoonlijke
              gegevens binnen 30 dagen verwijderd, tenzij een wettelijke bewaarplicht anders vereist.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Delen we jouw gegevens met anderen?</h2>
            <p>
              Quoter deelt jouw gegevens alleen met derden die strikt noodzakelijk zijn voor het leveren van
              de dienst, zoals:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Stripe (betalingsverwerking)</li>
              <li>Hosting- en infrastructuurproviders</li>
              <li>AI-dienstverleners voor het genereren van offertecontent</li>
            </ul>
            <p className="mt-3">
              Met alle verwerkers sluiten we verwerkersovereenkomsten. We verstrekken geen gegevens aan
              overheidsinstanties, tenzij wij daartoe wettelijk verplicht zijn.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Jouw rechten</h2>
            <p>Op grond van de AVG heb je de volgende rechten:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Recht op inzage in jouw persoonsgegevens</li>
              <li>Recht op correctie van onjuiste gegevens</li>
              <li>Recht op verwijdering ("recht om vergeten te worden")</li>
              <li>Recht op beperking van de verwerking</li>
              <li>Recht op dataportabiliteit</li>
              <li>Recht om bezwaar te maken tegen verwerking</li>
            </ul>
            <p className="mt-3">
              Je kunt jouw rechten uitoefenen door contact op te nemen via{" "}
              <a href="mailto:support@quoter.nu" className="text-green-600 hover:underline">support@quoter.nu</a>.
              We reageren binnen 30 dagen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Cookies</h2>
            <p>
              Quoter maakt gebruik van functionele cookies die nodig zijn voor het werken van het platform.
              Daarnaast plaatsen we analytische cookies om het gebruik te begrijpen en de dienst te verbeteren.
              We gebruiken geen tracking-cookies voor advertentiedoeleinden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Beveiliging</h2>
            <p>
              Wij nemen de beveiliging van jouw gegevens serieus. Quoter maakt gebruik van versleutelde
              verbindingen (HTTPS), beveiligde opslag en toegangsbeheer om ongeautoriseerde toegang te voorkomen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Wijzigingen in dit beleid</h2>
            <p>
              We kunnen dit privacybeleid van tijd tot tijd bijwerken. Bij belangrijke wijzigingen informeren
              we je via e-mail of een melding in het platform. De datum bovenaan deze pagina geeft altijd aan
              wanneer het beleid voor het laatst is bijgewerkt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Klacht indienen</h2>
            <p>
              Ben je niet tevreden over hoe wij met jouw gegevens omgaan? Dan heb je het recht een klacht in
              te dienen bij de Autoriteit Persoonsgegevens via{" "}
              <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                autoriteitpersoonsgegevens.nl
              </a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
