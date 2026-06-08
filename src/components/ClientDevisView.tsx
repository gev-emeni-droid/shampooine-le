import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiClient';
import { 
  DevisFacture, 
  LigneDocument, 
  EntrepriseConfig, 
  EntrepriseHoraire, 
  EntrepriseFermeture, 
  RendezVousPlanning,
  Client
} from '../types';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  Check, 
  CheckCircle, 
  Building, 
  Phone, 
  FileText, 
  AlertTriangle, 
  Sparkles, 
  ArrowLeft, 
  Lock,
  Moon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Mail,
  UserCheck
} from 'lucide-react';

interface ClientDevisViewProps {
  onToast: (msg: string, type: 'success' | 'info' | 'error') => void;
  backToHome?: () => void;
  entrepriseConfig?: any;
}

export default function ClientDevisView({ onToast, backToHome, entrepriseConfig: propConfig }: ClientDevisViewProps) {
  const [docId, setDocId] = useState<string | null>(null);
  const [document, setDocument] = useState<DevisFacture | null>(null);
  const [lines, setLines] = useState<LigneDocument[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMessage, setErrMessage] = useState<string | null>(null);

  // Corporate visual info
  const [corpConfig, setCorpConfig] = useState<EntrepriseConfig | null>(propConfig || null);

  useEffect(() => {
    if (propConfig) {
      setCorpConfig(propConfig);
    }
  }, [propConfig]);

  // Step state
  const [step, setStep] = useState<'view' | 'signed' | 'booked'>('view');

  // Signature Substates
  const [certifyChecked, setCertifyChecked] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  // Scheduling states
  const [estimatedMinutes, setEstimatedMinutes] = useState(120); // default 2 hours
  const [allSchedules, setAllSchedules] = useState<EntrepriseHoraire[]>([]);
  const [allClosures, setAllClosures] = useState<EntrepriseFermeture[]>([]);
  const [allAppointments, setAllAppointments] = useState<RendezVousPlanning[]>([]);
  
  // Interactive calendar date selection
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [selectedSlot, setSelectedSlot] = useState<string>(''); // "09:00"
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingNotes, setBookingNotes] = useState('');
  const [createdAppointment, setCreatedAppointment] = useState<RendezVousPlanning | null>(null);

  // List of upcoming 14 days to pick from
  const [upcomingDays, setUpcomingDays] = useState<{ dateStr: string; label: string; isClosed: boolean }[]>([]);
  const [currentWeekStartIndex, setCurrentWeekStartIndex] = useState(0);

  // Parse Quote ID from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('devis_id') || params.get('id');
    if (id) {
      setDocId(id);
    } else {
      setErrMessage("Aucun identifiant de devis spécifié dans le lien. Veuillez utiliser le lien fourni dans votre e-mail.");
      setLoading(false);
    }
  }, []);

  // Fetch document details, company settings and calendar configs
  useEffect(() => {
    if (!docId) return;
    async function loadData() {
      try {
        setLoading(true);
        const devisList = await apiService.getDevisFactures();
        const doc = devisList.find(d => d.id === docId) || null;
        if (!doc) {
          setErrMessage("Le devis demandé est introuvable ou a été archivé.");
          setLoading(false);
          return;
        }

        if (doc.type !== 'devis') {
          setErrMessage("Le document spécifié n'est pas un devis.");
          setLoading(false);
          return;
        }

        setDocument(doc);

        const docLines = await apiService.getLignesDocument(docId);
        setLines(docLines);

        // Fetch Client details
        const clientsList = await apiService.getClients();
        const foundClient = clientsList.find(c => c.id === doc.client_id) || null;
        setClient(foundClient);

        // Calculate dynamic work duration based on services
        const duration = calculateDevisDuration(docLines);
        setEstimatedMinutes(duration);

        // Fetch Enterprise settings
        const corp = await apiService.getEntrepriseConfig();
        if (corp) setCorpConfig(corp);

        // Fetch Scheduler Configs
        const hours = await apiService.getEntrepriseHoraires();
        const closures = await apiService.getEntrepriseFermetures();
        const appts = await apiService.getAppointments();

        setAllSchedules(hours || []);
        setAllClosures(closures || []);
        setAllAppointments(appts || []);

        // Define status-based routing
        if (doc.status === 'Signé' || doc.status === 'Signé/Accepté' || doc.status === 'Facturé' || doc.status === 'Payé') {
          // If already signed, check if appointment exists or navigate straight to scheduling
          const matchingAppt = appts.find(a => a.devis_facture_id === doc.id);
          if (matchingAppt) {
            setCreatedAppointment(matchingAppt);
            setStep('booked');
          } else {
            setStep('signed');
          }
        } else {
          setStep('view');
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setErrMessage("Une erreur est survenue lors du chargement des informations du devis.");
        setLoading(false);
      }
    }
    loadData();
  }, [docId]);

  // Compute work duration from service lines
  function calculateDevisDuration(linesList: LigneDocument[]): number {
    let totals = 0;
    if (!linesList || linesList.length === 0) return 120; // 2 hour default

    linesList.forEach(line => {
      const name = line.prestation_name.toLowerCase();
      const qty = line.quantity || 1;

      if (name.includes('canapé') || name.includes('canape')) {
        if (name.includes('3 places')) {
          totals += 180 * qty; // 3h per sofa
        } else if (name.includes('2 places')) {
          totals += 120 * qty; // 2h per sofa
        } else {
          totals += 60 * qty;
        }
      } else if (name.includes('moquette') || name.includes('tapis') || name.includes('m²') || name.includes('m2')) {
        totals += Math.max(30, Math.round(5 * qty)); // 5 min per m²
      } else if (name.includes('fauteuil')) {
        totals += 45 * qty;
      } else if (name.includes('matelas')) {
        totals += 60 * qty;
      } else {
        totals += 60 * qty;
      }
    });

    return totals || 120;
  }

  // Generate list of selectable calendar days (14 days from today)
  useEffect(() => {
    if (loading || !document) return;

    const days: { dateStr: string; label: string; isClosed: boolean }[] = [];
    const today = new Date();

    for (let i = 0; i < 21; i++) {
      const candidate = new Date(today);
      candidate.setDate(today.getDate() + i);

      // Exclude passed hours of today if late, but keep simplicity
      const dateStr = candidate.toISOString().split('T')[0];
      const dayOfWeekIdx = candidate.getDay(); // 0=Dimanche, 1=Lundi...

      // Check exceptional closures
      const isExceptionalClosure = allClosures.some(c => c.date === dateStr);

      // Check standard opening hours
      const weekdaySched = allSchedules.find(s => s.jour_semaine === dayOfWeekIdx);
      const isWeeklyClosed = !weekdaySched || !weekdaySched.est_ouvert;

      const isClosed = isExceptionalClosure || isWeeklyClosed;

      const label = candidate.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      days.push({
        dateStr,
        label,
        isClosed
      });
    }

    setUpcomingDays(days);
  }, [loading, document, allSchedules, allClosures]);

  // Compute available 30-minute blocks for the selected day based on rules
  useEffect(() => {
    if (!selectedDate || !document) {
      setAvailableSlots([]);
      return;
    }

    const candidateDate = new Date(selectedDate);
    const dayOfWeekIdx = candidateDate.getDay();

    // 1. Check exceptional closure
    const isClosed = allClosures.some(c => c.date === selectedDate);
    if (isClosed) {
      setAvailableSlots([]);
      return;
    }

    // 2. Fetch work hours
    const sched = allSchedules.find(s => s.jour_semaine === dayOfWeekIdx);
    if (!sched || !sched.est_ouvert) {
      setAvailableSlots([]);
      return;
    }

    // 3. Assemble active appointments for this day
    const dayAppts = allAppointments.filter(appt => appt.date === selectedDate && appt.status !== 'Annulé');

    // Interval helper converter
    const timeToMinutes = (hm: string) => {
      const [h, m] = hm.split(':').map(Number);
      return h * 60 + m;
    };

    const minutesToTime = (m: number) => {
      const h = Math.floor(m / 60);
      const mins = m % 60;
      return [h, mins].map(v => String(v).padStart(2, '0')).join(':');
    };

    const slots: string[] = [];

    // Helper to evaluate if the segment overlaps existing appointments
    const doesOverlapWithExisting = (startMin: number, endMin: number) => {
      for (const appt of dayAppts) {
        const apptStart = timeToMinutes(appt.start_time);
        const apptEnd = apptStart + appt.duration_minutes;

        // Overlap if max(start1, start2) < min(end1, end2)
        if (Math.max(startMin, apptStart) < Math.min(endMin, apptEnd)) {
          return true;
        }
      }
      return false;
    };

    // Evaluate possible blocks of X duration within morning hours
    if (sched.heure_debut_matin && sched.heure_fin_matin) {
      const mornStart = timeToMinutes(sched.heure_debut_matin);
      const mornEnd = timeToMinutes(sched.heure_fin_matin);

      for (let curr = mornStart; curr <= mornEnd - estimatedMinutes; curr += 30) {
        const blockEnd = curr + estimatedMinutes;
        if (!doesOverlapWithExisting(curr, blockEnd)) {
          slots.push(minutesToTime(curr));
        }
      }
    }

    // Evaluate possible blocks within afternoon hours
    if (sched.heure_debut_apresmidi && sched.heure_fin_apresmidi) {
      const aftStart = timeToMinutes(sched.heure_debut_apresmidi);
      const aftEnd = timeToMinutes(sched.heure_fin_apresmidi);

      for (let curr = aftStart; curr <= aftEnd - estimatedMinutes; curr += 30) {
        const blockEnd = curr + estimatedMinutes;
        if (!doesOverlapWithExisting(curr, blockEnd)) {
          slots.push(minutesToTime(curr));
        }
      }
    }

    setAvailableSlots(slots);
  }, [selectedDate, estimatedMinutes, allSchedules, allClosures, allAppointments, document]);

  // Execute quote e-signature
  const handleSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) return;
    if (!certifyChecked) {
      onToast("Veuillez certifier avoir pris connaissance et accepté les conditions du devis.", "error");
      return;
    }
    if (!signerName.trim()) {
      onToast("Veuillez saisir votre nom complet pour signer.", "error");
      return;
    }

    try {
      setIsSigning(true);
      
      let signatureDataUrl = signerName.trim();
      const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement;
      if (canvas) {
        // Convert drawn strokes to base64
        signatureDataUrl = canvas.toDataURL('image/png');
      }

      // Update signature and status with the drawn Base64
      await apiService.signDevis(document.id, signatureDataUrl);

      onToast("Félicitations ! Votre signature électronique a été enregistrée avec succès.", "success");
      
      // Fetch fresh document state
      const devisList = await apiService.getDevisFactures();
      const refreshedDoc = devisList.find(d => d.id === document.id) || null;
      if (refreshedDoc) setDocument(refreshedDoc);

      setStep('signed');
      setIsSigning(false);
    } catch (err) {
      console.error(err);
      onToast("Une erreur est survenue lors de la signature.", "error");
      setIsSigning(false);
    }
  };

  // Helper check to identify if a booked timeslot is a night hour (using dynamic settings set by artisan)
  const isNightShiftCrossed = (startHm: string): boolean => {
    if (!startHm) return false;
    if (corpConfig && corpConfig.activer_majoration === false) return false;

    const startLimit = corpConfig?.plage_majoration_debut || '19:00';
    const endLimit = corpConfig?.plage_majoration_fin || '06:00';

    const getMinutes = (hm: string): number => {
      const [hours, minutes] = hm.split(':').map(Number);
      return hours * 60 + (minutes || 0);
    };

    const currentMinutes = getMinutes(startHm);
    const startLimitMinutes = getMinutes(startLimit);
    const endLimitMinutes = getMinutes(endLimit);

    if (startLimitMinutes > endLimitMinutes) {
      // Overnight (e.g. 19:00 to 06:00)
      return currentMinutes >= startLimitMinutes || currentMinutes < endLimitMinutes;
    } else {
      // Same day (e.g. 08:00 to 12:00)
      return currentMinutes >= startLimitMinutes && currentMinutes < endLimitMinutes;
    }
  };

  // Confirm and save Online booking slot
  const handleConfirmBooking = async () => {
    if (!document || !selectedDate || !selectedSlot) return;

    try {
      setIsBooking(true);

      const computedStartTime = selectedSlot;
      const computedDuration = estimatedMinutes;

      // Surcharge Check: if crossed night shifts, apply customizable surcharge % on invoice/appointment
      const isNight = isNightShiftCrossed(computedStartTime);
      const pct = corpConfig?.majorat_tarif_nuit_pct !== undefined ? corpConfig.majorat_tarif_nuit_pct : 25;
      const multiplier = isNight ? (1 + pct / 100) : 1;
      const basePrice = document.total_amount;  // Toujours le prix BASE du document
      const finalPrice = Math.round(basePrice * multiplier * 100) / 100;  // ✅ Prix MAJORÉ

      const newAppt: RendezVousPlanning = {
        id: `client-appt-${Date.now()}`,
        devis_facture_id: document.id,
        title: `Nettoyage thermo-dynamique - ${client ? `${client.first_name} ${client.last_name}` : 'Client'}`,
        date: selectedDate,
        start_time: computedStartTime,
        duration_minutes: computedDuration,
        final_price: finalPrice,
        status: 'Planifié',
        notes: bookingNotes.trim() ? bookingNotes.trim() : `Réservation automatique en ligne.`,
        assigned_employee_ids: [], // Assigned dynamically by admin in dashboard
        source_creation: 'client_auto'
      };

      const saved = await apiService.saveAppointment(newAppt);

      // If Night surcharge applied, let's also automatically adjust the actual document total/notes indicating the night surcharge!
      if (isNight) {
        const updatedDoc = {
          ...document,
          total_amount: finalPrice,
          notes: `${document.notes || ''}\n\n[MAJORATION DE ${pct}%] Rendez-vous planifié en heure de nuit/majorée (${computedStartTime})`.trim()
        };
        await apiService.saveDevisFacture(updatedDoc, lines);
        setDocument(updatedDoc);
      }

      setCreatedAppointment(saved);
      onToast("Rendez-vous planifié avec succès ! Un e-mail de confirmation vous a été envoyé.", "success");
      setStep('booked');
      setIsBooking(false);
    } catch (err) {
      console.error(err);
      onToast("Échec de la planification du rendez-vous.", "error");
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">Chargement de votre devis sécurisé...</p>
      </div>
    );
  }

  if (errMessage) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl border border-gray-100 p-8 shadow-2xl text-center space-y-5">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto text-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="font-extrabold text-slate-900 text-base">Erreur d'accès</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{errMessage}</p>
          </div>
          {backToHome && (
            <button 
              onClick={backToHome}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center space-x-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retourner au site</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Active document and lines verified
  const activeDoc = document!;
  // ✅ CALCUL DYNAMIQUE : applique la majoration si créneau de nuit sélectionné
  const nightPct = corpConfig?.majorat_tarif_nuit_pct !== undefined ? corpConfig.majorat_tarif_nuit_pct : 25;
  const isCurrentSlotNight = selectedSlot ? isNightShiftCrossed(selectedSlot) : false;
  const nightMultiplier = isCurrentSlotNight ? (1 + nightPct / 100) : 1;
  const baseDocTotal = activeDoc.total_amount;
  // currentTotal = montant affiché et envoyé à l'API (avec majoration si applicable)
  const currentTotal = Math.round(baseDocTotal * nightMultiplier * 100) / 100;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-800 font-sans pb-16">
      
      {/* Dynamic customer portal navbar */}
      <header className="bg-slate-950 border-b border-slate-800/80 sticky top-0 z-40 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {corpConfig?.logo_url ? (
              <img 
                src={corpConfig.logo_url} 
                alt="Logo entreprise" 
                referrerPolicy="no-referrer"
                className="w-auto h-12 md:h-20 object-contain rounded-xl bg-white p-1 logo-dynamique-net"
              />
            ) : (
              <div className="p-2 bg-sky-500 text-white rounded-xl">
                <Sparkles className="w-4 h-4" />
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-xs tracking-tight">{corpConfig?.nom_entreprise || 'Shampooine Le'}</h1>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Portail Client Sécurisé</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="bg-slate-800 border border-slate-700/60 text-[9px] text-slate-300 font-black tracking-widest uppercase px-3 py-1 rounded-full flex items-center space-x-1">
              <Lock className="w-2.5 h-2.5 text-sky-400" />
              <span>SSL 256 BITS</span>
            </span>
            {backToHome && (
              <button 
                onClick={backToHome}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-850 py-1.5 px-3.5 rounded-xl text-[10px] uppercase font-black transition-all cursor-pointer"
              >
                Retour
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main container */}
      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: The high-fidelity Document preview replica */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Document container */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
            
            {/* Header info */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-100">
              <div className="space-y-3">
                {corpConfig?.logo_url ? (
                  <img 
                    src={corpConfig.logo_url} 
                    alt="Logo" 
                    referrerPolicy="no-referrer"
                    className="w-auto h-12 md:h-20 object-contain rounded-xl bg-white p-1 border border-slate-100 logo-dynamique-net"
                  />
                ) : (
                  <div className="bg-sky-500 text-white p-2.5 rounded-xl inline-block">
                    <Sparkles className="w-5 h-5" />
                  </div>
                )}
                <div className="space-y-0.5">
                  <h2 className="font-extrabold text-slate-900 text-sm">{corpConfig?.nom_entreprise || 'Shampooine Le'}</h2>
                  <p className="text-[10px] text-slate-400">Nettoyage de prestige canapés &amp; tapis</p>
                  <p className="text-[10px] text-slate-500 font-medium flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{corpConfig?.adresse_siege || 'Paris, France'}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{corpConfig?.telephone || '06 12 34 56 78'}</span>
                  </p>
                </div>
              </div>

              <div className="text-left md:text-right space-y-1 self-start md:self-auto">
                <span className="bg-sky-50 text-sky-600 font-extrabold text-[10px] px-3 py-1.5 rounded-xl uppercase font-mono border border-sky-100 block w-max ml-0 md:ml-auto">
                  Devis officiel #{activeDoc.number}
                </span>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Émis le : <strong>{new Date(activeDoc.date).toLocaleDateString('fr-FR')}</strong></p>
                <p className="text-[10px] text-slate-400 font-medium">Date limite de validité : <strong className="text-rose-600">{new Date(activeDoc.due_date).toLocaleDateString('fr-FR')}</strong></p>
              </div>
            </div>

            {/* Client address block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-wider">Destinataire :</span>
                {client ? (
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-slate-800 text-xs">{client.first_name} {client.last_name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{client.email}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{client.phone}</span>
                    </p>
                    {client.type_client === 'professionnel' && (
                      <div className="pt-2 text-[9px] text-sky-700 font-semibold space-y-0.5">
                        <p>Société : {client.raison_sociale}</p>
                        <p>SIRET : {client.siret}</p>
                        {client.tva_intracommunautaire && <p>N° TVA : {client.tva_intracommunautaire}</p>}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs italic">Fiche client introuvable</span>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-wider">Objet / Chantiers :</span>
                <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                  Intervention de détachage et régénération de tissu textile à domicile. {activeDoc.notes && <span className="block mt-1 bg-white p-2 rounded-lg border border-slate-50 text-[9px] text-slate-500 italic">{activeDoc.notes}</span>}
                </p>
              </div>
            </div>

            {/* Prestations breakdown table */}
            <div className="space-y-2">
              <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400 block">Détail des prestations de nettoyage :</span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                      <th className="py-3 pr-4">Prestation demandée</th>
                      <th className="py-3 text-center">Quantité</th>
                      <th className="py-3 text-right">P.U. (TTC)</th>
                      <th className="py-3 text-right">Total (TTC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lines.map((line, idx) => (
                      <tr key={line.id || idx} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3.5 pr-4 font-semibold text-slate-800 text-[11px] leading-relaxed">
                          <span className="flex flex-col">
                            <span>• {line.prestation_name.replace(/ \[MAJ\. NUIT.*?\]/g, '')}</span>
                            {line.prestation_name.includes('[MAJ. NUIT') && (
                              <span className="text-[9px] text-amber-600 font-bold mt-0.5">🌙 Tarif horaire de nuit appliqué</span>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 text-center font-bold text-[11px] text-slate-600">
                          {line.quantity}
                        </td>
                        <td className="py-3.5 text-right font-mono text-[11px] text-slate-600">
                          {line.unit_price.toFixed(2)} €
                        </td>
                        <td className="py-3.5 text-right font-mono font-bold text-[11px] text-slate-900">
                          {line.total_price.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom summary and total amount */}
            <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="text-[10px] text-slate-400 max-w-sm leading-relaxed">
                <span>⚠️ Durée d'intervention calculée informatiquement : ~<strong>{Math.round(estimatedMinutes/60)} heures</strong> de travail requises pour le chantier.</span>
              </div>
              
              <div className="bg-slate-50 border border-slate-100/80 p-4 rounded-2xl flex flex-col items-end shrink-0 min-w-[220px] space-y-1.5">
                {/* ✅ Détail majoration de nuit si appliquée */}
                {(() => {
                  const hasNight = lines.some(l => l.prestation_name.includes('[MAJ. NUIT'));
                  const nightPctMatch = lines.find(l => l.prestation_name.includes('[MAJ. NUIT'))?.prestation_name.match(/\[MAJ\. NUIT \+(\d+)%\]/);
                  const nightPctVal = nightPctMatch ? Number(nightPctMatch[1]) : (corpConfig?.majorat_tarif_nuit_pct ?? 25);
                  const baseSub = hasNight ? Math.round(baseDocTotal / (1 + nightPctVal / 100) * 100) / 100 : baseDocTotal;
                  const surchAmt = hasNight ? Math.round((baseDocTotal - baseSub) * 100) / 100 : 0;

                  return hasNight ? (
                    <>
                      <div className="flex justify-between w-full text-[10px] text-slate-500">
                        <span>Sous-total prestations :</span>
                        <span className="font-mono">{baseSub.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between w-full text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-lg">
                        <span>🌙 Majoration nuit (+{nightPctVal}%) :</span>
                        <span className="font-mono">+{surchAmt.toFixed(2)} €</span>
                      </div>
                      <div className="w-full h-px bg-slate-200 my-0.5"></div>
                    </>
                  ) : null;
                })()}
                <span className="text-[9px] uppercase font-bold text-slate-400">Total Net à Payer (TTC)</span>
                <span className="text-xl font-black text-sky-500 font-mono mt-1">
                  {currentTotal.toFixed(2)} €
                </span>
                {isCurrentSlotNight && (
                  <span className="text-[9px] text-amber-500 font-bold mt-1 flex items-center gap-1">🌙 Maj. nuit +{nightPct}% incluse</span>
                )}
                <span className="text-[8px] text-slate-400 uppercase mt-1 font-bold">TVA non applicable (art. 293B du CGI)</span>
              </div>
            </div>

            {/* Footer with corporate legal declarations */}
            <div className="pt-8 border-t border-dashed border-slate-200 text-center space-y-1 text-[8px] text-slate-400">
              <p className="font-bold text-slate-700">
                {corpConfig?.nom_entreprise || 'Shampooine Le'} — {corpConfig?.forme_juridique || 'SARL'} au Capital de {corpConfig?.capital_social || '10 000 €'}
              </p>
              <p className="truncate">
                Adresse Siège Social : {corpConfig?.adresse_siege || '42 Avenue de la Propreté, 75008 Paris'}
              </p>
              <p className="font-mono text-slate-500">
                SIRET : {corpConfig?.siret || '123 456 789 00021'} | CODE APE/NAF : {corpConfig?.code_ape || '8121Z'} | TVA Intracommunautaire : {corpConfig?.tva_intracommunautaire || 'FR 12 123456789'}
              </p>
              <div className="h-0.5 w-6 bg-slate-100 rounded my-1 mx-auto"></div>
              <p className="text-slate-400/60 max-w-[420px] mx-auto text-center leading-normal">
                Ce devis gratuit est valable pour une durée de 30 jours à compter de sa date d'émission. Dès signature contractuelle, les présentes conditions d'accord engagent les deux parties.
              </p>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: The interactive wizard (Sign block vs Book appointments slots) */}
        <div className="lg:col-span-5 h-full self-start sticky top-20 space-y-6">
          
          {/* STEP 1: View and Sign the quote */}
          {step === 'view' && (
            <div className="bg-slate-950 text-white rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-5 animate-in slide-in-from-right duration-300">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
                <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider">Espace Signature Électronique</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Signez votre devis en 2 clics de manière légale et sécurisée</span>
                </div>
              </div>

              <form onSubmit={handleSignSubmit} className="space-y-4">
                
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] text-slate-300 leading-relaxed font-sans space-y-3">
                  <span className="font-black text-sky-400 text-[11px] block">📜 Convention de signature numérique :</span>
                  <p>
                    En signant ce devis en ligne, vous certifiez donner votre accord exprès pour le déclenchement des prestations mentionnées ci-contre. Cette validation électronique est enregistrée dans le journal informatique de l'application et emporte acceptation sans réserve.
                  </p>
                </div>

                {/* Confirm certif checkbox */}
                <label className="flex items-start space-x-3 p-3 bg-slate-900/60 hover:bg-slate-900 rounded-2xl border border-slate-850 cursor-pointer transition-colors">
                  <input 
                    type="checkbox"
                    checked={certifyChecked}
                    onChange={e => setCertifyChecked(e.target.checked)}
                    className="mt-1 bg-slate-950 border-slate-800 rounded text-sky-500 focus:ring-sky-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-300 font-bold leading-normal">
                    Je certifie avoir pris connaissance de l'ensemble des lignes de prestations et accepte sans réserve ce devis gratuit. *
                  </span>
                </label>

                {/* Dynamic Signer Name Capture */}
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-bold text-slate-400 block">Saisissez votre nom pour signer *</label>
                  <input 
                    type="text"
                    required
                    value={signerName}
                    onChange={e => setSignerName(e.target.value)}
                    placeholder="Ex: Marie Laurent"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl text-xs p-3 outline-none text-white focus:bg-slate-850 focus:ring-1 focus:ring-sky-500 font-medium font-sans"
                  />
                </div>

                {/* HTML5 Tactile/Mouse Canvas Signature Pad */}
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-bold text-slate-400 block">Tracez votre signature ci-dessous *</label>
                  <div className="relative border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/80">
                    <canvas
                      id="signature-canvas"
                      width={400}
                      height={180}
                      className="w-full h-[180px] cursor-crosshair touch-none"
                      onMouseDown={(e) => {
                        const canvas = e.currentTarget;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        ctx.strokeStyle = '#38bdf8'; // Sky-400
                        ctx.lineWidth = 3;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        
                        const rect = canvas.getBoundingClientRect();
                        ctx.beginPath();
                        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                        (canvas as any).isDrawing = true;
                      }}
                      onMouseMove={(e) => {
                        const canvas = e.currentTarget;
                        if (!(canvas as any).isDrawing) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        const rect = canvas.getBoundingClientRect();
                        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                        ctx.stroke();
                      }}
                      onMouseUp={(e) => {
                        (e.currentTarget as any).isDrawing = false;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as any).isDrawing = false;
                      }}
                      onTouchStart={(e) => {
                        const canvas = e.currentTarget;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        ctx.strokeStyle = '#38bdf8';
                        ctx.lineWidth = 3;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        
                        const rect = canvas.getBoundingClientRect();
                        const touch = e.touches[0];
                        ctx.beginPath();
                        ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                        (canvas as any).isDrawing = true;
                      }}
                      onTouchMove={(e) => {
                        const canvas = e.currentTarget;
                        if (!(canvas as any).isDrawing) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        const rect = canvas.getBoundingClientRect();
                        const touch = e.touches[0];
                        ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                        ctx.stroke();
                      }}
                      onTouchEnd={(e) => {
                        (e.currentTarget as any).isDrawing = false;
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement;
                        if (canvas) {
                          const ctx = canvas.getContext('2d');
                          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                        }
                      }}
                      className="absolute bottom-2 right-2 bg-slate-900 border border-slate-800 text-[8px] uppercase tracking-wider font-extrabold px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white"
                    >
                      Effacer
                    </button>
                  </div>
                </div>

                {/* Calligraphic handwrite preview simulation */}
                {signerName.trim().length > 0 && (
                  <div className="p-4 bg-white/5 rounded-2xl text-center border border-dashed border-white/10 space-y-2">
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Simulation de votre signature manuscrite :</span>
                    <p className="text-xl text-sky-300 italic font-medium py-1 tracking-wider" style={{ fontFamily: '"Playfair Display", "Georgia", serif' }}>
                      {signerName.trim()}
                    </p>
                    <span className="text-[8px] text-slate-500 block font-mono">Enregistrement biométrique certifié par l'IP</span>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isSigning}
                  className={`w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-4 rounded-xl text-xs uppercase tracking-wider inline-flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/15 transition-all cursor-pointer ${isSigning ? 'opacity-50' : ''}`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isSigning ? 'Enregistrement de la signature...' : 'Valider et Signer le devis'}</span>
                </button>

              </form>
            </div>
          )}

          {/* STEP 2: Choose booking slot */}
          {step === 'signed' && (
            <div className="bg-slate-950 text-white rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-6 animate-in slide-in-from-right duration-300">
              
              {/* Signed Success Banner */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center space-x-2.5 text-emerald-400">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-black block uppercase tracking-wider">Devis signé avec succès !</span>
                  <span className="text-[9px] text-emerald-500/80 block">Signé par : <strong>{activeDoc.signature_client}</strong></span>
                </div>
              </div>

              {/* Dynamic slot booking engine header */}
              <div className="space-y-1 pb-3 border-b border-slate-800">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-sky-400">📅 Prise de rendez-vous en ligne</h3>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  L'artisan requiert environ un bloc de <strong>{Math.round(estimatedMinutes/60)} heures continu</strong> pour réaliser le chantier. Choisissez un créneau pré-filtré disponible ci-dessous.
                </p>
              </div>

              {/* Slider list of days */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold text-slate-400 font-sans">1. Sélectionnez un jour libre</span>
                  <div className="flex space-x-1.5">
                    <button 
                      type="button"
                      disabled={currentWeekStartIndex === 0}
                      onClick={() => setCurrentWeekStartIndex(Math.max(0, currentWeekStartIndex - 5))}
                      className="bg-slate-900 border border-slate-800 hover:bg-slate-850 p-1 rounded-lg text-white transition-opacity disabled:opacity-40"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button"
                      disabled={currentWeekStartIndex + 5 >= upcomingDays.length}
                      onClick={() => setCurrentWeekStartIndex(Math.min(upcomingDays.length - 5, currentWeekStartIndex + 5))}
                      className="bg-slate-900 border border-slate-800 hover:bg-slate-850 p-1 rounded-lg text-white transition-opacity disabled:opacity-40"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {upcomingDays.slice(currentWeekStartIndex, currentWeekStartIndex + 5).map((d, i) => {
                    const isSelected = selectedDate === d.dateStr;
                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        disabled={d.isClosed}
                        onClick={() => {
                          setSelectedDate(d.dateStr);
                          setSelectedSlot('');
                        }}
                        className={`py-3 px-1.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer text-center ${
                          d.isClosed 
                            ? 'bg-slate-900/40 border-slate-900/60 text-slate-600 opacity-40 cursor-not-allowed'
                            : isSelected 
                              ? 'bg-sky-500 border-sky-400 text-white shadow-md shadow-sky-500/10 scale-105'
                              : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
                        }`}
                      >
                        {/* Split short label into weekday and numeral */}
                        <span className="text-[8px] font-bold block uppercase opacity-80 leading-none">{d.label.split(' ')[0]}</span>
                        <span className="text-sm font-black block leading-none">{d.label.split(' ')[1]}</span>
                        <span className="text-[7px] font-bold block leading-none">{d.label.split(' ')[2] || ''}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slot picker */}
              {selectedDate && (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">2. Choisissez l'heure d'arrivée estimée</span>
                    <span className="text-[9px] text-slate-500 font-medium">Pour la date du {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </div>

                  {availableSlots.length === 0 ? (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-center space-y-1">
                      <span className="text-xs font-bold block">Aucun créneau continu disponible pour ce jour.</span>
                      <p className="text-[9px] text-rose-400/80">L'intervention nécessite {Math.round(estimatedMinutes/60)}h d'affilée sans couper ou empiéter sur la pause repas ou la fermeture.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto pr-1">
                      {availableSlots.map(timeStr => {
                        const isSlotSelected = selectedSlot === timeStr;
                        const startsNight = isNightShiftCrossed(timeStr);

                        return (
                          <button
                            key={timeStr}
                            type="button"
                            onClick={() => setSelectedSlot(timeStr)}
                            className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all relative flex flex-col items-center justify-center cursor-pointer ${
                              isSlotSelected
                                ? 'bg-sky-500 border-sky-400 text-white'
                                : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
                            }`}
                          >
                            <span>{timeStr}</span>
                            {startsNight && (
                              <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-slate-950 px-1 rounded font-black" title="Horaire de Nuit">🌙</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Surcharges Warning Banner and Final Validation Box */}
                  {selectedSlot && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 animate-in zoom-in-95 duration-200">
                      
                      {/* Interactive calculation details */}
                      <div className="space-y-1.5 font-sans">
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                          <span>Prestation de base :</span>
                          {/* ✅ Toujours afficher le prix BASE (sans majoration) */}
                          <span className="font-mono">{baseDocTotal.toFixed(2)} €</span>
                        </div>
                        
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                          <span>Durée totale :</span>
                          <span>~{Math.round(estimatedMinutes/60)} heures ({estimatedMinutes} min)</span>
                        </div>

                        {/* Night surcharge alert */}
                        {isNightShiftCrossed(selectedSlot) ? (
                          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl space-y-1 text-left">
                            <div className="flex items-center space-x-1.5 text-[10px] font-bold">
                              <Moon className="w-3.5 h-3.5 text-amber-400" />
                              <span>Tarif Spécial Activé (+{corpConfig?.majorat_tarif_nuit_pct !== undefined ? corpConfig.majorat_tarif_nuit_pct : 25}%)</span>
                            </div>
                            <p className="text-[9px] leading-relaxed text-amber-500/80">
                              L'heure choisie ({selectedSlot}) empiète sur les horaires soumis à majoration ({corpConfig?.plage_majoration_debut || '19:00'} - {corpConfig?.plage_majoration_fin || '06:00'}). Une majoration s'applique automatiquement à votre commande.
                            </p>
                            <div className="flex justify-between text-[10px] pt-1.5 border-t border-amber-500/10 font-bold mt-1">
                              <span>Montant majoration :</span>
                              <span className="font-mono font-bold">+{(currentTotal * ((corpConfig?.majorat_tarif_nuit_pct !== undefined ? corpConfig.majorat_tarif_nuit_pct : 25) / 100)).toFixed(2)} €</span>
                            </div>
                          </div>
                        ) : (
                          corpConfig?.activer_majoration !== false && (
                            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                              <span>Majoration ({corpConfig?.plage_majoration_debut || '19:00'}-{corpConfig?.plage_majoration_fin || '06:00'}) :</span>
                              <span className="text-emerald-400 font-bold">Inactif (0.00 €)</span>
                            </div>
                          )
                        )}

                        <div className="h-px bg-slate-800 my-2"></div>

                        <div className="flex justify-between text-xs font-black text-white">
                          <span>Total révisé :</span>
                          {/* ✅ Utilise currentTotal qui est déjà calculé avec la majoration */}
                          <span className="text-sky-400 font-mono text-sm">
                            {currentTotal.toFixed(2)} €
                          </span>
                        </div>
                      </div>

                      {/* Optional Notes */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block">Notes d'accès ou instructions pour l'artisan (Optionnel)</label>
                        <textarea
                          rows={2}
                          placeholder="Code d'entrée, interphone, étage ou détails d'escalier..."
                          value={bookingNotes}
                          onChange={e => setBookingNotes(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl text-[10px] p-2.5 outline-none text-white focus:ring-1 focus:ring-sky-500 font-sans leading-relaxed"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isBooking}
                        onClick={handleConfirmBooking}
                        className={`w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider inline-flex items-center justify-center space-x-1.5 cursor-pointer ${isBooking ? 'opacity-50' : ''}`}
                      >
                        <Check className="w-4 h-4" />
                        <span>{isBooking ? 'Planification de votre créneau...' : 'Confirmer ce rendez-vous'}</span>
                      </button>

                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* STEP 3: Booking Success screen */}
          {step === 'booked' && createdAppointment && (
            <div className="bg-slate-950 text-white rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-250 font-sans">
              
              <div className="text-center space-y-3.5 pb-4 border-b border-slate-800">
                <div className="w-12 h-12 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl shadow-lg shadow-emerald-500/10">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">Rendez-vous réservé !</h3>
                  <p className="text-[10px] text-slate-400 px-4 leading-normal">
                    Votre intervention est officiellement bloquée et réservée dans notre planning d'intervention.
                  </p>
                </div>
              </div>

              {/* Event details block */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-850 p-4 space-y-3.5 text-xs text-slate-300">
                <div className="flex items-center space-x-2.5">
                  <span className="text-base text-sky-400">📅</span>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Date confirmée :</span>
                    <span className="font-extrabold text-white text-[11px] block">
                      {new Date(createdAppointment.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5">
                  <span className="text-base text-sky-400">⏰</span>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Heure d'arrivée de l'équipe :</span>
                    <span className="font-extrabold text-white text-[11px] block">
                      {createdAppointment.start_time} (durée estimée : ~{Math.round(createdAppointment.duration_minutes/60)} heures)
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5">
                  <span className="text-base text-sky-400">💵</span>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Montant global TTC (avec majoration si applicable) :</span>
                    <span className="font-bold text-emerald-400 text-sm font-mono block">
                      {createdAppointment.final_price?.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-2xl text-[10px] leading-relaxed flex items-start space-x-2">
                <span className="text-base mt-0.5">💡</span>
                <p>
                  Un e-mail de confirmation vient d'être dépêché à l'adresse <strong>{client?.email || 'votre e-mail'}</strong>. L'équipe d'intervention {corpConfig?.nom_entreprise || 'Shampooine Le'} se présentera chez vous avec tout l'équipement nécessaire !
                </p>
              </div>

            </div>
          )}

        </div>

      </main>

    </div>
  );
}
