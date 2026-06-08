import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiClient';
import { schemaD1SQL } from '../data/schemaD1';
import { 
  Client, 
  Prestation, 
  DevisFacture, 
  LigneDocument, 
  Employe, 
  RendezVousPlanning,
  DocumentStatus,
  DocumentType,
  AppointmentStatus,
  DocumentPhoto,
  EmailConfiguration,
  AvisClient,
  ClientAdresse,
  EntrepriseHoraire,
  EntrepriseFermeture
} from '../types';
import { 
  Users, 
  FileText, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Search, 
  Plus, 
  Filter, 
  Clock, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  ArrowLeftRight, 
  Database,
  Trash2, 
  Edit, 
  Eye, 
  ArrowLeft,
  X,
  Printer,
  CalendarDays,
  UserCheck,
  DollarSign,
  Layers,
  Sparkles,
  ClipboardCheck,
  AlertCircle,
  Mail,
  MapPin,
  MessageSquare,
  CheckCircle2,
  Settings,
  Building,
  Shield,
  Camera,
  UploadCloud
} from 'lucide-react';
import { EntrepriseConfig } from '../types';

interface AdminViewProps {
  onSwitchToPublic: () => void;
  onToast: (msg: string, type: 'success' | 'info') => void;
  onUpdateEntrepriseConfig?: (config: EntrepriseConfig) => void;
}

export default function AdminView({ onSwitchToPublic, onToast, onUpdateEntrepriseConfig }: AdminViewProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'documents' | 'employees' | 'planning' | 'd1_schema' | 'email_config' | 'reviews' | 'entreprise_config'>('dashboard');

  // Enterprise details
  const [entrepriseConfig, setEntrepriseConfig] = useState<EntrepriseConfig>({
    id: 'default',
    nom_entreprise: 'Shampooine Le',
    telephone: '06 12 34 56 78',
    adresse_siege: '42 Avenue de la Propreté, 75008 Paris',
    horaires: 'Lundi au Samedi : 8h00 - 19h00',
    siret: '123 456 789 00021',
    code_ape: '8121Z',
    tva_intracommunautaire: 'FR 12 123456789',
    forme_juridique: 'SARL',
    capital_social: '10 000 €',
    logo_url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=120&h=120&q=80'
  });

  const [entrepriseHoraires, setEntrepriseHoraires] = useState<EntrepriseHoraire[]>([]);
  const [entrepriseFermetures, setEntrepriseFermetures] = useState<EntrepriseFermeture[]>([]);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'horaires' | 'prestations'>('general');
  const [newClosureForm, setNewClosureForm] = useState({ date: '', description: '' });
  
  // Prestation management state variables
  const [editingPrestation, setEditingPrestation] = useState<Prestation | null>(null);
  const [showPrestationModal, setShowPrestationModal] = useState(false);
  const [prestationForm, setPrestationForm] = useState({
    category: 'canape' as 'canape' | 'moquette' | 'fauteuil' | 'autre',
    name: '',
    type_tarif: 'fixe' as 'fixe' | 'm2',
    prix_unitaire: 0,
    activer_majoration_nuit: true,
    temps_estime_minutes: 30
  });

  // Quote line composition state variables
  const [lineComposeMode, setLineComposeMode] = useState<'catalogue' | 'libre'>('catalogue');
  const [customLineName, setCustomLineName] = useState('');
  const [customLinePrice, setCustomLinePrice] = useState(0);
  const [customLineQty, setCustomLineQty] = useState(1);

  // App datasets
  const [clients, setClients] = useState<Client[]>([]);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [documents, setDocuments] = useState<DevisFacture[]>([]);
  const [employees, setEmployees] = useState<Employe[]>([]);
  const [appointments, setAppointments] = useState<RendezVousPlanning[]>([]);
  const [emailConfigs, setEmailConfigs] = useState<EmailConfiguration[]>([]);
  const [clientReviews, setClientReviews] = useState<AvisClient[]>([]);
  
  // Selected configuration for email editor
  const [editingConfig, setEditingConfig] = useState<EmailConfiguration | null>(null);

  // Growth loop report for automatic emails sent
  const [selectedSentEmailsReport, setSelectedSentEmailsReport] = useState<{
    clientName: string;
    clientEmail: string;
    invoiceSubject: string;
    invoiceBody: string;
    feedbackSubject: string;
    feedbackBody: string;
  } | null>(null);

  // Loading indicator states
  const [loading, setLoading] = useState(true);

  // Search & Filter globals
  const [searchTerm, setSearchTerm] = useState('');
  const [documentSearchTerm, setDocumentSearchTerm] = useState('');
  
  // Modal / Detail drawer states
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClientModal, setNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    notes: '',
    type_client: 'particulier' as 'particulier' | 'professionnel',
    raison_sociale: '',
    siret: '',
    tva_intracommunautaire: '',
    adresse_complete: ''
  });
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  
  // Quote Builder States
  const [viewingDoc, setViewingDoc] = useState<DevisFacture | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [sendingDocId, setSendingDocId] = useState<string | null>(null);
  const [viewingLines, setViewingLines] = useState<LigneDocument[]>([]);
  const [viewingPhotos, setViewingPhotos] = useState<DocumentPhoto[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newPhotoBeforeAfter, setNewPhotoBeforeAfter] = useState<'before' | 'after' | 'spec'>('before');
  const [newDocModal, setNewDocModal] = useState(false);
  const [newDocForm, setNewDocForm] = useState({
    client_id: '',
    type: 'devis' as DocumentType,
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  });
  const [newDocLines, setNewDocLines] = useState<{ prestation_id: string; quantity: number; unit_price: number; custom_name?: string }[]>([]);

  // B2B & CRM Multi-adresses State
  const [editClientModal, setEditClientModal] = useState(false);
  const [editClientForm, setEditClientForm] = useState<Client | null>(null);
  const [allAddresses, setAllAddresses] = useState<ClientAdresse[]>([]);
  const [selectedClientAdresses, setSelectedClientAdresses] = useState<ClientAdresse[]>([]);
  const [addressLabel, setAddressLabel] = useState('Maison principale');
  const [addressLine, setAddressLine] = useState('');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [docInterventionAddress, setDocInterventionAddress] = useState('');
  const [apptInterventionAddress, setApptInterventionAddress] = useState('');

  // Enterprise & Admin Security Configuration Tab States
  const [adminEmailInput, setAdminEmailInput] = useState('shampooinele.direction');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordConfirmInput, setAdminPasswordConfirmInput] = useState('');
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [draftConfig, setDraftConfig] = useState<EntrepriseConfig>({
    id: 'default',
    nom_entreprise: 'Shampooine Le',
    telephone: '06 12 34 56 78',
    adresse_siege: '42 Avenue de la Propreté, 75008 Paris',
    horaires: 'Lundi au Samedi : 8h00 - 19h00',
    siret: '123 456 789 00021',
    code_ape: '8121Z',
    tva_intracommunautaire: 'FR 12 123456789',
    forme_juridique: 'SARL',
    capital_social: '10 000 €',
    logo_url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=120&h=120&q=80'
  });

  // Surcharge settings states
  const [surchargeActive, setSurchargeActive] = useState<boolean>(true);
  const [surchargePct, setSurchargePct] = useState<number>(25);
  const [surchargeStart, setSurchargeStart] = useState<string>('19:00');
  const [surchargeEnd, setSurchargeEnd] = useState<string>('06:00');

  useEffect(() => {
    if (entrepriseConfig) {
      setDraftConfig(entrepriseConfig);
      setSurchargeActive(entrepriseConfig.activer_majoration !== false);
      setSurchargePct(entrepriseConfig.majorat_tarif_nuit_pct !== undefined ? entrepriseConfig.majorat_tarif_nuit_pct : 25);
      setSurchargeStart(entrepriseConfig.plage_majoration_debut || '19:00');
      setSurchargeEnd(entrepriseConfig.plage_majoration_fin || '06:00');
    }
  }, [entrepriseConfig]);

  useEffect(() => {
    const saved = localStorage.getItem('shampooine_admin_credentials');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email) {
          setAdminEmailInput(parsed.email);
        }
      } catch (e) {}
    }
  }, []);

  // States for modifying appointments dynamically (including last-minute additions)
  const [editApptModal, setEditApptModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState<RendezVousPlanning | null>(null);
  const [editApptForm, setEditApptForm] = useState({
    title: '',
    date: '',
    start_time: '',
    duration_minutes: 60,
    assigned_employee_ids: [] as string[],
    notes: ''
  });
  const [editApptLines, setEditApptLines] = useState<{ prestation_name: string; quantity: number; unit_price: number; total_price: number }[]>([]);
  
  useEffect(() => {
    if (!editApptModal) return;
    
    // Auto-calculate sum of durations for editApptLines
    let totalMinutes = 0;
    editApptLines.forEach(line => {
      // Find matching prestation in catalogue by checking if the line name starts with the prestation name
      // (as line names can have suffixes like Grade Professionnel or night surcharge indicators)
      const matched = prestations.find(p => {
        // Clean name comparisons
        const cleanLineName = line.prestation_name.toLowerCase().trim();
        const cleanPrestationName = p.name.toLowerCase().trim();
        return cleanLineName.startsWith(cleanPrestationName);
      });
      
      const unitTime = matched && matched.temps_estime_minutes !== undefined ? matched.temps_estime_minutes : 30;
      totalMinutes += unitTime * line.quantity;
    });

    if (totalMinutes > 0) {
      setEditApptForm(prev => ({ ...prev, duration_minutes: totalMinutes }));
    }
  }, [editApptLines, editApptModal, prestations]);

  const [lastMinutePrestationId, setLastMinutePrestationId] = useState('');
  const [lastMinuteQty, setLastMinuteQty] = useState(1);

  // Mode signature sur place & Clôture de prestation règlement
  const [signatureOnSpotMode, setSignatureOnSpotMode] = useState(false);
  const [paymentClosingAppt, setPaymentClosingAppt] = useState<RendezVousPlanning | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'ESPECES' | 'VIREMENT'>('ESPECES');
  const [paymentEncaissed, setPaymentEncaissed] = useState<boolean>(true);

  // Drawing Pad Handlers for Touchscreen Signatures
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0ea5e9'; // Stunning clear cyan/sky-blue ink
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if ('touches' in e) {
      if (e.cancelable) e.preventDefault();
    }

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // On-the-fly client creation support
  const [onTheFlyClient, setOnTheFlyClient] = useState({
    enabled: false,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    notes: ''
  });

  // Employee Edit States
  const [newEmpModal, setNewEmpModal] = useState(false);
  const [newEmpForm, setNewEmpForm] = useState({ 
    id: '', 
    first_name: '', 
    last_name: '', 
    email: '', 
    phone: '', 
    status: 'Actif' as const, 
    color: '#0ea5e9',
    compte_actif: false,
    username: '',
    password_hash: ''
  });

  // Appointment Planner States
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(() => new Date());
  const [newApptModal, setNewApptModal] = useState(false);
  const [calendarView, setCalendarView] = useState<'week' | 'day'>('week');

  const [clientSearchText, setClientSearchText] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  useEffect(() => {
    if (!newDocModal) {
      setClientSearchText('');
      setShowClientSuggestions(false);
    }
  }, [newDocModal]);

  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return weekNo;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const getHeaderTitle = () => {
    if (calendarView === 'week') {
      const mon = getMonday(selectedCalendarDate);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      
      if (mon.getMonth() === sun.getMonth()) {
        return `${mon.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} (Semaine ${getWeekNumber(mon)})`;
      } else {
        return `${mon.toLocaleDateString('fr-FR', { month: 'short' })} - ${sun.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} (Semaine ${getWeekNumber(mon)})`;
      }
    } else {
      return selectedCalendarDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  const handleToday = () => {
    setSelectedCalendarDate(new Date());
  };

  const handlePrev = () => {
    const nextDate = new Date(selectedCalendarDate);
    if (calendarView === 'week') {
      nextDate.setDate(nextDate.getDate() - 7);
    } else {
      nextDate.setDate(nextDate.getDate() - 1);
    }
    setSelectedCalendarDate(nextDate);
  };

  const handleNext = () => {
    const nextDate = new Date(selectedCalendarDate);
    if (calendarView === 'week') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    setSelectedCalendarDate(nextDate);
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setSelectedCalendarDate(new Date(e.target.value));
    }
  };

  const formatEndTime = (startTimeStr: string, durationMin: number) => {
    const [h, m] = startTimeStr.split(':').map(Number);
    const totalMin = h * 60 + m + durationMin;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  const getStyledAppointmentsForDay = (dayDateStr: string, dayAppts: RendezVousPlanning[]) => {
    const sorted = [...dayAppts].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const columns: RendezVousPlanning[][] = [];
    
    sorted.forEach(appt => {
      let placed = false;
      const [ah, am] = appt.start_time.split(':').map(Number);
      const aStart = ah * 60 + am;
      const aEnd = aStart + appt.duration_minutes;
      
      for (let c = 0; c < columns.length; c++) {
        const hasOverlap = columns[c].some(other => {
          const [oh, om] = other.start_time.split(':').map(Number);
          const oStart = oh * 60 + om;
          const oEnd = oStart + other.duration_minutes;
          return (aStart < oEnd && aEnd > oStart);
        });
        
        if (!hasOverlap) {
          columns[c].push(appt);
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        columns.push([appt]);
      }
    });
    
    const apptStyles = new Map<string, { left: number; width: number }>();
    const totalCols = columns.length;
    
    columns.forEach((col, colIndex) => {
      col.forEach(appt => {
        const width = 95 / totalCols;
        const left = colIndex * (100 / totalCols);
        apptStyles.set(appt.id, { left, width });
      });
    });
    
    return apptStyles;
  };

  const getAvailableVariables = (fluxType: string): string[] => {
    switch (fluxType) {
      case 'appointment_confirmation':
        return ['{PRENOM_CLIENT}', '{NOM_CLIENT}', '{DATE_RDV}', '{HEURE_RDV}', '{DUREE_ESTIMEE}', '{NOM_ENTREPRISE}'];
      case 'devis_sending':
      case 'facture_sending':
        return ['{PRENOM_CLIENT}', '{NOM_CLIENT}', '{TYPE_DOCUMENT}', '{NUMERO_DOCUMENT}', '{TOTAL_DOCUMENT}', '{LIEN_DOCUMENT}', '{NOM_ENTREPRISE}'];
      case 'employee_notification':
        return ['{NOM_EMPLOYE}', '{IDENT_CONNEXION}', '{PASS_CONNEXION}', '{LIEN_CONNEXION}', '{PRENOM_CLIENT}', '{NOM_CLIENT}', '{DATE_RDV}', '{HEURE_RDV}', '{NOM_ENTREPRISE}'];
      case 'growth_feedback_request':
        return ['{PRENOM_CLIENT}', '{NOM_CLIENT}', '{LIEN_AVIS}', '{NOM_ENTREPRISE}'];
      default:
        return ['{PRENOM_CLIENT}', '{NOM_CLIENT}', '{NOM_ENTREPRISE}'];
    }
  };

  // ─── TVA HELPER ────────────────────────────────────────────────────────────
  // Tous les prix catalogue sont en TTC. Pour B2B, on extrait le HT via /1.20.
  const getDocTotals = (lines: typeof newDocLines, isB2B: boolean) => {
    const totalTTC = lines.reduce((acc, l) => acc + Number(l.quantity) * Number(l.unit_price), 0);
    if (isB2B) {
      const totalHT = totalTTC / 1.20;
      const montantTVA = totalTTC - totalHT;
      return { totalHT, montantTVA, totalTTC };
    }
    return { totalHT: null, montantTVA: null, totalTTC };
  };
  // ───────────────────────────────────────────────────────────────────────────

  const handleInsertVariable = (variable: string) => {
    const textarea = document.getElementById('email-body-editor') as HTMLTextAreaElement;
    if (!textarea || !editingConfig) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editingConfig.corps_template || '';
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    
    const newText = before + variable + after;
    setEditingConfig({ ...editingConfig, corps_template: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 10);
  };

  const [newApptForm, setNewApptForm] = useState({
    devis_facture_id: '',
    title: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    duration_minutes: 120,
    final_price: 150,
    notes: '',
    assigned_employee_ids: [] as string[]
  });

  const loadAllDbData = async () => {
    setLoading(true);
    try {
      const p1 = apiService.getClients();
      const p2 = apiService.getPrestations();
      const p3 = apiService.getDevisFactures();
      const p4 = apiService.getEmployees();
      const p5 = apiService.getAppointments();
      const p6 = apiService.getEmailConfigurations();
      const p7 = apiService.getClientReviews();
      const p8 = apiService.getAllClientAdresses();
      const p9 = apiService.getEntrepriseConfig();
      const p10 = apiService.getEntrepriseHoraires();
      const p11 = apiService.getEntrepriseFermetures();

      const [cRes, prRes, dfRes, empRes, apptRes, mRes, rRes, addrRes, entRes, hoursRes, closuresRes] = await Promise.all([p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11]);
      setClients(cRes);
      setPrestations(prRes);
      setDocuments(dfRes);
      setEmployees(empRes);
      setAppointments(apptRes);
      setEmailConfigs(mRes);
      setClientReviews(rRes);
      setAllAddresses(addrRes || []);
      setEntrepriseHoraires(hoursRes || []);
      setEntrepriseFermetures(closuresRes || []);
      if (entRes) {
        setEntrepriseConfig(entRes);
      }
    } catch (err) {
      console.error(err);
      onToast("Échec du rechargement des données.", "info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllDbData();
  }, []);

  // Load dynamic planning appointments when calendar date or tab changes
  useEffect(() => {
    async function loadPlanningEvents() {
      const getMonday = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
      };
      
      const mon = getMonday(selectedCalendarDate);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      
      const startStr = mon.toISOString().split('T')[0];
      const endStr = sun.toISOString().split('T')[0];
      
      try {
        const res = await apiService.getAppointments(startStr, endStr);
        setAppointments(res);
      } catch (err) {
        console.error("Error loading dynamic planning events", err);
      }
    }
    
    if (activeTab === 'planning') {
      loadPlanningEvents();
    }
  }, [selectedCalendarDate, activeTab]);

  // CRM: Create Client
  const handleAddressSearch = async (query: string) => {
    setNewClientForm(prev => ({ ...prev, adresse_complete: query }));
    if (query.trim().length < 4) {
      setAddressSuggestions([]);
      return;
    }
    try {
      setIsSearchingAddress(true);
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        const features = data.features || [];
        const labels = features.map((f: any) => f.properties.label);
        setAddressSuggestions(labels);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.last_name || !newClientForm.phone) {
      onToast("Le Nom et le Téléphone sont obligatoires pour créer un client.", "info");
      return;
    }
    try {
      const created = await apiService.createOrUpdateClient(newClientForm);
      onToast(`Client ${newClientForm.first_name} ${newClientForm.last_name} enregistré avec succès !`, "success");
      setNewClientModal(false);
      
      // Auto-select the newly created client in document builder if modal is open
      if (newDocModal) {
        setNewDocForm(prev => ({ ...prev, client_id: created.id }));
        setClientSearchText(`${created.last_name.toUpperCase()} ${created.first_name}`);
        setDocInterventionAddress('');
      }

      setNewClientForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        notes: '',
        type_client: 'particulier',
        raison_sociale: '',
        siret: '',
        tva_intracommunautaire: '',
        adresse_complete: ''
      });
      setAddressSuggestions([]);
      loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("Échec d'enregistrement du client.", "info");
    }
  };

  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client);
    try {
      const fullClient = await apiService.getClientById(client.id);
      if (fullClient) {
        setSelectedClient(fullClient);
        if (fullClient.documents) {
          setDocuments(prev => {
            const filtered = prev.filter(d => d.client_id !== client.id);
            return [...filtered, ...fullClient.documents!];
          });
        }
      }
    } catch (err) {
      console.error("Failed to load client details with documents", err);
    }
  };

  // CRM: Update Client
  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClientForm) return;
    try {
      await apiService.updateClient(editClientForm);
      onToast(`Client ${editClientForm.first_name} ${editClientForm.last_name} mis à jour.`, "success");
      setEditClientModal(false);
      // Synchroniser le client sélectionné
      setSelectedClient(editClientForm);
      loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("Échec du changement de fiche client.", "info");
    }
  };

  // CRM: Save/Update Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !addressLine) return;
    try {
      const payload: ClientAdresse = {
        id: editingAddressId || `addr-${Date.now()}`,
        client_id: selectedClient.id,
        label_adresse: addressLabel,
        adresse_complete: addressLine
      };
      await apiService.saveClientAdresse(payload);
      onToast(editingAddressId ? "Adresse modifiée." : "Adresse enregistrée.", "success");
      
      setAddressLine('');
      setAddressLabel('Maison principale');
      setEditingAddressId(null);
      setShowAddressForm(false);
      
      loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("Échec d'enregistrement de l'adresse.", "info");
    }
  };

  // CRM: Delete Address
  const handleDeleteAddress = async (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette adresse d'intervention ?")) {
      try {
        await apiService.deleteClientAdresse(id);
        onToast("Adresse d'intervention supprimée.", "success");
        loadAllDbData();
      } catch (err) {
        console.error(err);
        onToast("Échec de la suppression de l'adresse.", "info");
      }
    }
  };

  // CRM: Delete Client
  const handleDeleteClient = async (id: string, name: string) => {
    if (confirm(`Voulez-vous vraiment supprimer le client $ {name} ? Ceci supprimera également ses devis et factures rattachées.`)) {
      try {
        await apiService.deleteClient(id);
        onToast(`Client ${name} supprimé.`, "success");
        if (selectedClient?.id === id) setSelectedClient(null);
        loadAllDbData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // 1-Click convert Devis to Facture
  const handleConvertToInvoice = async (devisId: string, devisNumber: string) => {
    try {
      const res = await apiService.convertDevisToFacture(devisId);
      onToast(`Le devis ${devisNumber} a été converti en Facture ${res.number} !`, "success");
      setViewingDoc(null);
      loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("Erreur lors de la conversion.", "info");
    }
  };

  // Update Status of Document
  const handleStatusChange = async (docId: string, status: DocumentStatus) => {
    try {
      await apiService.updateDocumentStatus(docId, status);
      onToast(`Statut mis à jour : ${status}`, "success");
      loadAllDbData();
      if (viewingDoc && viewingDoc.id === docId) {
        setViewingDoc({ ...viewingDoc, status: status });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send or Resend Document via Resend API
  const handleSendOrResendDoc = async (doc: DevisFacture) => {
    setSendingDocId(doc.id);
    try {
      const res = await apiService.sendOrResendDocument(doc.id);
      
      // Update local state if we are currently viewing this document
      if (viewingDoc && viewingDoc.id === doc.id) {
        setViewingDoc({ ...viewingDoc, status: res.newStatus });
      }

      onToast(`Le document ${doc.number} a été envoyé avec succès à ${res.sentTo} !`, "success");
      loadAllDbData();
    } catch (err: any) {
      console.error(err);
      onToast(err.message || "Erreur lors de l'envoi du document", "info");
    } finally {
      setSendingDocId(null);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (id: string, num: string) => {
    if (confirm(`Supprimer définitivement le document ${num} ?`)) {
      try {
        await apiService.deleteDocument(id);
        onToast(`Document ${num} supprimé.`, "success");
        setViewingDoc(null);
        loadAllDbData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Mark completion of appointment & run Resend automation + billing conversion
  const handleCompleteAppointment = async (appt: RendezVousPlanning) => {
    try {
      const updatedAppt: RendezVousPlanning = { ...appt, status: 'Terminé' as AppointmentStatus };
      await apiService.saveAppointment(updatedAppt);

      const doc = documents.find(d => d.id === appt.devis_facture_id);
      const client = doc ? clients.find(c => c.id === doc.client_id) : null;

      let finalDocId = doc ? doc.id : '';
      let invoiceNumber = doc ? doc.number : 'FAC-SOLDE';

      if (doc && doc.type === 'devis') {
        const resultDoc = await apiService.convertDevisToFacture(doc.id);
        finalDocId = resultDoc.id;
        invoiceNumber = resultDoc.number;
        await apiService.updateDocumentStatus(resultDoc.id, 'Facturé');
      } else if (doc && doc.type === 'facture') {
        await apiService.updateDocumentStatus(doc.id, 'Facturé');
      }

      onToast(`Prestation terminée ! Facture ${invoiceNumber} générée de solde.`, "success");

      if (client) {
        const empNames = appt.assigned_employee_ids
          .map(id => {
            const em = employees.find(e => e.id === id);
            return em ? `${em.first_name} ${em.last_name}` : '';
          })
          .filter(Boolean)
          .join(', ');

        const feedbackLink = `${window.location.protocol}//${window.location.host}/laisser-un-avis?client_id=${client.id}&rdv_id=${appt.id}`;

        const replacements = {
          PRENOM_CLIENT: client.first_name,
          NOM_CLIENT: client.last_name,
          DATE_RDV: appt.date,
          HEURE_RDV: appt.start_time,
          DUREE_ESTIMEE: appt.duration_minutes.toString(),
          NOM_EMPLOYE: empNames || "Nos techniciens experts",
          LIEN_AVIS: feedbackLink
        };

        const resInvoice = await apiService.sendAutomatedEmail('facture_sending', replacements, client.email);
        const resFeedback = await apiService.sendAutomatedEmail('growth_feedback_request', replacements, client.email);

        setSelectedSentEmailsReport({
          clientName: `${client.first_name} ${client.last_name}`,
          clientEmail: client.email,
          invoiceSubject: resInvoice.subject,
          invoiceBody: resInvoice.body,
          feedbackSubject: resFeedback.subject,
          feedbackBody: resFeedback.body
        });
      }

      await loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("Erreur lors de la mise à jour de fin de prestation.", "info");
    }
  };

  // Open payment and closure modal for an appointment
  const handleOpenPaymentClosingModal = (appt: RendezVousPlanning) => {
    setPaymentClosingAppt(appt);
    setPaymentMethod('ESPECES');
    setPaymentEncaissed(true);
  };

  // Confirm finalization of appointment with payment
  const handleConfirmPaymentClosing = async () => {
    if (!paymentClosingAppt) return;
    try {
      const appt = paymentClosingAppt;
      // Mark appointment as 'Terminé'
      const updatedAppt: RendezVousPlanning = { ...appt, status: 'Terminé' as AppointmentStatus };
      await apiService.saveAppointment(updatedAppt);

      const doc = documents.find(d => d.id === appt.devis_facture_id);
      const client = doc ? clients.find(c => c.id === doc.client_id) : null;

      let finalDocId = doc ? doc.id : '';
      let invoiceNumber = doc ? doc.number : 'FAC-SOLDE';

      // Set status and payment properties
      const nextStatus = paymentEncaissed ? 'Payé' : 'Facturé';
      const docUpdates: Partial<DevisFacture> = {
        moyen_paiement: paymentMethod,
        paiement_valide: paymentEncaissed,
        date_paiement: paymentEncaissed ? new Date().toISOString().split('T')[0] : null,
        status: nextStatus as DocumentStatus
      };

      if (doc && doc.type === 'devis') {
        const resultDoc = await apiService.convertDevisToFacture(doc.id);
        finalDocId = resultDoc.id;
        invoiceNumber = resultDoc.number;
        await apiService.updateAppointmentFull(appt.id, {}, finalDocId, [], docUpdates);
      } else if (doc && doc.type === 'facture') {
        await apiService.updateAppointmentFull(appt.id, {}, doc.id, [], docUpdates);
      }

      onToast(`Facture ${invoiceNumber} clôturée et archivée (${paymentEncaissed ? 'Réglée' : 'Envoyée'}).`, "success");

      if (client) {
        const empNames = appt.assigned_employee_ids
          .map(id => {
            const em = employees.find(e => e.id === id);
            return em ? `${em.first_name} ${em.last_name}` : '';
          })
          .filter(Boolean)
          .join(', ');

        const feedbackLink = `${window.location.protocol}//${window.location.host}/laisser-un-avis?client_id=${client.id}&rdv_id=${appt.id}`;

        let bankTransferNotes = "";
        if (paymentMethod === 'VIREMENT') {
          bankTransferNotes = `Pour votre virement, merci de spécifier obligatoirement en libellé : ${client.last_name} ${client.first_name} - ${client.phone} - Prestation du ${appt.date}`;
        }

        const replacements = {
          PRENOM_CLIENT: client.first_name,
          NOM_CLIENT: client.last_name,
          DATE_RDV: appt.date,
          HEURE_RDV: appt.start_time,
          DUREE_ESTIMEE: appt.duration_minutes.toString(),
          NOM_EMPLOYE: empNames || "Nos techniciens experts",
          LIEN_AVIS: feedbackLink,
          NOTE_VIREMENT: bankTransferNotes ? `📌 CONSIGNE OBLIGATOIRE POUR TRANSFERT : ${bankTransferNotes}` : ""
        };

        const resInvoice = await apiService.sendAutomatedEmail('facture_sending', replacements, client.email);
        const resFeedback = await apiService.sendAutomatedEmail('growth_feedback_request', replacements, client.email);

        setSelectedSentEmailsReport({
          clientName: `${client.first_name} ${client.last_name}`,
          clientEmail: client.email,
          invoiceSubject: resInvoice.subject,
          invoiceBody: resInvoice.body,
          feedbackSubject: resFeedback.subject,
          feedbackBody: resFeedback.body
        });
      }

      setPaymentClosingAppt(null);
      await loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("Erreur lors de la finalisation du paiement.", "info");
    }
  };

  // Confirm finalization with signature on spot
  const handleValidateSignatureOnSpot = async (signatureDataUrl: string) => {
    if (!editingAppt) return;
    try {
      const appt = editingAppt;
      const totalAmount = editApptLines.reduce((acc, current) => acc + current.total_price, 0);

      // We have both appt updates & signature updates on the document
      const apptData: Partial<RendezVousPlanning> = {
        title: editApptForm.title,
        date: editApptForm.date,
        start_time: editApptForm.start_time,
        duration_minutes: Number(editApptForm.duration_minutes),
        assigned_employee_ids: editApptForm.assigned_employee_ids,
        notes: editApptForm.notes,
        status: 'Terminé' as AppointmentStatus,
        final_price: totalAmount
      };

      const doc = documents.find(d => d.id === appt.devis_facture_id);
      const client = doc ? clients.find(c => c.id === doc.client_id) : null;

      let finalDocId = doc ? doc.id : '';
      let invoiceNumber = doc ? doc.number : 'FAC-SIGN';

      const docUpdates: Partial<DevisFacture> = {
        signature_client: signatureDataUrl,
        signature_sur_place: true,
        date_signature: new Date().toISOString().split('T')[0],
        status: 'Signé' as DocumentStatus
      };

      // Perform deep update of appointment details, lines, and document details simultaneously!
      if (doc && doc.type === 'devis') {
        const resultDoc = await apiService.convertDevisToFacture(doc.id);
        finalDocId = resultDoc.id;
        invoiceNumber = resultDoc.number;
        await apiService.updateAppointmentFull(appt.id, apptData, finalDocId, editApptLines, docUpdates);
      } else if (doc && doc.type === 'facture') {
        await apiService.updateAppointmentFull(appt.id, apptData, doc.id, editApptLines, docUpdates);
      }

      onToast(`Prestation validée de dernière minute et signée sur place ! Facture ${invoiceNumber} validée.`, "success");

      if (client) {
        const empNames = apptData.assigned_employee_ids || [];
        const empNamesDisplay = empNames
          .map(id => {
            const em = employees.find(e => e.id === id);
            return em ? `${em.first_name} ${em.last_name}` : '';
          })
          .filter(Boolean)
          .join(', ');

        const feedbackLink = `${window.location.protocol}//${window.location.host}/laisser-un-avis?client_id=${client.id}&rdv_id=${appt.id}`;

        const replacements = {
          PRENOM_CLIENT: client.first_name,
          NOM_CLIENT: client.last_name,
          DATE_RDV: editApptForm.date,
          HEURE_RDV: editApptForm.start_time,
          DUREE_ESTIMEE: editApptForm.duration_minutes.toString(),
          NOM_EMPLOYE: empNamesDisplay || "Nos techniciens experts",
          LIEN_AVIS: feedbackLink
        };

        const resInvoice = await apiService.sendAutomatedEmail('facture_sending', replacements, client.email);
        const resFeedback = await apiService.sendAutomatedEmail('growth_feedback_request', replacements, client.email);

        setSelectedSentEmailsReport({
          clientName: `${client.first_name} ${client.last_name}`,
          clientEmail: client.email,
          invoiceSubject: resInvoice.subject,
          invoiceBody: resInvoice.body,
          feedbackSubject: resFeedback.subject,
          feedbackBody: resFeedback.body
        });
      }

      setSignatureOnSpotMode(false);
      setEditApptModal(false);
      await loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("Échec lors de la signature sur place.", "info");
    }
  };

  // Helper to check if a start time crosses night hours (surcharged)
  const isNightShiftCrossed = (startHm: string): boolean => {
    if (!startHm) return false;
    if (surchargeActive === false) return false;

    const getMinutes = (hm: string): number => {
      const [hours, minutes] = hm.split(':').map(Number);
      return hours * 60 + (minutes || 0);
    };

    const currentMinutes = getMinutes(startHm);
    const startLimitMinutes = getMinutes(surchargeStart);
    const endLimitMinutes = getMinutes(surchargeEnd);

    if (startLimitMinutes > endLimitMinutes) {
      // Overnight (e.g. 19:00 to 06:00)
      return currentMinutes >= startLimitMinutes || currentMinutes < endLimitMinutes;
    } else {
      // Same day (e.g. 08:00 to 12:00)
      return currentMinutes >= startLimitMinutes && currentMinutes < endLimitMinutes;
    }
  };

  // Re-adjust edit lines based on whether current start time is night time or not
  const [previousStartWasNight, setPreviousStartWasNight] = useState<boolean>(false);

  const applyNightSurchargeToLines = (startTime: string, linesList: typeof editApptLines) => {
    const isNight = isNightShiftCrossed(startTime);
    const multiplier = isNight ? (1 + surchargePct / 100) : 1.0;
    
    // We update unit_price of lines by applying or removing surcharge
    return linesList.map(line => {
      // Clean name from previous night surcharge notes
      const cleanName = line.prestation_name.replace(/ \[MAJORATION DE NIGHT.*?\]/g, "").replace(/ \[MAJ\. NUIT.*?\]/g, "");
      
      // Let's deduce base unit price: if previous was night, we divide by (1 + surchargePct/100)
      let basePrice = line.unit_price;
      if (previousStartWasNight) {
        basePrice = Number((line.unit_price / (1 + surchargePct / 100)).toFixed(2));
      }

      const finalUnitPrice = Number((basePrice * multiplier).toFixed(2));
      const nameWithNote = isNight ? `${cleanName} [MAJ. NUIT +${surchargePct}%]` : cleanName;

      return {
        ...line,
        prestation_name: nameWithNote,
        unit_price: finalUnitPrice,
        total_price: Number((finalUnitPrice * line.quantity).toFixed(2))
      };
    });
  };

  // Open Edit Appointment Modal and pre-fetch lines
  const handleOpenEditAppointment = async (appt: RendezVousPlanning) => {
    setEditingAppt(appt);
    setEditApptForm({
      title: appt.title,
      date: appt.date,
      start_time: appt.start_time,
      duration_minutes: appt.duration_minutes,
      assigned_employee_ids: [...appt.assigned_employee_ids],
      notes: appt.notes || ''
    });
    setLastMinutePrestationId('');
    setLastMinuteQty(1);

    const isNight = isNightShiftCrossed(appt.start_time);
    setPreviousStartWasNight(isNight);

    try {
      const lines = await apiService.getLignesDocument(appt.devis_facture_id);
      setEditApptLines(lines.map(l => ({
        prestation_name: l.prestation_name,
        quantity: l.quantity,
        unit_price: l.unit_price,
        total_price: l.total_price
      })));
    } catch (err) {
      console.error(err);
      setEditApptLines([]);
    }
    setEditApptModal(true);
  };

  // Trigger recalculation when form fields change (heure de debut)
  const handleEditStartTimeChange = (newTime: string) => {
    const nextLines = applyNightSurchargeToLines(newTime, editApptLines);
    setEditApptLines(nextLines);
    setPreviousStartWasNight(isNightShiftCrossed(newTime));
    setEditApptForm({ ...editApptForm, start_time: newTime });
  };

  // Dynamic lines updates inside appointment editing modal
  const updateLineEditQty = (index: number, newQty: number) => {
    const updated = [...editApptLines];
    updated[index].quantity = newQty;
    updated[index].total_price = Number((newQty * updated[index].unit_price).toFixed(2));
    setEditApptLines(updated);
  };

  const updateLineEditPrice = (index: number, newPrice: number) => {
    const updated = [...editApptLines];
    updated[index].unit_price = newPrice;
    updated[index].total_price = Number((updated[index].quantity * newPrice).toFixed(2));
    setEditApptLines(updated);
  };

  const removeLineEdit = (index: number) => {
    const updated = editApptLines.filter((_, i) => i !== index);
    setEditApptLines(updated);
  };

  const addLastMinutePrestation = () => {
    const isNightNow = isNightShiftCrossed(editApptForm.start_time);
    const surchargeMultiplier = isNightNow ? (1 + surchargePct / 100) : 1.0;

    if (lineComposeMode === 'catalogue') {
      if (!lastMinutePrestationId) {
        onToast("Veuillez sélectionner une prestation.", "info");
        return;
      }
      const found = prestations.find(p => p.id === lastMinutePrestationId);
      if (found) {
        const df = documents.find(d => d.id === editingAppt?.devis_facture_id);
        const cl = df ? clients.find(c => c.id === df.client_id) : null;
        const factor = cl?.type_client === 'professionnel' ? 1.25 : 1.0;
        const basePrice = found.prix_unitaire !== undefined ? found.prix_unitaire : found.base_price;
        
        // Apply professional factor & possible night surcharge multiplier
        const finalPrice = Number((basePrice * factor * surchargeMultiplier).toFixed(2));
        const nameSuffix = cl?.type_client === 'professionnel' ? ' (Grade Professionnel)' : '';
        const nightSuffix = isNightNow ? ` [MAJ. NUIT +${surchargePct}%]` : '';

        const newLine = {
          prestation_name: `${found.name}${nameSuffix}${nightSuffix}`,
          quantity: lastMinuteQty,
          unit_price: finalPrice,
          total_price: Number((finalPrice * lastMinuteQty).toFixed(2))
        };
        setEditApptLines([...editApptLines, newLine]);
        setLastMinutePrestationId('');
        setLastMinuteQty(1);
        onToast("Prestation du catalogue rajoutée !", "success");
      }
    } else {
      if (!customLineName) {
        onToast("Veuillez renseigner le libellé de la prestation.", "info");
        return;
      }
      
      const finalPrice = Number((customLinePrice * surchargeMultiplier).toFixed(2));
      const nightSuffix = isNightNow ? ` [MAJ. NUIT +${surchargePct}%]` : '';

      const newLine = {
        prestation_name: `${customLineName}${nightSuffix}`,
        quantity: customLineQty,
        unit_price: finalPrice,
        total_price: Number((finalPrice * customLineQty).toFixed(2))
      };
      setEditApptLines([...editApptLines, newLine]);
      setCustomLineName('');
      setCustomLinePrice(0);
      setCustomLineQty(1);
      onToast("Prestation personnalisée (saisie libre) rajoutée !", "success");
    }
  };

  const handleSaveEditedAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppt) return;

    try {
      const totalAmount = editApptLines.reduce((acc, current) => acc + current.total_price, 0);

      const apptData: Partial<RendezVousPlanning> = {
        title: editApptForm.title,
        date: editApptForm.date,
        start_time: editApptForm.start_time,
        duration_minutes: Number(editApptForm.duration_minutes),
        assigned_employee_ids: editApptForm.assigned_employee_ids,
        notes: editApptForm.notes,
        final_price: totalAmount
      };

      await apiService.updateAppointmentFull(
        editingAppt.id,
        apptData,
        editingAppt.devis_facture_id,
        editApptLines
      );

      onToast("Fiche chantier et document d'intervention mis à jour avec succès !", "success");
      setEditApptModal(false);
      loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("Échec de la modification du rendez-vous.", "info");
    }
  };

  // View Document Details
  const handleViewDoc = async (doc: DevisFacture) => {
    try {
      const lines = await apiService.getLignesDocument(doc.id);
      const photos = await apiService.getDocumentPhotos(doc.id);
      setViewingLines(lines);
      setViewingPhotos(photos);
      setViewingDoc(doc);
    } catch (err) {
      console.error(err);
    }
  };

  // Add photo to currently viewed document
  const handleAddDocumentPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingDoc) return;
    if (!newPhotoUrl) {
      onToast("Veuillez saisir l'URL ou importer une photo/document.", "info");
      return;
    }

    try {
      const added = await apiService.saveDocumentPhoto({
        devis_facture_id: viewingDoc.id,
        photo_url: newPhotoUrl,
        caption: newPhotoCaption || "Photo de suivi chantier",
        before_after: newPhotoBeforeAfter
      });
      setViewingPhotos([...viewingPhotos, added]);
      setNewPhotoUrl('');
      setNewPhotoCaption('');
      onToast("Fichier joint ou photo de chantier ajouté !", "success");
    } catch (err) {
      console.error(err);
      onToast("Erreur lors de l'ajout.", "info");
    }
  };

  // Delete attached photo
  const handleDeleteDocumentPhoto = async (id: string) => {
    try {
      await apiService.deleteDocumentPhoto(id);
      setViewingPhotos(viewingPhotos.filter(p => p.id !== id));
      onToast("Fichier joint supprimé.", "success");
    } catch (err) {
      console.error(err);
    }
  };

  // Document lines management during builder
  const addLineToDocBuilder = () => {
    if (prestations.length > 0) {
      setNewDocLines([
        ...newDocLines,
        { prestation_id: prestations[0].id, quantity: 1, unit_price: prestations[0].base_price }
      ]);
    }
  };

  const updateLineValue = (index: number, field: string, val: any) => {
    const lines = [...newDocLines];
    if (field === 'prestation_id') {
      lines[index].prestation_id = val;
      if (val === 'custom') {
        lines[index].custom_name = '';
        lines[index].unit_price = 0;
      } else {
        const p = prestations.find(x => x.id === val);
        lines[index].unit_price = p ? p.base_price : 0;
      }
    } else {
      (lines[index] as any)[field] = val;
    }
    setNewDocLines(lines);
  };

  const removeLineFromBuilder = (index: number) => {
    setNewDocLines(newDocLines.filter((_, i) => i !== index));
  };

  // Save Devis/Facture
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newDocLines.length === 0) {
      onToast("Le devis doit contenir au moins une prestation.", "info");
      return;
    }

    try {
      let finalClientId = newDocForm.client_id;

      if (onTheFlyClient.enabled) {
        if (!onTheFlyClient.first_name || !onTheFlyClient.last_name || !onTheFlyClient.email || !onTheFlyClient.phone) {
          onToast("Veuillez remplir toutes les informations requises pour le nouveau client.", "info");
          return;
        }
        
        // Auto check & create client
        const registeredClient = await apiService.createOrUpdateClient({
          first_name: onTheFlyClient.first_name,
          last_name: onTheFlyClient.last_name,
          email: onTheFlyClient.email,
          phone: onTheFlyClient.phone,
          notes: onTheFlyClient.notes || "Créé automatiquement via le constructeur de devis."
        });
        
        finalClientId = registeredClient.id;
        onToast(`Client ${registeredClient.first_name} ${registeredClient.last_name} synchronisé automatiquement !`, "success");
      }

      if (!finalClientId) {
        onToast("Veuillez sélectionner ou créer un client.", "info");
        return;
      }

      // Déterminer si le client est professionnel (B2B)
      const finalClient = clients.find(c => c.id === finalClientId);
      const isB2B = finalClient?.type_client === 'professionnel';

      const sanitLines = newDocLines.map(line => {
        const p = prestations.find(x => x.id === line.prestation_id);
        const unitPriceTTC = Number(line.unit_price);
        const unitPriceHT = isB2B ? unitPriceTTC / 1.20 : unitPriceTTC;
        const qty = Number(line.quantity);
        return {
          prestation_name: line.prestation_id === 'custom' ? (line.custom_name || 'Prestation personnalisée') : (p ? p.name : 'Service Nettoyage'),
          quantity: qty,
          unit_price: isB2B ? unitPriceHT : unitPriceTTC, // stocke HT pour B2B
          total_price: qty * (isB2B ? unitPriceHT : unitPriceTTC)
        };
      });

      // Calcul des totaux fiscaux
      const totalTTC = newDocLines.reduce((acc, l) => acc + Number(l.quantity) * Number(l.unit_price), 0);
      const totalHT = isB2B ? totalTTC / 1.20 : totalTTC;
      const montantTVA = isB2B ? totalTTC - totalHT : 0;

      let finalNotes = newDocForm.notes;
      if (docInterventionAddress) {
        finalNotes = `Adresse d'intervention : ${docInterventionAddress}\n${finalNotes}`;
      }

      await apiService.saveDevisFacture(
        {
          client_id: finalClientId,
          type: newDocForm.type,
          status: 'Brouillon',
          date: newDocForm.date,
          due_date: newDocForm.due_date,
          notes: finalNotes,
          total_ht: totalHT,
          total_ttc: totalTTC
        } as any,
        sanitLines
      );

      onToast("Document enregistré !", "success");
      setNewDocModal(false);
      setNewDocLines([]);
      setDocInterventionAddress('');
      setNewDocForm({
        client_id: '',
        type: 'devis',
        date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
      });
      setOnTheFlyClient({
        enabled: false,
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        notes: ''
      });
      loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("Une erreur est survenue lors de l'enregistrement.", "info");
    }
  };

  // Helper helpers for credential generation
  const buildUsername = (first: string, last: string) => {
    const f = first.trim().charAt(0).toLowerCase();
    const l = last.trim().toLowerCase().replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return `${f}.${l}`;
  };

  const buildPassword = (last: string) => {
    return last.trim().toLowerCase().replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "") + '123' + '2025'; // Wait, let's use exact specify "last_name2025"
  };

  // Save Employee
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpForm.first_name || !newEmpForm.last_name || !newEmpForm.email || !newEmpForm.phone) {
      onToast("Veuillez remplir toutes les informations de l'employé.", "info");
      return;
    }
    try {
      let p_hash = newEmpForm.password_hash;
      let u_name = newEmpForm.username;

      if (newEmpForm.compte_actif && (!p_hash || !u_name)) {
        u_name = buildUsername(newEmpForm.first_name, newEmpForm.last_name);
        p_hash = newEmpForm.last_name.trim().toLowerCase().replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "") + '2025';
      }

      const updatedEmp = {
        ...newEmpForm,
        username: u_name || '',
        password_hash: p_hash || '',
        compte_actif: newEmpForm.compte_actif
      };

      await apiService.saveEmployee(updatedEmp);
      onToast(`Employé enregistré !`, "success");

      // TRIGGERS AUTOmated email (Resend Simulation) if account is active
      if (newEmpForm.compte_actif) {
        const replacementParams = {
          NOM_EMPLOYE: `${newEmpForm.first_name} ${newEmpForm.last_name}`,
          IDENT_CONNEXION: u_name || buildUsername(newEmpForm.first_name, newEmpForm.last_name),
          PASS_CONNEXION: p_hash || (newEmpForm.last_name.trim().toLowerCase().replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "") + '2025'),
          LIEN_CONNEXION: `${window.location.protocol}//${window.location.host}/login`,
          PRENOM_CLIENT: 'Client',
          NOM_CLIENT: 'Test',
          DATE_RDV: 'À définir',
          HEURE_RDV: 'À définir',
          DUREE_ESTIMEE: '120',
          LIEN_AVIS: '#'
        };

        await apiService.sendAutomatedEmail('employee_notification', replacementParams, newEmpForm.email);
        onToast(`E-mail de bienvenue envoyé à ${newEmpForm.email} depuis notifications@l-iamani.com !`, "success");
      }

      setNewEmpModal(false);
      setNewEmpForm({ 
        id: '', 
        first_name: '', 
        last_name: '', 
        email: '', 
        phone: '', 
        status: 'Actif', 
        color: '#0ea5e9',
        compte_actif: false,
        username: '',
        password_hash: ''
      });
      loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("Impossible d'enregistrer le technicien.", "info");
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (id: string, name: string) => {
    if (confirm(`Confirmer le licenciement ou départ de l'employé ${name} ?`)) {
      try {
        await apiService.deleteEmployee(id);
        onToast(`Employé retiré.`, "success");
        loadAllDbData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Filter signed quotes that aren't scheduled yet
  const signedUnscheduledQuotes = documents.filter(doc => 
    doc.type === 'devis' && 
    doc.status === 'Signé/Accepté' && 
    !appointments.some(appt => appt.devis_facture_id === doc.id)
  );

  // Auto populate appointment form from selected Quote
  const handleQuoteSelectionForAppt = (devisId: string) => {
    const devis = documents.find(d => d.id === devisId);
    if (!devis) return;
    const client = clients.find(c => c.id === devis.client_id);
    
    setNewApptForm({
      ...newApptForm,
      devis_facture_id: devisId,
      title: `Nettoyage canapé / m² - ${client ? client.last_name : 'Client'}`,
      final_price: devis.total_amount,
    });
  };

  // Save Appointment
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApptForm.devis_facture_id) {
      onToast("Sélectionnez d'abord un devis accepté.", "info");
      return;
    }
    if (newApptForm.assigned_employee_ids.length === 0) {
      onToast("Veuillez assigner au moins un employé au chantier.", "info");
      return;
    }

    try {
      let finalNotes = newApptForm.notes;
      if (apptInterventionAddress) {
        finalNotes = `Adresse d'intervention : ${apptInterventionAddress}\n${finalNotes}`;
      }

      await apiService.saveAppointment({
        devis_facture_id: newApptForm.devis_facture_id,
        title: newApptForm.title,
        date: newApptForm.date,
        start_time: newApptForm.start_time,
        duration_minutes: Number(newApptForm.duration_minutes),
        final_price: Number(newApptForm.final_price),
        status: 'Planifié' as AppointmentStatus,
        notes: finalNotes,
        assigned_employee_ids: newApptForm.assigned_employee_ids
      });

      onToast("Rendez-vous de chantier planifié avec succès !", "success");
      setNewApptModal(false);
      setApptInterventionAddress('');
      setNewApptForm({
        devis_facture_id: '',
        title: '',
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        duration_minutes: 120,
        final_price: 150,
        notes: '',
        assigned_employee_ids: []
      });
      loadAllDbData();
    } catch (err) {
      console.error(err);
    }
  };

  // Save Enterprise Configuration & Admin Authentication Changes
  const handleSaveEntrepriseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Save company config
      await apiService.saveEntrepriseConfig(draftConfig);
      setEntrepriseConfig(draftConfig);
      if (onUpdateEntrepriseConfig) {
        onUpdateEntrepriseConfig(draftConfig);
      }
      
      // 2. Save admin credentials if email is updated or password filled
      const currentCredsStr = localStorage.getItem('shampooine_admin_credentials');
      let currentCreds = { email: 'shampooinele.direction', password: 'admin123' };
      if (currentCredsStr) {
        try {
          currentCreds = JSON.parse(currentCredsStr);
        } catch (ev) {}
      }
      
      let updatedEmail = adminEmailInput.trim() || currentCreds.email;
      let updatedPassword = currentCreds.password;
      
      if (adminPasswordInput) {
        if (adminPasswordInput !== adminPasswordConfirmInput) {
          onToast("⚠️ Les deux mots de passe ne correspondent pas.", "info");
          return;
        }
        if (adminPasswordInput.length < 4) {
          onToast("⚠️ Le nouveau mot de passe doit faire au moins 4 caractères.", "info");
          return;
        }
        updatedPassword = adminPasswordInput;
      }
      
      localStorage.setItem('shampooine_admin_credentials', JSON.stringify({
        email: updatedEmail,
        password: updatedPassword
      }));
      
      setAdminPasswordInput('');
      setAdminPasswordConfirmInput('');
      
      onToast("✅ Configuration d'entreprise enregistrée et identifiants admin sécurisés !", "success");
      loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("❌ Échec de la sauvegarde de la configuration globale.", "info");
    }
  };

  const handleSaveSchedules = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.saveEntrepriseHoraires(entrepriseHoraires);
      onToast("✅ Les horaires de fonctionnement de l'entreprise ont été enregistrés !", "success");
      loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("❌ Échec de la sauvegarde des horaires de fonctionnement.", "info");
    }
  };

  const handleSaveSurchargeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedConfig = {
        ...entrepriseConfig,
        activer_majoration: surchargeActive,
        majorat_tarif_nuit_pct: Number(surchargePct),
        plage_majoration_debut: surchargeStart,
        plage_majoration_fin: surchargeEnd
      };
      await apiService.saveEntrepriseConfig(updatedConfig);
      setEntrepriseConfig(updatedConfig);
      setDraftConfig(updatedConfig);
      if (onUpdateEntrepriseConfig) {
        onUpdateEntrepriseConfig(updatedConfig);
      }
      onToast("✅ Politique de majoration personnalisée enregistrée avec succès !", "success");
      loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("❌ Échec de la sauvegarde de la politique de majoration.", "info");
    }
  };

  const handleAddClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClosureForm.date || !newClosureForm.description) return;
    try {
      await apiService.saveEntrepriseFermeture({
        id: `f-${Date.now()}`,
        date: newClosureForm.date,
        description: newClosureForm.description
      });
      setNewClosureForm({ date: '', description: '' });
      onToast("✅ Jour de fermeture exceptionnelle ajouté !", "success");
      loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("❌ Erreur lors de l'ajout.", "info");
    }
  };

  const handleDeleteClosure = async (id: string) => {
    try {
      await apiService.deleteEntrepriseFermeture(id);
      onToast("🗑️ Jour de fermeture exceptionnel supprimé.", "success");
      loadAllDbData();
    } catch (err) {
      console.error(err);
      onToast("❌ Erreur lors de la suppression.", "info");
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (confirm("Supprimer ce rendez-vous du planning ?")) {
      try {
        await apiService.deleteAppointment(id);
        onToast("Rendez-vous annulé et supprimé.", "success");
        loadAllDbData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Helper calculating metrics
  const activeClientsCount = clients.length;
  const totalRevenue = documents
    .filter(d => d.type === 'facture' && d.status === 'Payé')
    .reduce((val, curr) => val + curr.total_amount, 0);
  const activeQuotesCount = documents.filter(d => d.type === 'devis').length;
  const acceptedQuotesCount = documents.filter(d => d.type === 'devis' && d.status === 'Signé/Accepté').length;

  const renderSingleDocumentPreview = (doc: DevisFacture, onClosePreview: () => void) => {
    return (
      <div className="space-y-6">
        <button 
          onClick={onClosePreview}
          className="flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer animate-in fade-in duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice sheet style */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-8 shadow-md space-y-8">
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-3.5">
                {entrepriseConfig?.logo_url ? (
                  <img 
                    src={entrepriseConfig.logo_url} 
                    alt="Logo" 
                    className="w-auto h-12 md:h-20 object-contain rounded-2xl border border-slate-100 shadow-sm logo-dynamique-net"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="bg-gradient-to-tr from-sky-400 to-blue-600 p-3.5 rounded-2xl text-white shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                )}
                <div className="space-y-0.5">
                  <span className="text-xl font-bold tracking-tight text-slate-900">
                    {entrepriseConfig?.nom_entreprise || 'Shampooine Le'}
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium">Nettoyage haut de gamme de textiles d'ameublement</p>
                  {entrepriseConfig?.telephone && (
                    <p className="text-[10px] text-slate-500 font-mono">Tél : {entrepriseConfig.telephone}</p>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full ${
                  doc.type === 'devis' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {doc.type} #{doc.number}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">{doc.total_amount.toFixed(2)} €</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Émetteur / Prestataire</p>
                <p className="font-bold text-slate-900 mt-1">{entrepriseConfig?.nom_entreprise || 'Shampooine Le S.A.S'}</p>
                <p className="text-slate-500 mt-0.5 whitespace-pre-line">{entrepriseConfig?.adresse_siege || '42 Avenue de la Propreté, 75008 Paris'}</p>
                <p className="text-slate-500">{entrepriseConfig?.telephone || '06 12 34 56 78'}</p>
              </div>

              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Destinataire (Client)</p>
                {(() => {
                  const cl = clients.find(c => c.id === doc.client_id);
                  return cl ? (
                    <div className="mt-1">
                      <p className="font-bold text-slate-900">{cl.last_name.toUpperCase()} {cl.first_name}</p>
                      <p className="text-slate-500">{cl.email}</p>
                      <p className="text-slate-500">{cl.phone}</p>
                      <button 
                        onClick={() => {
                          setSelectedClient(cl);
                          setActiveTab('clients');
                          setEditClientForm(cl);
                          setEditClientModal(true);
                          setIsDocModalOpen(false);
                        }}
                        className="mt-2 text-[10px] font-bold text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2 py-1 rounded-lg border border-sky-100 flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <span>👤 Consulter / Modifier la Fiche Client</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-500 mt-1">Inconnu</p>
                  );
                })()}
              </div>
            </div>

            <div className="border-t border-b border-gray-100 py-4 text-xs grid grid-cols-3">
              <div>
                <span className="text-slate-400 block text-[9px]">DATE D'ÉMISSION</span>
                <span className="font-bold text-slate-800">{doc.date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">DATE D'ÉCHÉANCE</span>
                <span className="font-bold text-slate-800">{doc.due_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">STATUT ACTUEL</span>
                <span className="font-extrabold text-sky-600">{doc.status}</span>
              </div>
            </div>

            {/* Line items table — adapté B2B/B2C */}
            {(() => {
              const cl = clients.find(c => c.id === doc.client_id);
              const isB2BDoc = cl?.type_client === 'professionnel';
              
              const localTTC = viewingLines.reduce((acc, l) => acc + (l.quantity * l.unit_price), 0);
              const localHT = isB2BDoc ? localTTC / 1.20 : localTTC;
              const localTVA = isB2BDoc ? localTTC - localHT : 0;
              const isBrouillon = doc.status === 'Brouillon';

              const updateLocalLineQty = async (index: number, newQty: number) => {
                const updatedLines = [...viewingLines];
                const line = updatedLines[index];
                line.quantity = Math.max(1, newQty);
                line.total_price = line.quantity * line.unit_price;
                setViewingLines(updatedLines);

                const calculatedTTC = updatedLines.reduce((acc, l) => acc + (l.quantity * l.unit_price), 0);
                const calculatedHT = isB2BDoc ? calculatedTTC / 1.20 : calculatedTTC;
                const updatedDoc = {
                  ...doc,
                  total_amount: calculatedTTC,
                  total_ht: calculatedHT,
                  total_ttc: calculatedTTC
                };
                setViewingDoc(updatedDoc);
                try {
                  await apiService.saveDevisFacture(updatedDoc, updatedLines);
                  const freshDocs = await apiService.getDevisFactures();
                  setDocuments(freshDocs);
                } catch(err) {
                  console.error(err);
                }
              };

              const deleteLocalLine = async (index: number) => {
                if (viewingLines.length <= 1) {
                  onToast("Un document doit posséder au moins une ligne de prestation.", "info");
                  return;
                }
                const updatedLines = viewingLines.filter((_, idx) => idx !== index);
                setViewingLines(updatedLines);

                const calculatedTTC = updatedLines.reduce((acc, l) => acc + (l.quantity * l.unit_price), 0);
                const calculatedHT = isB2BDoc ? calculatedTTC / 1.20 : calculatedTTC;
                const updatedDoc = {
                  ...doc,
                  total_amount: calculatedTTC,
                  total_ht: calculatedHT,
                  total_ttc: calculatedTTC
                };
                setViewingDoc(updatedDoc);
                try {
                  await apiService.saveDevisFacture(updatedDoc, updatedLines);
                  const freshDocs = await apiService.getDevisFactures();
                  setDocuments(freshDocs);
                  onToast("Ligne supprimée !", "success");
                } catch(err) {
                  console.error(err);
                }
              };

              const addPrestationToBrouillon = async (prestationId: string) => {
                const p = prestations.find(x => x.id === prestationId);
                if (!p) return;
                
                const factor = isB2BDoc ? 1.25 : 1.0;
                const unitVal = p.base_price * factor;
                const priceVal = isB2BDoc ? unitVal / 1.20 : unitVal;

                const newLine = {
                  devis_facture_id: doc.id,
                  prestation_name: p.name,
                  quantity: 1,
                  unit_price: priceVal,
                  total_price: priceVal
                } as any;

                const updatedLines = [...viewingLines, newLine];
                setViewingLines(updatedLines);

                const calculatedTTC = updatedLines.reduce((acc, l) => acc + (l.quantity * l.unit_price), 0);
                const calculatedHT = isB2BDoc ? calculatedTTC / 1.20 : calculatedTTC;
                const updatedDoc = {
                  ...doc,
                  total_amount: calculatedTTC,
                  total_ht: calculatedHT,
                  total_ttc: calculatedTTC
                };
                setViewingDoc(updatedDoc);
                try {
                  await apiService.saveDevisFacture(updatedDoc, updatedLines);
                  const freshDocs = await apiService.getDevisFactures();
                  setDocuments(freshDocs);
                  onToast("Prestation ajoutée au brouillon !", "success");
                } catch(err) {
                  console.error(err);
                }
              };

              return (
                <>
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-gray-100 text-slate-400 font-bold uppercase text-[9px]">
                        <th className="py-2">Désignation de la prestation</th>
                        <th className="py-2 text-center w-24">Qté</th>
                        <th className="py-2 text-right">{isB2BDoc ? 'Prix Unit. HT' : 'Prix Unit. TTC'}</th>
                        <th className="py-2 text-right">{isB2BDoc ? 'Total Ligne HT' : 'Total Ligne TTC'}</th>
                        {isBrouillon && <th className="py-2 text-center w-12">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {viewingLines.map((line, idx) => (
                        <tr key={idx} className="border-b border-slate-50 text-slate-800">
                          <td className="py-2.5 font-semibold text-slate-900">{line.prestation_name}</td>
                          <td className="py-2.5 text-center">
                            {isBrouillon ? (
                              <input 
                                type="number" 
                                min="1" 
                                value={line.quantity} 
                                onChange={(e) => updateLocalLineQty(idx, parseInt(e.target.value) || 1)}
                                className="w-14 text-center px-1 py-0.5 rounded border border-gray-200 outline-none focus:ring-1 focus:ring-sky-500"
                              />
                            ) : (
                              line.quantity
                            )}
                          </td>
                          <td className="py-2.5 text-right">{line.unit_price.toFixed(2)} €</td>
                          <td className="py-2.5 text-right font-bold text-slate-900">{line.total_price.toFixed(2)} €</td>
                          {isBrouillon && (
                            <td className="py-2.5 text-center">
                              <button 
                                onClick={() => deleteLocalLine(idx)}
                                className="text-red-500 hover:text-red-700 p-1 cursor-pointer transition-colors"
                                title="Supprimer la ligne"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isBrouillon && (
                    <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100/60 mt-4 flex flex-col sm:flex-row items-center gap-3">
                      <span className="text-[10px] font-extrabold text-sky-700 uppercase shrink-0">Ajouter au brouillon :</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addPrestationToBrouillon(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="flex-1 bg-white border border-sky-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-sky-500"
                        defaultValue=""
                      >
                        <option value="" disabled>Sélectionner une prestation du catalogue...</option>
                        {prestations.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.base_price.toFixed(2)} €)</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex flex-col items-end space-y-1 pt-4 border-t border-gray-100">
                    {isB2BDoc ? (
                      <>
                        <div className="text-xs text-slate-400 flex justify-between w-72">
                          <span>Total Global HT :</span>
                          <span className="text-slate-900 font-semibold">{localHT.toFixed(2)} €</span>
                        </div>
                        <div className="text-xs text-slate-400 flex justify-between w-72">
                          <span>TVA (20%) :</span>
                          <span className="text-slate-900 font-semibold">{localTVA.toFixed(2)} €</span>
                        </div>
                        <div className="text-sm font-bold text-indigo-700 flex justify-between w-72 pt-2 border-t border-slate-100">
                          <span>Total Global TTC (Net à payer) :</span>
                          <span className="text-indigo-600 text-base font-black">{localTTC.toFixed(2)} €</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-[8px] text-indigo-400 font-medium italic">🏢 Document B2B — TVA 20% détaillée</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-slate-400 flex justify-between w-64">
                          <span>Total global TTC :</span>
                          <span className="text-slate-900 font-semibold">{localTTC.toFixed(2)} €</span>
                        </div>
                        <div className="text-xs text-slate-400 flex justify-between w-64">
                          <span>TVA non applicable (art. 293B du CGI) :</span>
                          <span className="text-slate-900 font-semibold">0.00 €</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 flex justify-between w-64 pt-2 border-t border-slate-100">
                          <span>Total Net à payer (TTC) :</span>
                          <span className="text-sky-600 text-base font-black">{localTTC.toFixed(2)} €</span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              );
            })()}

            {doc.notes && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-500">
                <p className="font-bold uppercase text-[9px] text-slate-400">Notes &amp; conditions de règlement</p>
                <p className="mt-1 italic">{doc.notes}</p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex flex-col items-center justify-center text-center space-y-1.5 mt-8 text-[9px] text-slate-400 font-medium">
              <p className="font-bold text-slate-700">
                {entrepriseConfig?.nom_entreprise || 'Shampooine Le'} — {entrepriseConfig?.forme_juridique || 'SARL'} au Capital de {entrepriseConfig?.capital_social || '10 000 €'}
              </p>
              <p>
                Siège Social : {entrepriseConfig?.adresse_siege || '42 Avenue de la Propreté, 75008 Paris'}
              </p>
              <p className="font-mono text-[8px] text-slate-400/80">
                SIRET : {entrepriseConfig?.siret || '123 456 789 00021'} | Code APE : {entrepriseConfig?.code_ape || '8121Z'} | TVA Intracommunautaire : {entrepriseConfig?.tva_intracommunautaire || 'FR 12 123456789'}
              </p>
              <div className="h-1 w-12 bg-sky-200 rounded-full my-1"></div>
              <p className="text-[7.5px] text-slate-400/60 leading-normal">
                Dispositions applicables : Prestations d'injection-extraction et de détachage thermique de canapés, tapis et fauteuils. Tous nos tarifs s'entendent nets de taxes, TVA non applicable en vertu de l'article 293B du CGI.
              </p>
            </div>
          </div>

          {/* Left: action sidebar */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6 shrink-0 self-start">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Actions Administrateur</h4>
            
            <div className="space-y-3.5">
              {doc.type === 'facture' && doc.status === 'Facturé' && doc.moyen_paiement === 'VIREMENT' && (
                <button
                  onClick={async () => {
                    try {
                      const updated = await apiService.updateDocumentStatus(doc.id, 'Payé');
                      const updatedFull = {
                        ...doc,
                        status: 'Payé' as DocumentStatus,
                        paiement_valide: true,
                        date_paiement: new Date().toISOString()
                      };
                      await apiService.saveDevisFacture(updatedFull, viewingLines);
                      setViewingDoc(updatedFull);
                      onToast("Paiement validé et facture clôturée avec succès !", "success");
                      const freshDocs = await apiService.getDevisFactures();
                      setDocuments(freshDocs);
                    } catch (err) {
                      onToast("Erreur lors de la validation du paiement.", "info");
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/10 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Clôturer et valider le paiement</span>
                </button>
              )}

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">METTRE À JOUR LE STATUT</label>
                <select 
                  value={doc.status}
                  onChange={(e) => handleStatusChange(doc.id, e.target.value as DocumentStatus)}
                  className="bg-slate-50 border border-slate-100 text-xs px-3 py-2 rounded-xl w-full focus:ring-1 focus:ring-sky-500 focus:bg-white outline-none"
                >
                  <option value="Brouillon">Brouillon</option>
                  <option value="Envoyé au client">Envoyé au client</option>
                  <option value="Signé/Accepté">Signé/Accepté</option>
                  <option value="Facturé">Facturé</option>
                  <option value="Payé">Payé</option>
                </select>
              </div>

              <button
                onClick={() => handleSendOrResendDoc(doc)}
                disabled={sendingDocId === doc.id}
                className={`w-full font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                  sendingDocId === doc.id 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg shadow-sky-500/20'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>
                  {sendingDocId === doc.id 
                    ? "Envoi en cours..."
                    : doc.type === 'devis'
                      ? doc.status === 'Brouillon'
                        ? "Envoyer le devis"
                        : "Renvoyer le devis"
                      : doc.status === 'Brouillon'
                        ? "Envoyer la facture"
                        : "Renvoyer la facture"
                  }
                </span>
              </button>

              {doc.type === 'devis' && (
                <button 
                  onClick={() => handleConvertToInvoice(doc.id, doc.number)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/10 cursor-pointer transition-colors"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Convertir en Facture</span>
                </button>
              )}

              <button 
                onClick={() => { window.print(); }}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer / Format PDF</span>
              </button>

              <button 
                onClick={() => handleDeleteDocument(doc.id, doc.number)}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer le document</span>
              </button>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">PHOTOS &amp; FICHIERS JOINTS ({viewingPhotos.length})</span>
                
                {viewingPhotos.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Aucune photo ni fichier joint lié.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {viewingPhotos.map(p => (
                      <div key={p.id} className="relative group rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                        <img 
                          src={p.photo_url} 
                          alt={p.caption} 
                          referrerPolicy="no-referrer"
                          className="w-full h-16 object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                          <button 
                            type="button"
                            onClick={() => handleDeleteDocumentPhoto(p.id)}
                            className="text-white hover:text-red-400 p-1 cursor-pointer"
                            title="Supprimer la photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className={`absolute bottom-0 left-0 right-0 text-[8px] truncate bg-black/50 text-white px-1 text-center uppercase font-bold`}>
                          {p.before_after === 'before' ? 'Avant' : p.before_after === 'after' ? 'Après' : 'Tissu'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 mt-2">
                  <span className="text-[9px] font-bold text-sky-600 uppercase block">Ajouter un fichier joint</span>
                  
                  <input 
                    type="text" 
                    placeholder="URL de la photo" 
                    value={newPhotoUrl}
                    onChange={e => setNewPhotoUrl(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-[10px] p-1.5 rounded-lg outline-none"
                  />
                  
                  <input 
                    type="text" 
                    placeholder="Légende (ex: État initial canapé)" 
                    value={newPhotoCaption}
                    onChange={e => setNewPhotoCaption(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-[10px] p-1.5 rounded-lg outline-none"
                  />

                  <div className="flex justify-between items-center gap-2">
                    <select 
                      value={newPhotoBeforeAfter}
                      onChange={e => setNewPhotoBeforeAfter(e.target.value as any)}
                      className="bg-white border border-gray-200 text-[9px] p-1 rounded-lg outline-none"
                    >
                      <option value="before">État initial (Avant)</option>
                      <option value="after">Après nettoyage (Après)</option>
                      <option value="spec">Spécification technique</option>
                    </select>
                    <button 
                      type="button"
                      onClick={handleAddDocumentPhoto}
                      className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Joindre
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 flex flex-col md:flex-row font-sans selection:bg-sky-200">
      
      {/* SIDEBAR NAVIGATION PANEL */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shrink-0">
        <div className="flex flex-col">
          
          {/* Brand header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-sky-500 text-white p-2 rounded-xl">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <span className="text-white font-extrabold text-sm tracking-tight block">{entrepriseConfig?.nom_entreprise || 'Shampooine Le'}</span>
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-widest block">Artisan Portal</span>
              </div>
            </div>
            
            <button 
              onClick={onSwitchToPublic}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-1.5 flex flex-col text-xs font-semibold">
            <button 
              onClick={() => { setActiveTab('dashboard'); setSelectedClient(null); setViewingDoc(null); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Statistiques</span>
            </button>

            <button 
              onClick={() => { setActiveTab('clients'); setSelectedClient(null); setViewingDoc(null); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${activeTab === 'clients' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Clients (CRM)</span>
            </button>

            <button 
              onClick={() => { setActiveTab('documents'); setSelectedClient(null); setViewingDoc(null); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${activeTab === 'documents' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Devis &amp; Factures</span>
            </button>

            <button 
              onClick={() => { setActiveTab('planning'); setSelectedClient(null); setViewingDoc(null); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${activeTab === 'planning' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <CalendarIcon className="w-4 h-4 shrink-0" />
              <span>Planning &amp; Chantiers</span>
            </button>

            <button 
              onClick={() => { setActiveTab('employees'); setSelectedClient(null); setViewingDoc(null); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${activeTab === 'employees' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Employés</span>
            </button>

            <div className="pt-4 border-t border-slate-800 mt-4">
              <span className="px-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cloudflare Integration</span>
            </div>

            <button 
              onClick={() => { setActiveTab('d1_schema'); setSelectedClient(null); setViewingDoc(null); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${activeTab === 'd1_schema' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span>Schéma SQL D1</span>
            </button>

            <div className="pt-4 border-t border-slate-800 mt-4">
              <span className="px-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Emailing & Satisfaction</span>
            </div>

            <button 
              onClick={() => { setActiveTab('email_config'); setSelectedClient(null); setViewingDoc(null); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${activeTab === 'email_config' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>Configuration des E-mails</span>
            </button>

            <button 
              onClick={() => { setActiveTab('reviews'); setSelectedClient(null); setViewingDoc(null); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${activeTab === 'reviews' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Modération des Avis</span>
            </button>

            <div className="pt-4 border-t border-slate-800 mt-4">
              <span className="px-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Configuration Générale</span>
            </div>

            <button 
              onClick={() => { setActiveTab('entreprise_config'); setSelectedClient(null); setViewingDoc(null); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${activeTab === 'entreprise_config' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Paramètres / Mon Compte</span>
            </button>
          </div>
        </div>

        {/* Footer actions inside sidebar */}
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={onSwitchToPublic}
            className="w-full bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quitter le Admin Portal</span>
          </button>
        </div>
      </aside>

      {/* PRIMARY AREA WORKSPACE */}
      <main className="flex-1 flex flex-col overflow-y-auto max-w-full">
        
        {/* Top bar header */}
        <header className="bg-white border-b border-gray-100 py-4 px-6 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4 md:space-x-0">
            {/* Show sidebar toggle on mobile */}
            <h2 className="text-lg font-bold text-slate-900 tracking-tight capitalize">
              {activeTab === 'dashboard' && 'Tableau de bord de l\'artisan'}
              {activeTab === 'clients' && 'Gestion de la clientèle CRM'}
              {activeTab === 'documents' && 'Facturation professionnelle'}
              {activeTab === 'planning' && 'Planning des chantiers'}
              {activeTab === 'employees' && 'Équipes d\'intervention'}
              {activeTab === 'd1_schema' && 'Base de données & API Cloudflare'}
              {activeTab === 'email_config' && "Modèles d'e-mails & Automatisation"}
              {activeTab === 'reviews' && "Avis sur les Chantiers & Croissance"}
              {activeTab === 'entreprise_config' && "Paramètres de l'Entreprise & Mon Compte"}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900">Thomas</span>
              <span className="text-[10px] text-emerald-500 font-bold flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Worker API Synced
              </span>
            </div>
          </div>
        </header>

        {/* CONTENT ENVELOPE */}
        <div className="p-6 md:p-8 space-y-6 flex-1">
          
          {/* TAB 1: STATISTICS DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Quick Stat Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Revenus Encaissés</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{totalRevenue.toFixed(2)} €</p>
                    <span className="text-[10px] text-emerald-500 font-medium">Sur factures payées</span>
                  </div>
                  <div className="bg-sky-50 text-sky-500 p-3 rounded-2xl">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Base Clients CRM</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{activeClientsCount} clients</p>
                    <span className="text-[10px] text-indigo-500 font-medium">+100% organique</span>
                  </div>
                  <div className="bg-indigo-50 text-indigo-500 p-3 rounded-2xl">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Devis Émis (Total)</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{activeQuotesCount} devis</p>
                    <span className="text-[10px] text-amber-500 font-medium">{acceptedQuotesCount} signés et acceptés</span>
                  </div>
                  <div className="bg-amber-50 text-amber-500 p-3 rounded-2xl">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Chantiers Planifiés</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{appointments.length} rendez-vous</p>
                    <span className="text-[10px] text-teal-500 font-medium">Karim & Julie en route</span>
                  </div>
                  <div className="bg-teal-50 text-teal-500 p-3 rounded-2xl">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                </div>

              </div>

              {/* CRM alerts / pending tasks */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left: Pending Actions based on unsigned items */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-sky-500" />
                    <span>Devis en attente d'action client (Suivi CRM)</span>
                  </h3>

                  <div className="space-y-2.5">
                    {documents.filter(d => d.type === 'devis' && d.status === 'Envoyé au client').length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Aucun devis en attente de réponse en ce moment.</p>
                    ) : (
                      documents.filter(d => d.type === 'devis' && d.status === 'Envoyé au client').map(doc => {
                        const cl = clients.find(c => c.id === doc.client_id);
                        return (
                          <div key={doc.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                            <div>
                              <p className="text-xs font-bold text-slate-900">{doc.number} - {cl ? `${cl.first_name} ${cl.last_name}` : 'Inconnu'}</p>
                              <p className="text-[10px] text-slate-400">Date d'envoi : {doc.date} | Total : {doc.total_amount.toFixed(2)} €</p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleStatusChange(doc.id, 'Signé/Accepté')}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg text-xs cursor-pointer"
                                title="Marquer comme Signé"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right: Unscheduled signed layouts */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                    <span>Devis signés à planifier au planning ({signedUnscheduledQuotes.length})</span>
                  </h3>

                  <div className="space-y-2.5">
                    {signedUnscheduledQuotes.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Tous les devis validés ont été planifiés ou finalisés !
                      </div>
                    ) : (
                      signedUnscheduledQuotes.map(doc => {
                        const cl = clients.find(c => c.id === doc.client_id);
                        return (
                          <div key={doc.id} className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 flex justify-between items-center">
                            <div>
                              <p className="text-xs font-bold text-slate-900">{doc.number} — {cl ? `${cl.first_name} ${cl.last_name}` : 'Inconnu'}</p>
                              <p className="text-[10px] text-slate-500">Montant convenu : {doc.total_amount.toFixed(2)} €</p>
                            </div>
                            <button 
                              onClick={() => {
                                handleQuoteSelectionForAppt(doc.id);
                                setNewApptForm(prev => ({
                                  ...prev,
                                  devis_facture_id: doc.id,
                                  final_price: doc.total_amount
                                }));
                                setNewApptModal(true);
                              }}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer"
                            >
                              Créer Chantier
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Prestations overview */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Grille des Services Actifs (Worker Synced)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {prestations.map(p => (
                    <div key={p.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <p className="text-slate-400 mt-0.5">Catégorie : {p.category}</p>
                      </div>
                      <span className="font-black text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-gray-100">{p.base_price.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CRM MODULE (CLIENTS LIST & SHEET PROFILE) */}
          {activeTab === 'clients' && (
            <div className="space-y-6">
              
              {selectedClient ? (
                /* CLIENT DETAIL SHEET PROFILE (Full History & Photos) */
                <div className="space-y-6">
                  <button 
                    onClick={() => setSelectedClient(null)}
                    className="flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour au CRM</span>
                  </button>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Client Profile info card & Multi-addresses */}
                    <div className="space-y-6 self-start">
                      
                      {/* PROFILE PROFILE INFO CARD */}
                      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6">
                        <div className="flex items-center space-x-3 pb-4 border-b border-gray-100">
                          <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center font-extrabold text-lg">
                            {selectedClient.first_name[0]}{selectedClient.last_name[0]}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">{selectedClient.first_name} {selectedClient.last_name}</h3>
                            <p className="text-[10px] text-gray-400">Client depuis : {new Date(selectedClient.created_at).toLocaleDateString()}</p>
                            <span className={`inline-block mt-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                              selectedClient.type_client === 'professionnel' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {selectedClient.type_client === 'professionnel' ? '🏢 Professionnel' : '👤 Particulier'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4 text-xs">
                          <div>
                            <span className="text-slate-400">Adresse Email</span>
                            <p className="font-semibold text-slate-900">{selectedClient.email}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Numéro de Téléphone</span>
                            <p className="font-semibold text-slate-900">{selectedClient.phone}</p>
                          </div>

                          {selectedClient.type_client === 'professionnel' && (
                            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 space-y-1 mt-1 text-[11px]">
                              <p className="text-indigo-800 font-extrabold text-[9px] uppercase tracking-wider">Infos Société</p>
                              <p className="text-slate-700"><span className="font-semibold text-slate-400">Raison sociale:</span> {selectedClient.raison_sociale || '—'}</p>
                              <p className="text-slate-700"><span className="font-semibold text-slate-400">SIRET:</span> {selectedClient.siret || '—'}</p>
                              <p className="text-slate-700"><span className="font-semibold text-slate-400">TVA Intracom.:</span> {selectedClient.tva_intracommunautaire || '—'}</p>
                            </div>
                          )}

                          <div>
                            <span className="text-slate-400 flex items-center gap-1">Notes de suivi artisan</span>
                            <p className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-slate-600 leading-relaxed italic whitespace-pre-line mt-1">
                              {selectedClient.notes || "Aucune note saisie."}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                          <button 
                            onClick={() => {
                              setEditClientForm(selectedClient);
                              setEditClientModal(true);
                            }}
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-sky-500/10"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Modifier informations</span>
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteClient(selectedClient.id, `${selectedClient.first_name} ${selectedClient.last_name}`)}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center space-x-1 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer Client</span>
                          </button>
                        </div>
                      </div>

                      {/* MULTI-ADRESSES MANAGER CARD */}
                      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-sky-500" />
                            Interventions multiples ({allAddresses.filter(addr => addr.client_id === selectedClient.id).length})
                          </h4>
                          <button
                            onClick={() => {
                              setEditingAddressId(null);
                              setAddressLabel('Maison principale');
                              setAddressLine('');
                              setShowAddressForm(!showAddressForm);
                            }}
                            className="text-[10px] font-bold text-sky-500 hover:text-sky-600 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            {showAddressForm ? 'Masquer' : 'Ajouter'}
                          </button>
                        </div>

                        {showAddressForm ? (
                          <form onSubmit={handleSaveAddress} className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100 space-y-3 transition-all">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{editingAddressId ? 'Modifier l\'adresse' : 'Nouvelle adresse'}</p>
                            <div className="space-y-1">
                              <label className="text-[9px] font-extrabold text-slate-500 uppercase">Libellé (Type de site)</label>
                              <input
                                type="text"
                                required
                                value={addressLabel}
                                onChange={e => setAddressLabel(e.target.value)}
                                placeholder="Ex: Maison principale, Appartement locatif, Bureaux"
                                className="w-full bg-white border border-gray-100 text-xs p-2.5 rounded-xl outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-extrabold text-slate-500 uppercase">Adresse d'intervention complète</label>
                              <input
                                type="text"
                                required
                                value={addressLine}
                                onChange={e => setAddressLine(e.target.value)}
                                placeholder="Ex: 12 Rue de Rivoli, Paris 75001"
                                className="w-full bg-white border border-gray-100 text-xs p-2.5 rounded-xl outline-none"
                              />
                            </div>
                            <div className="flex space-x-2 pt-1">
                              <button
                                type="submit"
                                className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 rounded-xl text-[10px] transition-colors cursor-pointer"
                              >
                                {editingAddressId ? 'Mettre à jour' : 'Enregistrer'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAddressId(null);
                                  setAddressLine('');
                                  setAddressLabel('Maison principale');
                                  setShowAddressForm(false);
                                }}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-3 rounded-xl text-[10px] transition-colors cursor-pointer"
                              >
                                Annuler
                              </button>
                            </div>
                          </form>
                        ) : null}

                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {allAddresses.filter(addr => addr.client_id === selectedClient.id).length === 0 ? (
                            <div className="text-center text-[10px] text-slate-400 py-6">
                              Aucune adresse multiple enregistrée. L'artisan utilise l'adresse de raccordement par défaut pour ce client.
                            </div>
                          ) : (
                            allAddresses.filter(addr => addr.client_id === selectedClient.id).map(addr => (
                              <div key={addr.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100/50 flex flex-col text-[11px] hover:border-sky-100/80 transition-all">
                                <div className="flex justify-between items-center">
                                  <span className="font-black text-[8px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded uppercase">{addr.label_adresse}</span>
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => {
                                        setEditingAddressId(addr.id);
                                        setAddressLabel(addr.label_adresse);
                                        setAddressLine(addr.adresse_complete);
                                        setShowAddressForm(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-sky-500 transition-colors cursor-pointer"
                                    >
                                      <Edit className="w-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAddress(addr.id)}
                                      className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-slate-700 mt-1 font-semibold leading-tight">{addr.adresse_complete}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Right / History of past quotes & bills */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Past bills and quotes */}
                      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-slate-900">Historique des transactions ({documents.filter(d => d.client_id === selectedClient.id).length})</h3>
                        
                        <div className="space-y-2.5">
                          {documents.filter(d => d.client_id === selectedClient.id).length === 0 ? (
                            <p className="text-xs text-slate-400 py-6 text-center">Aucun devis ou facture pour ce client.</p>
                          ) : (
                            documents.filter(d => d.client_id === selectedClient.id).map(doc => (
                              <div key={doc.id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-slate-900">{doc.number}</span>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                      doc.type === 'devis' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {doc.type.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-slate-400 text-[10px]">Date : {doc.date} | Échéance : {doc.due_date}</p>
                                </div>

                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <p className="font-black text-slate-900">{doc.total_amount.toFixed(2)} €</p>
                                    <span className="text-[10px] text-slate-500 font-medium">{doc.status}</span>
                                  </div>
                                  <button 
                                    onClick={() => { handleViewDoc(doc); setIsDocModalOpen(true); }}
                                    className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Job Photos */}
                      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-slate-900">Photos de chantier associées (Canapés &amp; Moquettes)</h3>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {/* We will showcase elegant before/after canvas illustrations */}
                          <div className="relative group overflow-hidden rounded-2xl bg-[#fef3c7] h-32 flex flex-col justify-end p-3 border border-amber-200">
                            <span className="absolute top-2 left-2 text-[8px] bg-amber-950 text-white font-extrabold px-1.5 py-0.5 rounded uppercase">AVANT</span>
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-amber-900 leading-none">Canapé Laetitia</p>
                              <p className="text-[8px] text-amber-700">Taches d'eau &amp; café</p>
                            </div>
                          </div>

                          <div className="relative group overflow-hidden rounded-2xl bg-[#e0f2fe] h-32 flex flex-col justify-end p-3 border border-sky-200">
                            <span className="absolute top-2 left-2 text-[8px] bg-sky-950 text-white font-extrabold px-1.5 py-0.5 rounded uppercase">APRÈS</span>
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-sky-900 leading-none">Canapé Laetitia</p>
                              <p className="text-[8px] text-sky-700">Shampooing complet</p>
                            </div>
                          </div>

                          <div className="border-2 border-dashed border-gray-200 hover:border-sky-300 rounded-2xl h-32 flex flex-col items-center justify-center p-3 text-center text-slate-400 transition-colors">
                            <Plus className="w-6 h-6 text-slate-300" />
                            <span className="text-[10px] font-medium mt-1">Glisser une photo</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              ) : (
                /* CLIENTS DIRECTORY DIRECT VIEW */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input 
                        type="text"
                        placeholder="Rechercher par nom, email, tél..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-200 pl-9 pr-4 py-2.5 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                      />
                    </div>

                    <button 
                      onClick={() => setNewClientModal(true)}
                      className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-sky-500/10 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter un client</span>
                    </button>
                  </div>

                  {/* CRM Grid List */}
                  {clients.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 text-slate-400">
                      Aucun client enregistré dans votre base de données D1.
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-bold border-b border-gray-100">
                            <th className="p-4">Nom complet</th>
                            <th className="p-4">Coordonnées</th>
                            <th className="p-4 hidden sm:table-cell">Notes de suivi</th>
                            <th className="p-4 text-center">Historique</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clients
                            .filter(c => 
                              `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              c.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              c.phone.includes(searchTerm)
                            )
                            .map(c => {
                              const customerDocs = documents.filter(d => d.client_id === c.id);
                              return (
                                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 font-extrabold flex items-center justify-center">
                                        {c.first_name[0]}{c.last_name[0]}
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-900">{c.last_name.toUpperCase()} {c.first_name}</p>
                                        <p className="text-[10px] text-slate-400">{customerDocs.length} transac.</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <p className="font-medium text-slate-800">{c.email}</p>
                                    <p className="text-[10px] text-slate-400">{c.phone}</p>
                                  </td>
                                  <td className="p-4 max-w-xs truncate hidden sm:table-cell text-slate-500 italic">
                                    {c.notes || '—'}
                                  </td>
                                  <td className="p-4 text-center">
                                    <button 
                                      onClick={() => handleSelectClient(c)}
                                      className="bg-sky-50 hover:bg-sky-100 text-sky-600 font-bold px-2.5 py-1 rounded-lg text-[10px] cursor-pointer"
                                    >
                                      Ouvrir historique
                                    </button>
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="flex justify-end items-center space-x-1.5">
                                      <button 
                                        onClick={() => handleDeleteClient(c.id, `${c.first_name} ${c.last_name}`)}
                                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 cursor-pointer"
                                        title="Supprimer"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* TAB 3: MODULE DEVIS & FACTURES */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              
              {viewingDoc ? renderSingleDocumentPreview(viewingDoc, () => setViewingDoc(null)) : (
                /* MAIN LIST VIEW */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-1 flex-col sm:flex-row gap-3 sm:items-center">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-500">Filtrer par type :</span>
                      </div>
                      <div className="relative flex-1 max-w-md">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <Search className="h-4 w-4 text-slate-400" />
                        </span>
                        <input
                          type="text"
                          placeholder="Rechercher par numéro, client, téléphone..."
                          value={documentSearchTerm}
                          onChange={e => setDocumentSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        if (clients.length === 0) {
                          onToast("Vous devez d'abord enregistrer un Client pour créer un devis.", "info");
                          return;
                        }
                        setNewDocLines([{ prestation_id: prestations[0]?.id || 'p1', quantity: 1, unit_price: prestations[0]?.base_price || 120 }]);
                        setNewDocModal(true);
                      }}
                      className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-sky-500/10 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Créer Devis / Facture</span>
                    </button>
                  </div>

                  {documents.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 text-slate-400">
                      Aucun document commercial émis.
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-bold border-b border-gray-100">
                            <th className="p-4">Numéro</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Client</th>
                            <th className="p-4">Date émission</th>
                            <th className="p-4">Statut</th>
                            <th className="p-4 text-right">Total Net</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents
                            .filter(doc => {
                              const cl = clients.find(c => c.id === doc.client_id);
                              const searchLower = documentSearchTerm.toLowerCase();
                              if (!searchLower) return true;
                              const numMatch = doc.number.toLowerCase().includes(searchLower);
                              const typeMatch = doc.type.toLowerCase().includes(searchLower);
                              const clientNameMatch = cl ? `${cl.first_name} ${cl.last_name}`.toLowerCase().includes(searchLower) : false;
                              const phoneMatch = cl ? cl.phone.includes(searchLower) : false;
                              return numMatch || typeMatch || clientNameMatch || phoneMatch;
                            })
                            .map(doc => {
                              const cl = clients.find(c => c.id === doc.client_id);
                              return (
                                <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 font-bold text-slate-900">
                                    {doc.number}
                                  </td>
                                  <td className="p-4">
                                    <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                      doc.type === 'devis' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {doc.type}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    {cl ? (
                                      <div>
                                        <p className="font-bold text-slate-800">{cl.last_name.toUpperCase()} {cl.first_name}</p>
                                        <p className="text-[10px] text-slate-400">{cl.phone}</p>
                                      </div>
                                    ) : (
                                      <p className="text-slate-400">Inconnu</p>
                                    )}
                                  </td>
                                  <td className="p-4 text-slate-500">
                                    {doc.date}
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      doc.status === 'Payé' ? 'bg-green-100 text-green-700' :
                                      doc.status === 'Signé/Accepté' ? 'bg-sky-100 text-sky-700' :
                                      doc.status === 'Facturé' ? 'bg-indigo-100 text-indigo-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {doc.status}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right font-black text-slate-950">
                                    {doc.total_amount.toFixed(2)} €
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="flex justify-end items-center space-x-1">
                                      <button 
                                        onClick={() => handleViewDoc(doc)}
                                        className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-50 cursor-pointer"
                                        title="Ouvrir le devis/facture"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteDocument(doc.id, doc.number)}
                                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 cursor-pointer"
                                        title="Supprimer"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* TAB 4: PLANNING WORKSPACE */}
          {activeTab === 'planning' && (
            <div className="space-y-6">
              
              {/* Sleek Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-3xl shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-sky-500/10 rounded-xl">
                    <CalendarIcon className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold tracking-tight">Planning de Livraison & Chantiers</h3>
                    <p className="text-[10px] text-slate-400">Vue interactive Google Calendar (Time-Grid) temps réel</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {/* Navigation buttons */}
                  <div className="flex items-center bg-slate-850 rounded-xl p-1 border border-slate-700 shadow-inner">
                    <button 
                      onClick={handleToday}
                      className="px-3.5 py-1.5 text-xs font-black bg-slate-700 hover:bg-slate-650 rounded-lg transition-colors cursor-pointer text-white animate-transition"
                    >
                      Aujourd'hui
                    </button>
                    <div className="w-px h-4 bg-slate-700 mx-2"></div>
                    <button 
                      onClick={handlePrev}
                      className="p-1.5 hover:bg-slate-750 rounded-lg transition-colors cursor-pointer text-slate-300 hover:text-white"
                      title="Précédent"
                    >
                      <ChevronLeft className="w-4.5 h-4.5" />
                    </button>
                    <button 
                      onClick={handleNext}
                      className="p-1.5 hover:bg-slate-750 rounded-lg transition-colors cursor-pointer text-slate-300 hover:text-white"
                      title="Suivant"
                    >
                      <ChevronRight className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {/* Date Picker Input */}
                  <div className="relative">
                    <input 
                      type="date"
                      value={selectedCalendarDate.toISOString().split('T')[0]}
                      onChange={handleDatePickerChange}
                      className="bg-slate-850 text-white text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-750 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-inner"
                    />
                  </div>

                  {/* View Switcher */}
                  <div className="flex bg-slate-850 border border-slate-750 rounded-xl p-1 shadow-inner">
                    <button
                      onClick={() => setCalendarView('week')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${calendarView === 'week' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                      Semaine
                    </button>
                    <button
                      onClick={() => setCalendarView('day')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${calendarView === 'day' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                      Jour
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-Header details and actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <span>{getHeaderTitle()}</span>
                  </h2>
                  <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full w-max">
                    {signedUnscheduledQuotes.length} chantiers signés en attente de planification
                  </p>
                </div>
                
                <button 
                  onClick={() => {
                    if (signedUnscheduledQuotes.length === 0) {
                      onToast("Aucun devis n'est marqué comme 'Signé/Accepté' en attente de planification.", "info");
                      return;
                    }
                    handleQuoteSelectionForAppt(signedUnscheduledQuotes[0].id);
                    setNewApptModal(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all hover:-translate-y-0.5 w-full sm:w-auto text-center"
                >
                  <Plus className="w-4.5 h-4.5" />
                  <span>Planifier un Chantier</span>
                </button>
              </div>

              {/* Calendrier plein écran */}
              <div className="w-full">
                
                {/* Main Dynamic Calendar Time-Grid Container */}
                <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden flex flex-col h-[75vh] min-h-[600px] lg:h-[800px]">
                  
                  {/* Sticky Grid Header Row */}
                  <div className="grid grid-cols-[70px_1fr] bg-slate-50 border-b border-slate-200 sticky top-0 z-20 shadow-sm overflow-hidden">
                    <div className="h-14 flex items-center justify-center border-r border-slate-200 bg-slate-100 text-[9px] font-black text-slate-400 uppercase select-none">
                      GMT+2
                    </div>
                    
                    <div className="overflow-x-auto select-none">
                      <div className={`grid ${calendarView === 'week' ? 'grid-cols-7 min-w-[700px] lg:min-w-0' : 'grid-cols-1'} divide-x divide-slate-200 text-center w-full`}>
                        {(calendarView === 'week' 
                          ? Array.from({ length: 7 }, (_, i) => {
                              const d = new Date(getMonday(selectedCalendarDate));
                              d.setDate(d.getDate() + i);
                              return d;
                            })
                          : [selectedCalendarDate]
                        ).map((dayDate, idx) => {
                          const isCurrentDay = isToday(dayDate);
                          return (
                            <div key={idx} className={`py-2 px-1 flex flex-col justify-center items-center ${isCurrentDay ? 'bg-sky-500/5' : ''}`}>
                              <span className={`text-[10px] font-black ${isCurrentDay ? 'text-sky-600' : 'text-slate-400'} uppercase tracking-wider`}>
                                {dayDate.toLocaleDateString('fr-FR', { weekday: 'short' })}
                              </span>
                              <span className={`text-sm font-black leading-none mt-1 w-7 h-7 flex items-center justify-center rounded-full ${isCurrentDay ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-700'}`}>
                                {dayDate.getDate()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Time Grid Body */}
                  <div className="grid grid-cols-[70px_1fr] flex-1 overflow-y-auto relative bg-white">
                    {/* Left Column: Hours (Sticky) */}
                    <div className="bg-slate-50 border-r border-slate-200 select-none sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                      {Array.from({ length: 17 }, (_, i) => {
                        const h = 6 + i;
                        return (
                          <div key={h} className="h-20 border-b border-slate-100 flex items-start justify-center pr-1.5 pt-1.5 text-[9px] font-black text-slate-400">
                            {h.toString().padStart(2, '0')}:00
                          </div>
                        );
                      })}
                    </div>

                    {/* Right column: Columns of Days */}
                    <div className="relative overflow-x-auto flex-1">
                      <div className={`relative h-[1360px] ${calendarView === 'week' ? 'min-w-[700px] lg:min-w-0' : 'w-full'}`}>
                        
                        {/* Horizontal grid lines */}
                        <div className="absolute inset-0 pointer-events-none z-0">
                          {Array.from({ length: 17 }, (_, i) => (
                            <div 
                              key={i} 
                              className="border-b border-slate-100" 
                              style={{ height: '80px' }}
                            />
                          ))}
                        </div>

                        {/* Columns mapping */}
                        <div className={`grid ${calendarView === 'week' ? 'grid-cols-7 h-full' : 'grid-cols-1 h-full'} divide-x divide-slate-150 relative z-10`}>
                          {(calendarView === 'week' 
                            ? Array.from({ length: 7 }, (_, i) => {
                                const d = new Date(getMonday(selectedCalendarDate));
                                d.setDate(d.getDate() + i);
                                return d;
                              })
                            : [selectedCalendarDate]
                          ).map((dayDate, dayIdx) => {
                            const dayDateStr = dayDate.toISOString().split('T')[0];
                            const dayAppts = appointments.filter(appt => appt.date === dayDateStr);
                            const apptStyles = getStyledAppointmentsForDay(dayDateStr, dayAppts);

                            return (
                              <div key={dayIdx} className="relative h-full bg-slate-50/5 hover:bg-slate-50/10 transition-colors">
                                {dayAppts.map(appt => {
                                  const df = documents.find(d => d.id === appt.devis_facture_id);
                                  const cl = df ? clients.find(c => c.id === df.client_id) : null;
                                  
                                  const [sh, sm] = appt.start_time.split(':').map(Number);
                                  const startMins = Math.max(360, Math.min(1320, sh * 60 + sm));
                                  const duration = Math.min(1320 - startMins, appt.duration_minutes);
                                  
                                  // Map minutes to relative percentage within the 06:00 to 22:00 window (17 hours = 1020 mins)
                                  const topPercent = ((startMins - 360) / 1020) * 100;
                                  const heightPercent = (duration / 1020) * 100;

                                  const layout = apptStyles.get(appt.id) || { left: 0, width: 95 };
                                  const firstEmp = appt.assigned_employee_ids.length > 0 
                                    ? employees.find(e => e.id === appt.assigned_employee_ids[0]) 
                                    : null;
                                  const cardColor = firstEmp?.color || '#0ea5e9';

                                  return (
                                    <div
                                      key={appt.id}
                                      onClick={() => handleOpenEditAppointment(appt)}
                                      className="absolute rounded-xl border p-2.5 transition-all hover:scale-[1.01] hover:shadow-lg shadow-sm cursor-pointer overflow-hidden z-10 group select-none hover:z-20 animate-transition"
                                      style={{
                                        top: `${topPercent}%`,
                                        height: `calc(${heightPercent}% - 2px)`,
                                        left: `${layout.left}%`,
                                        width: `${layout.width}%`,
                                        backgroundColor: `${cardColor}15`,
                                        borderColor: cardColor,
                                        borderLeftWidth: '5px',
                                        color: '#1e293b'
                                      }}
                                    >
                                      <div className="flex flex-col h-full justify-between">
                                        <div className="space-y-1">
                                          <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-black tracking-tight" style={{ color: cardColor }}>
                                              {appt.start_time} - {formatEndTime(appt.start_time, appt.duration_minutes)}
                                            </span>
                                            
                                            <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                              {appt.status === 'Terminé' ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                              ) : (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenPaymentClosingModal(appt);
                                                  }}
                                                  className="p-0.5 bg-white/85 hover:bg-emerald-500 hover:text-white rounded border border-slate-200 transition-colors shadow-sm cursor-pointer"
                                                  title="Terminer la prestation"
                                                >
                                                  <Check className="w-3 h-3 text-emerald-600 hover:text-white" />
                                                </button>
                                              )}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteAppointment(appt.id);
                                                }}
                                                className="p-0.5 bg-white/85 hover:bg-red-500 hover:text-white rounded border border-slate-200 transition-colors shadow-sm cursor-pointer"
                                                title="Annuler le RDV"
                                              >
                                                <Trash2 className="w-3 h-3 text-red-650 hover:text-white" />
                                              </button>
                                            </div>
                                          </div>
                                          
                                          <h4 className="font-extrabold text-xs leading-tight text-slate-800 truncate" title={appt.title}>
                                            {appt.title}
                                          </h4>
                                          
                                          {cl && (
                                            <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                                              <span>👤</span>
                                              <span className="truncate">{cl.first_name} {cl.last_name}</span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                                          <span className="text-[10px] font-black text-slate-800 bg-white/95 px-1.5 py-0.5 rounded-md border border-slate-100 shadow-sm shrink-0">
                                            {appt.final_price} €
                                          </span>
                                          {appt.assigned_employee_ids.map(empId => {
                                            const em = employees.find(e => e.id === empId);
                                            return em ? (
                                              <span 
                                                key={empId} 
                                                className="px-1.5 py-0.5 rounded-md text-[8px] font-black text-white shadow-sm truncate max-w-[70px]" 
                                                style={{ backgroundColor: em.color }}
                                                title={`${em.first_name} ${em.last_name}`}
                                              >
                                                {em.first_name}
                                              </span>
                                            ) : null;
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>


              </div>
              
            </div>
          )}

          {/* TAB 5: EMPLOYEES LIST CONTROL */}
          {activeTab === 'employees' && (
            <div className="space-y-6">
              
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <p className="text-xs text-slate-400">Gérez le personnel actif de Shampooine Le habilité à intervenir chez les clients.</p>
                
                <button 
                  onClick={() => {
                    setNewEmpForm({ 
                      id: '', 
                      first_name: '', 
                      last_name: '', 
                      email: '', 
                      phone: '', 
                      status: 'Actif', 
                      color: '#0ea5e9',
                      compte_actif: false,
                      username: '',
                      password_hash: ''
                    });
                    setNewEmpModal(true);
                  }}
                  className="bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1 shadow-md shadow-sky-500/10 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un technicien</span>
                </button>
              </div>

              {employees.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 text-slate-400">
                  Aucun employé configuré.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {employees.map(emp => (
                    <div key={emp.id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full font-bold text-white flex items-center justify-center select-none" style={{ backgroundColor: emp.color }}>
                              {emp.first_name[0]}{emp.last_name[0]}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{emp.first_name} {emp.last_name}</h4>
                              <p className="text-[10px] text-slate-400">Technicien Extracteur HP</p>
                              <div className="mt-1">
                                {emp.compte_actif ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-sky-100 text-sky-800 border border-sky-100">
                                    🔒 Compte Perso : {emp.username || (emp.first_name[0] + '.' + emp.last_name).toLowerCase().replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "")}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-400">
                                    🔓 Compte inactif
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            emp.status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {emp.status}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600">
                          <p className="flex items-center space-x-2">
                            <span className="text-slate-400">Email :</span>
                            <span className="font-medium text-slate-900">{emp.email}</span>
                          </p>
                          <p className="flex items-center space-x-2">
                            <span className="text-slate-400">Portable :</span>
                            <span className="font-medium text-slate-900">{emp.phone}</span>
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] text-slate-400">Couleur planning :</span>
                          <span className="w-3.5 h-3.5 rounded-full border border-gray-200" style={{ backgroundColor: emp.color }}></span>
                        </div>
                        
                        <div className="flex space-x-1.5">
                          <button 
                            onClick={() => {
                              setNewEmpForm({
                                id: emp.id,
                                first_name: emp.first_name,
                                last_name: emp.last_name,
                                email: emp.email,
                                phone: emp.phone,
                                status: emp.status,
                                color: emp.color,
                                compte_actif: emp.compte_actif || false,
                                username: emp.username || '',
                                password_hash: emp.password_hash || ''
                              });
                              setNewEmpModal(true);
                            }}
                            className="p-1 px-2.2 text-slate-400 hover:text-sky-500 rounded bg-slate-50 border border-gray-100 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteEmployee(emp.id, `${emp.first_name} ${emp.last_name}`)}
                            className="p-1 px-2.2 text-slate-400 hover:text-red-500 rounded bg-slate-50 border border-gray-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 6: D1 SQL DATABASE CONFIG & SEED FILE */}
          {activeTab === 'd1_schema' && (
            <div className="space-y-6">
              
              <div className="bg-sky-500 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-white/10 p-2.5 rounded-full">
                  <Database className="w-6 h-6 text-white/90" />
                </div>
                <h3 className="text-lg font-bold">Votre instance Cloudflare D1 est prête !</h3>
                <p className="text-sky-100 text-xs mt-1 max-w-2xl leading-relaxed">
                  Cloudflare D1 est une base de données SQL relationnelle sans serveur (Serverless SQLite) à faible latence intégrée aux Workers. Vous trouverez ci-dessous le script complet de création de tables (DDL) de l'artisan.
                </p>
              </div>

              {/* Clipboard Action & Schema Source */}
              <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative">
                
                <div className="bg-slate-950 px-6 py-4 flex justify-between items-center border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-[11px] text-slate-400 font-bold ml-2 font-mono">schema.sql</span>
                  </div>

                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(schemaD1SQL);
                      onToast("Code du schéma SQL copié !", "success");
                    }}
                    className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-[10px] font-extrabold px-3 py-1.5 rounded-lg border border-sky-500/30 transition-all cursor-pointer"
                  >
                    Copier le code SQL
                  </button>
                </div>

                <pre className="p-6 overflow-x-auto text-xs text-slate-300 font-mono leading-relaxed bg-slate-950/80 max-h-[420px]">
                  {schemaD1SQL}
                </pre>
              </div>

              {/* Cloudflare Worker Router Example */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Modèle d'API Cloudflare Worker (REST API)</h4>
                <p className="text-xs text-slate-500">
                  Voici le squelette de route à ajouter dans votre script de Worker Cloudflare (par exemple via Hono ou IttyRouter) de manière à interagir parfaitement avec ces tables D1 SQL :
                </p>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 font-mono text-[11px] text-slate-700 whitespace-pre overflow-x-auto leading-relaxed">
{`// Cloudflare Worker API Handler
export default {
  async fetch(request, env) {
    const { url, method } = request;
    const { pathname } = new URL(url);

    // Endpoint Prestations
    if (pathname === "/api/prestations" && method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM prestations").all();
      return Response.json(results, { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    // Endpoint création Devis & Client auto
    if (pathname === "/api/documents" && method === "POST") {
      const { doc, lines } = await request.json();
      
      // Insérer ou mettre à jour client
      await env.DB.prepare(\`
        INSERT INTO clients (id, first_name, last_name, email, phone, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET first_name=excluded.first_name, last_name=excluded.last_name
      \`).bind(doc.client_id, doc.first_name, doc.last_name, doc.email, doc.phone, doc.notes).run();

      // Insérer document devis_facture
      await env.DB.prepare(\`
        INSERT INTO devis_factures (id, client_id, type, number, status, date, due_date, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      \`).bind(doc.id, doc.client_id, doc.type, doc.number, doc.status, doc.date, doc.due_date, doc.total_amount).run();
      
      return Response.json({ success: true });
    }
  }
}`}
                </div>
              </div>

            </div>
          )}

          {/* TAB 7: EMAIL ARCHITECTURE & AUTOMATIONS */}
          {activeTab === 'email_config' && (
            <div className="space-y-6 animate-in fade-in duration-250">
              
              {/* SUB TABS NAVIGATION */}
              <div className="flex border-b border-slate-200/80 mb-4 bg-white p-2 rounded-2xl shadow-sm gap-2">
                <button
                  type="button"
                  onClick={() => { setActiveTab('entreprise_config'); setActiveSettingsTab('general'); }}
                  className={`px-4 py-2 text-[10px] uppercase font-black tracking-wider transition-all rounded-xl cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-800`}
                >
                  🏢 Identité &amp; Mon Compte
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('entreprise_config'); setActiveSettingsTab('horaires'); }}
                  className={`px-4 py-2 text-[10px] uppercase font-black tracking-wider transition-all rounded-xl cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-800`}
                >
                  ⚙️ Gestion des Horaires &amp; Fermetures
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('entreprise_config'); setActiveSettingsTab('prestations'); }}
                  className={`px-4 py-2 text-[10px] uppercase font-black tracking-wider transition-all rounded-xl cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-800`}
                >
                  🧼 Gestion des Prestations
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('email_config'); }}
                  className={`px-4 py-2 text-[10px] uppercase font-black tracking-wider transition-all rounded-xl cursor-pointer bg-sky-500 text-white shadow-md shadow-sky-500/10`}
                >
                  📧 Modèles d'e-mails &amp; Automatisation
                </button>
              </div>
              
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-800">
                <div className="absolute top-4 right-4 bg-sky-500/10 p-2.5 rounded-full border border-sky-500/20">
                  <Mail className="w-6 h-6 text-sky-400" />
                </div>
                <h3 className="text-lg font-bold">Plateforme de Routage &amp; Modèles Resend</h3>
                <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
                  Personnalisez entièrement les fiches et automatismes e-mails transmis à vos clients et techniciens. Les variables d'intégration ci-dessous sont injectées dynamiquement en temps réel avant la notification par passerelle SMTP ou Resend API.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: Email Flow list */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4 lg:col-span-1">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Flux transactionnels d'e-mails</h4>
                  <div className="space-y-2.5 flex flex-col">
                    {emailConfigs.map((config) => {
                      const isSelected = editingConfig?.id === config.id;
                      let flowLabel = "";
                      switch (config.flux_type) {
                        case 'appointment_confirmation':
                          flowLabel = "1. Confirmation de Rendez-vous";
                          break;
                        case 'devis_sending':
                          flowLabel = "2. Envoi de Devis";
                          break;
                        case 'facture_sending':
                          flowLabel = "2b. Envoi de Facture";
                          break;
                        case 'employee_notification':
                          flowLabel = "3. Assignation & Rappel Employé";
                          break;
                        case 'growth_feedback_request':
                          flowLabel = "4. Enquête d'Avis (Fin de Prestation)";
                          break;
                        default:
                          flowLabel = config.flux_type;
                      }

                      return (
                        <button
                          key={config.id}
                          onClick={() => setEditingConfig(config)}
                          className={`w-full text-left p-3.5 rounded-2xl transition-all border flex flex-col space-y-1 cursor-pointer ${
                            isSelected 
                              ? 'bg-sky-50 border-sky-200 text-sky-950' 
                              : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <span className="text-xs font-bold">{flowLabel}</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-full">Sujet : {config.sujet_template}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-gray-100 space-y-2 text-[11px] text-slate-400">
                    <p className="font-bold text-slate-700">Tags de variables exploitables :</p>
                    <ul className="space-y-1 bg-slate-50 p-3 rounded-xl border border-gray-100 font-mono text-[9px]">
                      <li><strong className="text-sky-600">{`{PRENOM_CLIENT}`}</strong> : Prénom</li>
                      <li><strong className="text-sky-600">{`{NOM_CLIENT}`}</strong> : Nom de famille</li>
                      <li><strong className="text-sky-600">{`{DATE_RDV}`}</strong> : Date d'intervention</li>
                      <li><strong className="text-sky-600">{`{HEURE_RDV}`}</strong> : Heure de début</li>
                      <li><strong className="text-sky-600">{`{DUREE_ESTIMEE}`}</strong> : Durée</li>
                      <li><strong className="text-sky-600">{`{NOM_EMPLOYE}`}</strong> : Équipe assignée / Nom employé</li>
                      <li><strong className="text-sky-600">{`{IDENT_CONNEXION}`}</strong> : Identifiant employé</li>
                      <li><strong className="text-sky-600">{`{PASS_CONNEXION}`}</strong> : Mot de passe employé</li>
                      <li><strong className="text-sky-600">{`{LIEN_CONNEXION}`}</strong> : Lien de connexion employé</li>
                      <li><strong className="text-sky-600">{`{LIEN_AVIS}`}</strong> : Lien d'avis clients</li>
                    </ul>
                  </div>
                </div>

                {/* Right: Rich editor for template selected */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm lg:col-span-2 space-y-4">
                  {editingConfig ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <div>
                          <p className="text-xs font-bold text-slate-900">Éditeur de Modèle Métier</p>
                          <p className="text-[10px] text-slate-400">Flux de routage : <span className="font-mono text-sky-600">{editingConfig.flux_type}</span></p>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-sky-50 text-sky-700 text-[10px] font-bold uppercase tracking-wide">
                          SMTP Resend Activé
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block uppercase">Sujet de l'E-mail</label>
                          <input
                            type="text"
                            value={editingConfig.sujet_template}
                            onChange={(e) => setEditingConfig({ ...editingConfig, sujet_template: e.target.value })}
                            className="bg-slate-50 border border-slate-100 text-xs px-4 py-2.5 rounded-xl w-full focus:ring-1 focus:ring-sky-500 focus:bg-white outline-none font-medium"
                          />
                        </div>

                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-400 block uppercase">Corps du Message (Texte / Variables)</label>
                           <textarea
                             id="email-body-editor"
                             rows={10}
                             value={editingConfig.corps_template || ''}
                             onChange={(e) => setEditingConfig({ ...editingConfig, corps_template: e.target.value })}
                             className="bg-slate-50 border border-slate-100 text-xs p-4 rounded-xl w-full focus:ring-1 focus:ring-sky-500 focus:bg-white outline-none font-mono leading-relaxed shadow-inner"
                           />
                           <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150 space-y-2 animate-in fade-in duration-100">
                             <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Insérer une variable en un clic :</span>
                             <div className="flex flex-wrap gap-1.5">
                               {getAvailableVariables(editingConfig.flux_type).map(v => (
                                 <button
                                   key={v}
                                   type="button"
                                   onClick={() => handleInsertVariable(v)}
                                   className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:border-sky-500 hover:text-sky-600 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-colors shadow-sm active:scale-95"
                                 >
                                   {v}
                                 </button>
                               ))}
                             </div>
                           </div>
                         </div>

                        <div className="pt-2 flex justify-end space-x-2">
                          <button
                            onClick={async () => {
                              try {
                                await apiService.saveEmailConfiguration(editingConfig);
                                onToast("Modèle sauvegardé avec succès !", "success");
                                const fresh = await apiService.getEmailConfigurations();
                                setEmailConfigs(fresh);
                                const matching = fresh.find(f => f.flux_type === editingConfig.flux_type);
                                if (matching) {
                                  setEditingConfig(matching);
                                }
                              } catch (err) {
                                console.error(err);
                                onToast("Erreur lors de la sauvegarde.", "info");
                              }
                            }}
                            className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
                          >
                            Enregistrer le Modèle
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                      <div className="p-3 bg-slate-50 text-slate-400 rounded-full border border-gray-100">
                        <Mail className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Aucun modèle sélectionné</p>
                        <p className="text-[10px] text-slate-400">Veuillez cliquer sur un flux transactionnel dans le panneau de gauche pour éditer son contenu.</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 8: CLIENTS FEEDBACKS & REVIEWS MODERATION */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 animate-in fade-in duration-250">
              
              {/* Stats overview banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl border border-amber-100">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Note Moyenne</p>
                    <p className="text-lg font-bold text-slate-900">
                      {(clientReviews.reduce((sum, r) => sum + r.rating, 0) / (clientReviews.length || 1)).toFixed(1)} / 5.0
                    </p>
                    <p className="text-[9px] text-amber-600 font-semibold mt-0.5">Calculé sur {clientReviews.length} avis recueillis</p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl border border-emerald-100">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider font-semibold font-bold">Témoignages Approuvés</p>
                    <p className="text-lg font-bold text-slate-900">
                      {clientReviews.filter(r => r.approuve).length} avis validés
                    </p>
                    <p className="text-[9px] text-emerald-600 font-semibold mt-0.5">Visibles en temps réel sur le site public</p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider font-semibold font-bold">En attente de relecture</p>
                    <p className="text-lg font-bold text-slate-900">
                      {clientReviews.filter(r => !r.approuve).length} retours chantiers
                    </p>
                    <p className="text-[9px] text-rose-600 font-semibold mt-0.5">Modération requise pour publication</p>
                  </div>
                </div>
              </div>

              {/* Reviews Table/Feed List card */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Avis clients et Enquêtes satisfaction</h4>
                  <span className="text-[10px] text-slate-400">Triez ou gérez le statut de publication</span>
                </div>

                <div className="space-y-4">
                  {clientReviews.length === 0 ? (
                    <p className="text-xs text-slate-400 py-12 text-center font-medium">Aucun retour d'avis client n'a été enregistré pour le moment.</p>
                  ) : (
                    clientReviews.map(review => {
                      const cl = clients.find(c => c.id === review.client_id);
                      return (
                        <div key={review.id} className="p-4 bg-slate-50 rounded-2xl border border-gray-100 flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              {/* Render Golden Stars */}
                              <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <svg 
                                    key={i} 
                                    className={`w-3.5 h-3.5 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                  >
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-xs font-bold text-slate-900">{review.rating} / 5</span>
                              
                              {/* Approval badge */}
                              {review.approuve ? (
                                <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                  Approuvé &amp; En Ligne
                                </span>
                              ) : (
                                <span className="bg-rose-100 text-rose-800 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                  En Attente Modération
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-700 italic font-medium">"{review.commentaire}"</p>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                              <span>Client : <strong>{cl ? `${cl.first_name} ${cl.last_name}` : `ID: ${review.client_id}`}</strong></span>
                              <span>Date : {review.created_at.split('T')[0]}</span>
                              <span className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${review.afficher_nom_public ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                Permis de publier l'identité : <strong>{review.afficher_nom_public ? "Oui" : "Anonyme"}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex md:flex-col md:justify-center items-end justify-between gap-2 border-t md:border-t-0 pt-2.5 md:pt-0">
                            <div className="flex gap-1.5 w-full md:w-auto">
                              {review.approuve ? (
                                <button
                                  onClick={async () => {
                                    await apiService.approveClientReview(review.id, false);
                                    onToast("Avis masqué !", "info");
                                    const fresh = await apiService.getClientReviews();
                                    setClientReviews(fresh);
                                  }}
                                  className="bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold text-[10px] px-3 py-1.5 rounded-xl transition-colors cursor-pointer w-full md:w-auto"
                                >
                                  Masquer
                                </button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    await apiService.approveClientReview(review.id, true);
                                    onToast("Avis approuvé pour affichage public !", "success");
                                    const fresh = await apiService.getClientReviews();
                                    setClientReviews(fresh);
                                  }}
                                  className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-[10px] px-3 py-1.5 rounded-xl transition-colors cursor-pointer w-full md:w-auto"
                                >
                                  Approuver &amp; Publier
                                </button>
                              )}

                              <button
                                onClick={async () => {
                                  if (confirm("Supprimer définitivement cet avis ?")) {
                                    await apiService.deleteClientReview(review.id);
                                    onToast("Avis supprimé définitivement.", "success");
                                    const fresh = await apiService.getClientReviews();
                                    setClientReviews(fresh);
                                  }
                                }}
                                className="bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 p-1.5 rounded-xl cursor-pointer"
                                title="Supprimer du CRM"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 9: PARAMÈTRES / MON COMPTE (ADMINISTRATEUR) */}
          {activeTab === 'entreprise_config' && (
            <div className="space-y-6 animate-in fade-in duration-250">
              
              {/* SUB TABS NAVIGATION */}
              <div className="flex border-b border-slate-200/80 mb-4 bg-white p-2 rounded-2xl shadow-sm gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSettingsTab('general')}
                  className={`px-4 py-2 text-[10px] uppercase font-black tracking-wider transition-all rounded-xl cursor-pointer ${
                    activeSettingsTab === 'general'
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 animate-none'
                  }`}
                >
                  🏢 Identité &amp; Mon Compte
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSettingsTab('horaires')}
                  className={`px-4 py-2 text-[10px] uppercase font-black tracking-wider transition-all rounded-xl cursor-pointer ${
                    activeSettingsTab === 'horaires'
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 animate-none'
                  }`}
                >
                  ⚙️ Gestion des Horaires &amp; Fermetures
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSettingsTab('prestations')}
                  className={`px-4 py-2 text-[10px] uppercase font-black tracking-wider transition-all rounded-xl cursor-pointer ${
                    activeSettingsTab === 'prestations'
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 animate-none'
                  }`}
                >
                  🧼 Gestion des Prestations
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('email_config'); setSelectedClient(null); setViewingDoc(null); }}
                  className={`px-4 py-2 text-[10px] uppercase font-black tracking-wider transition-all rounded-xl cursor-pointer ${
                    activeTab === 'email_config'
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 animate-none'
                  }`}
                >
                  📧 Modèles d'e-mails &amp; Automatisation
                </button>
              </div>

              {activeSettingsTab === 'general' && (
                <>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Paramètres globaux &amp; Sécurité</h3>
                  <p className="text-[11px] text-slate-500 max-w-xl">
                    Personnalisez l'identité visuelle de votre entreprise, définissez les mentions réglementaires à injecter en pied de page de vos devis et factures, et modifiez vos identifiants d'accès privilégiés.
                  </p>
                </div>
                <div className="bg-white px-3.5 py-1.5 rounded-2xl border border-slate-100 flex items-center space-x-2 text-[10px] text-slate-500 font-semibold self-start md:self-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Modifications instantanées</span>
                </div>
              </div>

              <form onSubmit={handleSaveEntrepriseConfig} className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* Left block : Form elements */}
                <div className="xl:col-span-7 space-y-6">
                  
                  {/* Card 1: Enterprise Information */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 pb-3 border-b border-slate-50">
                      <div className="p-1.5 bg-sky-50 text-sky-500 rounded-lg">
                        <Building className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Identité de l'entreprise</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block">Nom commercial *</label>
                        <input 
                          type="text"
                          required
                          value={draftConfig.nom_entreprise || ''}
                          onChange={e => setDraftConfig({ ...draftConfig, nom_entreprise: e.target.value })}
                          placeholder="Shampooine Le"
                          className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 font-medium text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block">Téléphone de contact *</label>
                        <input 
                          type="text"
                          required
                          value={draftConfig.telephone || ''}
                          onChange={e => setDraftConfig({ ...draftConfig, telephone: e.target.value })}
                          placeholder="06 12 34 56 78"
                          className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 font-mono text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block">Adresse du siège social *</label>
                        <input 
                          type="text"
                          required
                          value={draftConfig.adresse_siege || ''}
                          onChange={e => setDraftConfig({ ...draftConfig, adresse_siege: e.target.value })}
                          placeholder="42 Avenue de la Propreté, 75008 Paris"
                          className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 font-medium text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block">Horaires de fonctionnement *</label>
                        <input 
                          type="text"
                          required
                          value={draftConfig.horaires || ''}
                          onChange={e => setDraftConfig({ ...draftConfig, horaires: e.target.value })}
                          placeholder="Lundi au Samedi : 8h00 - 19h00"
                          className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Legal Mentions (Obligations) */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 pb-3 border-b border-slate-50">
                      <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">Mentions légales professionnelles</span>
                        <span className="text-[8px] text-amber-600 block font-semibold mt-0.5">⚠️ Obligations réglementaires de facturation</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block">Numéro SIRET *</label>
                        <input 
                          type="text"
                          required
                          value={draftConfig.siret || ''}
                          onChange={e => setDraftConfig({ ...draftConfig, siret: e.target.value })}
                          placeholder="123 456 789 00021"
                          className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 font-mono text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block">Code APE / NAF *</label>
                        <input 
                          type="text"
                          required
                          value={draftConfig.code_ape || ''}
                          onChange={e => setDraftConfig({ ...draftConfig, code_ape: e.target.value })}
                          placeholder="8121Z"
                          className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 font-mono text-slate-808"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block">N° TVA Intracommunautaire *</label>
                        <input 
                          type="text"
                          required
                          value={draftConfig.tva_intracommunautaire || ''}
                          onChange={e => setDraftConfig({ ...draftConfig, tva_intracommunautaire: e.target.value })}
                          placeholder="FR 12 123456789"
                          className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 font-mono text-slate-808"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block">Forme juridique *</label>
                        <input 
                          type="text"
                          required
                          value={draftConfig.forme_juridique || ''}
                          onChange={e => setDraftConfig({ ...draftConfig, forme_juridique: e.target.value })}
                          placeholder="SARL / S.A.S"
                          className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 font-medium text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block">Capital social *</label>
                        <input 
                          type="text"
                          required
                          value={draftConfig.capital_social || ''}
                          onChange={e => setDraftConfig({ ...draftConfig, capital_social: e.target.value })}
                          placeholder="10 000 €"
                          className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Business Logo Upload (supporting Drag and Drop + Manual click) */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 pb-3 border-b border-slate-50">
                      <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">Logo de marque d'entreprise (R2)</span>
                        <span className="text-[8px] text-slate-400 block mt-0.5">S'affiche en haut de vos documents clients et sur le site public</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-8 space-y-3.5">
                        <div 
                          className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                            isDraggingLogo 
                              ? 'border-sky-500 bg-sky-50 text-sky-600' 
                              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-500'
                          }`}
                          onDragOver={e => {
                            e.preventDefault();
                            setIsDraggingLogo(true);
                          }}
                          onDragLeave={() => setIsDraggingLogo(false)}
                          onDrop={e => {
                            e.preventDefault();
                            setIsDraggingLogo(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              const img = new Image();
                              const objectUrl = URL.createObjectURL(file);
                              img.onload = () => {
                                const MAX = 400;
                                let w = img.width, h = img.height;
                                if (w > MAX || h > MAX) {
                                  if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                                  else { w = Math.round(w * MAX / h); h = MAX; }
                                }
                                const canvas = document.createElement('canvas');
                                canvas.width = w; canvas.height = h;
                                const ctx = canvas.getContext('2d')!;
                                ctx.imageSmoothingEnabled = true;
                                ctx.imageSmoothingQuality = 'high';
                                ctx.drawImage(img, 0, 0, w, h);
                                const base64 = canvas.toDataURL('image/png');
                                URL.revokeObjectURL(objectUrl);
                                setDraftConfig({ ...draftConfig, logo_url: base64 });
                                onToast("✅ Logo importé et optimisé !", "success");
                              };
                              img.src = objectUrl;
                            }
                          }}
                          onClick={() => {
                            const input = document.getElementById('logo-file-picker');
                            if (input) input.click();
                          }}
                        >
                          <input 
                            id="logo-file-picker"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const img = new Image();
                                const objectUrl = URL.createObjectURL(file);
                                img.onload = () => {
                                  const MAX = 400;
                                  let w = img.width, h = img.height;
                                  if (w > MAX || h > MAX) {
                                    if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                                    else { w = Math.round(w * MAX / h); h = MAX; }
                                  }
                                  const canvas = document.createElement('canvas');
                                  canvas.width = w; canvas.height = h;
                                  const ctx = canvas.getContext('2d')!;
                                  ctx.imageSmoothingEnabled = true;
                                  ctx.imageSmoothingQuality = 'high';
                                  ctx.drawImage(img, 0, 0, w, h);
                                  const base64 = canvas.toDataURL('image/png');
                                  URL.revokeObjectURL(objectUrl);
                                  setDraftConfig({ ...draftConfig, logo_url: base64 });
                                  onToast("✅ Logo importé et optimisé !", "success");
                                };
                                img.src = objectUrl;
                              }
                            }}
                          />
                          <UploadCloud className="w-7 h-7 text-slate-400 mb-2" />
                          <p className="text-xs font-bold text-slate-800">Glissez-déposez votre logo ici</p>
                          <p className="text-[9px] text-slate-400 mt-1">ou cliquez ici pour le rechercher sur votre machine (Max 2Mo)</p>
                          <p className="text-[8px] text-sky-500 font-black tracking-widest uppercase mt-2">Compatible Cloudflare R2 / AWS S3</p>
                        </div>

                        {/* Text URL Input option */}
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Ou renseignez un lien d'image direct (URL / Cloudflare)</label>
                          <input 
                            type="text"
                            value={draftConfig.logo_url || ''}
                            onChange={e => setDraftConfig({ ...draftConfig, logo_url: e.target.value })}
                            placeholder="https://images.unsplash.com/... ou cdn.shampooinele.fr/logo.png"
                            className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800 font-mono text-[10px]"
                          />
                        </div>

                        {/* Suggested High-Res Clean Logos */}
                        <div className="space-y-1.5">
                          <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Modèles d'icônes recommandés pour lavage textile :</span>
                          <div className="flex gap-2">
                            {[
                              { label: 'Eau Purifiée', url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=120&h=120&q=80' },
                              { label: 'Pro Émeraude', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=120&h=120&q=80' },
                              { label: 'Mousse Azur', url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=120&h=120&q=80' }
                            ].map((sug, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setDraftConfig({ ...draftConfig, logo_url: sug.url });
                                  onToast(`Logo "${sug.label}" configuré.`, "info");
                                }}
                                className={`text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg border font-bold transition-all cursor-pointer ${draftConfig.logo_url === sug.url ? 'border-sky-500 text-sky-600 bg-sky-50/50' : 'border-transparent'}`}
                              >
                                {sug.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right column: Current Logo view box */}
                      <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100/80">
                        <span className="text-[8px] uppercase tracking-wide font-black text-slate-400 text-center block mb-2">Visuel Actuel</span>
                        {draftConfig.logo_url ? (
                          <div className="relative group">
                            <img 
                              src={draftConfig.logo_url} 
                              alt="Logo d'entreprise" 
                              referrerPolicy="no-referrer"
                              className="w-auto h-12 md:h-20 object-contain rounded-2xl bg-white p-2 border border-slate-200/60 shadow-md transform group-hover:scale-105 transition-transform duration-200 logo-dynamique-net"
                            />
                            <button
                              type="button"
                              onClick={() => setDraftConfig({ ...draftConfig, logo_url: '' })}
                              className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-1 shadow hover:bg-rose-600 transition-colors cursor-pointer"
                              title="Effacer le logo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-slate-200/50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                            <Camera className="w-5 h-5 mb-1 text-slate-300" />
                            <span className="text-[8px] font-bold">Aucun logo</span>
                          </div>
                        )}
                        <p className="text-[8px] text-slate-400 text-center mt-3 leading-normal max-w-[120px]">
                          Format carré ou horizontal recommandé
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Administrator Privileges Security */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 pb-3 border-b border-slate-50">
                      <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">Sécurité du compte artisan-direction</span>
                        <span className="text-[8px] text-rose-500 block font-semibold mt-0.5">Modifier votre e-mail d'accès et votre code secret</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block">Adresse e-mail de connexion *</label>
                        <input 
                          type="text"
                          required
                          value={adminEmailInput}
                          onChange={e => setAdminEmailInput(e.target.value)}
                          placeholder="shampooinele.direction"
                          className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 font-mono font-medium text-slate-800"
                        />
                        <p className="text-[8px] text-slate-400 italic">Par défaut, l'application utilise l'identifiant "shampooinele.direction". Vous pouvez le modifier ci-dessus.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Nouveau Mot de passe (Laissez vide pour conserver l'ancien)</label>
                          <input 
                            type="password"
                            value={adminPasswordInput}
                            onChange={e => setAdminPasswordInput(e.target.value)}
                            placeholder="••••••"
                            className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Confirmer le nouveau Mot de passe</label>
                          <input 
                            type="password"
                            value={adminPasswordConfirmInput}
                            onChange={e => setAdminPasswordConfirmInput(e.target.value)}
                            placeholder="••••••"
                            className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-4 rounded-2xl text-xs transition-colors cursor-pointer text-center shadow-lg shadow-sky-500/15"
                  >
                    💾 Sauvegarder l'identité &amp; Sécuriser le compte
                  </button>

                </div>

                {/* Right block: Live Real-Time Document mockup */}
                <div className="xl:col-span-5 h-full self-start sticky top-6 space-y-4">
                  <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between text-white">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider font-mono">Simulateur Live</span>
                      <h4 className="text-xs font-black text-white">Rendu automatique des Mentions Légales</h4>
                    </div>
                    <span className="bg-slate-800 text-[9px] text-slate-400 px-2 py-1 rounded-lg font-bold">Document client PDF</span>
                  </div>

                  {/* Document replica */}
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 space-y-6 text-[10px] text-slate-600 font-sans">
                    
                    {/* Mock header */}
                    <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        {draftConfig.logo_url ? (
                          <img 
                            src={draftConfig.logo_url} 
                            alt="Logo preview" 
                            referrerPolicy="no-referrer"
                            className="w-auto h-12 md:h-20 object-contain rounded-lg border border-slate-100 bg-white p-1 logo-dynamique-net"
                          />
                        ) : (
                          <div className="bg-sky-500 text-white p-1.5 rounded-lg">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <p className="font-extrabold text-slate-950 text-xs">{draftConfig.nom_entreprise || 'Shampooine Le'}</p>
                          <p className="text-[8px] text-slate-400">Nettoyage de prestige</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="bg-amber-100 text-amber-800 font-extrabold text-[8px] px-2 py-0.5 rounded uppercase font-mono">Devis #DV-1049</span>
                        <p className="font-medium text-slate-400 text-[8px] mt-1">Émis le 07/06/2026</p>
                      </div>
                    </div>

                    {/* Mock body rows */}
                    <div className="space-y-3">
                      <p className="text-[8px] uppercase tracking-wider font-bold text-slate-400">Détail des prestations :</p>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>• Nettoyage thermo-dynamique Canapé 3 places</span>
                          <span className="font-mono">149.00 €</span>
                        </div>
                        <p className="text-[8px] text-slate-400 italic pl-3">Détachage intense, traitement antibactérien et désodorisant à la vapeur.</p>
                      </div>

                      <div className="space-y-1.5 pt-1.5 border-t border-slate-50">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>• Protection imperméabilisante anti-taches (Nano)</span>
                          <span className="font-mono">49.00 €</span>
                        </div>
                        <p className="text-[8px] text-slate-400 italic pl-3">Application de polymère fluorique hydrophobe sur l'ensemble de l'assise.</p>
                      </div>

                      <div className="flex justify-end pt-3 border-t border-slate-100 font-black text-slate-900 text-xs">
                        <span className="mr-4">Net à payer (TTC) :</span>
                        <span className="text-sky-600 font-mono">198.00 €</span>
                      </div>
                    </div>

                    {/* Mock footer (Injects user fields dynamically!) */}
                    <div className="pt-6 border-t border-dashed border-slate-200 text-center space-y-1 flex flex-col items-center justify-center text-[8px] text-slate-400">
                      <p className="font-bold text-slate-700">
                        {draftConfig.nom_entreprise || 'Shampooine Le'} — {draftConfig.forme_juridique || 'SARL'} au Capital de {draftConfig.capital_social || '10 000 €'}
                      </p>
                      <p className="truncate w-full text-center">
                        Siège Social : {draftConfig.adresse_siege || '42 Avenue de la Propreté, 75008 Paris'}
                      </p>
                      <p className="font-mono text-[7.5px] text-slate-400/80">
                        SIRET : {draftConfig.siret || '123 456 789 00021'} | CODE APE : {draftConfig.code_ape || '8121Z'} | TVA : {draftConfig.tva_intracommunautaire || 'FR 12 123456789'}
                      </p>
                      <div className="h-0.5 w-6 bg-slate-200 rounded my-0.5"></div>
                      <p className="text-[7px] text-slate-400/50 leading-relaxed max-w-[240px]">
                        TVA non applicable en vertu de l'article 293B du CGI. Ce devis gratuit engage le client dès signature de l'accord de chantier.
                      </p>
                    </div>

                  </div>
                </div>

              </form>
                </>
              )}

              {activeSettingsTab === 'horaires' && (
                <div className="space-y-6 animate-in fade-in duration-250">
                  {/* HORAIRES SUB-TAB VIEW */}
                  <form onSubmit={handleSaveSchedules} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-sky-50 text-sky-500 rounded-lg">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">Horaires de fonctionnement hebdomadaires</span>
                          <span className="text-[10px] text-slate-500 block">Configurez les heures d'ouverture et de fermeture (pause de midi ou repas incluse)</span>
                        </div>
                      </div>
                      <button 
                        type="submit"
                        className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                      >
                        Enregistrer les horaires
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 pb-2">
                            <th className="text-[10px] uppercase font-bold text-slate-400 py-3 pl-2">Jour</th>
                            <th className="text-[10px] uppercase font-bold text-slate-400 py-3">Statut</th>
                            <th className="text-[10px] uppercase font-bold text-slate-400 py-3">Matinée (Ouverture - Pause)</th>
                            <th className="text-[10px] uppercase font-bold text-slate-400 py-3">Après-midi (Reprise - Fermeture)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map((dayName, idx) => {
                            const h = entrepriseHoraires.find(item => item.jour_semaine === idx) || {
                              id: `h${idx}`,
                              jour_semaine: idx,
                              heure_debut_matin: null,
                              heure_fin_matin: null,
                              heure_debut_apresmidi: null,
                              heure_fin_apresmidi: null,
                              est_ouvert: false
                            };
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 pl-2 font-semibold text-xs text-slate-800">{dayName}</td>
                                <td className="py-4">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox"
                                      checked={h.est_ouvert}
                                      onChange={e => {
                                        const updated = [...entrepriseHoraires];
                                        const targetIdx = updated.findIndex(item => item.jour_semaine === idx);
                                        const isNowOpen = e.target.checked;
                                        if (targetIdx !== -1) {
                                          updated[targetIdx] = {
                                            ...updated[targetIdx],
                                            est_ouvert: isNowOpen,
                                            heure_debut_matin: isNowOpen ? (updated[targetIdx].heure_debut_matin || '08:00') : null,
                                            heure_fin_matin: isNowOpen ? (updated[targetIdx].heure_fin_matin || '12:00') : null,
                                            heure_debut_apresmidi: isNowOpen ? (updated[targetIdx].heure_debut_apresmidi || '14:00') : null,
                                            heure_fin_apresmidi: isNowOpen ? (updated[targetIdx].heure_fin_apresmidi || '19:00') : null,
                                          };
                                          setEntrepriseHoraires(updated);
                                        } else {
                                          updated.push({
                                            id: `h-${idx}`,
                                            jour_semaine: idx,
                                            heure_debut_matin: isNowOpen ? '08:00' : null,
                                            heure_fin_matin: isNowOpen ? '12:00' : null,
                                            heure_debut_apresmidi: isNowOpen ? '14:00' : null,
                                            heure_fin_apresmidi: isNowOpen ? '19:00' : null,
                                            est_ouvert: isNowOpen
                                          });
                                          setEntrepriseHoraires(updated);
                                        }
                                      }}
                                      className="sr-only peer"
                                    />
                                    <div className="w-10 h-5.5 bg-slate-200 rounded-full peer peer-focus:ring-1 peer-focus:ring-sky-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-sky-500"></div>
                                    <span className="ml-2 text-[10px] font-extrabold uppercase tracking-wide peer-checked:text-sky-600 text-slate-400">
                                      {h.est_ouvert ? 'Ouvert' : 'Fermé'}
                                    </span>
                                  </label>
                                </td>
                                <td className="py-4">
                                  {h.est_ouvert ? (
                                    <div className="flex items-center space-x-2">
                                      <input 
                                        type="time"
                                        value={h.heure_debut_matin || '08:00'}
                                        onChange={e => {
                                          const updated = [...entrepriseHoraires];
                                          const tIdx = updated.findIndex(item => item.jour_semaine === idx);
                                          if (tIdx !== -1) {
                                            updated[tIdx].heure_debut_matin = e.target.value;
                                            setEntrepriseHoraires(updated);
                                          }
                                        }}
                                        className="bg-slate-50 border border-slate-100 text-xs p-1.5 rounded-lg outline-none font-medium text-slate-800"
                                      />
                                      <span className="text-gray-400 text-[10px]">à</span>
                                      <input 
                                        type="time"
                                        value={h.heure_fin_matin || '12:00'}
                                        onChange={e => {
                                          const updated = [...entrepriseHoraires];
                                          const tIdx = updated.findIndex(item => item.jour_semaine === idx);
                                          if (tIdx !== -1) {
                                            updated[tIdx].heure_fin_matin = e.target.value;
                                            setEntrepriseHoraires(updated);
                                          }
                                        }}
                                        className="bg-slate-50 border border-slate-100 text-xs p-1.5 rounded-lg outline-none font-medium text-slate-800"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">-</span>
                                  )}
                                </td>
                                <td className="py-4">
                                  {h.est_ouvert ? (
                                    <div className="flex items-center space-x-2">
                                      <input 
                                        type="time"
                                        value={h.heure_debut_apresmidi || '14:00'}
                                        onChange={e => {
                                          const updated = [...entrepriseHoraires];
                                          const tIdx = updated.findIndex(item => item.jour_semaine === idx);
                                          if (tIdx !== -1) {
                                            updated[tIdx].heure_debut_apresmidi = e.target.value;
                                            setEntrepriseHoraires(updated);
                                          }
                                        }}
                                        className="bg-slate-50 border border-slate-100 text-xs p-1.5 rounded-lg outline-none font-medium text-slate-800"
                                      />
                                      <span className="text-gray-400 text-[10px]">à</span>
                                      <input 
                                        type="time"
                                        value={h.heure_fin_apresmidi || '19:00'}
                                        onChange={e => {
                                          const updated = [...entrepriseHoraires];
                                          const tIdx = updated.findIndex(item => item.jour_semaine === idx);
                                          if (tIdx !== -1) {
                                            updated[tIdx].heure_fin_apresmidi = e.target.value;
                                            setEntrepriseHoraires(updated);
                                          }
                                        }}
                                        className="bg-slate-50 border border-slate-100 text-xs p-1.5 rounded-lg outline-none font-medium text-slate-800"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* CUSTOM SURCHARGE MANAGEMENT POLICY */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg">
                            <span className="text-sm">🌙</span>
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">Politique de Majoration Horaire (Nuit / Heures Spéciales)</span>
                            <span className="text-[10px] text-slate-500 block">Configurez la majoration automatique selon la plage horaire de votre choix</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveSurchargeSettings}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                        >
                          Enregistrer la politique
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                        {/* Status Toggle */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Statut de la majoration</label>
                          <div className="flex items-center h-10">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={surchargeActive}
                                onChange={e => setSurchargeActive(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-10 h-5.5 bg-slate-200 rounded-full peer peer-focus:ring-1 peer-focus:ring-amber-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-amber-500"></div>
                              <span className="ml-2 text-[10px] font-extrabold uppercase tracking-wide peer-checked:text-amber-600 text-slate-400 font-sans">
                                {surchargeActive ? 'Activée' : 'Désactivée'}
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Surcharge Percentage */}
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Taux de majoration (%)</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              required
                              disabled={!surchargeActive}
                              value={surchargePct}
                              onChange={e => setSurchargePct(Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 pl-3 pr-8 rounded-xl outline-none font-medium text-slate-800 focus:border-amber-500 transition-colors disabled:opacity-50"
                              placeholder="25"
                            />
                            <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                          </div>
                        </div>

                        {/* Start Hour */}
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Heure de début</label>
                          <input
                            type="time"
                            required
                            disabled={!surchargeActive}
                            value={surchargeStart}
                            onChange={e => setSurchargeStart(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none font-medium text-slate-800 focus:border-amber-500 transition-colors disabled:opacity-50"
                          />
                        </div>

                        {/* End Hour */}
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Heure de fin</label>
                          <input
                            type="time"
                            required
                            disabled={!surchargeActive}
                            value={surchargeEnd}
                            onChange={e => setSurchargeEnd(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none font-medium text-slate-800 focus:border-amber-500 transition-colors disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div className="bg-amber-50/50 rounded-2xl border border-amber-200/30 p-3.5 text-amber-800 text-[10px] space-y-1 font-sans">
                        <span className="font-extrabold block">💡 Fonctionnement intelligent de l'application :</span>
                        <p className="leading-relaxed text-amber-700/95">
                          {surchargeActive ? (
                            <>
                              Une majoration de <strong className="text-amber-900 font-extrabold">+{surchargePct}%</strong> sera appliquée automatiquement sur le prix du devis et de l'intervention si l'heure d'arrivée planifiée par le client ou l'artisan se situe entre <strong className="text-amber-900 font-extrabold">{surchargeStart}</strong> et <strong className="text-amber-900 font-extrabold">{surchargeEnd}</strong>.
                            </>
                          ) : (
                            <>
                              La majoration automatique des plages horaires spéciales est actuellement <strong className="font-extrabold text-slate-600">désactivée</strong>. Aucun frais supplémentaire ne sera appliqué sur les travaux planifiés.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </form>

                  {/* Exceptional Closures */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Add closure form */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                      <div className="flex items-center space-x-2 pb-3 border-b border-slate-50">
                        <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg">
                          <span className="text-xs">📅</span>
                        </div>
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">Fermeture Exceptionnelle</span>
                      </div>

                      <form onSubmit={handleAddClosure} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Date de fermeture *</label>
                          <input 
                            type="date"
                            required
                            value={newClosureForm.date}
                            onChange={e => setNewClosureForm({ ...newClosureForm, date: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 font-medium text-slate-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Motif / Description *</label>
                          <input 
                            type="text"
                            required
                            placeholder="Ex: Fête du Travail, Vacances annuelles"
                            value={newClosureForm.description}
                            onChange={e => setNewClosureForm({ ...newClosureForm, description: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-500 font-medium text-slate-800"
                          />
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer tracking-wider uppercase inline-flex items-center justify-center space-x-2"
                        >
                          <span>Ajouter ce jour de fermeture</span>
                        </button>
                      </form>
                    </div>

                    {/* Closures List */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                      <div className="flex items-center space-x-2 pb-3 border-b border-slate-50">
                        <div className="p-1.5 bg-gray-50 text-gray-500 rounded-lg">
                          <span className="text-xs">📋</span>
                        </div>
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">Fermetures exceptionnelles ({entrepriseFermetures.length})</span>
                      </div>

                      {entrepriseFermetures.length === 0 ? (
                        <p className="text-slate-400 text-xs italic text-center py-6 font-sans">Aucune fermeture exceptionnelle configurée.</p>
                      ) : (
                        <div className="space-y-2 overflow-y-auto max-h-[250px] pr-1">
                          {entrepriseFermetures.map(f => (
                            <div key={f.id} className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/40 border border-rose-100/50">
                              <div className="space-y-0.5">
                                <span className="text-[11px] font-bold text-slate-800">{new Date(f.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                <p className="text-[10px] text-rose-700 font-semibold">{f.description}</p>
                              </div>
                              <button 
                                type="button"
                                onClick={() => handleDeleteClosure(f.id)}
                                className="bg-rose-100 hover:bg-rose-200 text-rose-600 p-1.5 rounded-xl transition-all cursor-pointer"
                                title="Supprimer la fermeture"
                              >
                                <span className="text-xs">🗑️</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {activeSettingsTab === 'prestations' && (
                <div className="space-y-6 animate-in fade-in duration-250">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Catalogue des Prestations</h3>
                      <p className="text-[11px] text-slate-500 max-w-xl">
                        Ajoutez, modifiez ou supprimez vos prestations de base. Celles-ci alimentent automatiquement votre simulateur de tarifs public et votre interface de création de devis.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPrestation(null);
                        setPrestationForm({
                          category: 'canape',
                          name: '',
                          type_tarif: 'fixe',
                          prix_unitaire: 0,
                          activer_majoration_nuit: true,
                          temps_estime_minutes: 30
                        });
                        setShowPrestationModal(true);
                      }}
                      className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm cursor-pointer inline-flex items-center space-x-1.5"
                    >
                      <span>+</span>
                      <span>Ajouter une prestation</span>
                    </button>
                  </div>

                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-wider border-b border-gray-100">
                            <th className="py-3 px-6">Nom de la prestation</th>
                            <th className="py-3 px-6">Catégorie</th>
                            <th className="py-3 px-6">Type de Tarification</th>
                            <th className="py-3 px-6">Durée estimée</th>
                            <th className="py-3 px-6">Prix Unitaire</th>
                            <th className="py-3 px-6">Majoration Nuit</th>
                            <th className="py-3 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150/40 text-xs">
                          {prestations.map(p => {
                            const price = p.prix_unitaire !== undefined ? p.prix_unitaire : p.base_price;
                            const label = p.type_tarif === 'm2' ? 'Au m²' : 'Prix Fixe';
                            const maj = p.activer_majoration_nuit !== false ? '✅ Active' : '❌ Désactivée';
                            const duration = p.temps_estime_minutes !== undefined ? p.temps_estime_minutes : 30;
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3.5 px-6 font-semibold text-slate-900">{p.name}</td>
                                <td className="py-3.5 px-6 font-mono text-[11px] font-bold text-slate-700">
                                  {p.category}
                                </td>
                                <td className="py-3.5 px-6 font-medium text-slate-600">{label}</td>
                                <td className="py-3.5 px-6 font-mono font-medium text-slate-600">{duration} min</td>
                                <td className="py-3.5 px-6 font-mono font-bold text-slate-900">{price.toFixed(2)} €</td>
                                <td className="py-3.5 px-6 font-medium">{maj}</td>
                                <td className="py-3.5 px-6 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPrestation(p);
                                        setPrestationForm({
                                          category: p.category,
                                          name: p.name,
                                          type_tarif: p.type_tarif || (p.unit_label === 'm²' ? 'm2' : 'fixe'),
                                          prix_unitaire: price,
                                          activer_majoration_nuit: p.activer_majoration_nuit !== false,
                                          temps_estime_minutes: p.temps_estime_minutes !== undefined ? p.temps_estime_minutes : 30
                                        });
                                        setShowPrestationModal(true);
                                      }}
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-all cursor-pointer font-bold text-[10px]"
                                    >
                                      Modifier
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (confirm(`Supprimer la prestation "${p.name}" ?`)) {
                                          await apiService.deletePrestation(p.id);
                                          onToast("Prestation supprimée !", "success");
                                          const fresh = await apiService.getPrestations();
                                          setPrestations(fresh);
                                        }
                                      }}
                                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg transition-all cursor-pointer"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* AUTOMATION EMAIL RESEND DIAGNOSTIC REPORT MODAL */}
      {selectedSentEmailsReport && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="font-bold text-sm tracking-tight font-mono">Resend Deliverability Log - Shampooine Le</span>
              </div>
              <button 
                onClick={() => setSelectedSentEmailsReport(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200/60 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">Destinataire Client : {selectedSentEmailsReport.clientName}</p>
                  <p className="text-slate-500 font-mono text-[11px] mt-0.5">{selectedSentEmailsReport.clientEmail}</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                    API Status: 200 Sent
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Via: notifications@l-iamani.com</p>
                </div>
              </div>

              {/* Email 1: Invoice */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[9px] font-extrabold font-mono">Envoi A</span>
                  <span>Facture Acquittée &amp; Note d'Honoraire</span>
                </p>
                <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 space-y-2">
                  <div className="text-[11px] text-slate-500 border-b border-gray-100 pb-2">
                    <strong>Sujet :</strong> {selectedSentEmailsReport.invoiceSubject}
                  </div>
                  <pre className="text-[10px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {selectedSentEmailsReport.invoiceBody}
                  </pre>
                </div>
              </div>

              {/* Email 2: Satisfaction request */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[9px] font-extrabold font-mono">Envoi B</span>
                  <span>Enquête Satisfaction (Boucle de Croissance)</span>
                </p>
                <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 space-y-2">
                  <div className="text-[11px] text-slate-500 border-b border-gray-100 pb-2">
                    <strong>Sujet :</strong> {selectedSentEmailsReport.feedbackSubject}
                  </div>
                  <pre className="text-[10px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {selectedSentEmailsReport.feedbackBody}
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-gray-100">
              <button
                onClick={() => setSelectedSentEmailsReport(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Fermer le Log de Livraison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          CRIM MODALES SECTION
          ====================================================================== */}

      {/* 0.0.1 PAYMENT CLOSING MODAL */}
      {paymentClosingAppt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-150 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-lg">💳</span>
                <span className="font-extrabold text-sm uppercase tracking-wide">Validation & Règlement</span>
              </div>
              <button 
                onClick={() => setPaymentClosingAppt(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Mission Summary Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 text-[11px] text-slate-700 space-y-2">
                <p className="font-bold text-slate-500 uppercase tracking-wide text-[9px]">Intervention Sélectionnée</p>
                <p className="font-black text-slate-900 text-sm leading-tight">{paymentClosingAppt.title}</p>
                
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-slate-600">
                  <div>
                    <span className="block text-[9px] uppercase tracking-wide text-gray-400">Date</span>
                    <span className="font-bold text-slate-800">{paymentClosingAppt.date}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wide text-gray-400">Total Solde</span>
                    <span className="font-extrabold text-sky-600 text-xs">{paymentClosingAppt.final_price?.toFixed(2) || "0.00"} €</span>
                  </div>
                </div>
              </div>

              {/* Moyen de Paiement Section */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Moyen de paiement</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ESPECES')}
                    className={`p-3.5 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer ${
                      paymentMethod === 'ESPECES'
                        ? 'bg-sky-50 border-sky-400 text-sky-700 shadow-sm shadow-sky-500/5'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">💵</span>
                    <span>Espèces</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('VIREMENT')}
                    className={`p-3.5 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer ${
                      paymentMethod === 'VIREMENT'
                        ? 'bg-sky-50 border-sky-400 text-sky-700 shadow-sm shadow-sky-500/5'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">🏦</span>
                    <span>Virement bancaire</span>
                  </button>
                </div>
              </div>

              {/* Mandatory Notice for Bank Transfer */}
              {paymentMethod === 'VIREMENT' && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl space-y-2 animate-in fade-in duration-150">
                  <p className="font-black text-[9px] uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <span>⚠️</span> Consigne Obligatoire de Virement
                  </p>
                  <p className="text-[10px] leading-relaxed text-amber-700">
                    Pour valider le virement bancaire, le client doit obligatoirement spécifier en libellé :
                  </p>
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 text-slate-800 font-mono text-[9px] select-all leading-tight font-bold">
                    {(() => {
                      const clientDoc = documents.find(d => d.id === paymentClosingAppt.devis_facture_id);
                      const activeClient = clientDoc ? clients.find(c => c.id === clientDoc.client_id) : null;
                      return `${activeClient?.last_name || "[Nom]"} ${activeClient?.first_name || "[Prénom]"} - ${activeClient?.phone || "[Téléphone]"} - Prestation du ${paymentClosingAppt.date}`;
                    })()}
                  </div>
                  <p className="text-[9px] text-amber-600 leading-normal">
                    💡 Cette consigne claire est automatiquement ajoutée à sa facture envoyée par email !
                  </p>
                </div>
              )}

              {/* Coche Règlement Encaissé */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-150 flex items-center justify-between cursor-pointer" onClick={() => setPaymentEncaissed(!paymentEncaissed)}>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-800 block">Paiement effectué / Encaissé</span>
                  <span className="text-[10px] text-slate-400 block">
                    {paymentEncaissed 
                      ? "Le document passera instantanément à l'état 'Payé'" 
                      : "Le document est en attente de paiement (statut 'Facturé')"}
                  </span>
                </div>
                <input 
                  type="checkbox"
                  checked={paymentEncaissed}
                  onChange={(e) => setPaymentEncaissed(e.target.checked)}
                  className="w-4 h-4 text-sky-500 border-gray-300 rounded focus:ring-sky-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button 
                  type="button"
                  onClick={handleConfirmPaymentClosing}
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-extrabold py-3.5 rounded-xl text-xs transition-colors cursor-pointer text-center shadow-lg shadow-sky-500/15"
                >
                  Confirmer & Clôturer
                </button>
                <button 
                  type="button"
                  onClick={() => setPaymentClosingAppt(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-750 font-bold px-5 py-3.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 0.0.2 FULLSCREEN TACTILE SIGNATURE OVERLAY */}
      {signatureOnSpotMode && editingAppt && (
        <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col justify-between p-6 overflow-y-auto text-white animate-in slide-in-from-bottom duration-300">
          {/* Header Panel */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-black text-sky-400 tracking-widest block font-mono">📱 Mode Terrain Mobile</span>
              <h2 className="text-lg font-black tracking-tight text-white uppercase">validation & SIGNATURE CLIENT SUR TABLETTE</h2>
            </div>
            <button 
              onClick={() => setSignatureOnSpotMode(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Centering Area showing Contract details and canvas pad */}
          <div className="flex-1 my-6 max-w-lg mx-auto w-full space-y-5 flex flex-col justify-center">
            {/* Bento Summary of actual lines */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-3xl space-y-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block font-mono">🔍 Récapitulatif des prestations révisées :</span>
              
              <div className="space-y-2 max-h-40 overflow-y-auto divide-y divide-slate-800">
                {editApptLines.map((line, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-2 first:pt-0">
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-slate-200">{line.prestation_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Qté : {line.quantity} × {line.unit_price.toFixed(2)} €</p>
                    </div>
                    <span className="font-bold text-slate-100">{line.total_price.toFixed(2)} €</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs uppercase font-extrabold text-sky-400 font-mono">Total Final à Signer</span>
                <span className="text-lg font-black text-emerald-400">
                  {editApptLines.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)} €
                </span>
              </div>
            </div>

            {/* Canvas Sign pad */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase font-black text-slate-400 tracking-wider block font-mono">✍️ Signez ci-dessous avec votre doigt :</span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  Réinitialiser le tracé
                </button>
              </div>

              <div className="relative overflow-hidden bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-inner shadow-black/40">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={220}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-48 bg-slate-900 cursor-crosshair touch-none"
                />
              </div>
            </div>
          </div>

          {/* Action buttons at base */}
          <div className="max-w-lg mx-auto w-full border-t border-slate-800 pt-5 space-y-2.5">
            <button
              type="button"
              onClick={() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const dataUrl = canvas.toDataURL('image/png');
                handleValidateSignatureOnSpot(dataUrl);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-xs transition-colors cursor-pointer text-center shadow-lg shadow-emerald-500/10 uppercase tracking-widest active:scale-[0.98] transform"
            >
              🚀 Valider la signature & Émettre la facture
            </button>
            <button
              type="button"
              onClick={() => setSignatureOnSpotMode(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 rounded-2xl text-xs transition-colors cursor-pointer text-center"
            >
              Retour à la modification
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================
          CRIM MODALES SECTION
          ====================================================================== */}
      
      {/* 0.0 EDIT APPOINTMENT MODAL (PLANNING & CHANTIERS DYNAMIQUES) */}
      {editApptModal && editingAppt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
              <span className="font-bold text-slate-900 text-sm">Modifier le Rendez-vous / Chantier</span>
              <button 
                onClick={() => setEditApptModal(false)} 
                className="text-slate-400 hover:text-slate-900 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedAppointment} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              
              <div className="p-3 bg-sky-50/50 rounded-2xl border border-sky-100 text-[11px] text-slate-700 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sky-800 uppercase tracking-wide text-[9px]">Chantier Rattaché</p>
                  <p className="font-semibold text-slate-800 mt-0.5">Impression / Référence : {editingAppt.id}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sky-800 uppercase tracking-wide text-[9px]">Document Direct</p>
                  <p className="font-black text-slate-800 mt-0.5">
                    {documents.find(d => d.id === editingAppt.devis_facture_id)?.number || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Titre Mission */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Titre de l'intervention *</span>
                <input 
                  type="text"
                  required
                  value={editApptForm.title}
                  onChange={e => setEditApptForm({ ...editApptForm, title: e.target.value })}
                  placeholder="Ex: Shampooing Canapé d'angle & Tapis"
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Date, Heure, Durée */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Date planning *</span>
                  <input 
                    type="date"
                    required
                    value={editApptForm.date}
                    onChange={e => setEditApptForm({ ...editApptForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Heure de début *</span>
                  <input 
                    type="time"
                    required
                    value={editApptForm.start_time}
                    onChange={e => handleEditStartTimeChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Durée estimée (min) *</span>
                  <input 
                    type="number"
                    required
                    min="15"
                    step="15"
                    value={editApptForm.duration_minutes}
                    onChange={e => setEditApptForm({ ...editApptForm, duration_minutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Équipe assignée */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">👤 Gestion de l'équipe assignée</span>
                <div className="grid grid-cols-2 gap-2">
                  {employees.filter(e => e.status === 'Actif').map(emp => {
                    const isAssigned = editApptForm.assigned_employee_ids.includes(emp.id);
                    return (
                      <button
                        type="button"
                        key={emp.id}
                        onClick={() => {
                          const alreadyAdded = editApptForm.assigned_employee_ids.includes(emp.id);
                          const updated = alreadyAdded
                            ? editApptForm.assigned_employee_ids.filter(id => id !== emp.id)
                            : [...editApptForm.assigned_employee_ids, emp.id];
                          setEditApptForm({ ...editApptForm, assigned_employee_ids: updated });
                        }}
                        className={`p-2.5 rounded-xl text-left border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isAssigned 
                            ? 'bg-sky-50 border-sky-400 text-sky-700 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: emp.color }}></span>
                          {emp.first_name} {emp.last_name[0]}.
                        </span>
                        {isAssigned && <Check className="w-3.5 h-3.5 text-sky-600 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LIGNES DU DOCUMENT - PRESTATIONS DE DERNIÈRE MINUTE */}
              <div className="space-y-3 pt-3 border-t border-gray-150">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">💼 Prestations détaillées ({editApptLines.length})</span>
                  <span className="text-xs font-black text-sky-600 bg-sky-50 px-2.5 py-1 rounded-xl">
                    Total : {editApptLines.reduce((acc, c) => acc + c.total_price, 0).toFixed(2)} €
                  </span>
                </div>

                {/* List of current lines */}
                <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100">
                  {editApptLines.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-4">Aucune prestation rattachée à ce dossier.</p>
                  ) : (
                    editApptLines.map((line, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[11px] font-bold text-slate-800 leading-tight">{line.prestation_name}</span>
                          <button
                            type="button"
                            onClick={() => removeLineEdit(idx)}
                            className="text-red-500 hover:text-red-700 p-0.5 rounded transition-transform cursor-pointer"
                            title="Retirer cette ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold">Quantité</span>
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={e => updateLineEditQty(idx, Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-100 text-[11px] font-bold p-1 rounded focus:ring-1 focus:ring-sky-500"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold">Prix unitaire (€)</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.unit_price}
                              onChange={e => updateLineEditPrice(idx, Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-100 text-[11px] font-bold p-1 rounded focus:ring-1 focus:ring-sky-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new on-the-fly line */}
                <div className="bg-sky-50/20 p-3.5 rounded-2xl border border-sky-100/50 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-sky-100/30">
                    <p className="text-[10px] font-black text-sky-800 uppercase tracking-wide">Ajouter une prestation</p>
                    <div className="flex bg-white p-0.5 rounded-lg border border-sky-100/80">
                      <button
                        type="button"
                        onClick={() => setLineComposeMode('catalogue')}
                        className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${lineComposeMode === 'catalogue' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Catalogue
                      </button>
                      <button
                        type="button"
                        onClick={() => setLineComposeMode('libre')}
                        className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${lineComposeMode === 'libre' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Saisie Libre
                      </button>
                    </div>
                  </div>

                  {lineComposeMode === 'catalogue' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={lastMinutePrestationId}
                        onChange={e => {
                          setLastMinutePrestationId(e.target.value);
                          const p = prestations.find(pr => pr.id === e.target.value);
                          if (p) {
                            // Pre-fill price representation or handle
                          }
                        }}
                        className="w-full bg-white border border-gray-150 text-[11px] p-2 rounded-xl outline-none"
                      >
                        <option value="">-- Choisir la prestation --</option>
                        {prestations.map(p => {
                          const price = p.prix_unitaire !== undefined ? p.prix_unitaire : p.base_price;
                          const label = p.type_tarif === 'm2' ? 'm²' : 'unité';
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} ({price} € / {label})
                            </option>
                          );
                        })}
                      </select>

                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          placeholder={
                            prestations.find(p => p.id === lastMinutePrestationId)?.type_tarif === 'm2'
                              ? "Surface m²"
                              : "Qté"
                          }
                          value={lastMinuteQty}
                          onChange={e => setLastMinuteQty(parseFloat(e.target.value) || 0)}
                          className="w-20 bg-white border border-gray-150 text-[11px] p-2 rounded-xl text-center outline-none font-bold text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={addLastMinutePrestation}
                          className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-[10px] px-2.5 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-sky-500/10"
                        >
                          + Ajouter
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Libellé de la prestation (ex: Nettoyage banquette de bateau)"
                        value={customLineName}
                        onChange={e => setCustomLineName(e.target.value)}
                        className="w-full bg-white border border-gray-150 text-[11px] p-2 rounded-xl outline-none font-medium"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Prix unitaire (€)"
                          value={customLinePrice || ''}
                          onChange={e => setCustomLinePrice(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-gray-150 text-[11px] p-2 rounded-xl text-center outline-none"
                        />
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          placeholder="Quantité"
                          value={customLineQty || ''}
                          onChange={e => setCustomLineQty(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-gray-150 text-[11px] p-2 rounded-xl text-center outline-none"
                        />
                        <button
                          type="button"
                          onClick={addLastMinutePrestation}
                          className="bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-[10px] rounded-xl transition-all cursor-pointer shadow-md shadow-sky-500/10"
                        >
                          + Ajouter libre
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Spécificités / Notes */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Remarques / Notes du Chantier</span>
                <textarea 
                  rows={2}
                  value={editApptForm.notes || ''}
                  onChange={e => setEditApptForm({ ...editApptForm, notes: e.target.value })}
                  placeholder="Ex: Préciser l'accès, le code d'entrée ou les consignes matériel pour l'artisan..."
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 border-t border-dashed border-gray-200">
                <button
                  type="button"
                  onClick={async () => {
                    // 1. Sauvegarder d'abord les modifications en base
                    try {
                      const totalAmount = editApptLines.reduce((acc, current) => acc + current.total_price, 0);
                      const apptData: Partial<RendezVousPlanning> = {
                        title: editApptForm.title,
                        date: editApptForm.date,
                        start_time: editApptForm.start_time,
                        duration_minutes: Number(editApptForm.duration_minutes),
                        assigned_employee_ids: editApptForm.assigned_employee_ids,
                        notes: editApptForm.notes,
                        final_price: totalAmount
                      };
                      await apiService.updateAppointmentFull(
                        editingAppt.id,
                        apptData,
                        editingAppt.devis_facture_id,
                        editApptLines
                      );
                      // Mettre à jour l'état local du rendez-vous d'intervention
                      setEditingAppt({ ...editingAppt, ...apptData });
                      setSignatureOnSpotMode(true);
                    } catch (err) {
                      console.error(err);
                      onToast("Erreur lors de la sauvegarde intermédiaire avant signature.", "info");
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl text-xs transition-transform cursor-pointer text-center shadow-lg shadow-emerald-500/15 active:scale-[0.98] flex items-center justify-center space-x-2"
                  title="Permet au client de signer directement avec son doigt pour valider les modifications sur votre smartphone"
                >
                  <span>✍️</span>
                  <span>Faire signer sur place (Écran Tactile)</span>
                </button>
              </div>

              <div className="flex space-x-3 pt-1">
                <button 
                  type="submit"
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-xl text-xs transition-colors cursor-pointer text-center shadow-lg shadow-sky-500/10 block"
                >
                  Mettre à jour la mission & document
                </button>
                <button 
                  type="button"
                  onClick={() => setEditApptModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-3.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 0. EDIT CLIENT MODAL */}
      {editClientModal && editClientForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
              <span className="font-bold text-slate-900 text-sm">Modifier la fiche Client</span>
              <button onClick={() => setEditClientModal(false)} className="text-slate-400 hover:text-slate-900 p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Type Selection */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Type de Client *</span>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditClientForm({ ...editClientForm, type_client: 'particulier' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      editClientForm.type_client === 'particulier' || !editClientForm.type_client
                        ? 'bg-sky-500 border-sky-500 text-white shadow shadow-sky-500/10'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    👤 Particulier
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditClientForm({ ...editClientForm, type_client: 'professionnel' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      editClientForm.type_client === 'professionnel'
                        ? 'bg-sky-500 border-sky-500 text-white shadow shadow-sky-500/10'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    🏢 Professionnel
                  </button>
                </div>
              </div>

              {/* Conditional B2B layout */}
              {editClientForm.type_client === 'professionnel' && (
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 space-y-3">
                  <p className="text-[9px] font-black text-indigo-800 uppercase">Paramètres légaux entreprise</p>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Raison sociale *</span>
                    <input 
                      type="text"
                      required
                      value={editClientForm.raison_sociale || ''}
                      onChange={e => setEditClientForm({ ...editClientForm, raison_sociale: e.target.value })}
                      placeholder="Nom de la société SAS"
                      className="w-full bg-white border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">SIRET *</span>
                    <input 
                      type="text"
                      required
                      value={editClientForm.siret || ''}
                      onChange={e => setEditClientForm({ ...editClientForm, siret: e.target.value })}
                      placeholder="12345678901234"
                      className="w-full bg-white border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Numéro de TVA *</span>
                    <input 
                      type="text"
                      required
                      value={editClientForm.tva_intracommunautaire || ''}
                      onChange={e => setEditClientForm({ ...editClientForm, tva_intracommunautaire: e.target.value })}
                      placeholder="FR12345678901"
                      className="w-full bg-white border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Prénom *</span>
                  <input 
                    type="text"
                    required
                    value={editClientForm.first_name}
                    onChange={e => setEditClientForm({ ...editClientForm, first_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Nom *</span>
                  <input 
                    type="text"
                    required
                    value={editClientForm.last_name}
                    onChange={e => setEditClientForm({ ...editClientForm, last_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Email *</span>
                <input 
                  type="email"
                  required
                  value={editClientForm.email}
                  onChange={e => setEditClientForm({ ...editClientForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Portable *</span>
                <input 
                  type="text"
                  required
                  value={editClientForm.phone}
                  onChange={e => setEditClientForm({ ...editClientForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Spécificités/Notes</span>
                <textarea 
                  rows={2}
                  value={editClientForm.notes || ''}
                  onChange={e => setEditClientForm({ ...editClientForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-xl text-xs transition-colors cursor-pointer block text-center shadow-lg shadow-sky-500/10"
              >
                Mettre à jour la fiche client
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {isDocModalOpen && viewingDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 w-full max-w-6xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-4 flex justify-between items-center border-b border-gray-100 shrink-0">
              <span className="font-extrabold text-slate-900 text-sm">Visualisation Document : {viewingDoc.number} ({viewingDoc.type.toUpperCase()})</span>
              <button 
                onClick={() => { setIsDocModalOpen(false); setViewingDoc(null); }} 
                className="text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {renderSingleDocumentPreview(viewingDoc, () => { setIsDocModalOpen(false); setViewingDoc(null); })}
            </div>
          </div>
        </div>
      )}

      {/* 1. NEW CLIENT CRÉATION MODAL */}
      {newClientModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
              <span className="font-bold text-slate-900 text-sm">Fiche pour Nouveau Client</span>
              <button onClick={() => setNewClientModal(false)} className="text-slate-400 hover:text-slate-900 p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Type de client (Particulier/Professionnel) */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Type de client</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewClientForm({ ...newClientForm, type_client: 'particulier' })}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                      newClientForm.type_client === 'particulier'
                        ? 'bg-sky-500 border-sky-400 text-white shadow-md shadow-sky-500/10'
                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Particulier
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClientForm({ ...newClientForm, type_client: 'professionnel' })}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                      newClientForm.type_client === 'professionnel'
                        ? 'bg-sky-500 border-sky-400 text-white shadow-md shadow-sky-500/10'
                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Professionnel
                  </button>
                </div>
              </div>

              {/* B2B Info Box */}
              {newClientForm.type_client === 'professionnel' && (
                <div className="bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100 space-y-2.5 animate-in slide-in-from-top-1 duration-150">
                  <span className="text-[9px] uppercase font-black text-sky-500 block">Informations B2B (Optionnelles)</span>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Raison Sociale</span>
                    <input 
                      type="text"
                      value={newClientForm.raison_sociale}
                      onChange={e => setNewClientForm({ ...newClientForm, raison_sociale: e.target.value })}
                      placeholder="Ex: Nettoyage SARL"
                      className="w-full bg-white border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">SIRET</span>
                      <input 
                        type="text"
                        value={newClientForm.siret}
                        onChange={e => setNewClientForm({ ...newClientForm, siret: e.target.value })}
                        placeholder="123 456 789 00012"
                        className="w-full bg-white border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">TVA Intra.</span>
                      <input 
                        type="text"
                        value={newClientForm.tva_intracommunautaire}
                        onChange={e => setNewClientForm({ ...newClientForm, tva_intracommunautaire: e.target.value })}
                        placeholder="FR 12 123456789"
                        className="w-full bg-white border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Adresse d'intervention */}
              <div className="space-y-1 relative">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Adresse d'intervention (Optionnelle)</span>
                <input 
                  type="text"
                  value={newClientForm.adresse_complete}
                  onChange={e => handleAddressSearch(e.target.value)}
                  placeholder="Rechercher une adresse..."
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                />
                {isSearchingAddress && (
                  <span className="absolute right-3.5 top-8 text-[10px] text-slate-400 animate-pulse">Recherche...</span>
                )}
                {addressSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 bg-white border border-slate-100 rounded-xl mt-1 shadow-xl max-h-48 overflow-y-auto">
                    {addressSuggestions.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setNewClientForm({ ...newClientForm, adresse_complete: label });
                          setAddressSuggestions([]);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs hover:bg-sky-50 text-slate-700 cursor-pointer border-b border-slate-50 last:border-b-0"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Prénom & Nom */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Prénom (Optionnel)</span>
                  <input 
                    type="text"
                    value={newClientForm.first_name}
                    onChange={e => setNewClientForm({ ...newClientForm, first_name: e.target.value })}
                    placeholder="Jean"
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Nom *</span>
                  <input 
                    type="text"
                    required
                    value={newClientForm.last_name}
                    onChange={e => setNewClientForm({ ...newClientForm, last_name: e.target.value })}
                    placeholder="Dupont"
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Portable & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Portable *</span>
                  <input 
                    type="text"
                    required
                    value={newClientForm.phone}
                    onChange={e => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    placeholder="06 12 34 56 78"
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Email (Optionnel)</span>
                  <input 
                    type="email"
                    value={newClientForm.email}
                    onChange={e => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    placeholder="jean@gmail.com"
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Spécificités Textiles (Note de Suivi)</span>
                <textarea 
                  rows={2}
                  value={newClientForm.notes}
                  onChange={e => setNewClientForm({ ...newClientForm, notes: e.target.value })}
                  placeholder="Canapé velours, moquette fragile..."
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-xl text-xs transition-colors cursor-pointer block text-center shadow-lg shadow-sky-500/10"
              >
                Valider l'enregistrement CRM
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. NEW DEVIS/FACTURE MODAL */}
      {newDocModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
              <span className="font-bold text-slate-900 text-sm">Nouveau Devis / Facture</span>
              <button onClick={() => setNewDocModal(false)} className="text-slate-400 hover:text-slate-900 p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Client Choice Box */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="text-xs font-bold text-slate-800">Assignation Client CRM</span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 relative">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">RECHERCHER UN CLIENT CRM *</span>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="Commencez à taper un nom ou prénom..."
                          value={clientSearchText}
                          onChange={e => {
                            setClientSearchText(e.target.value);
                            if (newDocForm.client_id) {
                              setNewDocForm({ ...newDocForm, client_id: '' });
                              setDocInterventionAddress('');
                            }
                            setShowClientSuggestions(true);
                          }}
                          onFocus={() => setShowClientSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowClientSuggestions(false), 250)}
                          className="w-full bg-white border border-slate-200 text-xs p-2.5 rounded-xl outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                        />
                        
                        {showClientSuggestions && clientSearchText.trim().length > 0 && (
                          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 max-h-[220px] overflow-y-auto p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-100">
                            {(() => {
                              const query = clientSearchText.toLowerCase();
                              const filtered = clients.filter(c => 
                                c.first_name.toLowerCase().includes(query) || 
                                c.last_name.toLowerCase().includes(query) ||
                                (c.raison_sociale && c.raison_sociale.toLowerCase().includes(query))
                              );
                              
                              if (filtered.length > 0) {
                                return filtered.map(c => (
                                  <div
                                    key={c.id}
                                    onMouseDown={() => {
                                      setNewDocForm(prev => ({ ...prev, client_id: c.id }));
                                      setClientSearchText(`${c.last_name.toUpperCase()} ${c.first_name}`);
                                      setDocInterventionAddress('');
                                      setShowClientSuggestions(false);
                                    }}
                                    className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer text-xs flex justify-between items-center transition-colors"
                                  >
                                    <div>
                                      <p className="font-extrabold text-slate-800">{c.last_name.toUpperCase()} {c.first_name}</p>
                                      {c.raison_sociale && <p className="text-[9px] text-sky-600 font-bold">{c.raison_sociale}</p>}
                                      <p className="text-[10px] text-slate-400">{c.phone} | {c.email}</p>
                                    </div>
                                    {newDocForm.client_id === c.id && (
                                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                    )}
                                  </div>
                                ));
                              } else {
                                return (
                                  <div className="p-3 text-center space-y-2 select-none">
                                    <p className="text-xs text-slate-400 font-medium">❌ Client introuvable</p>
                                    <button
                                      type="button"
                                      onMouseDown={() => {
                                        const parts = clientSearchText.trim().split(/\s+/);
                                        const firstName = parts.length > 1 ? parts[0] : '';
                                        const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || '';
                                        setNewClientForm({
                                          first_name: firstName,
                                          last_name: lastName,
                                          email: '',
                                          phone: '',
                                          notes: '',
                                          type_client: 'particulier',
                                          raison_sociale: '',
                                          siret: '',
                                          tva_intracommunautaire: '',
                                          adresse_complete: ''
                                        });
                                        setNewClientModal(true);
                                        setShowClientSuggestions(false);
                                      }}
                                      className="text-xs font-bold text-sky-500 hover:text-sky-600 bg-sky-50 px-3 py-2 rounded-lg transition-colors cursor-pointer w-full text-center"
                                    >
                                      [ + Créer ce client à la volée ]
                                    </button>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">TYPE DE DOCUMENT</span>
                      <select 
                        value={newDocForm.type}
                        onChange={e => setNewDocForm({ ...newDocForm, type: e.target.value as DocumentType })}
                        className="w-full bg-white border border-slate-200 text-xs p-2.5 rounded-xl outline-none focus:border-sky-500 transition-colors"
                      >
                        <option value="devis">Devis</option>
                        <option value="facture">Facture</option>
                      </select>
                    </div>
                  </div>

                  {newDocForm.client_id && (
                    <div className="p-3 bg-sky-50/40 rounded-xl border border-sky-100 flex items-center justify-between text-xs animate-in fade-in duration-100">
                      <div>
                        <span className="text-[10px] uppercase font-black text-sky-600 block">Client sélectionné</span>
                        <span className="font-extrabold text-slate-800">
                          {(() => {
                            const c = clients.find(x => x.id === newDocForm.client_id);
                            return c ? `${c.last_name.toUpperCase()} ${c.first_name} (${c.phone})` : 'Client sélectionné';
                          })()}
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setNewDocForm(prev => ({ ...prev, client_id: '' }));
                          setClientSearchText('');
                          setDocInterventionAddress('');
                        }}
                        className="text-[10px] font-bold text-red-500 hover:text-red-650 bg-red-50 px-2 py-1 rounded-md transition-colors"
                      >
                        Désélectionner
                      </button>
                    </div>
                  )}

                  {newDocForm.client_id && allAddresses.filter(addr => addr.client_id === newDocForm.client_id).length > 0 && (
                    <div className="space-y-1 animate-in slide-in-from-top-1 duration-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">ADRESSE DE CHANTIER / INTERVENTION</span>
                      <select 
                        value={docInterventionAddress}
                        onChange={e => setDocInterventionAddress(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                      >
                        <option value="">-- Utiliser l'adresse d'origine du compte client --</option>
                        {allAddresses.filter(addr => addr.client_id === newDocForm.client_id).map(addr => (
                          <option key={addr.id} value={addr.adresse_complete}>
                            [{addr.label_adresse.toUpperCase()}] {addr.adresse_complete}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">DATE D'ÉMISSION</span>
                  <input 
                    type="date"
                    value={newDocForm.date}
                    onChange={e => setNewDocForm({ ...newDocForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">DATE D'ÉCHÉANCE</span>
                  <input 
                    type="date"
                    value={newDocForm.due_date}
                    onChange={e => setNewDocForm({ ...newDocForm, due_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Dynamic lines list builder */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black text-slate-900">LIGNES DE PRESTATIONS</span>
                  <button 
                    type="button"
                    onClick={addLineToDocBuilder}
                    className="text-sky-500 font-bold hover:text-sky-600 text-[10px] flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une prestation</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {newDocLines.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-2">Aucune ligne de prestation ajoutée.</p>
                  ) : (
                    newDocLines.map((line, index) => (
                      <div key={index} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex-1 flex flex-col md:flex-row gap-2">
                          <div className="w-full md:w-1/2">
                            <select 
                              value={line.prestation_id}
                              onChange={e => updateLineValue(index, 'prestation_id', e.target.value)}
                              className="bg-white border border-gray-100 text-[11px] p-2 rounded-lg w-full outline-none"
                            >
                              <option value="custom">[ Saisie Libre / Option Personnalisée ]</option>
                              {prestations.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.base_price}€)</option>
                              ))}
                            </select>
                          </div>

                          {line.prestation_id === 'custom' && (
                            <div className="flex-1">
                              <input 
                                type="text"
                                required
                                value={line.custom_name || ''}
                                onChange={e => updateLineValue(index, 'custom_name', e.target.value)}
                                placeholder="Description personnalisée..."
                                className="bg-white border border-gray-100 text-[11px] p-2 rounded-lg w-full outline-none font-medium text-slate-800"
                              />
                            </div>
                          )}
                        </div>

                        <div className="w-20">
                          <input 
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={e => updateLineValue(index, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                            className="bg-white border border-gray-100 text-[11px] p-2 rounded-lg w-full text-center outline-none"
                          />
                        </div>

                        <div className="w-24">
                          <input 
                            type="number"
                            min="0"
                            value={line.unit_price}
                            onChange={e => updateLineValue(index, 'unit_price', Math.max(0, Number(e.target.value) || 0))}
                            className="bg-white border border-gray-100 text-[11px] p-2 rounded-lg w-full text-right outline-none"
                          />
                        </div>

                        <button 
                          type="button"
                          onClick={() => removeLineFromBuilder(index)}
                          className="text-red-500 hover:text-red-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── Bloc totalisation dynamique TVA ── */}
              {newDocLines.length > 0 && (() => {
                const selectedC = clients.find(c => c.id === newDocForm.client_id);
                const isB2BClient = selectedC?.type_client === 'professionnel';
                const totals = getDocTotals(newDocLines, isB2BClient);
                return (
                  <div className={`rounded-2xl border p-4 space-y-1.5 ${
                    isB2BClient
                      ? 'bg-indigo-50/60 border-indigo-100'
                      : 'bg-sky-50/60 border-sky-100'
                  }`}>
                    <p className={`text-[9px] uppercase font-black tracking-wider mb-2 ${
                      isB2BClient ? 'text-indigo-600' : 'text-sky-600'
                    }`}>
                      {isB2BClient ? '🏢 Mode B2B — Détail TVA 20%' : '👤 Mode B2C — Prix TTC'}
                    </p>
                    {isB2BClient ? (
                      <>
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>Total HT</span>
                          <span className="font-bold">{totals.totalHT!.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>TVA (20%)</span>
                          <span className="font-semibold">{totals.montantTVA!.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-sm font-black text-indigo-700 border-t border-indigo-200 pt-1.5 mt-1">
                          <span>Total TTC (Net à payer)</span>
                          <span>{totals.totalTTC.toFixed(2)} €</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-sm font-black text-sky-700">
                        <span>Total TTC</span>
                        <span>{totals.totalTTC.toFixed(2)} €</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-1 pt-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Notes du devis / Conditions de ventes</span>
                <textarea 
                  rows={2}
                  value={newDocForm.notes}
                  onChange={e => setNewDocForm({ ...newDocForm, notes: e.target.value })}
                  placeholder="Seuil minimum de commande applicable. Décompte d'intervention."
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-4">
                <button 
                  type="submit"
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Générer le document {newDocForm.type === 'devis' ? 'Brouillon' : 'Facture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. NEW EMPLOYÉ MODAL */}
      {newEmpModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
              <span className="font-bold text-slate-900 text-sm">{newEmpForm.id ? "Modifier" : "Enregistrer"} un Technicien</span>
              <button onClick={() => setNewEmpModal(false)} className="text-slate-400 hover:text-slate-900 p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Prénom *</span>
                  <input 
                    type="text"
                    required
                    value={newEmpForm.first_name}
                    onChange={e => setNewEmpForm({ ...newEmpForm, first_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Nom *</span>
                  <input 
                    type="text"
                    required
                    value={newEmpForm.last_name}
                    onChange={e => setNewEmpForm({ ...newEmpForm, last_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Email *</span>
                <input 
                  type="email"
                  required
                  value={newEmpForm.email}
                  onChange={e => setNewEmpForm({ ...newEmpForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Téléphone *</span>
                <input 
                  type="text"
                  required
                  value={newEmpForm.phone}
                  onChange={e => setNewEmpForm({ ...newEmpForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Disponibilité</span>
                  <select 
                    value={newEmpForm.status}
                    onChange={e => setNewEmpForm({ ...newEmpForm, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  >
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Code Couleur</span>
                  <select 
                    value={newEmpForm.color}
                    onChange={e => setNewEmpForm({ ...newEmpForm, color: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="#0ea5e9">Eau Pure (Bleu)</option>
                    <option value="#10b981">Émeraude pro (Vert)</option>
                    <option value="#8b5cf6">Lilas chic (Violet)</option>
                    <option value="#f59e0b">Jasmin chaud (Orange)</option>
                    <option value="#ec4899">Rosé (Rose)</option>
                  </select>
                </div>
              </div>

              {/* Account Activation Segment */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Activer le compte employé</span>
                    <p className="text-[9px] text-slate-400">Permet au technicien de se connecter à son planning.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={newEmpForm.compte_actif || false}
                      onChange={e => setNewEmpForm({ ...newEmpForm, compte_actif: e.target.checked })}
                    />
                    <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {(newEmpForm.compte_actif) && (
                  <div className="bg-white p-3 rounded-xl border border-dashed border-slate-200 text-[10px] space-y-1.5 text-slate-600">
                    <p className="font-bold text-slate-700">🔐 Identifiants de connexion d'accès :</p>
                    <p>• Identifiant : <span className="font-mono bg-slate-50 text-sky-600 px-1 py-0.5 rounded">{(newEmpForm.first_name?.[0] ? newEmpForm.first_name[0].toLowerCase() : '')}.{newEmpForm.last_name ? newEmpForm.last_name.trim().toLowerCase().replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 'nom'}</span></p>
                    <p>• Mot de passe : <span className="font-mono bg-slate-50 text-emerald-600 px-1 py-0.5 rounded">{newEmpForm.last_name ? newEmpForm.last_name.trim().toLowerCase().replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 'nom'}2025</span></p>
                    <p className="text-[8px] text-amber-600 mt-1 font-black">📧 Un e-mail automatique contenant ces codes sera envoyé à {newEmpForm.email || "l'adresse saisie"}.</p>
                  </div>
                )}
              </div>

              <button 
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-xl text-xs transition-colors cursor-pointer block text-center shadow-lg shadow-sky-500/10"
              >
                Sauvegarder le profil
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. SCHEDULER: APPOINTMENT CREATION MODAL */}
      {newApptModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
              <span className="font-bold text-slate-900 text-sm">Planifier un Chantier de Nettoyage</span>
              <button onClick={() => setNewApptModal(false)} className="text-slate-400 hover:text-slate-900 p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">DEVIS SIGNÉ ASSOCIDÉ *</span>
                <select 
                  value={newApptForm.devis_facture_id}
                  onChange={e => handleQuoteSelectionForAppt(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                >
                  <option value="">-- Choisissez un devis signé --</option>
                  {documents.filter(d => d.type === 'devis' && d.status === 'Signé/Accepté').map(d => {
                    const cl = clients.find(x => x.id === d.client_id);
                    return (
                      <option key={d.id} value={d.id}>
                        {d.number} - {cl ? `${cl.first_name} ${cl.last_name}` : 'Inconnu'} ({d.total_amount}€)
                      </option>
                    );
                  })}
                </select>
              </div>

              {newApptForm.devis_facture_id && allAddresses.filter(addr => {
                const doc = documents.find(d => d.id === newApptForm.devis_facture_id);
                return doc && addr.client_id === doc.client_id;
              }).length > 0 && (
                <div className="space-y-1 animate-in slide-in-from-top-1 duration-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">ADRESSE DE CHANTIER SPÉCIFIQUE</span>
                  <select 
                    value={apptInterventionAddress}
                    onChange={e => setApptInterventionAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  >
                    <option value="">-- Utiliser l'adresse générale du client --</option>
                    {allAddresses.filter(addr => {
                      const doc = documents.find(d => d.id === newApptForm.devis_facture_id);
                      return doc && addr.client_id === doc.client_id;
                    }).map(addr => (
                      <option key={addr.id} value={addr.adresse_complete}>
                        [{addr.label_adresse.toUpperCase()}] {addr.adresse_complete}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">TITRE DE L'INTERVENTION *</span>
                <input 
                  type="text"
                  required
                  value={newApptForm.title}
                  onChange={e => setNewApptForm({ ...newApptForm, title: e.target.value })}
                  placeholder="Lavage textile Dubois"
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">DATE PLANIFIÉE *</span>
                  <input 
                    type="date"
                    required
                    value={newApptForm.date}
                    onChange={e => setNewApptForm({ ...newApptForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">HEURE DE DÉBUT *</span>
                  <input 
                    type="time"
                    required
                    value={newApptForm.start_time}
                    onChange={e => setNewApptForm({ ...newApptForm, start_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">DURÉE ESTIMÉE (MINUTES) *</span>
                  <input 
                    type="number"
                    min="15"
                    step="15"
                    required
                    value={newApptForm.duration_minutes}
                    onChange={e => setNewApptForm({ ...newApptForm, duration_minutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">TARIF FINAL (TTC) *</span>
                  <input 
                    type="number"
                    required
                    value={newApptForm.final_price}
                    onChange={e => setNewApptForm({ ...newApptForm, final_price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Assign Employés (checkboxes) */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">ASSIGNATION DU TECHNICIEN *</span>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {employees.filter(em => em.status === 'Actif').map(em => (
                    <label key={em.id} className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={newApptForm.assigned_employee_ids.includes(em.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          if (checked) {
                            setNewApptForm({ ...newApptForm, assigned_employee_ids: [...newApptForm.assigned_employee_ids, em.id] });
                          } else {
                            setNewApptForm({ ...newApptForm, assigned_employee_ids: newApptForm.assigned_employee_ids.filter(id => id !== em.id) });
                          }
                        }}
                        className="rounded border-gray-300 text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800">{em.first_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Consignes techniques de nettoyage</span>
                <textarea 
                  rows={2}
                  value={newApptForm.notes}
                  onChange={e => setNewApptForm({ ...newApptForm, notes: e.target.value })}
                  placeholder="Apporter extracteur compact + brosse velours douce."
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl text-xs transition-colors cursor-pointer block text-center shadow-lg shadow-emerald-500/10"
              >
                Inscrire au planning
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. GESTION DES PRESTATIONS: ADD / EDIT MODAL */}
      {showPrestationModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
              <span className="font-bold text-slate-900 text-sm">
                {editingPrestation ? 'Modifier la Prestation' : 'Ajouter une Prestation'}
              </span>
              <button 
                onClick={() => setShowPrestationModal(false)} 
                className="text-slate-400 hover:text-slate-900 p-1 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const payload = {
                    category: prestationForm.category,
                    name: prestationForm.name,
                    type_tarif: prestationForm.type_tarif,
                    prix_unitaire: Number(prestationForm.prix_unitaire),
                    base_price: Number(prestationForm.prix_unitaire), // legacy
                    unit_label: prestationForm.type_tarif === 'm2' ? 'm²' : 'unité',
                    activer_majoration_nuit: prestationForm.activer_majoration_nuit,
                    temps_estime_minutes: Number(prestationForm.temps_estime_minutes)
                  };

                  if (editingPrestation) {
                    await apiService.updatePrestation({
                      id: editingPrestation.id,
                      ...payload
                    });
                    onToast("Prestation modifiée avec succès !", "success");
                  } else {
                    await apiService.createPrestation(payload);
                    onToast("Prestation créée avec succès !", "success");
                  }

                  const fresh = await apiService.getPrestations();
                  setPrestations(fresh);
                  setShowPrestationModal(false);
                } catch (err: any) {
                  console.error(err);
                  onToast("Erreur lors de la sauvegarde : " + err.message, "info");
                }
              }} 
              className="p-6 space-y-4"
            >
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Nom de la prestation *</span>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Nettoyage matelas 2 places"
                  value={prestationForm.name}
                  onChange={e => setPrestationForm({ ...prestationForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Catégorie *</span>
                  <select 
                    value={prestationForm.category}
                    onChange={e => setPrestationForm({ ...prestationForm, category: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  >
                    <option value="canape">Canapés / Sofas</option>
                    <option value="moquette">Sols & Tapis</option>
                    <option value="fauteuil">Assises</option>
                    <option value="autre">Options / Autre</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tarification *</span>
                  <select 
                    value={prestationForm.type_tarif}
                    onChange={e => setPrestationForm({ ...prestationForm, type_tarif: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none"
                  >
                    <option value="fixe">Prix Fixe (unité)</option>
                    <option value="m2">Au Mètre Carré (m²)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Prix unitaire (€) *</span>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={prestationForm.prix_unitaire || ''}
                    onChange={e => setPrestationForm({ ...prestationForm, prix_unitaire: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Temps estimé (minutes) *</span>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={prestationForm.temps_estime_minutes || ''}
                    onChange={e => setPrestationForm({ ...prestationForm, temps_estime_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-100 text-xs p-2.5 rounded-xl outline-none focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={prestationForm.activer_majoration_nuit}
                    onChange={e => setPrestationForm({ ...prestationForm, activer_majoration_nuit: e.target.checked })}
                    className="rounded border-gray-300 text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-800">Activer la majoration de nuit automatique</span>
                </label>
              </div>

              <button 
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-xl text-xs transition-colors cursor-pointer block text-center shadow-lg shadow-sky-500/10"
              >
                Enregistrer la prestation
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
