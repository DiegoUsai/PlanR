import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
      client: "Ministero della Giustizia",
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
      client: "Regione Emilia-Romagna",
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
      client: "Comune di Bologna",
      amount: 120000,
      startDate: new Date("2026-06-01"),
      endDate: new Date("2027-05-31"),
      pmEffortPercentage: 4,
      applications: { connect: [{ id: fatturazione.id }] },
    },
  });
  console.log("3 contracts created");

  // Resources
  const resources = await Promise.all([
    prisma.resource.create({
      data: {
        name: "Rossi Marco", role: "TECH_LEAD", level: "SENIOR", type: "INTERNA",
        belonging: "BU_DOCUMENTALE", pool: "EVOLUTIVA_ADEGUATIVA", isPTF: true, attivo: true,
        joinDate: new Date("2020-03-01"),
        managedApps: { connect: [] },
      },
    }),
    prisma.resource.create({
      data: {
        name: "Bianchi Laura", role: "PM", level: "SENIOR", type: "INTERNA",
        belonging: "BU_DOCUMENTALE", pool: "EVOLUTIVA_ADEGUATIVA", isPTF: false, attivo: true,
        joinDate: new Date("2019-06-01"),
        managedApps: { connect: [{ id: sibarDoc.id }, { id: protocollo.id }] },
      },
    }),
    prisma.resource.create({
      data: {
        name: "Verdi Andrea", role: "FE", level: "MID", type: "INTERNA",
        belonging: "BU_DOCUMENTALE", pool: "EVOLUTIVA_ADEGUATIVA", isPTF: false, attivo: true,
        joinDate: new Date("2022-01-15"),
      },
    }),
    prisma.resource.create({
      data: {
        name: "Neri Sara", role: "FE", level: "JUNIOR", type: "INTERNA",
        belonging: "BU_DOCUMENTALE", pool: "EVOLUTIVA_ADEGUATIVA", isPTF: false, attivo: true,
        joinDate: new Date("2025-09-01"),
      },
    }),
    prisma.resource.create({
      data: {
        name: "Colombo Luca", role: "BE", level: "SENIOR", type: "INTERNA",
        belonging: "BU_DOCUMENTALE", pool: "EVOLUTIVA_ADEGUATIVA", isPTF: true, attivo: true,
        joinDate: new Date("2018-04-01"),
      },
    }),
    prisma.resource.create({
      data: {
        name: "Ferrari Elena", role: "BE", level: "MID", type: "INTERNA",
        belonging: "BU_DOCUMENTALE", pool: "EVOLUTIVA_ADEGUATIVA", isPTF: false, attivo: true,
        joinDate: new Date("2023-02-01"),
      },
    }),
    prisma.resource.create({
      data: {
        name: "Russo Paolo", role: "ANALISTA", level: "SENIOR", type: "INTERNA",
        belonging: "BU_DOCUMENTALE", pool: "EVOLUTIVA_ADEGUATIVA", isPTF: true, attivo: true,
        joinDate: new Date("2017-09-01"),
      },
    }),
    prisma.resource.create({
      data: {
        name: "Galli Chiara", role: "BA_SENIOR", level: "SENIOR", type: "INTERNA",
        belonging: "BU_DOCUMENTALE", pool: "EVOLUTIVA_ADEGUATIVA", isPTF: false, attivo: true,
        joinDate: new Date("2021-05-01"),
      },
    }),
    prisma.resource.create({
      data: {
        name: "Moretti Davide", role: "ARCHITETTO", level: "SENIOR", type: "INTERNA",
        belonging: "ENGINEERING_EXCELLENCE", pool: "EVOLUTIVA_ADEGUATIVA", isPTF: false, attivo: true,
        joinDate: new Date("2016-01-01"),
      },
    }),
    prisma.resource.create({
      data: {
        name: "Conti Alessia", role: "FE", level: "MID", type: "ESTERNA",
        belonging: "BU_DOCUMENTALE", pool: "EVOLUTIVA_ADEGUATIVA", isPTF: false, attivo: true,
        joinDate: new Date("2026-01-15"),
        notes: "Consulente XYZ Solutions",
      },
    }),
    prisma.resource.create({
      data: {
        name: "Ricci Matteo", role: "BE", level: "MID", type: "INTERNA",
        belonging: "BU_DOCUMENTALE", pool: "MANUTENZIONE", isPTF: false, attivo: true,
        joinDate: new Date("2021-11-01"),
      },
    }),
    prisma.resource.create({
      data: {
        name: "Lombardi Anna", role: "ANALISTA", level: "MID", type: "INTERNA",
        belonging: "BU_DOCUMENTALE", pool: "MANUTENZIONE", isPTF: false, attivo: true,
        joinDate: new Date("2024-03-01"),
      },
    }),
  ]);
  console.log(`${resources.length} resources created`);

  // Resource Parameters
  for (const r of resources) {
    const isJunior = r.level === "JUNIOR";
    const isSenior = r.level === "SENIOR";
    const isPTF = r.isPTF;
    const isExternal = r.type === "ESTERNA";

    await prisma.resourceParameter.create({
      data: {
        resourceId: r.id,
        weeklyHours: 40,
        dailyCost: isExternal ? 350 : isJunior ? 180 : isSenior ? 300 : 240,
        productivityCoeff: isJunior ? 1.3 : isSenior ? 0.85 : 1.0,
        weeklyHoursBuffer: isPTF ? 16 : null,
        contractEndDate: isExternal ? new Date("2027-06-30") : null,
        validFrom: new Date("2026-01-01"),
        validTo: null,
      },
    });
  }
  console.log("Resource parameters created");

  // Initiatives
  const mevFirma = await prisma.initiative.create({
    data: {
      applicationId: sibarDoc.id,
      moduleId: modFirma.id,
      contractId: contrattoPA.id,
      jiraEpicId: "DOC-142",
      title: "Firma massiva documenti con OTP",
      description: "Implementazione firma massiva con autenticazione OTP per lotti fino a 500 documenti",
      type: "MEV",
      priority: "ALTA",
      desiredStartDate: new Date("2026-09-01"),
      desiredEndDate: new Date("2026-11-15"),
      estimatedDays: 45,
      requiredProfiles: "2 FE, 1 BE, 1 Analista",
      status: "ALLOCATO",
      sizingSize: "L",
      polarity: "PRIMA_META",
      affidabilitaStima: "MEDIA",
      economicValue: "FROM_20K_TO_30K",
    },
  });

  const madProtocollo = await prisma.initiative.create({
    data: {
      applicationId: protocollo.id,
      moduleId: modPEC.id,
      contractId: contrattoPA.id,
      jiraEpicId: "DOC-158",
      title: "Adeguamento PEC a standard AgID 2026",
      description: "Adeguamento modulo PEC alle nuove linee guida AgID sulla interoperabilita",
      type: "MAD",
      priority: "ALTA",
      desiredEndDate: new Date("2026-10-31"),
      estimatedDays: 25,
      requiredProfiles: "1 BE, 1 Analista",
      status: "IN_LAVORAZIONE",
      sizingSize: "M",
      polarity: "SECONDA_META",
      affidabilitaStima: "BASSA",
      vincoliCriticita: "Dipendenza da specifiche AgID in fase di finalizzazione",
      economicValue: "FROM_10K_TO_15K",
    },
  });

  const mevConservazione = await prisma.initiative.create({
    data: {
      applicationId: conservazione.id,
      contractId: contrattoEnte.id,
      jiraEpicId: "DOC-167",
      title: "Migrazione formato conservazione a UNI 11386:2025",
      type: "MEV",
      priority: "MEDIA",
      desiredEndDate: new Date("2027-01-31"),
      estimatedDays: 60,
      requiredProfiles: "2 BE, 1 FE, 1 Analista, 1 Architetto",
      status: "IN_ATTESA_DI_ALLOCAZIONE",
      sizingSize: "XL",
      polarity: "PRIMA_META",
      affidabilitaStima: "BASSA",
      vincoliCriticita: "Standard UNI 11386:2025 non ancora ratificato, possibili revisioni",
      reuseFlag: true,
      economicValue: "FROM_30K_TO_40K",
    },
  });

  const softLockInit = await prisma.initiative.create({
    data: {
      applicationId: fatturazione.id,
      contractId: contrattoFatt.id,
      jiraEpicId: "DOC-175",
      title: "Integrazione SDI v2 per fatturazione B2B",
      type: "MEV",
      priority: "MEDIA",
      desiredEndDate: new Date("2027-03-31"),
      estimatedDays: 35,
      requiredProfiles: "1 FE, 2 BE",
      status: "IN_ATTESA_COPERTURA_CONTRATTUALE",
      sizingSize: "M",
      economicValue: "FROM_15K_TO_20K",
    },
  });

  const pendingInit = await prisma.initiative.create({
    data: {
      applicationId: sibarDoc.id,
      moduleId: modWorkflow.id,
      contractId: contrattoPA.id,
      jiraEpicId: "DOC-180",
      title: "Workflow approvativo multi-livello con delega",
      type: "MEV",
      priority: "BASSA",
      desiredEndDate: new Date("2027-02-28"),
      estimatedDays: 40,
      requiredProfiles: "2 FE, 1 BE, 1 BA Senior",
      status: "READY_PENDING_RESOURCES",
      sizingSize: "L",
      economicValue: "FROM_20K_TO_30K",
    },
  });
  console.log("5 initiatives created");

  // Allocations
  const [rossi, bianchi, verdi, neri, colombo, ferrari, russo, galli, moretti, conti, ricci, lombardi] = resources;

  await Promise.all([
    // Firma massiva - hard allocations
    prisma.allocation.create({
      data: {
        initiativeId: mevFirma.id,
        resourceId: verdi.id,
        lockType: "HARD",
        allocationPercentage: 60,
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-11-15"),
        allocatedEffortDays: 20,
        roleInInitiative: "FE",
      },
    }),
    prisma.allocation.create({
      data: {
        initiativeId: mevFirma.id,
        resourceId: neri.id,
        lockType: "HARD",
        allocationPercentage: 40,
        startDate: new Date("2026-09-15"),
        endDate: new Date("2026-11-15"),
        allocatedEffortDays: 12,
        roleInInitiative: "FE",
        affiancamento: true,
        isSeniorAffiancamento: false,
      },
    }),
    prisma.allocation.create({
      data: {
        initiativeId: mevFirma.id,
        resourceId: verdi.id,
        lockType: "HARD",
        allocationPercentage: 20,
        startDate: new Date("2026-09-15"),
        endDate: new Date("2026-10-15"),
        allocatedEffortDays: 3,
        roleInInitiative: "FE",
        affiancamento: true,
        isSeniorAffiancamento: true,
        notes: "Affiancamento senior per Neri su firma massiva",
      },
    }),
    prisma.allocation.create({
      data: {
        initiativeId: mevFirma.id,
        resourceId: colombo.id,
        lockType: "HARD",
        allocationPercentage: 50,
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-11-15"),
        allocatedEffortDays: 18,
        roleInInitiative: "BE",
      },
    }),
    prisma.allocation.create({
      data: {
        initiativeId: mevFirma.id,
        resourceId: russo.id,
        lockType: "HARD",
        allocationPercentage: 30,
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-10-15"),
        allocatedEffortDays: 8,
        roleInInitiative: "ANALISTA",
      },
    }),

    // Adeguamento PEC
    prisma.allocation.create({
      data: {
        initiativeId: madProtocollo.id,
        resourceId: ferrari.id,
        lockType: "HARD",
        allocationPercentage: 80,
        startDate: new Date("2026-08-18"),
        endDate: new Date("2026-10-31"),
        allocatedEffortDays: 20,
        roleInInitiative: "BE",
      },
    }),
    prisma.allocation.create({
      data: {
        initiativeId: madProtocollo.id,
        resourceId: russo.id,
        lockType: "HARD",
        allocationPercentage: 40,
        startDate: new Date("2026-08-18"),
        endDate: new Date("2026-09-30"),
        allocatedEffortDays: 10,
        roleInInitiative: "ANALISTA",
      },
    }),

    // Soft lock - SDI v2 (softLockExpiry on allocation now)
    prisma.allocation.create({
      data: {
        initiativeId: softLockInit.id,
        resourceId: conti.id,
        lockType: "SOFT",
        softLockExpiry: new Date("2026-10-15"),
        allocationPercentage: 50,
        startDate: new Date("2026-11-01"),
        endDate: new Date("2027-02-28"),
        allocatedEffortDays: 15,
        roleInInitiative: "FE",
      },
    }),
    prisma.allocation.create({
      data: {
        initiativeId: softLockInit.id,
        resourceId: colombo.id,
        lockType: "SOFT",
        softLockExpiry: new Date("2026-10-15"),
        allocationPercentage: 40,
        startDate: new Date("2026-11-15"),
        endDate: new Date("2027-03-15"),
        allocatedEffortDays: 20,
        roleInInitiative: "BE",
      },
    }),
  ]);
  console.log("9 allocations created");

  // Absences
  await Promise.all([
    prisma.absence.create({
      data: {
        resourceId: verdi.id, startDate: new Date("2026-09-08"),
        endDate: new Date("2026-09-08"), type: "FERIE", hours: 8,
      },
    }),
    prisma.absence.create({
      data: {
        resourceId: verdi.id, startDate: new Date("2026-09-09"),
        endDate: new Date("2026-09-09"), type: "FERIE", hours: 8,
      },
    }),
    prisma.absence.create({
      data: {
        resourceId: colombo.id, startDate: new Date("2026-09-15"),
        endDate: new Date("2026-09-15"), type: "FERIE", hours: 8,
      },
    }),
    prisma.absence.create({
      data: {
        resourceId: colombo.id, startDate: new Date("2026-09-16"),
        endDate: new Date("2026-09-16"), type: "FERIE", hours: 8,
      },
    }),
    prisma.absence.create({
      data: {
        resourceId: colombo.id, startDate: new Date("2026-09-17"),
        endDate: new Date("2026-09-17"), type: "FERIE", hours: 8,
      },
    }),
    prisma.absence.create({
      data: {
        resourceId: ferrari.id, startDate: new Date("2026-09-22"),
        endDate: new Date("2026-09-22"), type: "PERMESSO", hours: 4,
      },
    }),
    prisma.absence.create({
      data: {
        resourceId: russo.id, startDate: new Date("2026-10-05"),
        endDate: new Date("2026-10-05"), type: "FERIE", hours: 8,
      },
    }),
    prisma.absence.create({
      data: {
        resourceId: russo.id, startDate: new Date("2026-10-06"),
        endDate: new Date("2026-10-06"), type: "FERIE", hours: 8,
      },
    }),
    prisma.absence.create({
      data: {
        resourceId: russo.id, startDate: new Date("2026-10-07"),
        endDate: new Date("2026-10-07"), type: "FERIE", hours: 8,
      },
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
