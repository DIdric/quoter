export interface ConstructionModule {
  id: string;
  name: string;
  icon: string;
  description: string;
  intro: string;
  items: string[];
}

export const CONSTRUCTION_MODULES: ConstructionModule[] = [
  {
    id: "grondwerk",
    name: "Grondwerk",
    icon: "shovel",
    description: "Ontgravingen, grondafvoer en terreinvoorbereiding",
    intro:
      "Het verrichten van de benodigde grondwerkzaamheden ter voorbereiding van de bouw. Hierbij worden ontgravingen uitgevoerd, grond afgevoerd en het terrein bouwrijp gemaakt.",
    items: [
      "Benodigde ontgravingen verrichten",
      "Afvoer grond (d.m.v. container)",
      "Verwijderen van eventuele bestrating",
      "Verwijderen van eventuele schuttingdelen",
    ],
  },
  {
    id: "fundering",
    name: "Fundering",
    icon: "foundation",
    description: "Heipalen, bekisting, beton en vochtkering",
    intro:
      "Het aanbrengen van een volledige fundering inclusief heipalen, bekisting en betonwerk. De fundering wordt voorzien van de benodigde vochtkering en afstandhouders conform de bouwvoorschriften.",
    items: [
      "Uitzetten t.b.v. heipalen",
      "Leveren en plaatsen van stalen buispalen",
      "Leveren en plaatsen van houten bekisting voor fundering",
      "Aanbrengen fundering (beton, betonkwaliteit C20/25)",
      "Benodigde vochtkering en afstandhouders",
    ],
  },
  {
    id: "vloer-dekvloer",
    name: "Vloer en dekvloer",
    icon: "layers",
    description: "Betonvloer, isolatie, folie en cementdekvloer",
    intro:
      "Het aanbrengen van een traditionele geïsoleerde betonvloer met vorstrandafwerking, voorzien van isolatie, folie en krimpnetten. Hierop wordt een afwerkvloer aangebracht d.m.v. een cementdekvloer.",
    items: [
      "Aanbrengen geïsoleerde betonvloer met vorstrandafwerking, isolatie, folie en krimpnetten",
      "Leveren en plaatsen afwerkvloer d.m.v. cementdekvloer",
    ],
  },
  {
    id: "ijzerwerk",
    name: "IJzerwerk / Staalconstructie",
    icon: "beam",
    description: "HEA staalprofielen, lassen en boutwerk",
    intro:
      "Het leveren en plaatsen van de benodigde staalconstructie. Deze constructie dient als draagstructuur en zal worden uitgevoerd met HEA-profielen, inclusief alle benodigde las- en boutwerkzaamheden.",
    items: [
      "Leveren en plaatsen van HEA staanders",
      "Leveren en plaatsen van HEA liggers",
      "Benodigde flensen en platen",
      "Laswerkzaamheden",
      "Boutwerk",
    ],
  },
  {
    id: "klim-hijswerk",
    name: "Klim en hijswerken",
    icon: "crane",
    description: "Steigerwerk en hijswerkzaamheden",
    intro:
      "Het leveren en plaatsen van steigerwerk en het uitvoeren van de benodigde hijswerkzaamheden ten behoeve van de constructie en kozijnen.",
    items: [
      "Leveren en plaatsen van steiger",
      "Benodigde hijswerken t.b.v. kozijnen en constructie",
    ],
  },
  {
    id: "demontage",
    name: "Demonteerwerkzaamheden",
    icon: "demolition",
    description: "Sloop en afvoer van bestaande elementen",
    intro:
      "Het demonteren en afvoeren van de bestaande elementen die vervangen of verwijderd moeten worden. Er zal een bouw- en sloopafvalcontainer worden geplaatst op gelegenheid nabij de woning.",
    items: [
      "Demonteren en afvoeren van bestaande overkapping",
      "Demonteren en afvoeren van bestaande kozijnen",
      "Demonteren en afvoeren van bestaande gevel",
      "Bouw- en sloopafvalcontainer plaatsen",
    ],
  },
  {
    id: "binnenwanden",
    name: "Binnenwanden",
    icon: "wall",
    description: "HSB wanden, isolatie, dampwerende folie en gipsplaten",
    intro:
      "Het plaatsen van binnenwanden in houtskeletbouw (HSB), voorzien van isolatie, dampwerende folie en afgewerkt met gipsplaten. De wanden zullen gestuukt worden.",
    items: [
      "Binnenwanden (HSB) plaatsen voor uitbouw",
      "Isolatie steenwol aanbrengen (Rc waarde 4.5 m2 K/W)",
      "Dampwerende folie aanbrengen",
      "Dichtzetten met OSB platen",
      "Afwerken met gipsplaten en stucwerk",
    ],
  },
  {
    id: "buitengevel",
    name: "Buitengevel",
    icon: "facade",
    description: "Stelwerk, gevelbekleding en EPDM aansluiting",
    intro:
      "Het aanbrengen van de buitengevel inclusief stelwerkzaamheden en gevelafwerking. De aansluiting met de fundering wordt waterdicht afgewerkt met EPDM slabben.",
    items: [
      "Benodigde stelwerkzaamheden",
      "Gevelafwerking met rhombusdelen (horizontaal)",
      "Rollaag met rhombusdelen",
      "Aansluiting fundering met buitenmuur EPDM slabben",
    ],
  },
  {
    id: "dak-plafond",
    name: "Dak en plafond afwerking",
    icon: "roof",
    description: "Balklaag, dakbeplating, isolatie, bitumen en HWA",
    intro:
      "Het aanbrengen van een geïsoleerd plat dak, afgewerkt met 2-laags bitumineuze dakbedekking. Inclusief balklaag, dakbeplating, isolatie en dakrandafwerking. Het plafond wordt gemonteerd op dezelfde hoogte als het bestaande plafond en afgewerkt met gipsplaten.",
    items: [
      "Vuren balklaag aanbrengen",
      "Dakbeplating Underlayment tong en groef",
      "Isolatie aanbrengen (Rc waarde 6)",
      "Dampwerende folie",
      "Bitumineuze dakbedekking twee laags",
      "Dakrandafwerking: aluminium daktrim",
      "HWA (PVC) aansluiten op bestaand leidingwerk",
      "Plafond monteren en afwerken met gipsplaten en stucwerk",
    ],
  },
  {
    id: "kozijnen",
    name: "Kozijnen, ramen en deuren",
    icon: "door",
    description: "Schuifpui, hefschuifpui, ramen en deuren leveren en plaatsen",
    intro:
      "Het leveren, plaatsen, stellen en aftimmeren van kozijnen, ramen en deuren. De definitieve maatvoeringen worden na akkoord offerte ingemeten.",
    items: [
      "Leveren van kozijnen/schuifpui/hefschuifpui",
      "Plaatsen van kozijnen",
      "Stellen van kozijnen",
      "Aftimmeren van kozijnen",
    ],
  },
  {
    id: "elektra",
    name: "Elektra",
    icon: "zap",
    description: "Elektrische installatie, bedrading en aansluitingen",
    intro:
      "Het aanleggen van de elektrische installatie in de aanbouw/uitbouw, inclusief wandcontactdozen, schakelaars en verlichting. Indien nodig wordt de groepenkast uitgebreid.",
    items: [
      "Elektra aanleggen in de aanbouw/uitbouw",
      "Wandcontactdozen en schakelaars plaatsen",
      "Verlichting aansluiten",
      "Groepenkast uitbreiden indien nodig",
    ],
  },
  {
    id: "loodgieterswerk",
    name: "Loodgieterswerk",
    icon: "droplets",
    description: "Water-, gas- en afvoerleidingen",
    intro:
      "Het aanleggen en/of verleggen van water-, gas- en afvoerleidingen. Inclusief het aansluiten van radiatoren of vloerverwarming.",
    items: [
      "Waterleiding aanleggen/verleggen",
      "Afvoerleidingen aanleggen",
      "Gasleiding verleggen indien nodig",
      "Radiatoren/vloerverwarming aansluiten",
    ],
  },
];
