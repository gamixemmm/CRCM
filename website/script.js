const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const languageButtons = document.querySelectorAll("[data-lang]");

const translations = {
  fr: {
    "meta.title": "AtlasDrive | Logiciel de location de voitures au Maroc",
    "meta.description": "AtlasDrive est une plateforme SaaS pour les agences de location de voitures au Maroc: flotte, reservations, factures, paiements, maintenance et reporting.",
    "brand.home": "Accueil AtlasDrive",
    "nav.toggle": "Ouvrir le menu",
    "nav.platform": "Plateforme",
    "nav.workflow": "Flux de travail",
    "nav.pricing": "Offres",
    "nav.contact": "Contact",
    "lang.label": "Choisir la langue",
    "cta.demo": "Demander une demo",
    "hero.eyebrow": "SaaS marocain pour agences de location",
    "hero.copy": "Gere les reservations, la flotte, les factures, les paiements en MAD et la maintenance depuis une seule plateforme concue pour les agences marocaines.",
    "hero.primary": "Planifier une demo",
    "hero.secondary": "Voir la plateforme",
    "hero.metricsLabel": "Points forts AtlasDrive",
    "hero.metric1Title": "MAD",
    "hero.metric1Text": "paiements et soldes",
    "hero.metric2Title": "Live",
    "hero.metric2Text": "disponibilite flotte",
    "hero.metric3Title": "Multi",
    "hero.metric3Text": "equipes et roles",
    "proof.label": "Operations couvertes",
    "proof.bookings": "Reservations",
    "proof.fleet": "Flotte",
    "proof.invoices": "Factures",
    "proof.payments": "Paiements",
    "proof.maintenance": "Maintenance",
    "proof.reports": "Rapports",
    "platform.eyebrow": "Plateforme",
    "platform.title": "Tout ce qu'il faut pour piloter une agence de location au Maroc.",
    "platform.copy": "AtlasDrive garde le comptoir, le gestionnaire de flotte et la facturation sur le meme dossier operationnel.",
    "feature.bookingTitle": "Reservations maitrisees",
    "feature.bookingCopy": "Suivez les dates de depart et retour, conducteurs, courtiers, statuts, prolongations et retards.",
    "feature.fleetTitle": "Flotte disponible",
    "feature.fleetCopy": "Visualisez les vehicules disponibles, loues, en maintenance, ou bloques par assurance et visite technique.",
    "feature.invoiceTitle": "Factures en MAD",
    "feature.invoiceCopy": "Enregistrez avances, paiements partiels, soldes dus, credits clients et extensions de location.",
    "feature.maintenanceTitle": "Maintenance visible",
    "feature.maintenanceCopy": "Controlez reparations, kilometrage, couts, prestataires et indisponibilites avant qu'elles affectent les reservations.",
    "workflow.eyebrow": "Flux de travail",
    "workflow.title": "Du devis au retour du vehicule, tout reste synchronise.",
    "workflow.copy": "AtlasDrive suit le cycle reel d'une agence: reserver, encaisser, livrer, ajuster les dates, mettre a jour la facture et cloturer avec le kilometrage final.",
    "workflow.step1Title": "Reserver",
    "workflow.step1Copy": "Choisissez un vehicule, ajoutez conducteurs et lieux, puis creez la reservation.",
    "workflow.step2Title": "Encaisser",
    "workflow.step2Copy": "Generez la facture, ajoutez les paiements et gardez les soldes visibles.",
    "workflow.step3Title": "Operer",
    "workflow.step3Copy": "Gerez departs anticipes, retours tardifs, maintenance et disponibilite en temps reel.",
    "workflow.step4Title": "Analyser",
    "workflow.step4Copy": "Consultez revenus, restes a payer, usage vehicules et alertes importantes.",
    "pricing.eyebrow": "Offres",
    "pricing.title": "Des formules simples pour les agences marocaines.",
    "pricing.copy": "Commencez avec l'exploitation quotidienne, puis ajoutez reporting avance, roles et multi-societes quand votre activite grandit.",
    "pricing.launchTitle": "Demarrage",
    "pricing.launchSub": "Petites flottes",
    "pricing.launch1": "Reservations et statuts vehicules",
    "pricing.launch2": "Factures et paiements",
    "pricing.launch3": "Clients, courtiers et conducteurs",
    "pricing.operateTitle": "Exploitation",
    "pricing.operateSub": "Agences actives",
    "pricing.operate1": "Maintenance et alertes",
    "pricing.operate2": "Revenus et restes a payer",
    "pricing.operate3": "Comptes equipe et permissions",
    "pricing.scaleTitle": "Croissance",
    "pricing.scaleSub": "Multi-equipes",
    "pricing.scale1": "Structure multi-societes",
    "pricing.scale2": "Flux adaptes a votre agence",
    "pricing.scale3": "Accompagnement prioritaire",
    "contact.eyebrow": "Contact",
    "contact.title": "Equipez votre agence avec AtlasDrive.",
    "contact.copy": "Indiquez la taille de votre flotte et vos priorites. La demonstration peut se concentrer sur les reservations, paiements, maintenance ou reporting.",
    "form.name": "Nom",
    "form.email": "Email professionnel",
    "form.fleet": "Taille de la flotte",
    "form.message": "Sur quoi doit porter la demo ?",
    "form.submit": "Demander une demo",
    "footer.text": "Logiciel de gestion pour agences de location au Maroc",
  },
  ar: {
    "meta.title": "AtlasDrive | برنامج كراء السيارات في المغرب",
    "meta.description": "AtlasDrive منصة SaaS لوكالات كراء السيارات في المغرب: الأسطول، الحجوزات، الفواتير، الدفعات، الصيانة والتقارير.",
    "brand.home": "الرئيسية AtlasDrive",
    "nav.toggle": "فتح القائمة",
    "nav.platform": "المنصة",
    "nav.workflow": "سير العمل",
    "nav.pricing": "العروض",
    "nav.contact": "اتصال",
    "lang.label": "اختيار اللغة",
    "cta.demo": "اطلب عرضا تجريبيا",
    "hero.eyebrow": "منصة مغربية لوكالات كراء السيارات",
    "hero.copy": "دبر الحجوزات، الأسطول، الفواتير، الدفعات بالدرهم المغربي والصيانة من منصة واحدة مصممة لوكالات الكراء في المغرب.",
    "hero.primary": "برمج عرضا تجريبيا",
    "hero.secondary": "اكتشف المنصة",
    "hero.metricsLabel": "نقاط قوة AtlasDrive",
    "hero.metric1Title": "MAD",
    "hero.metric1Text": "الدفعات والأرصدة",
    "hero.metric2Title": "مباشر",
    "hero.metric2Text": "توفر الأسطول",
    "hero.metric3Title": "متعدد",
    "hero.metric3Text": "فرق وصلاحيات",
    "proof.label": "العمليات المدعومة",
    "proof.bookings": "الحجوزات",
    "proof.fleet": "الأسطول",
    "proof.invoices": "الفواتير",
    "proof.payments": "الدفعات",
    "proof.maintenance": "الصيانة",
    "proof.reports": "التقارير",
    "platform.eyebrow": "المنصة",
    "platform.title": "كل ما تحتاجه لتسيير وكالة كراء سيارات في المغرب.",
    "platform.copy": "AtlasDrive يربط المكتب، مسؤول الأسطول والمحاسبة في نفس السجل التشغيلي.",
    "feature.bookingTitle": "تحكم في الحجوزات",
    "feature.bookingCopy": "تتبع تواريخ الانطلاق والرجوع، السائقين، الوسطاء، الحالات، التمديدات والتأخير.",
    "feature.fleetTitle": "وضوح الأسطول",
    "feature.fleetCopy": "اعرف السيارات المتاحة، المكراة، في الصيانة أو المتوقفة بسبب التأمين والفحص التقني.",
    "feature.invoiceTitle": "فواتير بالدرهم",
    "feature.invoiceCopy": "سجل التسبيقات، الدفعات الجزئية، المبالغ المتبقية، رصيد العميل وتمديدات الكراء.",
    "feature.maintenanceTitle": "صيانة واضحة",
    "feature.maintenanceCopy": "راقب الإصلاحات، الكيلومترات، التكاليف، المزودين وفترات التوقف قبل أن تؤثر على الحجوزات.",
    "workflow.eyebrow": "سير العمل",
    "workflow.title": "من الحجز إلى إرجاع السيارة، كل شيء يبقى متزامنا.",
    "workflow.copy": "AtlasDrive يتبع الدورة الحقيقية للوكالة: حجز، استخلاص، تسليم، تعديل التواريخ، تحديث الفاتورة وإغلاق الملف مع الكيلومترات النهائية.",
    "workflow.step1Title": "احجز",
    "workflow.step1Copy": "اختر السيارة، أضف السائقين والأماكن، ثم أنشئ الحجز.",
    "workflow.step2Title": "استخلص",
    "workflow.step2Copy": "أنشئ الفاتورة، أضف الدفعات، واترك الأرصدة واضحة للفريق.",
    "workflow.step3Title": "شغل",
    "workflow.step3Copy": "دبر الانطلاق المبكر، الرجوع المتأخر، الصيانة والتوفر في الوقت الحقيقي.",
    "workflow.step4Title": "حلل",
    "workflow.step4Copy": "راجع المداخيل، الباقي استخلاصه، استعمال السيارات والتنبيهات المهمة.",
    "pricing.eyebrow": "العروض",
    "pricing.title": "عروض بسيطة لوكالات الكراء المغربية.",
    "pricing.copy": "ابدأ بالتسيير اليومي، ثم أضف التقارير المتقدمة، الأدوار وتعدد الشركات عندما يكبر نشاطك.",
    "pricing.launchTitle": "البداية",
    "pricing.launchSub": "أساطيل صغيرة",
    "pricing.launch1": "الحجوزات وحالات السيارات",
    "pricing.launch2": "الفواتير والدفعات",
    "pricing.launch3": "العملاء، الوسطاء والسائقون",
    "pricing.operateTitle": "التشغيل",
    "pricing.operateSub": "وكالات نشيطة",
    "pricing.operate1": "الصيانة والتنبيهات",
    "pricing.operate2": "المداخيل والباقي استخلاصه",
    "pricing.operate3": "حسابات الفريق والصلاحيات",
    "pricing.scaleTitle": "النمو",
    "pricing.scaleSub": "فرق متعددة",
    "pricing.scale1": "هيكلة متعددة الشركات",
    "pricing.scale2": "مسارات عمل حسب وكالتك",
    "pricing.scale3": "مواكبة بأولوية",
    "contact.eyebrow": "اتصال",
    "contact.title": "جهز وكالتك مع AtlasDrive.",
    "contact.copy": "شارك حجم أسطولك وأولوياتك. يمكن تخصيص العرض للحجوزات، الدفعات، الصيانة أو التقارير.",
    "form.name": "الاسم",
    "form.email": "البريد المهني",
    "form.fleet": "حجم الأسطول",
    "form.message": "على ماذا يجب أن يركز العرض؟",
    "form.submit": "اطلب عرضا تجريبيا",
    "footer.text": "برنامج تسيير لوكالات كراء السيارات في المغرب",
  },
  en: {
    "meta.title": "AtlasDrive | Car rental software for Morocco",
    "meta.description": "AtlasDrive is a SaaS platform for car rental agencies in Morocco: fleet, bookings, invoices, payments, maintenance, and reporting.",
    "brand.home": "AtlasDrive home",
    "nav.toggle": "Open menu",
    "nav.platform": "Platform",
    "nav.workflow": "Workflow",
    "nav.pricing": "Plans",
    "nav.contact": "Contact",
    "lang.label": "Choose language",
    "cta.demo": "Request demo",
    "hero.eyebrow": "Morocco-ready SaaS for rental agencies",
    "hero.copy": "Manage bookings, fleet, invoices, MAD payments, and maintenance from one platform built for Moroccan rental operators.",
    "hero.primary": "Schedule a demo",
    "hero.secondary": "View platform",
    "hero.metricsLabel": "AtlasDrive highlights",
    "hero.metric1Title": "MAD",
    "hero.metric1Text": "payments and balances",
    "hero.metric2Title": "Live",
    "hero.metric2Text": "fleet availability",
    "hero.metric3Title": "Multi",
    "hero.metric3Text": "teams and roles",
    "proof.label": "Operations covered",
    "proof.bookings": "Bookings",
    "proof.fleet": "Fleet",
    "proof.invoices": "Invoices",
    "proof.payments": "Payments",
    "proof.maintenance": "Maintenance",
    "proof.reports": "Reports",
    "platform.eyebrow": "Platform",
    "platform.title": "Everything needed to run a car rental agency in Morocco.",
    "platform.copy": "AtlasDrive keeps the rental desk, fleet manager, and billing team working from the same operational record.",
    "feature.bookingTitle": "Controlled bookings",
    "feature.bookingCopy": "Track pickup and return dates, drivers, brokers, statuses, extensions, and late returns.",
    "feature.fleetTitle": "Fleet visibility",
    "feature.fleetCopy": "See vehicles that are available, rented, in maintenance, or blocked by insurance and inspection deadlines.",
    "feature.invoiceTitle": "MAD invoicing",
    "feature.invoiceCopy": "Record deposits, partial payments, due balances, customer credits, and rental extensions.",
    "feature.maintenanceTitle": "Visible maintenance",
    "feature.maintenanceCopy": "Control repairs, mileage, costs, providers, and downtime before they affect reservations.",
    "workflow.eyebrow": "Workflow",
    "workflow.title": "From quote to vehicle return, everything stays in sync.",
    "workflow.copy": "AtlasDrive follows the real agency cycle: reserve, collect payment, hand over, adjust dates, update the invoice, and close with final mileage.",
    "workflow.step1Title": "Reserve",
    "workflow.step1Copy": "Choose a vehicle, add drivers and locations, then create the booking.",
    "workflow.step2Title": "Collect",
    "workflow.step2Copy": "Generate the invoice, add payments, and keep balances visible.",
    "workflow.step3Title": "Operate",
    "workflow.step3Copy": "Handle early pickups, late returns, maintenance, and availability in real time.",
    "workflow.step4Title": "Analyze",
    "workflow.step4Copy": "Review revenue, unpaid balances, vehicle usage, and important alerts.",
    "pricing.eyebrow": "Plans",
    "pricing.title": "Simple plans for Moroccan rental agencies.",
    "pricing.copy": "Start with daily operations, then add advanced reporting, roles, and multi-company controls as you grow.",
    "pricing.launchTitle": "Launch",
    "pricing.launchSub": "Small fleets",
    "pricing.launch1": "Bookings and vehicle statuses",
    "pricing.launch2": "Invoices and payments",
    "pricing.launch3": "Customers, brokers, and drivers",
    "pricing.operateTitle": "Operate",
    "pricing.operateSub": "Active agencies",
    "pricing.operate1": "Maintenance and alerts",
    "pricing.operate2": "Revenue and due balances",
    "pricing.operate3": "Team accounts and permissions",
    "pricing.scaleTitle": "Scale",
    "pricing.scaleSub": "Multi-team growth",
    "pricing.scale1": "Multi-company structure",
    "pricing.scale2": "Workflows adapted to your agency",
    "pricing.scale3": "Priority implementation",
    "contact.eyebrow": "Contact",
    "contact.title": "Bring AtlasDrive to your agency.",
    "contact.copy": "Share your fleet size and priorities. The demo can focus on bookings, payments, maintenance, or reporting.",
    "form.name": "Name",
    "form.email": "Work email",
    "form.fleet": "Fleet size",
    "form.message": "What should the demo focus on?",
    "form.submit": "Request demo",
    "footer.text": "Management software for car rental agencies in Morocco",
  },
};

const syncHeader = () => {
  if (!header) return;
  header.classList.toggle("scrolled", window.scrollY > 12);
};

const applyLanguage = (language) => {
  const activeLanguage = translations[language] ? language : "fr";
  const dictionary = translations[activeLanguage];

  document.documentElement.lang = activeLanguage;
  document.documentElement.dir = activeLanguage === "ar" ? "rtl" : "ltr";
  document.title = dictionary["meta.title"];

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (key && dictionary[key]) element.textContent = dictionary[key];
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    const pairs = element.getAttribute("data-i18n-attr")?.split(",");
    pairs?.forEach((pair) => {
      const [attribute, key] = pair.split(":").map((value) => value.trim());
      if (attribute && key && dictionary[key]) {
        element.setAttribute(attribute, dictionary[key]);
      }
    });
  });

  languageButtons.forEach((button) => {
    button.classList.toggle("active", button.getAttribute("data-lang") === activeLanguage);
  });

  localStorage.setItem("atlasdrive_language", activeLanguage);
};

syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

if (header && navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      header.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.getAttribute("data-lang") || "fr");
    header?.classList.remove("nav-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

document.querySelectorAll(".reveal").forEach((element) => {
  revealObserver.observe(element);
});

document.addEventListener(
  "wheel",
  (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('input[type="number"]')) {
      event.preventDefault();
    }
  },
  { capture: true, passive: false }
);

applyLanguage(localStorage.getItem("atlasdrive_language") || "fr");
