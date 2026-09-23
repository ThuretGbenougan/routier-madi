import type { HistoryEntry, Photo, ProblemType, RepairRequest, RequestStatus } from "@/types";
import { statusLabels, statusOrder } from "@/i18n/fr";

type Seed = {
  ref: number;
  type: ProblemType;
  address: string;
  district: string;
  description: string;
  status: RequestStatus;
  contractorId: string | null;
  daysAgo: number;
  citizenName?: string;
  citizenEmail?: string;
  photos: number;
};

const seeds: Seed[] = [
  {
    ref: 1,
    type: "POTHOLE",
    address: "12 rue des Tilleuls",
    district: "Centre",
    description:
      "Nid-de-poule profond au milieu de la chaussée, dangereux pour les deux-roues.",
    status: "CLOSED",
    contractorId: "c1",
    daysAgo: 62,
    citizenName: "Nadia Berger",
    citizenEmail: "nadia.berger@mail.fr",
    photos: 2,
  },
  {
    ref: 2,
    type: "SIDEWALK",
    address: "5 place de la République",
    district: "Centre",
    description: "Dalles de trottoir descellées devant la pharmacie, risque de chute.",
    status: "CLOSED",
    contractorId: "c3",
    daysAgo: 55,
    citizenName: "Paul Vasseur",
    photos: 1,
  },
  {
    ref: 3,
    type: "DRAINAGE",
    address: "34 avenue du Général Leclerc",
    district: "Nord",
    description: "Grille d'évacuation bouchée, l'eau stagne après chaque pluie.",
    status: "CLOSED",
    contractorId: "c4",
    daysAgo: 48,
    citizenName: "Sophie Renard",
    citizenEmail: "s.renard@mail.fr",
    photos: 2,
  },
  {
    ref: 4,
    type: "CRACK",
    address: "18 rue Victor Hugo",
    district: "Est",
    description: "Longue fissure sur toute la largeur de la voie devant l'école.",
    status: "CONTROLLED",
    contractorId: "c2",
    daysAgo: 41,
    citizenName: "Lucas Meyer",
    photos: 1,
  },
  {
    ref: 5,
    type: "PAVEMENT",
    address: "77 boulevard Saint-Martin",
    district: "Sud",
    description: "Chaussée fortement dégradée sur environ 30 mètres.",
    status: "CONTROLLED",
    contractorId: "c2",
    daysAgo: 37,
    citizenName: "Amel Haddad",
    citizenEmail: "amel.haddad@mail.fr",
    photos: 3,
  },
  {
    ref: 6,
    type: "POTHOLE",
    address: "3 impasse des Lilas",
    district: "Ouest",
    description: "Deux nids-de-poule à l'entrée de l'impasse.",
    status: "COMPLETED",
    contractorId: "c1",
    daysAgo: 30,
    citizenName: "Thierry Gomez",
    photos: 1,
  },
  {
    ref: 7,
    type: "MARKING",
    address: "Carrefour rue Pasteur / rue de Verdun",
    district: "Centre",
    description: "Passage piéton totalement effacé, visibilité nulle la nuit.",
    status: "COMPLETED",
    contractorId: "c2",
    daysAgo: 28,
    citizenName: "Hélène Dupuis",
    citizenEmail: "h.dupuis@mail.fr",
    photos: 2,
  },
  {
    ref: 8,
    type: "SIDEWALK",
    address: "22 rue des Écoles",
    district: "Est",
    description: "Bordure de trottoir cassée gênant le passage des poussettes.",
    status: "IN_PROGRESS",
    contractorId: "c3",
    daysAgo: 22,
    citizenName: "Marion Leclerc",
    photos: 1,
  },
  {
    ref: 9,
    type: "DRAINAGE",
    address: "9 chemin du Moulin",
    district: "Nord",
    description: "Affaissement autour d'une bouche d'égout, eau stagnante permanente.",
    status: "IN_PROGRESS",
    contractorId: "c4",
    daysAgo: 20,
    citizenName: "Bruno Aubert",
    citizenEmail: "bruno.aubert@mail.fr",
    photos: 2,
  },
  {
    ref: 10,
    type: "POTHOLE",
    address: "45 rue de la Gare",
    district: "Centre",
    description: "Nid-de-poule qui s'agrandit à chaque intempérie, près de l'arrêt de bus.",
    status: "IN_PROGRESS",
    contractorId: "c1",
    daysAgo: 18,
    citizenName: "Inès Moreau",
    photos: 1,
  },
  {
    ref: 11,
    type: "PAVEMENT",
    address: "8 allée des Chênes",
    district: "Ouest",
    description: "Revêtement affaissé au niveau du passage des bus scolaires.",
    status: "ASSIGNED",
    contractorId: "c2",
    daysAgo: 14,
    citizenName: "Damien Prat",
    citizenEmail: "d.prat@mail.fr",
    photos: 2,
  },
  {
    ref: 12,
    type: "CRACK",
    address: "60 rue Jean Jaurès",
    district: "Sud",
    description: "Fissures multiples en toile d'araignée sur la voie de droite.",
    status: "ASSIGNED",
    contractorId: "c1",
    daysAgo: 12,
    citizenName: "Fatou Diallo",
    photos: 1,
  },
  {
    ref: 13,
    type: "SIDEWALK",
    address: "14 rue du Marché",
    district: "Centre",
    description: "Trottoir soulevé par les racines d'un platane.",
    status: "ASSIGNED",
    contractorId: "c3",
    daysAgo: 10,
    citizenName: "Olivier Chevalier",
    citizenEmail: "o.chevalier@mail.fr",
    photos: 2,
  },
  {
    ref: 14,
    type: "MARKING",
    address: "Rond-point des Acacias",
    district: "Nord",
    description: "Flèches directionnelles illisibles, confusion des automobilistes.",
    status: "VERIFIED",
    contractorId: null,
    daysAgo: 8,
    citizenName: "Sandrine Petit",
    photos: 1,
  },
  {
    ref: 15,
    type: "DRAINAGE",
    address: "27 rue des Peupliers",
    district: "Ouest",
    description: "Caniveau obstrué par des gravats depuis plusieurs semaines.",
    status: "VERIFIED",
    contractorId: null,
    daysAgo: 6,
    citizenName: "Antoine Rivière",
    citizenEmail: "a.riviere@mail.fr",
    photos: 2,
  },
  {
    ref: 16,
    type: "POTHOLE",
    address: "101 avenue de la Libération",
    district: "Sud",
    description: "Trou important en sortie de virage, plusieurs pneus crevés signalés.",
    status: "VERIFIED",
    contractorId: null,
    daysAgo: 5,
    citizenName: "Laura Sanchez",
    photos: 3,
  },
  {
    ref: 17,
    type: "OTHER",
    address: "2 rue du Stade",
    district: "Est",
    description: "Plaque de fonte descellée qui claque au passage des véhicules.",
    status: "CREATED",
    contractorId: null,
    daysAgo: 4,
    citizenName: "Mehdi Farid",
    citizenEmail: "mehdi.farid@mail.fr",
    photos: 1,
  },
  {
    ref: 18,
    type: "POTHOLE",
    address: "39 rue Camille Claudel",
    district: "Nord",
    description: "Nid-de-poule devant le garage, environ 40 cm de diamètre.",
    status: "CREATED",
    contractorId: null,
    daysAgo: 3,
    citizenName: "Céline Barbier",
    photos: 2,
  },
  {
    ref: 19,
    type: "PAVEMENT",
    address: "16 rue des Vignes",
    district: "Ouest",
    description: "Enrobé arraché sur la bande cyclable après les travaux de réseau.",
    status: "CREATED",
    contractorId: null,
    daysAgo: 2,
    citizenName: "Yann Le Goff",
    citizenEmail: "y.legoff@mail.fr",
    photos: 1,
  },
  {
    ref: 20,
    type: "SIDEWALK",
    address: "88 boulevard de la Paix",
    district: "Centre",
    description: "Trottoir effondré sur un mètre carré, barrières posées provisoirement.",
    status: "CREATED",
    contractorId: null,
    daysAgo: 1,
    citizenName: "Rachel Nunes",
    photos: 2,
  },
  {
    ref: 21,
    type: "OTHER",
    address: "Rue inconnue",
    district: "Centre",
    description: "Signalement incomplet, adresse non localisable.",
    status: "REJECTED",
    contractorId: null,
    daysAgo: 9,
    photos: 0,
  },
];

const REF_YEAR = 2026;
const NOW = new Date("2026-09-10T09:00:00.000Z").getTime();
const DAY = 86_400_000;

function iso(daysAgo: number, hourOffset = 0): string {
  return new Date(NOW - daysAgo * DAY + hourOffset * 3_600_000).toISOString();
}

function makePhotos(seed: Seed): Photo[] {
  return Array.from({ length: seed.photos }, (_, i) => ({
    id: `p-${seed.ref}-${i}`,
    label: `Photo citoyen ${i + 1}`,
    kind: "citizen" as const,
    seed: `${seed.ref}-${i}`,
  }));
}

const actors = {
  CITIZEN: "Citoyen",
  ADMIN: "Claire Fontaine",
  CONTRACTOR: "Équipe terrain",
};

function buildHistory(seed: Seed, contractorName: string): HistoryEntry[] {
  const entries: HistoryEntry[] = [
    {
      id: `h-${seed.ref}-0`,
      status: "CREATED",
      at: iso(seed.daysAgo),
      actor: seed.citizenName ?? "Citoyen anonyme",
      role: "CITIZEN",
      comment: "Demande déposée via le portail citoyen.",
    },
  ];

  if (seed.status === "REJECTED") {
    entries.push({
      id: `h-${seed.ref}-r`,
      status: "REJECTED",
      at: iso(seed.daysAgo - 1),
      actor: actors.ADMIN,
      role: "ADMIN",
      comment: "Demande rejetée : informations insuffisantes pour localiser le désordre.",
    });
    return entries;
  }

  const index = statusOrder.indexOf(seed.status);
  const comments: Partial<Record<RequestStatus, string>> = {
    VERIFIED: "Signalement vérifié sur le terrain par le service voirie.",
    ASSIGNED: `Intervention confiée à ${contractorName}.`,
    IN_PROGRESS: "Démarrage de l'intervention sur site.",
    COMPLETED: "Travaux terminés, photos de fin de chantier transmises.",
    CONTROLLED: "Contrôle qualité réalisé : intervention conforme.",
    CLOSED: "Demande clôturée et citoyen informé.",
  };
  const roles: Partial<Record<RequestStatus, "ADMIN" | "CONTRACTOR">> = {
    VERIFIED: "ADMIN",
    ASSIGNED: "ADMIN",
    IN_PROGRESS: "CONTRACTOR",
    COMPLETED: "CONTRACTOR",
    CONTROLLED: "ADMIN",
    CLOSED: "ADMIN",
  };

  for (let i = 1; i <= index; i++) {
    const status = statusOrder[i]!;
    const role = roles[status]!;
    entries.push({
      id: `h-${seed.ref}-${i}`,
      status,
      at: iso(seed.daysAgo - (i * seed.daysAgo) / (index + 1)),
      actor: role === "ADMIN" ? actors.ADMIN : contractorName,
      role,
      comment: comments[status],
    });
  }
  return entries;
}

export function buildRequests(contractorNames: Record<string, string>): RepairRequest[] {
  return seeds.map((seed) => {
    const contractorName =
      (seed.contractorId ? contractorNames[seed.contractorId] : undefined) ?? "—";
    const history = buildHistory(seed, contractorName);
    const last = history[history.length - 1]!;
    const photos = makePhotos(seed);
    const done = ["COMPLETED", "CONTROLLED", "CLOSED"].includes(seed.status);

    if (done) {
      photos.push(
        {
          id: `p-${seed.ref}-b`,
          label: "Avant intervention",
          kind: "before",
          seed: `${seed.ref}-b`,
        },
        {
          id: `p-${seed.ref}-a`,
          label: "Après intervention",
          kind: "after",
          seed: `${seed.ref}-a`,
        },
      );
    }

    return {
      id: `r${seed.ref}`,
      reference: `RR-${REF_YEAR}-${String(seed.ref).padStart(4, "0")}`,
      problemType: seed.type,
      address: seed.address,
      district: seed.district,
      description: seed.description,
      lat: 48.85 + seed.ref * 0.0031,
      lng: 2.34 + seed.ref * 0.0042,
      citizenName: seed.citizenName,
      citizenEmail: seed.citizenEmail,
      status: seed.status,
      contractorId: seed.contractorId,
      createdAt: iso(seed.daysAgo),
      updatedAt: last.at,
      closedAt: seed.status === "CLOSED" ? last.at : undefined,
      photos,
      history,
      dispatcherNotes:
        seed.status === "CREATED"
          ? []
          : [
              {
                id: `n-${seed.ref}-1`,
                at: iso(seed.daysAgo - 0.5),
                actor: actors.ADMIN,
                role: "ADMIN" as const,
                text: "Désordre confirmé lors de la tournée de contrôle du secteur.",
              },
            ],
      contractorNotes: done
        ? [
            {
              id: `n-${seed.ref}-2`,
              at: last.at,
              actor: contractorName,
              role: "CONTRACTOR" as const,
              text: "Découpe, purge et réfection en enrobé à chaud. Zone rendue à la circulation.",
            },
          ]
        : [],
      controlResult: ["CONTROLLED", "CLOSED"].includes(seed.status)
        ? {
            at: last.at,
            actor: actors.ADMIN,
            passed: true,
            comment: `Intervention conforme au cahier des charges (${statusLabels[seed.status]}).`,
          }
        : undefined,
    } satisfies RepairRequest;
  });
}
