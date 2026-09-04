import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("Seeding database...");

  const config = await prisma.bUConfiguration.create({
    data: {
      annualBudget: 2500000,
      weeklyHoursBuffer: 8,
      saturationMin: 75,
      saturationMax: 85,
      saturationAlarm: 90,
    },
  });
  console.log("BU Configuration created");

  // Clients
  const clientMinistero = await prisma.client.create({
    data: { slug: slugify("Ministero della Giustizia"), name: "Ministero della Giustizia" },
  });
  const clientRegione = await prisma.client.create({
    data: { slug: slugify("Regione Emilia-Romagna"), name: "Regione Emilia-Romagna" },
  });
  const clientComune = await prisma.client.create({
    data: { slug: slugify("Comune di Bologna"), name: "Comune di Bologna" },
  });
  console.log("3 clients created");

  // Applications
  const sibarDoc = await prisma.application.create({
    data: { name: "SibarDoc", description: "Sistema documentale per la PA" },
  });

  const protocollo = await prisma.application.create({
    data: { name: "Protocollo Informatico", description: "Gestione protocollo enti pubblici" },
  });

  const conservazione = await prisma.application.create({
    data: { name: "Conservazione Digitale", description: "Conservazione a norma dei documenti digitali" },
  });

  const fatturazione = await prisma.application.create({
    data: { name: "Fatturazione Elettronica", description: "Gestione fatture PA e B2B" },
  });
  console.log("4 applications created");

  // Modules
  const modFirma = await prisma.module.create({
    data: { applicationId: sibarDoc.id, name: "Firma Digitale", description: "Modulo firma digitale e massiva" },
  });
  const modConservazione = await prisma.module.create({
    data: { applicationId: sibarDoc.id, name: "Conservazione", description: "Integrazione con sistema di conservazione" },
  });
  const modWorkflow = await prisma.module.create({
    data: { applicationId: sibarDoc.id, name: "Workflow", description: "Motore di workflow documentale" },
  });
  const modPEC = await prisma.module.create({
    data: { applicationId: protocollo.id, name: "Integrazione PEC", description: "Ricezione e invio PEC" },
  });
  console.log("4 modules created");

  // Contracts
  const contrattoPA = await prisma.contract.create({
    data: {
      identifier: "CTR-2026-001",
      type: "SUBAPPALTO",
      clientSlug: clientMinistero.slug,
      amount: 450000,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      pmEffortPercentage: 5,
      applications: { connect: [{ id: sibarDoc.id }, { id: protocollo.id }] },
    },
  });

  const contrattoEnte = await prisma.contract.create({
    data: {
      identifier: "CTR-2026-002",
      type: "APPALTO",
      clientSlug: clientRegione.slug,
      amount: 280000,
      startDate: new Date("2026-03-01"),
      endDate: new Date("2027-02-28"),
      pmEffortPercentage: 3,
      applications: { connect: [{ id: conservazione.id }] },
    },
  });

  const contrattoFatt = await prisma.contract.create({
    data: {
      identifier: "CTR-2026-003",
      type: "APPALTO",
      clientSlug: clientComune.slug,
      amount: 120000,
      startDate: new Date("2026-06-01"),
      endDate: new Date("2027-05-31"),
      pmEffortPercentage: 4,
      applications: { connect: [{ id: fatturazione.id }] },
    },
  });
  console.log("3 contracts created");

  // Resources (lastName firstName format — matches Factorial CSV convention)
  const resources = await Promise.all([
    prisma.resource.create({
      data: {
        lastName: "Rossi", firstName: "Marco", employeeId: "EMP-001",
        type: "INTERNA", belonging: "BU_DOCUMENTALE",
        isPTF: true, attivo: true, joinDate: new Date("2020-03-01"),
      },
    }),
    prisma.resource.create({
      data: {
        lastName: "Bianchi", firstName: "Laura", employeeId: "EMP-002",
        type: "INTERNA", belonging: "BU_DOCUMENTALE",
        isPTF: false, attivo: true, joinDate: new Date("2019-06-01"),
        managedApps: { connect: [{ id: sibarDoc.id }, { id: protocollo.id }] },
      },
    }),
    prisma.resource.create({
      data: {
        lastName: "Verdi", firstName: "Andrea", employeeId: "EMP-003",
        type: "INTERNA", belonging: "BU_DOCUMENTALE",
        isPTF: false, attivo: true, joinDate: new Date("2022-01-15"),
      },
    }),
    prisma.resource.create({
      data: {
        lastName: "Neri", firstName: "Sara", employeeId: "EMP-004",
        type: "INTERNA", belonging: "BU_DOCUMENTALE",
        isPTF: false, attivo: true, joinDate: new Date("2025-09-01"),
      },
    }),
    prisma.resource.create({
      data: {
        lastName: "Colombo", firstName: "Luca", employeeId: "EMP-005",
        type: "INTERNA", belonging: "BU_DOCUMENTALE",
        isPTF: true, attivo: true, joinDate: new Date("2018-04-01"),
      },
    }),
    prisma.resource.create({
      data: {
        lastName: "Ferrari", firstName: "Elena", employeeId: "EMP-006",
        type: "INTERNA", belonging: "BU_DOCUMENTALE",
        isPTF: false, attivo: true, joinDate: new Date("2023-02-01"),
      },
    }),
    prisma.resource.create({
      data: {
        lastName: "Russo", firstName: "Paolo", employeeId: "EMP-007",
        type: "INTERNA", belonging: "BU_DOCUMENTALE",
        isPTF: true, attivo: true, joinDate: new Date("2017-09-01"),
      },
    }),
    prisma.resource.create({
      data: {
        lastName: "Galli", firstName: "Chiara", employeeId: "EMP-008",
        type: "INTERNA", belonging: "BU_DOCUMENTALE",
        isPTF: false, attivo: true, joinDate: new Date("2021-05-01"),
      },
    }),
    prisma.resource.create({
      data: {
        lastName: "Moretti", firstName: "Davide", employeeId: "EMP-009",
        type: "INTERNA", belonging: "ENGINEERING_EXCELLENCE",
        isPTF: false, attivo: true, joinDate: new Date("2016-01-01"),
      },
    }),
    prisma.resource.create({
      data: {
        lastName: "Conti", firstName: "Alessia",
        type: "ESTERNA", belonging: "BU_DOCUMENTALE",
        isPTF: false, attivo: true, joinDate: new Date("2026-01-15"),
        notes: "Consulente XYZ Solutions",
      },
    }),
    prisma.resource.create({
      data: {
        lastName: "Ricci", firstName: "Matteo", employeeId: "EMP-010",
        type: "INTERNA", belonging: "BU_DOCUMENTALE",
        isPTF: false, attivo: true, joinDate: new Date("2021-11-01"),
      },
    }),
    prisma.resource.create({
      data: {
        lastName: "Lombardi", firstName: "Anna", employeeId: "EMP-011",
        type: "INTERNA", belonging: "BU_DOCUMENTALE",
        isPTF: false, attivo: true, joinDate: new Date("2024-03-01"),
      },
    }),
  ]);
  console.log(`${resources.length} resources created`);

  // Resource Parameters (role + level are temporalized here)
  const resourceParams: { role: string; level: string }[] = [
    { role: "TECH_LEADER", level: "SENIOR" },          // Rossi Marco
    { role: "PROJECT_MANAGER", level: "SENIOR" },      // Bianchi Laura
    { role: "DEVELOPER", level: "MID" },               // Verdi Andrea
    { role: "DEVELOPER", level: "JUNIOR" },            // Neri Sara
    { role: "SENIOR_DEV", level: "SENIOR" },           // Colombo Luca
    { role: "DEVELOPER", level: "MID" },               // Ferrari Elena
    { role: "ANALISTA_FUNZIONALE", level: "SENIOR" },  // Russo Paolo
    { role: "ANALISTA_HD1", level: "SENIOR" },         // Galli Chiara
    { role: "ARCHITECT", level: "SENIOR" },            // Moretti Davide
    { role: "UI_UX", level: "MID" },                   // Conti Alessia
    { role: "DEVOPS", level: "MID" },                  // Ricci Matteo
    { role: "ANALISTA_HD2", level: "MID" },            // Lombardi Anna
  ];

  for (let i = 0; i < resources.length; i++) {
    const r = resources[i];
    const { role, level } = resourceParams[i];
    const isJunior = level === "JUNIOR";
    const isSenior = level === "SENIOR";
    const isExternal = r.type === "ESTERNA";

    await prisma.resourceParameter.create({
      data: {
        resourceId: r.id,
        role: role as never,
        level: level as never,
        weeklyHours: 40,
        dailyCost: isExternal ? 350 : isJunior ? 180 : isSenior ? 300 : 240,
        productivityCoeff: isJunior ? 1.3 : isSenior ? 0.85 : 1.0,
        weeklyHoursBuffer: r.isPTF ? 16 : null,
        validFrom: new Date("2026-01-01"),
        validTo: null,
      },
    });
  }
  console.log("Resource parameters created");

  // Initiatives: created via Jira CSV import, not seeded

  // Absences (single-day model, source defaults to FACTORIAL)
  const [, , verdi, , colombo, ferrari, russo] = resources;
  await Promise.all([
    prisma.absence.create({
      data: { resourceId: verdi.id, date: new Date("2026-09-08"), type: "FERIE", hours: 8 },
    }),
    prisma.absence.create({
      data: { resourceId: verdi.id, date: new Date("2026-09-09"), type: "FERIE", hours: 8 },
    }),
    prisma.absence.create({
      data: { resourceId: colombo.id, date: new Date("2026-09-15"), type: "FERIE", hours: 8 },
    }),
    prisma.absence.create({
      data: { resourceId: colombo.id, date: new Date("2026-09-16"), type: "FERIE", hours: 8 },
    }),
    prisma.absence.create({
      data: { resourceId: colombo.id, date: new Date("2026-09-17"), type: "FERIE", hours: 8 },
    }),
    prisma.absence.create({
      data: { resourceId: ferrari.id, date: new Date("2026-09-22"), type: "PERMESSO", hours: 4 },
    }),
    prisma.absence.create({
      data: { resourceId: russo.id, date: new Date("2026-10-05"), type: "FERIE", hours: 8 },
    }),
    prisma.absence.create({
      data: { resourceId: russo.id, date: new Date("2026-10-06"), type: "FERIE", hours: 8 },
    }),
    prisma.absence.create({
      data: { resourceId: russo.id, date: new Date("2026-10-07"), type: "FERIE", hours: 8 },
    }),
  ]);
  console.log("9 absences created");

  console.log("Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
