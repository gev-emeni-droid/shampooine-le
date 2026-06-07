import React, { useState, useEffect } from 'react';
import { Employe, RendezVousPlanning, Client, DevisFacture } from '../types';
import { apiService } from '../services/apiClient';
import { 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Search, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Briefcase, 
  FileText,
  Compass,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface EmployeeViewProps {
  employee: Employe;
  onLogout: () => void;
  onToast: (msg: string, type: 'success' | 'info') => void;
  entrepriseConfig?: any;
}

export default function EmployeeView({ employee, onLogout, onToast, entrepriseConfig: propConfig }: EmployeeViewProps) {
  const [appointments, setAppointments] = useState<RendezVousPlanning[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [documents, setDocuments] = useState<DevisFacture[]>([]);
  const [entrepriseConfig, setEntrepriseConfig] = useState<any>(propConfig || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (propConfig) {
      setEntrepriseConfig(propConfig);
    }
  }, [propConfig]);
  
  // Navigation tabs for Employee: 'planning' or 'clients'
  const [activeTab, setActiveTab] = useState<'planning' | 'clients'>('planning');

  // Client Search filter
  const [clientSearch, setClientSearch] = useState('');

  // Selected appointment details view
  const [selectedAppt, setSelectedAppt] = useState<RendezVousPlanning | null>(null);

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const [apptRes, clientRes, docRes, configRes] = await Promise.all([
        apiService.getAppointments(),
        apiService.getClients(),
        apiService.getDevisFactures(),
        propConfig ? Promise.resolve(propConfig) : apiService.getEntrepriseConfig()
      ]);
      setAppointments(apptRes);
      setClients(clientRes);
      setDocuments(docRes);
      setEntrepriseConfig(configRes);
    } catch (err) {
      console.error(err);
      onToast("Impossible de charger les données du technicien.", "info");
    } finally {
      setLoading(false);
    }
  };

  // Parse address from notes if it exists
  const getInterventionAddress = (notes?: string) => {
    if (!notes) return null;
    const match = notes.match(/Adresse d'intervention\s*:\s*([^\n]+)/i);
    return match ? match[1].trim() : null;
  };

  const getCleanNotes = (notes?: string) => {
    if (!notes) return "";
    return notes.replace(/Adresse d'intervention\s*:\s*[^\n]+\n?/i, "").trim();
  };

  // Helper to determine if a date string falls in the current week (Monday - Sunday)
  const isDateInCurrentWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    
    const today = new Date();
    // Get start of current week (Monday)
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Get end of current week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return d >= startOfWeek && d <= endOfWeek;
  };

  // Filter appointments assigned to this employee and occurring in the current week
  const myCurrentWeekAppointments = appointments.filter(appt => {
    const isAssigned = appt.assigned_employee_ids.includes(employee.id);
    const isThisWeek = isDateInCurrentWeek(appt.date);
    return isAssigned && isThisWeek;
  });

  // Filter other non-current week appointments just in case
  const myFutureAppointments = appointments.filter(appt => {
    const isAssigned = appt.assigned_employee_ids.includes(employee.id);
    const isThisWeek = isDateInCurrentWeek(appt.date);
    const d = new Date(appt.date);
    const today = new Date();
    today.setHours(0,0,0,0);
    return isAssigned && !isThisWeek && d >= today;
  });

  // Filter clients list
  const filteredClients = clients.filter(c => {
    const q = clientSearch.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  // Helper: Format date into nice French words
  const formatFriendlyDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', options);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* 1. LEFT UTILITY RAIL / SIDEBAR */}
      <aside className="w-full md:w-72 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 shrink-0 flex flex-col justify-between">
        <div>
          {/* Header branding */}
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
            <div className="bg-sky-500 text-white p-2 rounded-2xl shadow-lg shadow-sky-500/15">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white uppercase text-sky-400">{entrepriseConfig?.nom_entreprise || 'Shampooine Le'}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Espace Technicien</p>
            </div>
          </div>

          {/* User profile segment */}
          <div className="p-6 bg-slate-950/40 border-b border-slate-800 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{ backgroundColor: employee.color || '#3b82f6' }}>
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{employee.first_name} {employee.last_name}</p>
              <span className="text-[10px] uppercase font-bold text-slate-400">Technicien Pro</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1.5 flex flex-col">
            <button
              onClick={() => setActiveTab('planning')}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-left border cursor-pointer ${
                activeTab === 'planning'
                  ? 'bg-sky-500 text-white shadow-lg border-sky-400 shadow-sky-500/10 font-bold'
                  : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Mon Planning Hebdo</span>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-left border cursor-pointer ${
                activeTab === 'clients'
                  ? 'bg-sky-500 text-white shadow-lg border-sky-400 shadow-sky-500/10 font-bold'
                  : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="text-xs">Carnet d'Adresses Clients</span>
            </button>
          </nav>
        </div>

        {/* Bottom actions */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white py-3 px-4 rounded-xl text-xs font-bold transition-all border border-slate-800 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* 2. CHIEF WORKSPACE */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        
        {/* Top Header info */}
        <header className="px-8 py-4 bg-slate-900/40 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {activeTab === 'planning' && 'Interventions Assignées'}
              {activeTab === 'clients' && 'Coordonnées Clientèle'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Connexion Technicien</span>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
            <p className="text-xs text-slate-400 font-black mt-3 uppercase tracking-widest">Mise à jour du planning...</p>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6">

            {/* TAB: PLANNING VIEW */}
            {activeTab === 'planning' && (
              <div className="space-y-6">
                
                {/* Intro message */}
                <div className="bg-gradient-to-r from-slate-900 to-sky-950 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <h3 className="text-sm font-bold text-white">Salut {employee.first_name} ! 🚀</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Voici vos rendez-vous de nettoyage assignés pour la <strong>semaine en cours</strong>. Cliquez sur un chantier pour voir les adresses de déplacement, les heures d'arrivée et les notes d'intervention.
                  </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  
                  {/* Left columns: List of week's interventions */}
                  <div className="xl:col-span-2 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-sky-400" />
                      <span>Mon planning de la semaine</span>
                    </h4>

                    {myCurrentWeekAppointments.length === 0 ? (
                      <div className="bg-slate-900/40 rounded-2xl p-8 border border-slate-800 text-center space-y-3">
                        <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                        <div>
                          <p className="text-xs font-bold text-slate-300">Aucune intervention cette semaine</p>
                          <p className="text-[10px] text-slate-500 mt-1">Vous n'avez pas de chantiers planifiés pour la semaine en cours.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myCurrentWeekAppointments.map(appt => {
                          const doc = documents.find(d => d.id === appt.devis_facture_id);
                          const isSelected = selectedAppt?.id === appt.id;
                          
                          return (
                            <button
                              key={appt.id}
                              onClick={() => setSelectedAppt(appt)}
                              className={`w-full text-left p-5 rounded-2xl border transition-all flex flex-col space-y-3 cursor-pointer ${
                                isSelected 
                                  ? 'bg-sky-950/40 border-sky-500/50 shadow-lg shadow-sky-500/5 text-white' 
                                  : 'bg-slate-900 border-slate-800/80 hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-3 w-full">
                                <div>
                                  <span className="text-[10px] uppercase font-black text-sky-400 tracking-wider">Chantier</span>
                                  <h5 className="text-xs font-bold text-white mt-0.5">{appt.title}</h5>
                                </div>
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded inline-flex items-center space-x-1 ${
                                  appt.status === 'Terminé' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : appt.status === 'En cours'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                                    : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                }`}>
                                  {appt.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-400 pt-1">
                                <span className="flex items-center space-x-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                  <span className="truncate">{appt.date}</span>
                                </span>
                                <span className="flex items-center space-x-1.5">
                                  <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>{appt.start_time} ({appt.duration_minutes} min)</span>
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Future planning segment */}
                    {myFutureAppointments.length > 0 && (
                      <div className="pt-4 space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          Chantiers Ultérieurs ({myFutureAppointments.length})
                        </h4>
                        <div className="space-y-2">
                          {myFutureAppointments.map(appt => (
                            <div key={appt.id} className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-xl flex justify-between items-center text-xs">
                              <div>
                                <p className="font-bold text-slate-300">{appt.title}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Le {appt.date} à {appt.start_time}</p>
                              </div>
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                À venir
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right column: Interactive Detail Sheet */}
                  <div className="xl:col-span-1">
                    {selectedAppt ? (
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 sticky top-6">
                        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Fiche Intervention</span>
                            <h4 className="text-xs font-black text-white mt-0.5">{selectedAppt.title}</h4>
                          </div>
                          <button 
                            onClick={() => setSelectedAppt(null)} 
                            className="text-slate-500 hover:text-white text-xs font-bold p-1 rounded-full hover:bg-slate-800"
                          >
                            × Fermer
                          </button>
                        </div>

                        {/* Timing information */}
                        <div className="space-y-3">
                          <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Timing et Durée</h5>
                          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
                            <p className="text-slate-300 flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                              <span className="font-medium">{formatFriendlyDate(selectedAppt.date)}</span>
                            </p>
                            <p className="text-slate-300 flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>Début : <strong>{selectedAppt.start_time}</strong> | Travail estimé : <strong>{selectedAppt.duration_minutes} min</strong></span>
                            </p>
                          </div>
                        </div>

                        {/* Client details segment */}
                        {(() => {
                          const doc = documents.find(d => d.id === selectedAppt.devis_facture_id);
                          const cl = doc ? clients.find(c => c.id === doc.client_id) : null;
                          if (!cl) return null;

                          return (
                            <div className="space-y-3">
                              <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Coordonnées de déplacement</h5>
                              <div className="bg-slate-950/65 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                                <div>
                                  <p className="font-bold text-white text-xs">{cl.first_name} {cl.last_name}</p>
                                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider mt-0.5">Nouveau Client</p>
                                </div>
                                <div className="space-y-1.5 pt-1.5 border-t border-slate-800 text-[11px] text-slate-300">
                                  <a href={`tel:${cl.phone}`} className="flex items-center space-x-2 hover:text-sky-400 transition-all">
                                    <Phone className="w-3.5 h-3.5 text-sky-400" />
                                    <span>{cl.phone}</span>
                                  </a>
                                  <a href={`mailto:${cl.email}`} className="flex items-center space-x-2 hover:text-sky-400 transition-all mt-1">
                                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="truncate">{cl.email}</span>
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Adresse d'intervention */}
                        {(() => {
                          const addr = getInterventionAddress(selectedAppt.notes);
                          return (
                            <div className="space-y-3">
                              <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Adresse d'intervention</h5>
                              <div className="bg-slate-955 p-3.5 rounded-2xl border border-slate-800 flex items-start space-x-2.5 text-xs text-slate-300">
                                <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold text-white">Chantier d'intervention</p>
                                  <p className="mt-1 text-slate-400 leading-normal">{addr || "Utiliser l'adresse principale du client"}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Internal memo notes */}
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Mémos &amp; Consignes</label>
                          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 text-xs text-slate-300 italic leading-relaxed">
                            {getCleanNotes(selectedAppt.notes) ? getCleanNotes(selectedAppt.notes) : "Aucune consigne interne n'a été rédigée."}
                          </div>
                        </div>

                        {/* WORKFLOW AUTOMATISÉ : MODE EMPLOYÉ TERRAIN */}
                        {(() => {
                          const doc = documents.find(d => d.id === selectedAppt.devis_facture_id);
                          if (!doc) return null;

                          // Local/state management helpers for employee inline session
                          return (
                            <EmployeePrestationManager 
                              appt={selectedAppt}
                              doc={doc}
                              onToast={onToast}
                              onRefresh={loadEmployeeData}
                              prestations={prestations}
                            />
                          );
                        })()}

                      </div>
                    ) : (
                      <div className="h-full bg-slate-900/30 border border-slate-800/60 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-full text-slate-600">
                          <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-300">Aucun chantier sélectionné</p>
                          <p className="text-[10px] text-slate-500 mt-1">Cliquez sur une heure ou un titre d'intervention dans la liste de gauche pour voir les informations complètes.</p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* TAB: CLIENTS ADDRESS BOOK */}
            {activeTab === 'clients' && (
              <div className="space-y-6">
                
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                  
                  {/* Search box & Info bar */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pb-2 border-b border-slate-800/80">
                    <div>
                      <h3 className="text-sm font-bold text-white">Carnet d'adresses de la clientèle</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Accès restreint pour appeler ou trouver un client en déplacement.</p>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Rechercher (Nom, Téléphone, Email)..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white rounded-xl w-full focus:ring-1 focus:ring-sky-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Clients list cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClients.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-xs text-slate-500">
                        Aucun client ne correspond à votre recherche.
                      </div>
                    ) : (
                      filteredClients.map(c => (
                        <div key={c.id} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-900 text-sky-400 flex items-center justify-center font-bold text-xs border border-slate-850">
                                {c.first_name[0]}{c.last_name[0]}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">{c.first_name} {c.last_name}</p>
                                <span className="text-[9px] text-slate-500 font-mono">Fiche : {c.id}</span>
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-2 text-[11px] text-slate-300">
                              <a href={`tel:${c.phone}`} className="flex items-center space-x-2.5 hover:text-sky-400 transition-all">
                                <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span>{c.phone}</span>
                              </a>
                              <a href={`mailto:${c.email}`} className="flex items-center space-x-2.5 hover:text-sky-400 transition-all">
                                <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0 text-slate-500" />
                                <span className="truncate">{c.email}</span>
                              </a>
                            </div>
                          </div>

                          {c.notes && (
                            <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400 italic">
                              <strong>Mémo :</strong> {c.notes}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      </main>

    </div>
  );
}

// =========================================================================
// EMPLOYEE TERRAIN WORKFLOW MANAGER (PHOTOS, LIVE LINES CALCULATIONS, CHECKOUT)
// =========================================================================
import { Trash, Plus, Check } from 'lucide-react';

interface EmployeePrestationManagerProps {
  appt: RendezVousPlanning;
  doc: DevisFacture;
  onToast: (msg: string, type: 'success' | 'info') => void;
  onRefresh: () => void;
  prestations: Prestation[];
}

function EmployeePrestationManager({ appt, doc, onToast, onRefresh, prestations }: EmployeePrestationManagerProps) {
  const [status, setStatus] = useState<string>(appt.status);
  const [docLines, setDocLines] = useState<LigneDocument[]>([]);
  const [photos, setPhotos] = useState<DocumentPhoto[]>([]);
  
  // Custom manual prestations form
  const [selectedPrestationId, setSelectedPrestationId] = useState<string>(prestations[0]?.id || '');
  const [qty, setQty] = useState<number>(1);
  
  // Photo upload simulated inputs
  const [loadingLines, setLoadingLines] = useState(false);
  const [simulatedPhotoUrl, setSimulatedPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  
  // Final payment variables
  const [paymentMode, setPaymentMode] = useState<'ESPECES' | 'VIREMENT'>('ESPECES');

  // Load photos and document lines
  const loadDocData = async () => {
    try {
      setLoadingLines(true);
      const lines = await apiService.getLignesDocument(doc.id);
      const docPhotos = await apiService.getDocumentPhotos(doc.id);
      setDocLines(lines);
      setPhotos(docPhotos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLines(false);
    }
  };

  useEffect(() => {
    loadDocData();
  }, [doc.id]);

  // Photo helpers
  const handleUploadPhoto = async (type: 'before' | 'after') => {
    const defaultPlaceholder = type === 'before' 
      ? 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=600&q=80'
      : 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&w=600&q=80';
      
    const url = simulatedPhotoUrl.trim() || defaultPlaceholder;
    const caption = photoCaption.trim() || `${type === 'before' ? 'Avant' : 'Après'} prestation`;

    try {
      await apiService.saveDocumentPhoto({
        devis_facture_id: doc.id,
        photo_url: url,
        caption,
        before_after: type
      });
      onToast(`Photo "${type.toUpperCase()}" enregistrée !`, 'success');
      setSimulatedPhotoUrl('');
      setPhotoCaption('');
      loadDocData();
    } catch (err) {
      onToast("Erreur lors de l'enregistrement de la photo.", 'info');
    }
  };

  // Add line item
  const handleAddLine = async () => {
    const target = prestations.find(p => p.id === selectedPrestationId);
    if (!target) return;

    try {
      const newLinePrice = target.prix_unitaire || target.base_price || 0;
      const newLineTotal = newLinePrice * qty;

      const currentLines = [...docLines];
      const existingLineIndex = currentLines.findIndex(l => l.prestation_name === target.name);

      if (existingLineIndex !== -1) {
        currentLines[existingLineIndex].quantity += qty;
        currentLines[existingLineIndex].total_price = currentLines[existingLineIndex].quantity * currentLines[existingLineIndex].unit_price;
      } else {
        currentLines.push({
          id: `line-emp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          devis_facture_id: doc.id,
          prestation_name: target.name,
          quantity: qty,
          unit_price: newLinePrice,
          total_price: newLineTotal
        });
      }

      const newTotal = currentLines.reduce((sum, line) => sum + line.total_price, 0);
      const updatedDoc = {
        ...doc,
        total_amount: newTotal
      };

      // Save document and lines
      await apiService.saveDevisFacture(updatedDoc, currentLines);
      
      // Update appointment price as well
      await apiService.saveAppointment({
        ...appt,
        final_price: newTotal
      });

      onToast("Ligne ajoutée avec succès !", 'success');
      setQty(1);
      loadDocData();
      onRefresh();
    } catch (err) {
      onToast("Erreur lors de l'ajout.", 'info');
    }
  };

  // Remove line item
  const handleRemoveLine = async (lineId: string) => {
    try {
      const currentLines = docLines.filter(l => l.id !== lineId);
      const newTotal = currentLines.reduce((sum, line) => sum + line.total_price, 0);
      
      const updatedDoc = {
        ...doc,
        total_amount: newTotal
      };

      await apiService.saveDevisFacture(updatedDoc, currentLines);

      await apiService.saveAppointment({
        ...appt,
        final_price: newTotal
      });

      onToast("Ligne supprimée !", 'success');
      loadDocData();
      onRefresh();
    } catch (err) {
      onToast("Erreur lors de la suppression.", 'info');
    }
  };

  // Prestation start transition
  const handleStartPrestation = async () => {
    try {
      const updatedAppt = { ...appt, status: 'En cours' as AppointmentStatus };
      await apiService.saveAppointment(updatedAppt);
      setStatus('En cours');
      onToast("Chantier démarré ! Veuillez prendre les photos AVANT.", 'success');
      onRefresh();
    } catch (e) {
      onToast("Impossible de démarrer le chantier.", 'info');
    }
  };

  // Checkout and submit
  const handleFinalizePrestation = async () => {
    const photosAvant = photos.filter(p => p.before_after === 'before');
    const photosApres = photos.filter(p => p.before_after === 'after');

    if (photosAvant.length === 0) {
      onToast("Action requise : Veuillez d'abord ajouter au moins 1 photo AVANT.", 'info');
      return;
    }
    if (photosApres.length === 0) {
      onToast("Action requise : Veuillez d'abord ajouter au moins 1 photo APRÈS.", 'info');
      return;
    }

    try {
      // 1. Update planning status
      const finalAppt = { ...appt, status: 'Terminé' as AppointmentStatus };
      await apiService.saveAppointment(finalAppt);

      // 2. Convert quote to FACTURE if still a quote
      let finalDoc = doc;
      if (doc.type === 'devis') {
        finalDoc = await apiService.convertDevisToFacture(doc.id);
      }

      // 3. Update payment parameters based on ESPECES / VIREMENT
      const valPaiement = paymentMode === 'ESPECES' ? 1 : 0;
      const statusDocument = paymentMode === 'ESPECES' ? 'Payé' : 'Facturé';
      
      const updatedDoc = {
        ...finalDoc,
        status: statusDocument as any,
        moyen_paiement: paymentMode,
        paiement_valide: valPaiement === 1,
        date_paiement: valPaiement === 1 ? new Date().toISOString() : null
      };

      await apiService.saveDevisFacture(updatedDoc, docLines);

      // 4. Send Invoice dynamic Resend flow
      const client = await apiService.getClientById(doc.client_id);
      if (client && client.email) {
        let noteVirement = '';
        if (paymentMode === 'VIREMENT') {
          noteVirement = `📋 INSTRUCTIONS DE VIREMENT BANCAIRE :\nVeuillez virer le montant restant à payer de ${updatedDoc.total_amount.toFixed(2)} € sur notre compte.\nIBAN: FR76 1234 5678 9012 3456 7890 123\nIndiquez la référence: ${updatedDoc.number} dans l'intitulé.`;
        }

        await apiService.sendAutomatedEmail(
          'facture_sending',
          {
            PRENOM_CLIENT: client.first_name,
            NOM_CLIENT: client.last_name,
            NUMERO_DOCUMENT: updatedDoc.number,
            TOTAL_DOCUMENT: `${updatedDoc.total_amount.toFixed(2)} €`,
            NOTE_VIREMENT: noteVirement,
          },
          client.email
        );
      }

      onToast(`Intervention terminée avec succès (${paymentMode}) !`, 'success');
      onRefresh();
    } catch (err) {
      console.error(err);
      onToast("Erreur lors de la finalisation du chantier.", 'info');
    }
  };

  const hasBefore = photos.some(p => p.before_after === 'before');
  const hasAfter = photos.some(p => p.before_after === 'after');

  return (
    <div className="space-y-4 pt-4 border-t border-slate-800">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Workflow Terrain</span>
        <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-slate-950 text-sky-400 border border-slate-800">
          Chantier {appt.status}
        </span>
      </div>

      {status === 'Planifié' && (
        <button
          onClick={handleStartPrestation}
          className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Camera className="w-4 h-4" />
          <span>Démarrer la prestation</span>
        </button>
      )}

      {status !== 'Planifié' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* UPLOAD SIMULATION BOX */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850 space-y-3">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wide block">💾 Enregistrement Photos</span>
            
            <input 
              type="text" 
              placeholder="Simuler URL Photo (Laisser vide pour exemple)" 
              value={simulatedPhotoUrl}
              onChange={e => setSimulatedPhotoUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-[10px] p-2 rounded-lg outline-none text-white"
            />
            
            <input 
              type="text" 
              placeholder="Légende (ex: Usure canapé avant)" 
              value={photoCaption}
              onChange={e => setPhotoCaption(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-[10px] p-2 rounded-lg outline-none text-white"
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleUploadPhoto('before')}
                className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg border border-amber-500/20 flex items-center justify-center space-x-1"
              >
                <Camera className="w-3 h-3" />
                <span>Photo AVANT</span>
              </button>
              <button
                type="button"
                onClick={() => handleUploadPhoto('after')}
                className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 flex items-center justify-center space-x-1"
              >
                <Camera className="w-3 h-3" />
                <span>Photo APRÈS</span>
              </button>
            </div>
            
            {/* Show local uploads status badges */}
            <div className="flex justify-between items-center text-[9px] pt-1 text-slate-500">
              <span className={hasBefore ? 'text-amber-400 font-bold' : ''}>{hasBefore ? '✔ Photo Avant OK' : '⚠ Manque photo Avant'}</span>
              <span className={hasAfter ? 'text-emerald-400 font-bold' : ''}>{hasAfter ? '✔ Photo Après OK' : '⚠ Manque photo Après'}</span>
            </div>
          </div>

          {/* DYNAMIC PRESTATIONS LIST & LIVE RE-CALCULATION */}
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850 space-y-3">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wide block">🧼 Lignes de Prestation (Ajustement Direct)</span>

            {loadingLines ? (
              <p className="text-[10px] text-slate-500 italic text-center">Calcul des lignes...</p>
            ) : (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {docLines.map(line => (
                  <div key={line.id} className="flex justify-between items-center bg-slate-900/50 p-2 rounded-lg text-[10px] text-slate-300">
                    <div className="truncate pr-2 max-w-[150px]">
                      <span className="font-bold text-white block">{line.prestation_name}</span>
                      <span>{line.quantity} x {line.unit_price.toFixed(2)} €</span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-bold text-white">{line.total_price.toFixed(2)} €</span>
                      <button
                        onClick={() => handleRemoveLine(line.id)}
                        className="text-red-400 hover:text-red-500 p-1 cursor-pointer flex items-center justify-center"
                        title="Supprimer la prestation"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total display */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-850 text-xs font-bold text-white">
              <span>Total révisé :</span>
              <span className="text-sky-400 font-mono">{doc.total_amount.toFixed(2)} €</span>
            </div>

            {/* Quick catalog insertion form */}
            <div className="pt-2 grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">
                <select
                  value={selectedPrestationId}
                  onChange={e => setSelectedPrestationId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-[10px] p-2 rounded-lg outline-none text-white"
                >
                  {prestations.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.prix_unitaire || p.base_price} €)</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <input 
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-800 text-[10px] p-2 rounded-lg text-center text-white"
                />
              </div>
              <div className="col-span-3">
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-[10px] font-black flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>[+]</span>
                </button>
              </div>
            </div>
          </div>

          {/* CHECKOUT FINALIZE PANEL */}
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850 space-y-3">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wide block">💳 Mode de paiement &amp; Clôture</span>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('ESPECES')}
                className={`flex-1 py-2 px-1 text-[10px] font-black rounded-lg border cursor-pointer transition-all ${
                  paymentMode === 'ESPECES'
                    ? 'bg-sky-500 border-sky-400 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                💵 ESPÈCES
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('VIREMENT')}
                className={`flex-1 py-2 px-1 text-[10px] font-black rounded-lg border cursor-pointer transition-all ${
                  paymentMode === 'VIREMENT'
                    ? 'bg-sky-500 border-sky-400 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                🏦 VIREMENT
              </button>
            </div>

            <button
              type="button"
              onClick={handleFinalizePrestation}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-colors flex items-center justify-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Valider &amp; Clôturer le chantier</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
