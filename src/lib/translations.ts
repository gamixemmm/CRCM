import { LanguageCode } from "./SettingsContext";

const translations = {
  // ─── Navigation ─────────────────────────────────────────────────
  "nav.dashboard": { en: "Dashboard", fr: "Tableau de bord", ar: "لوحة القيادة" },
  "nav.vehicles": { en: "Vehicles", fr: "Véhicules", ar: "المركبات" },
  "nav.bookings": { en: "Bookings", fr: "Réservations", ar: "الحجوزات" },
  "nav.calendar": { en: "Calendar", fr: "Calendrier", ar: "التقويم" },
  "nav.brokers": { en: "Brokers", fr: "Courtiers", ar: "الوسطاء" },
  "nav.invoices": { en: "Invoices", fr: "Factures", ar: "الفواتير" },
  "nav.maintenance": { en: "Maintenance", fr: "Maintenance", ar: "الصيانة" },
  "nav.settings": { en: "Settings", fr: "Paramètres", ar: "الإعدادات" },
  "nav.menu": { en: "Menu", fr: "Menu", ar: "القائمة" },

  // ─── Common Actions ─────────────────────────────────────────────
  "action.back": { en: "Back", fr: "Retour", ar: "رجوع" },
  "action.save": { en: "Save", fr: "Enregistrer", ar: "حفظ" },
  "action.cancel": { en: "Cancel", fr: "Annuler", ar: "إلغاء" },
  "action.delete": { en: "Delete", fr: "Supprimer", ar: "حذف" },
  "action.edit": { en: "Edit", fr: "Modifier", ar: "تعديل" },
  "action.search": { en: "Search...", fr: "Rechercher...", ar: "بحث..." },
  "action.confirm": { en: "Confirm", fr: "Confirmer", ar: "تأكيد" },
  "action.close": { en: "Close", fr: "Fermer", ar: "إغلاق" },
  "action.add": { en: "Add", fr: "Ajouter", ar: "إضافة" },
  "action.print": { en: "Print / PDF", fr: "Imprimer / PDF", ar: "طباعة / PDF" },
  "action.viewAll": { en: "View All", fr: "Voir tout", ar: "عرض الكل" },
  "action.saveChanges": { en: "Save Changes", fr: "Enregistrer", ar: "حفظ التغييرات" },

  // ─── Common Labels ──────────────────────────────────────────────
  "label.status": { en: "Status", fr: "Statut", ar: "الحالة" },
  "label.actions": { en: "Actions", fr: "Actions", ar: "إجراءات" },
  "label.name": { en: "Name", fr: "Nom", ar: "الاسم" },
  "label.phone": { en: "Phone", fr: "Téléphone", ar: "الهاتف" },
  "label.email": { en: "Email", fr: "Email", ar: "البريد" },
  "label.notes": { en: "Notes", fr: "Notes", ar: "ملاحظات" },
  "label.date": { en: "Date", fr: "Date", ar: "التاريخ" },
  "label.total": { en: "Total", fr: "Total", ar: "المجموع" },
  "label.all": { en: "All", fr: "Tous", ar: "الكل" },
  "label.days": { en: "Days", fr: "Jours", ar: "أيام" },

  // ─── Statuses ───────────────────────────────────────────────────
  "status.active": { en: "Active", fr: "Actif", ar: "نشط" },
  "status.confirmed": { en: "Confirmed", fr: "Confirmé", ar: "مؤكد" },
  "status.completed": { en: "Completed", fr: "Terminé", ar: "مكتمل" },
  "status.cancelled": { en: "Cancelled", fr: "Annulé", ar: "ملغى" },
  "status.pending": { en: "Pending", fr: "En attente", ar: "معلق" },
  "status.paid": { en: "Paid", fr: "Payé", ar: "مدفوع" },
  "status.partial": { en: "Partial", fr: "Partiel", ar: "جزئي" },
  "status.available": { en: "Available", fr: "Disponible", ar: "متاح" },
  "status.rented": { en: "Rented", fr: "Loué", ar: "مؤجر" },
  "status.inMaintenance": { en: "In Maintenance", fr: "En maintenance", ar: "في الصيانة" },

  // ─── Dashboard ──────────────────────────────────────────────────
  "dashboard.title": { en: "Dashboard", fr: "Tableau de bord", ar: "لوحة القيادة" },
  "dashboard.totalVehicles": { en: "Total Vehicles", fr: "Total véhicules", ar: "إجمالي المركبات" },
  "dashboard.activeBookings": { en: "Active Bookings", fr: "Réservations actives", ar: "الحجوزات النشطة" },
  "dashboard.monthlyRevenue": { en: "Monthly Revenue", fr: "Revenu mensuel", ar: "الإيرادات الشهرية" },
  "dashboard.pendingPayments": { en: "Pending Payments", fr: "Paiements en attente", ar: "المدفوعات المعلقة" },
  "dashboard.recentBookings": { en: "Recent Bookings", fr: "Réservations récentes", ar: "الحجوزات الأخيرة" },
  "dashboard.fleetStatus": { en: "Fleet Status", fr: "État de la flotte", ar: "حالة الأسطول" },
  "dashboard.upcomingReturns": { en: "Upcoming Returns", fr: "Retours à venir", ar: "العودات القادمة" },
  "dashboard.welcome": { en: "Welcome back", fr: "Bienvenue", ar: "مرحباً بعودتك" },

  // ─── Vehicles ───────────────────────────────────────────────────
  "vehicles.title": { en: "Vehicle Fleet", fr: "Flotte de véhicules", ar: "أسطول المركبات" },
  "vehicles.addVehicle": { en: "Add Vehicle", fr: "Ajouter un véhicule", ar: "إضافة مركبة" },
  "vehicles.brand": { en: "Brand", fr: "Marque", ar: "العلامة" },
  "vehicles.model": { en: "Model", fr: "Modèle", ar: "الموديل" },
  "vehicles.year": { en: "Year", fr: "Année", ar: "السنة" },
  "vehicles.plate": { en: "Plate", fr: "Immatriculation", ar: "اللوحة" },
  "vehicles.dailyRate": { en: "Daily Rate", fr: "Tarif journalier", ar: "السعر اليومي" },
  "vehicles.mileage": { en: "Mileage", fr: "Kilométrage", ar: "عدد الكيلومترات" },
  "vehicles.color": { en: "Color", fr: "Couleur", ar: "اللون" },
  "vehicles.fuelType": { en: "Fuel Type", fr: "Carburant", ar: "نوع الوقود" },
  "vehicles.transmission": { en: "Transmission", fr: "Transmission", ar: "ناقل الحركة" },
  "vehicles.noVehicles": { en: "No vehicles found.", fr: "Aucun véhicule trouvé.", ar: "لم يتم العثور على مركبات." },
  "vehicles.searchPlaceholder": { en: "Search brand, model, plate...", fr: "Rechercher marque, modèle, plaque...", ar: "بحث عن علامة، موديل، لوحة..." },

  // ─── Bookings ───────────────────────────────────────────────────
  "bookings.title": { en: "Bookings", fr: "Réservations", ar: "الحجوزات" },
  "bookings.newBooking": { en: "New Booking", fr: "Nouvelle réservation", ar: "حجز جديد" },
  "bookings.details": { en: "Booking Details", fr: "Détails de la réservation", ar: "تفاصيل الحجز" },
  "bookings.customer": { en: "Customer", fr: "Client", ar: "العميل" },
  "bookings.vehicle": { en: "Vehicle", fr: "Véhicule", ar: "المركبة" },
  "bookings.pickup": { en: "Pickup", fr: "Départ", ar: "الاستلام" },
  "bookings.return": { en: "Return", fr: "Retour", ar: "الإرجاع" },
  "bookings.pickupDate": { en: "Pickup Date", fr: "Date de départ", ar: "تاريخ الاستلام" },
  "bookings.returnDate": { en: "Return Date", fr: "Date de retour", ar: "تاريخ الإرجاع" },
  "bookings.duration": { en: "Duration", fr: "Durée", ar: "المدة" },
  "bookings.totalAmount": { en: "Total Amount", fr: "Montant total", ar: "المبلغ الإجمالي" },
  "bookings.deposit": { en: "Deposit", fr: "Acompte", ar: "العربون" },
  "bookings.markActive": { en: "Mark as Active (Picked Up)", fr: "Marquer actif (Récupéré)", ar: "تحديد كنشط (تم الاستلام)" },
  "bookings.completeReturn": { en: "Complete (Returned)", fr: "Terminer (Retourné)", ar: "إتمام (تم الإرجاع)" },
  "bookings.cancelBooking": { en: "Cancel Booking", fr: "Annuler la réservation", ar: "إلغاء الحجز" },
  "bookings.editDates": { en: "Edit Dates", fr: "Modifier les dates", ar: "تعديل التواريخ" },
  "bookings.editBookingDates": { en: "Edit Booking Dates", fr: "Modifier les dates de réservation", ar: "تعديل تواريخ الحجز" },
  "bookings.pricePerDay": { en: "Price per Day", fr: "Prix par jour", ar: "السعر لكل يوم" },
  "bookings.newDurationTotal": { en: "New duration & total", fr: "Nouvelle durée et total", ar: "المدة والمجموع الجديد" },
  "bookings.timeline": { en: "Rental Timeline & Logistics", fr: "Chronologie & Logistique", ar: "الجدول الزمني واللوجستيات" },
  "bookings.financials": { en: "Financials", fr: "Finances", ar: "المالية" },
  "bookings.primaryDriver": { en: "Primary Driver", fr: "Conducteur principal", ar: "السائق الرئيسي" },
  "bookings.secondDriver": { en: "Second Driver", fr: "Second conducteur", ar: "السائق الثاني" },
  "bookings.activity": { en: "Booking Activity", fr: "Activité de réservation", ar: "نشاط الحجز" },
  "bookings.searchPlaceholder": { en: "Search customer, vehicle...", fr: "Rechercher client, véhicule...", ar: "بحث عن عميل، مركبة..." },
  "bookings.noBookings": { en: "No bookings found.", fr: "Aucune réservation trouvée.", ar: "لم يتم العثور على حجوزات." },
  "bookings.company": { en: "Company", fr: "Entreprise", ar: "الشركة" },
  "bookings.companyInfo": { en: "Company Info", fr: "Info entreprise", ar: "معلومات الشركة" },
  "bookings.individual": { en: "Individual", fr: "Individuel", ar: "فردي" },

  // ─── Bookings - Early Pickup ────────────────────────────────────
  "bookings.earlyPickup": { en: "Early Pickup", fr: "Récupération anticipée", ar: "الاستلام المبكر" },
  "bookings.earlyPickupDesc": { en: "This booking's pickup date hasn't arrived yet. Would you like to update the start date to today?", fr: "La date de récupération n'est pas encore arrivée. Souhaitez-vous mettre à jour la date de début à aujourd'hui ?", ar: "لم يحن تاريخ الاستلام بعد. هل تريد تحديث تاريخ البداية إلى اليوم؟" },
  "bookings.updateDateInvoice": { en: "Yes — Update Date & Invoice", fr: "Oui — Modifier la date et la facture", ar: "نعم — تحديث التاريخ والفاتورة" },
  "bookings.pickupNoChange": { en: "No — Pick Up Without Changing Dates", fr: "Non — Récupérer sans modifier les dates", ar: "لا — استلام بدون تغيير التواريخ" },

  // ─── Bookings - Return ──────────────────────────────────────────
  "bookings.returnVehicle": { en: "Return Vehicle", fr: "Retourner le véhicule", ar: "إرجاع المركبة" },
  "bookings.currentMileage": { en: "Current Mileage", fr: "Kilométrage actuel", ar: "عدد الكيلومترات الحالي" },
  "bookings.newMileage": { en: "New Mileage", fr: "Nouveau kilométrage", ar: "عدد الكيلومترات الجديد" },
  "bookings.earlyReturn": { en: "Early return — update end date to today?", fr: "Retour anticipé — mettre à jour la date de fin à aujourd'hui ?", ar: "إرجاع مبكر — تحديث تاريخ الانتهاء إلى اليوم؟" },
  "bookings.confirmReturn": { en: "Confirm Return", fr: "Confirmer le retour", ar: "تأكيد الإرجاع" },

  // ─── Invoices ───────────────────────────────────────────────────
  "invoices.title": { en: "Invoices & Billing", fr: "Factures & Facturation", ar: "الفواتير والمحاسبة" },
  "invoices.details": { en: "Invoice Details", fr: "Détails de la facture", ar: "تفاصيل الفاتورة" },
  "invoices.generateInvoice": { en: "Generate Invoice", fr: "Générer une facture", ar: "إنشاء فاتورة" },
  "invoices.viewInvoice": { en: "View Invoice", fr: "Voir la facture", ar: "عرض الفاتورة" },
  "invoices.recordPayment": { en: "Record Payment", fr: "Enregistrer un paiement", ar: "تسجيل دفعة" },
  "invoices.markUnpaid": { en: "Mark Unpaid", fr: "Marquer impayé", ar: "تحديد كغير مدفوع" },
  "invoices.amountDue": { en: "Amount Due", fr: "Montant dû", ar: "المبلغ المستحق" },
  "invoices.paymentAmount": { en: "Payment Amount", fr: "Montant du paiement", ar: "مبلغ الدفعة" },
  "invoices.paymentMethod": { en: "Payment Method", fr: "Méthode de paiement", ar: "طريقة الدفع" },
  "invoices.confirmPayment": { en: "Confirm Payment", fr: "Confirmer le paiement", ar: "تأكيد الدفع" },
  "invoices.subtotal": { en: "Base Subtotal", fr: "Sous-total de base", ar: "المجموع الفرعي" },
  "invoices.extraCharges": { en: "Extra Charges", fr: "Frais supplémentaires", ar: "رسوم إضافية" },
  "invoices.discount": { en: "Discount", fr: "Remise", ar: "خصم" },
  "invoices.totalCalculated": { en: "Total Calculated", fr: "Total calculé", ar: "المجموع المحسوب" },
  "invoices.totalPaid": { en: "Total Paid (Deposit + Payments)", fr: "Total payé (Acompte + Paiements)", ar: "إجمالي المدفوع (العربون + المدفوعات)" },
  "invoices.paymentHistory": { en: "Payment History", fr: "Historique des paiements", ar: "سجل المدفوعات" },
  "invoices.depositPaid": { en: "Initial Deposit Paid Upfront", fr: "Acompte initial payé d'avance", ar: "العربون المبدئي المدفوع مقدماً" },
  "invoices.noPayments": { en: "No further partial payments recorded.", fr: "Aucun paiement partiel supplémentaire enregistré.", ar: "لا توجد مدفوعات جزئية إضافية." },
  "invoices.noInvoices": { en: "No invoices generated yet.", fr: "Aucune facture générée.", ar: "لم يتم إنشاء فواتير بعد." },
  "invoices.searchPlaceholder": { en: "Search invoice ID or customer...", fr: "Rechercher ID facture ou client...", ar: "بحث عن رقم الفاتورة أو العميل..." },
  "invoices.summary": { en: "Summary", fr: "Résumé", ar: "ملخص" },
  "invoices.customerBooking": { en: "Customer & Booking", fr: "Client & Réservation", ar: "العميل والحجز" },
  "invoices.invoiced": { en: "Invoiced", fr: "Facturé", ar: "مفوتر" },
  "invoices.unpaid": { en: "Unpaid", fr: "Impayé", ar: "غير مدفوع" },

  // ─── Payment Methods ────────────────────────────────────────────
  "payment.cash": { en: "Cash (Espèce)", fr: "Espèce", ar: "نقدي" },
  "payment.card": { en: "Credit Card", fr: "Carte bancaire", ar: "بطاقة ائتمان" },
  "payment.transfer": { en: "Bank Transfer", fr: "Virement bancaire", ar: "تحويل بنكي" },
  "payment.check": { en: "Check", fr: "Chèque", ar: "شيك" },

  // ─── Customers / Brokers ────────────────────────────────────────
  "customers.title": { en: "Brokers (Semsars)", fr: "Courtiers (Semsars)", ar: "الوسطاء (السماسرة)" },
  "customers.addCustomer": { en: "Add Broker", fr: "Ajouter un courtier", ar: "إضافة وسيط" },
  "customers.details": { en: "Broker Details", fr: "Détails du courtier", ar: "تفاصيل الوسيط" },
  "customers.firstName": { en: "First Name", fr: "Prénom", ar: "الاسم الأول" },
  "customers.lastName": { en: "Last Name", fr: "Nom", ar: "الاسم الأخير" },
  "customers.totalBookings": { en: "Total Bookings", fr: "Total réservations", ar: "إجمالي الحجوزات" },
  "customers.searchPlaceholder": { en: "Search by name, phone, email...", fr: "Rechercher par nom, téléphone, email...", ar: "بحث بالاسم، الهاتف، البريد..." },
  "customers.noCustomers": { en: "No brokers found.", fr: "Aucun courtier trouvé.", ar: "لم يتم العثور على وسطاء." },

  // ─── Maintenance ────────────────────────────────────────────────
  "maintenance.title": { en: "Maintenance", fr: "Maintenance", ar: "الصيانة" },
  "maintenance.addRecord": { en: "Add Record", fr: "Ajouter un enregistrement", ar: "إضافة سجل" },
  "maintenance.type": { en: "Type", fr: "Type", ar: "النوع" },
  "maintenance.cost": { en: "Cost", fr: "Coût", ar: "التكلفة" },
  "maintenance.description": { en: "Description", fr: "Description", ar: "الوصف" },
  "maintenance.scheduled": { en: "Scheduled", fr: "Planifié", ar: "مجدول" },
  "maintenance.inProgress": { en: "In Progress", fr: "En cours", ar: "قيد التنفيذ" },
  "maintenance.done": { en: "Done", fr: "Terminé", ar: "منتهي" },
  "maintenance.noRecords": { en: "No maintenance records found.", fr: "Aucun enregistrement de maintenance trouvé.", ar: "لم يتم العثور على سجلات صيانة." },
  "maintenance.searchPlaceholder": { en: "Search vehicle, type...", fr: "Rechercher véhicule, type...", ar: "بحث عن مركبة، نوع..." },

  // ─── Calendar ───────────────────────────────────────────────────
  "calendar.title": { en: "Booking Calendar", fr: "Calendrier des réservations", ar: "تقويم الحجوزات" },
  "calendar.today": { en: "Today", fr: "Aujourd'hui", ar: "اليوم" },

  // ─── Settings ───────────────────────────────────────────────────
  "settings.title": { en: "Global Settings", fr: "Paramètres généraux", ar: "الإعدادات العامة" },
  "settings.currency": { en: "Dashboard Currency", fr: "Devise du tableau de bord", ar: "عملة لوحة القيادة" },
  "settings.currencyDesc": { en: "Select the primary currency used to display revenue, daily rates, and all financial metrics across the system.", fr: "Sélectionnez la devise principale pour afficher les revenus, tarifs journaliers et toutes les métriques financières.", ar: "اختر العملة الرئيسية لعرض الإيرادات والأسعار اليومية وجميع المقاييس المالية." },
  "settings.language": { en: "Language", fr: "Langue", ar: "اللغة" },
  "settings.languageDesc": { en: "Choose the display language for the interface. This affects labels, buttons, and system messages.", fr: "Choisissez la langue d'affichage de l'interface. Cela affecte les libellés, boutons et messages système.", ar: "اختر لغة العرض للواجهة. يؤثر هذا على التسميات والأزرار ورسائل النظام." },

  // ─── Driver Info ────────────────────────────────────────────────
  "driver.name": { en: "Name", fr: "Nom", ar: "الاسم" },
  "driver.cin": { en: "CIN / Passport", fr: "CIN / Passeport", ar: "البطاقة / جواز السفر" },
  "driver.license": { en: "License #", fr: "Permis #", ar: "رقم الرخصة" },

  // ─── Topbar ─────────────────────────────────────────────────────
  "topbar.search": { en: "Search...", fr: "Rechercher...", ar: "بحث..." },

  // ─── Invoice recalculation ──────────────────────────────────────
  "invoices.willRecalculate": { en: "Invoice will be recalculated", fr: "La facture sera recalculée", ar: "سيتم إعادة حساب الفاتورة" },
  "invoices.confirmGenerate": { en: "Confirm & Generate", fr: "Confirmer et générer", ar: "تأكيد وإنشاء" },
  "invoices.depositPaidUpfront": { en: "Deposit Paid Upfront", fr: "Acompte payé d'avance", ar: "العربون المدفوع مقدماً" },
  "invoices.depositHint": { en: "Subtracts from final Amount Due", fr: "Déduit du montant final dû", ar: "يُخصم من المبلغ المستحق النهائي" },
  "invoices.invoiceNotes": { en: "Invoice Notes", fr: "Notes de facture", ar: "ملاحظات الفاتورة" },
  "invoices.partiallyPaid": { en: "PARTIALLY PAID", fr: "PARTIELLEMENT PAYÉ", ar: "مدفوع جزئياً" },
  "invoices.paymentRecordedVia": { en: "Payment recorded via", fr: "Paiement enregistré via", ar: "تم تسجيل الدفع عبر" },

  // ─── Dashboard Activity ─────────────────────────────────────────
  "dashboard.todayTomorrow": { en: "Today & Tomorrow", fr: "Aujourd'hui et demain", ar: "اليوم والغد" },
  "dashboard.today": { en: "Today", fr: "Aujourd'hui", ar: "اليوم" },
  "dashboard.tomorrow": { en: "Tomorrow", fr: "Demain", ar: "غداً" },
  "dashboard.noActivity": { en: "No activity scheduled for today or tomorrow", fr: "Aucune activité prévue pour aujourd'hui ou demain", ar: "لا يوجد نشاط مجدول لليوم أو الغد" },
  "dashboard.noBookingsYet": { en: "No bookings yet", fr: "Aucune réservation", ar: "لا توجد حجوزات بعد" },
  "dashboard.pickup": { en: "Pickup", fr: "Récupération", ar: "استلام" },
  "dashboard.return": { en: "Return", fr: "Retour", ar: "إرجاع" },
  "dashboard.toShop": { en: "To Shop", fr: "Vers l'atelier", ar: "إلى الورشة" },
  "dashboard.fromShop": { en: "From Shop", fr: "De l'atelier", ar: "من الورشة" },
  "dashboard.fleetSubtitle": { en: "Here's what's happening with your fleet today.", fr: "Voici ce qui se passe avec votre flotte aujourd'hui.", ar: "إليك ما يحدث مع أسطولك اليوم." },

  // ─── Vehicle Card ───────────────────────────────────────────────
  "vehicles.perDay": { en: "/ day", fr: "/ jour", ar: "/ يوم" },
  "vehicles.noVehiclesFound": { en: "No vehicles found", fr: "Aucun véhicule trouvé", ar: "لم يتم العثور على مركبات" },
  "vehicles.tryAdjusting": { en: "Try adjusting your search or filters", fr: "Essayez de modifier votre recherche ou vos filtres", ar: "حاول تعديل البحث أو المرشحات" },
  "vehicles.viewBooking": { en: "View Booking", fr: "Voir la réservation", ar: "عرض الحجز" },

  // ─── Booking Detail Labels ──────────────────────────────────────
  "bookings.broker": { en: "Broker", fr: "Courtier", ar: "الوسيط" },
  "bookings.license": { en: "License", fr: "Permis", ar: "رخصة" },
  "bookings.mainOffice": { en: "Main Office", fr: "Bureau principal", ar: "المكتب الرئيسي" },

  // ─── Booking Timeline Events ────────────────────────────────────
  "timeline.bookingCreated": { en: "Booking Created", fr: "Réservation créée", ar: "تم إنشاء الحجز" },
  "timeline.invoiceGenerated": { en: "Invoice Generated", fr: "Facture générée", ar: "تم إنشاء الفاتورة" },
  "timeline.paymentRecorded": { en: "Payment Recorded", fr: "Paiement enregistré", ar: "تم تسجيل الدفع" },
  "timeline.fullyPaid": { en: "Fully Paid", fr: "Entièrement payé", ar: "مدفوع بالكامل" },
  "timeline.fullyPaidDesc": { en: "Invoice has been settled in full", fr: "La facture a été réglée en totalité", ar: "تمت تسوية الفاتورة بالكامل" },
  "timeline.vehiclePickedUp": { en: "Vehicle Picked Up", fr: "Véhicule récupéré", ar: "تم استلام المركبة" },
  "timeline.vehicleReturned": { en: "Vehicle Returned", fr: "Véhicule retourné", ar: "تم إرجاع المركبة" },
  "timeline.bookingCancelled": { en: "Booking Cancelled", fr: "Réservation annulée", ar: "تم إلغاء الحجز" },
  "timeline.cancelledDesc": { en: "This booking was cancelled", fr: "Cette réservation a été annulée", ar: "تم إلغاء هذا الحجز" },
  "timeline.handedOverAt": { en: "handed over at", fr: "remis à", ar: "تم التسليم في" },
  "timeline.returnedAt": { en: "Returned at", fr: "Retourné à", ar: "تم الإرجاع في" },
  "timeline.bookedFor": { en: "booked for", fr: "réservé pour", ar: "محجوز لـ" },

  // ─── Booking: Early Pickup Modal ────────────────────────────────
  "bookings.scheduledFor": { en: "This booking is scheduled for", fr: "Cette réservation est prévue pour le", ar: "هذا الحجز مقرر في" },
  "bookings.earlyPickupQuestion": { en: "You are picking up early. Would you like to change the pickup date to today and recalculate the invoice?", fr: "Vous récupérez en avance. Souhaitez-vous changer la date de récupération à aujourd'hui et recalculer la facture ?", ar: "أنت تستلم مبكراً. هل تريد تغيير تاريخ الاستلام إلى اليوم وإعادة حساب الفاتورة؟" },
  "bookings.keepOriginalDates": { en: "No — Just Pick Up (Keep Original Dates)", fr: "Non — Récupérer seulement (Garder les dates originales)", ar: "لا — استلام فقط (الاحتفاظ بالتواريخ الأصلية)" },

  // ─── Booking: Return Modal ──────────────────────────────────────
  "bookings.returningEarly": { en: "Returning early — scheduled return", fr: "Retour anticipé — retour prévu le", ar: "إرجاع مبكر — الإرجاع المقرر" },
  "bookings.earlyReturnQuestion": { en: "Would you like to update the return date to today and recalculate the invoice?", fr: "Souhaitez-vous mettre à jour la date de retour à aujourd'hui et recalculer la facture ?", ar: "هل تريد تحديث تاريخ الإرجاع إلى اليوم وإعادة حساب الفاتورة؟" },
  "bookings.keepOrigDates": { en: "No — Keep Original Dates", fr: "Non — Garder les dates originales", ar: "لا — الاحتفاظ بالتواريخ الأصلية" },
  "bookings.mileageHint": { en: "Enter the odometer reading at return", fr: "Entrez la lecture du compteur au retour", ar: "أدخل قراءة العداد عند الإرجاع" },
  "bookings.newMileageKm": { en: "New Mileage (km)", fr: "Nouveau kilométrage (km)", ar: "عدد الكيلومترات الجديد (كم)" },

  // ─── Maintenance Table Columns ──────────────────────────────────
  "maintenance.serviceDesc": { en: "Service Description", fr: "Description du service", ar: "وصف الخدمة" },
  "maintenance.shopLogic": { en: "Shop Logic", fr: "Logique atelier", ar: "منطق الورشة" },
  "maintenance.in": { en: "In", fr: "Entrée", ar: "دخول" },
  "maintenance.out": { en: "Out", fr: "Sortie", ar: "خروج" },
  "maintenance.stillInShop": { en: "Still in shop", fr: "Encore en atelier", ar: "لا يزال في الورشة" },
  "maintenance.repairCost": { en: "Repair Cost", fr: "Coût de réparation", ar: "تكلفة الإصلاح" },
  "maintenance.resolve": { en: "Resolve", fr: "Résoudre", ar: "حل" },
  "maintenance.unresolve": { en: "Unresolve", fr: "Rouvrir", ar: "إعادة فتح" },

  // ─── Booking confirm prompts ────────────────────────────────────
  "bookings.cancelConfirm": { en: "Cancel this booking? The vehicle will be freed up.", fr: "Annuler cette réservation ? Le véhicule sera libéré.", ar: "إلغاء هذا الحجز؟ سيتم تحرير المركبة." },
  "maintenance.resolveConfirm": { en: "Mark this maintenance job as completed? The vehicle will immediately become AVAILABLE in the fleet.", fr: "Marquer cette maintenance comme terminée ? Le véhicule deviendra immédiatement DISPONIBLE dans la flotte.", ar: "هل تريد وضع علامة على هذه الصيانة كمكتملة؟ ستصبح المركبة متاحة فوراً في الأسطول." },
  "maintenance.unresolveConfirm": { en: "Reopen this maintenance job? The vehicle will be pulled back into the shop immediately.", fr: "Rouvrir cette maintenance ? Le véhicule sera retourné à l'atelier immédiatement.", ar: "إعادة فتح هذه الصيانة؟ ستتم إعادة المركبة إلى الورشة فوراً." },
  "maintenance.deleteConfirm": { en: "Permanently delete this shop log? This action cannot be undone.", fr: "Supprimer définitivement ce journal d'atelier ? Cette action est irréversible.", ar: "حذف سجل الورشة نهائياً؟ لا يمكن التراجع عن هذا الإجراء." },

  // ─── New Booking Form ───────────────────────────────────────────  
  "bookings.createBooking": { en: "Create Booking", fr: "Créer une réservation", ar: "إنشاء حجز" },

  // ─── Toast Messages ─────────────────────────────────────────────
  "toast.carPickedUp": { en: "Car picked up! Booking is now Active.", fr: "Voiture récupérée ! La réservation est maintenant active.", ar: "تم استلام السيارة! الحجز الآن نشط." },
  "toast.bookingCancelled": { en: "Booking cancelled.", fr: "Réservation annulée.", ar: "تم إلغاء الحجز." },
  "toast.mileageError": { en: "New mileage cannot be less than current mileage", fr: "Le nouveau kilométrage ne peut pas être inférieur au kilométrage actuel", ar: "لا يمكن أن يكون عدد الكيلومترات الجديد أقل من الحالي" },

  // ─── Timeline Detail ────────────────────────────────────────────
  "timeline.total": { en: "Total", fr: "Total", ar: "المجموع" },
  "timeline.deposit": { en: "Deposit", fr: "Acompte", ar: "العربون" },

  // ─── Invoice Notes Placeholder ──────────────────────────────────
  "invoices.notesPlaceholder": { en: "Thank you for your business...", fr: "Merci pour votre confiance...", ar: "شكراً لتعاملكم معنا..." },

  // ─── Invoice List ───────────────────────────────────────────────
  "invoices.invId": { en: "Inv ID", fr: "N° Fact", ar: "رقم الفاتورة" },
  "invoices.customerVehicle": { en: "Customer & Vehicle", fr: "Client & Véhicule", ar: "العميل والمركبة" },
  "invoices.dateCreated": { en: "Date Created", fr: "Date de création", ar: "تاريخ الإنشاء" },
  "invoices.pay": { en: "Pay", fr: "Payer", ar: "دفع" },
  "invoices.unpay": { en: "Unpay", fr: "Annuler paiement", ar: "إلغاء الدفع" },

  // ─── Vehicles Table ─────────────────────────────────────────────
  "vehicles.type": { en: "Type", fr: "Type", ar: "النوع" },

  // ─── Status Translations (for badges) ──────────────────────────
  "status.outOfService": { en: "Out Of Service", fr: "Hors service", ar: "خارج الخدمة" },
  "status.refunded": { en: "Refunded", fr: "Remboursé", ar: "مسترد" },
  "status.unpaid": { en: "Unpaid", fr: "Impayé", ar: "غير مدفوع" },
  "status.maintenance": { en: "Maintenance", fr: "Maintenance", ar: "صيانة" },

  // ─── Customer Detail ───────────────────────────────────────────
  "customers.profile": { en: "Profile", fr: "Profil", ar: "الملف الشخصي" },
  "customers.identity": { en: "Identity", fr: "Identité", ar: "الهوية" },
  "customers.phone": { en: "Phone", fr: "Téléphone", ar: "الهاتف" },
  "customers.email": { en: "Email", fr: "Email", ar: "البريد الإلكتروني" },
  "customers.address": { en: "Home Address", fr: "Adresse", ar: "العنوان" },
  "customers.joined": { en: "Joined", fr: "Inscrit le", ar: "تاريخ الانضمام" },
  "customers.licenseCin": { en: "License / CIN", fr: "Permis / CIN", ar: "الرخصة / البطاقة" },
  "customers.licenseExpiry": { en: "License Expiry", fr: "Expiration du permis", ar: "انتهاء الرخصة" },
  "customers.editProfile": { en: "Edit Profile", fr: "Modifier le profil", ar: "تعديل الملف" },
  "customers.bookingHistory": { en: "Booking History", fr: "Historique des réservations", ar: "سجل الحجوزات" },
  "customers.noBookings": { en: "No bookings found for this broker.", fr: "Aucune réservation trouvée pour ce courtier.", ar: "لم يتم العثور على حجوزات لهذا الوسيط." },

  // ─── Misc ──────────────────────────────────────────────────────
  "label.to": { en: "to", fr: "au", ar: "إلى" },
} as const;

export type TranslationKey = keyof typeof translations;

export function getTranslation(key: TranslationKey, language: LanguageCode): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[language] || entry.en;
}
