import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiClient';
import { Prestation, DocumentStatus } from '../types';
import { TESTIMONIALS } from '../data/mockData';
import { 
  Sparkles, 
  Layers, 
  MapPin, 
  Phone, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  Calculator, 
  User, 
  Calendar,
  Lock,
  Star
} from 'lucide-react';

interface PublicViewProps {
  onSwitchToAdmin: () => void;
  onToast: (msg: string, type: 'success' | 'info') => void;
  entrepriseConfig?: any;
}

export default function PublicView({ onSwitchToAdmin, onToast, entrepriseConfig: propConfig }: PublicViewProps) {
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [loadingPrestations, setLoadingPrestations] = useState(true);
  const [entrepriseConfig, setEntrepriseConfig] = useState<any>(propConfig || null);

  // Quote Request Form
  const [clientType, setClientType] = useState<'particulier' | 'professionnel'>('particulier');
  const [companyName, setCompanyName] = useState('');
  const [siret, setSiret] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [selectedPrestationId, setSelectedPrestationId] = useState('');
  const [areaQty, setAreaQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Before/After interactive slider state
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0-100

  // Dynamic Pricing Calculator State
  const [calcItems, setCalcItems] = useState<{id: string; qty: number}[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (propConfig) {
      setEntrepriseConfig(propConfig);
    }
  }, [propConfig]);

  useEffect(() => {
    async function loadData() {
      try {
        const prests = await apiService.getPrestations();
        setPrestations(prests);
        if (prests.length > 0) {
          setSelectedPrestationId(prests[0].id);
        }

        // Fetch real reviews from D1 (fallback to mock only if empty)
        const dbClients = await apiService.getClients();
        const dbReviews = await apiService.getClientReviews(true);
        if (dbReviews && dbReviews.length > 0) {
          const mappedReviews = dbReviews.map((r: any) => {
            const clientObj = dbClients.find((c: any) => c.id === r.client_id);
            const clientName = r.afficher_nom && clientObj 
              ? `${clientObj.first_name} ${clientObj.last_name[0]}.` 
              : "Client Anonyme";
            return {
              id: r.id,
              name: clientName,
              category: "Prestation",
              text: r.commentaire,
              rating: r.note,
              date: r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : "Récemment"
            };
          });
          setReviews(mappedReviews);
        } else {
          setReviews(TESTIMONIALS);
        }
      } catch (err) {
        console.error("Error loading prestations or reviews", err);
        setReviews(TESTIMONIALS);
      } finally {
        setLoadingPrestations(false);
      }
    }
    async function loadCompany() {
      if (propConfig) return;
      try {
        const conf = await apiService.getEntrepriseConfig();
        setEntrepriseConfig(conf);
      } catch (err) {
        console.error("Error loading company config", err);
      }
    }
    loadData();
    loadCompany();
  }, []);

  const [startTime, setStartTime] = useState('09:00');

  // Helper check to identify if a booked timeslot is a night hour (using dynamic settings set by artisan)
  const isNightShiftCrossed = (startHm: string): boolean => {
    if (!startHm) return false;
    if (entrepriseConfig && entrepriseConfig.activer_majoration === false) return false;

    const startLimit = entrepriseConfig?.plage_majoration_debut || '19:00';
    const endLimit = entrepriseConfig?.plage_majoration_fin || '06:00';

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

  const getNightMultiplier = () => {
    if (!startTime || !isNightShiftCrossed(startTime)) return 1.0;
    const pct = entrepriseConfig?.majorat_tarif_nuit_pct !== undefined ? entrepriseConfig.majorat_tarif_nuit_pct : 25;
    return 1 + pct / 100;
  };

  const handleSliderMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offset = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (offset / rect.width) * 100));
    setSliderPosition(percentage);
  };

  // Calculator Functions
  const updateCalcQty = (prestationId: string, quantity: number) => {
    const existing = calcItems.find(item => item.id === prestationId);
    if (existing) {
      if (quantity <= 0) {
        setCalcItems(calcItems.filter(item => item.id !== prestationId));
      } else {
        setCalcItems(calcItems.map(item => item.id === prestationId ? { ...item, qty: quantity } : item));
      }
    } else if (quantity > 0) {
      setCalcItems([...calcItems, { id: prestationId, qty: quantity }]);
    }
  };

  const calculateTotal = () => {
    const baseTotal = calcItems.reduce((total, item) => {
      const p = prestations.find(prest => prest.id === item.id);
      const factor = clientType === 'professionnel' ? 1.25 : 1.0;
      return total + (p ? p.base_price * factor * item.qty : 0);
    }, 0);
    return baseTotal * getNightMultiplier();
  };

  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !phone) {
      onToast("Veuillez remplir tous les champs requis.", "info");
      return;
    }

    if (clientType === 'professionnel' && (!companyName || !siret || !vatNumber)) {
      onToast("Veuillez remplir les informations légales de l'entreprise.", "info");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Enregistrer ou vérifier le client
      const fullClient = await apiService.createOrUpdateClient({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        type_client: clientType,
        raison_sociale: clientType === 'professionnel' ? companyName : undefined,
        siret: clientType === 'professionnel' ? siret : undefined,
        tva_intracommunautaire: clientType === 'professionnel' ? vatNumber : undefined,
        notes: `Demande de devis soumise depuis le site web.\nMessage client: ${message || 'Aucun message.'}`
      });

      // 2. Générer des lignes de devis
      const factor = clientType === 'professionnel' ? 1.25 : 1.0;
      const lines = [];
      let baseSum = 0;
      
      // We use a clean placeholder item for the estimate request that will be edited by the artisan
      const placeholderPrice = 0.0;
      lines.push({
        prestation_name: "Chaise Classique 1 Place (Prestation à définir)",
        quantity: 1,
        unit_price: placeholderPrice * factor,
        total_price: placeholderPrice * factor
      });

      // 2b. Add Night Surcharge Line if startTime falls under night shift rules (surcharge of 0.0 since base is 0.0)
      const isNight = isNightShiftCrossed(startTime);
      const pct = entrepriseConfig?.majorat_tarif_nuit_pct !== undefined ? entrepriseConfig.majorat_tarif_nuit_pct : 25;
      if (isNight) {
        lines.push({
          prestation_name: `Majoration Horaires de Nuit (${pct}%)`,
          quantity: 1,
          unit_price: 0,
          total_price: 0
        });
      }

      // 3. Soumettre le devis comme un brouillon à l'artisan
      const todayString = new Date().toISOString().split('T')[0];
      const expiryString = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await apiService.saveDevisFacture(
        {
          client_id: fullClient.id,
          type: 'devis',
          status: 'Brouillon' as DocumentStatus,
          date: todayString,
          due_date: expiryString,
          notes: `Généré automatiquement suite au formulaire publique.\nMessage client: ${message}\nHeure de début souhaitée: ${startTime || 'Non spécifiée'}\nType: ${clientType === 'professionnel' ? `Pro (${companyName})` : 'Particulier'}`
        },
        lines
      );

      setIsSubmitted(true);
      onToast("Votre demande de devis a été reçue !", "success");
    } catch (err) {
      console.error(err);
      onToast("Erreur lors de l'envoi de votre devis.", "info");
    } finally {
      setSubmitting(false);
    }
  };

  const transferCalcToForm = () => {
    if (calcItems.length > 0) {
      const first = calcItems[0];
      setSelectedPrestationId(first.id);
      setAreaQty(first.qty);
      const targetElement = document.getElementById('devis-form-anchor');
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
      onToast("Options de nettoyage transférées au formulaire !", "success");
    } else {
      onToast("Veuillez d'abord ajouter des éléments dans le calculateur ci-dessus.", "info");
    }
  };

  return (
    <div className="bg-[#fcfdfe] text-gray-800 min-h-screen font-sans flex flex-col selection:bg-sky-200">
      
      {/* HEADER / NAVIGATION BAR */}
      <nav id="public-nav" className="sticky top-0 z-40 backdrop-blur-md bg-white/90 border-b border-sky-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {entrepriseConfig?.logo_url ? (
              <img 
                src={entrepriseConfig.logo_url} 
                alt={entrepriseConfig.nom_entreprise || 'Logo'} 
                className="w-auto h-12 md:h-20 object-contain rounded-xl shadow-md border border-slate-100 bg-white p-0.5 logo-dynamique-net" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="bg-gradient-to-tr from-sky-400 to-blue-600 p-2.5 rounded-xl shadow-md shadow-sky-100">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            )}
            <div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                {entrepriseConfig?.nom_entreprise || 'Shampooine Le'}
              </span>
              <p className="text-[10px] uppercase tracking-widest text-sky-600 font-semibold -mt-1">Sofa & Tapis Premium</p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
            <a href="#services" className="hover:text-sky-500 transition-colors">Nos Services</a>
            <a href="#avant-apres" className="hover:text-sky-500 transition-colors">Démonstration</a>
            <a href="#testimonials" className="hover:text-sky-500 transition-colors">Avis clients</a>
            <a href="#devis-form-anchor" className="bg-sky-50 text-sky-600 px-4 py-2 rounded-lg hover:bg-sky-100 transition-colors duration-200">Obtenir un devis</a>
          </div>

          <div>
            <button 
              id="btn-switch-admin"
              onClick={onSwitchToAdmin}
              className="flex items-center space-x-2 border border-gray-200 hover:border-sky-300 text-gray-700 hover:text-sky-600 px-4 py-2 rounded-xl text-xs font-semibold bg-white cursor-pointer shadow-sm hover:shadow transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Espace Artisan</span>
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section id="hero" className="relative py-20 px-6 overflow-hidden bg-gradient-to-b from-sky-50/50 via-white to-transparent">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12 relative z-10">
          <div className="flex-1 text-left space-y-6">
            <div className="inline-flex items-center space-x-2 bg-sky-50 px-3 py-1.5 rounded-full text-indigo-950 text-xs font-bold ring-1 ring-sky-100" id="hero-tag">
              <span className="w-2 h-2 bg-sky-500 rounded-full animate-ping"></span>
              <span className="text-sky-700">Artisan local d'excellence</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Redonnez l'éclat du neuf à vos <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600">Canapés</span> &amp; <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-sky-500">Moquettes</span>.
            </h1>
            
            <p className="text-gray-600 leading-relaxed text-base max-w-lg">
              {entrepriseConfig?.nom_entreprise || 'Shampooine Le'} est le spécialiste de l'injection-extraction haut de gamme. Nous éliminons 99% des taches, acariens, allergènes et odeurs de vos intérieurs.
            </p>

            <ul className="space-y-3 pt-2">
              <li className="flex items-center space-x-2.5 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <span>Restauration en profondeur de toutes les fibres délicates (Laine, Velours, Lin, Nubuck)</span>
              </li>
              <li className="flex items-center space-x-2.5 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <span>Séchage optimisé rapide sous 4h à 8h</span>
              </li>
              <li className="flex items-center space-x-2.5 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <span>Éco-produits non-toxiques certifiés pour bébés et animaux</span>
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a 
                href="#devis-form-anchor" 
                className="bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-sky-500/20 text-center flex items-center justify-center space-x-2 transition-all duration-200 group"
              >
                <span>Calculer et Demander mon devis libre</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="#avant-apres" 
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold text-sm px-6 py-3.5 rounded-xl text-center transition-all"
              >
                Voir notre efficacité
              </a>
            </div>
          </div>

          <div className="flex-1 w-full flex justify-center">
            {/* Ambient visual badge */}
            <div className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-tr from-sky-100 to-blue-50 p-4 border border-sky-100">
              <div className="bg-white rounded-2xl p-6 shadow-xl relative z-10 flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-sky-500 bg-sky-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Élimination Active</span>
                  <p className="text-[11px] text-gray-400">Restoration v1.2</p>
                </div>
                
                {/* Visual element representing a microfiber grid */}
                <div className="relative h-28 bg-gradient-to-b from-[#f0f9ff] to-[#e0f2fe] rounded-xl flex items-center justify-center overflow-hidden border border-sky-50">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#0c4a6e_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <div className="flex flex-col items-center">
                    <Sparkles className="w-10 h-10 text-sky-400 animate-pulse mb-1" />
                    <p className="text-[11px] uppercase tracking-widest font-bold text-sky-600">Injecteur-Extracteur HP</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 font-medium">Bactéries et odeurs neutres</span>
                    <span className="text-sky-600 font-bold">99.9%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="w-[99.9%] h-full bg-sky-500 rounded-full"></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase text-gray-400">Canapés nettoyés</p>
                    <p className="text-lg font-extrabold text-[#0369a1]">+350</p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase text-gray-400">Note moyenne</p>
                    <p className="text-lg font-extrabold text-amber-500 flex items-center justify-center gap-0.5">4.9 <Star className="w-3.5 h-3.5 fill-current" /></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE BENEFITS / SERVICES */}
      <section id="services" className="py-16 px-6 bg-white border-t border-b border-gray-100">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Nos Prestations et Tarifs Clairs</h2>
            <p className="text-gray-500 text-sm">
              Découvrez la rigueur de notre protocole en 5 étapes : Aspiration cyclonique, Détachage ciblé, Brossage mécanique, Injection-Extraction thermique et Parfumage antibactérien.
            </p>
          </div>

          {loadingPrestations ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-44 bg-gray-50 rounded-2xl border border-gray-100 p-6 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-1/3 h-4 bg-gray-200 rounded"></div>
                    <div className="w-3/4 h-6 bg-gray-300 rounded"></div>
                  </div>
                  <div className="w-1/2 h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {prestations.map(p => (
                <div 
                  key={p.id} 
                  className="bg-sky-50/20 hover:bg-sky-50/50 hover:shadow-lg transition-all duration-300 rounded-3xl p-6 border border-sky-100/60 flex flex-col justify-between relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-3 bg-sky-100/35 rounded-bl-3xl">
                    <Layers className="w-4 h-4 text-sky-500" />
                  </div>

                  <div className="space-y-4">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#0c4a6e] bg-[#e0f2fe] px-2.5 py-1 rounded-full w-max block">
                      {p.category === 'canape' ? 'Canapés / Sofas' : p.category === 'moquette' ? 'Sols & Tapis' : p.category === 'fauteuil' ? 'Assises' : 'Options'}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight tracking-tight">{p.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">Dépoussiérage, désinfection, et imperméabilisation incluses.</p>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-sky-100/50 flex justify-between items-baseline">
                    <div>
                      <span className="text-xs text-gray-400">À partir de</span>
                      <p className="text-2xl font-black text-gray-900">{p.base_price.toFixed(2)} €</p>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">la {p.unit_label}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* INTERACTIVE DEMONSTRATION SLIDER (AVANT/APRES) */}
      <section id="avant-apres" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          
          <div className="flex-1 space-y-6 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-500">Un résultat éblouissant</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">Glissez pour comparer notre nettoyage</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Faites glisser le curseur interactif de gauche à droite pour constater l'efficacité de notre procédé d'extraction sous pression.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3.5">
                <div className="w-5 h-5 bg-sky-100 text-sky-600 flex items-center justify-center rounded-full text-xs font-bold mt-0.5">1</div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Avant : Fibres jaunies et taches de sébum</h4>
                  <p className="text-xs text-gray-500">Accumulation de peaux mortes, poussières et odeurs d'animaux incrustées.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3.5">
                <div className="w-5 h-5 bg-sky-100 text-sky-600 flex items-center justify-center rounded-full text-xs font-bold mt-0.5">2</div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Après : Tissu désinfecté et teintes ravivées</h4>
                  <p className="text-xs text-gray-500">Restauration en profondeur sans décoloration. Redressage du poil.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full max-w-lg flex flex-col items-center">
            {/* Real Interactive Before-After Slider using actual images */}
            <div 
              className="relative w-full h-96 rounded-3xl overflow-hidden shadow-2xl border border-gray-200 select-none cursor-ew-resize"
              onMouseMove={handleSliderMove}
              onTouchMove={handleSliderMove}
            >
              
              {/* BACK - Clean State (After) */}
              <div className="absolute inset-0 w-full h-full">
                <img 
                  src="/media__1780928603266.png" 
                  alt="Après nettoyage" 
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
                <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
                  <span className="bg-sky-500/90 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                    APRÈS {entrepriseConfig?.nom_entreprise?.toUpperCase() || 'SHAMPOOINE LE'}
                  </span>
                  <div className="flex space-x-0.5 bg-black/35 p-1 rounded-lg backdrop-blur-sm">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 text-amber-400 fill-current" />)}
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 z-10 text-center">
                  <span className="text-[10px] text-white font-extrabold bg-sky-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full inline-block">
                    DÉSINFICTÉ &amp; RAVIVÉ 100% — Velours préservé
                  </span>
                </div>
              </div>

              {/* OVERLAY FRONT - Dirty State (Before) */}
              <div 
                className="absolute inset-0 w-full h-full overflow-hidden transition-all duration-75"
                style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
              >
                {/* We use exactly the parent dimensions to align images perfectly */}
                <div className="absolute inset-0 w-full h-full">
                  <img 
                    src="/media__1780928603260.png" 
                    alt="Avant nettoyage" 
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />
                  <div className="absolute top-4 left-4 z-10">
                    <span className="bg-amber-800/95 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                      AVANT {entrepriseConfig?.nom_entreprise?.toUpperCase() || 'SHAMPOOINE LE'}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 z-10 text-center">
                    <span className="text-[10px] text-white font-extrabold bg-amber-900/80 backdrop-blur-sm px-3 py-1.5 rounded-full inline-block">
                      TACHES INCRUSTÉES, AURÉOLES &amp; SÉBUM
                    </span>
                  </div>
                </div>
              </div>

              {/* SLIDER BAR HANDLE */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center z-20"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="w-8 h-8 bg-sky-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg -ml-3.5 select-none">
                  <span className="text-white text-[10px] font-bold">⇌</span>
                </div>
              </div>

            </div>
            
            <span className="text-xs text-gray-400 mt-4 font-medium">Glissez latéralement</span>
          </div>

        </div>
      </section>



      {/* FREE QUOTE REQUEST FORM */}
      <section id="devis-form-anchor" className="py-20 px-6 bg-gradient-to-b from-white to-sky-50/50">
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-sky-100 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-tr from-sky-400 to-blue-600 p-8 text-white relative">
            <div className="absolute top-4 right-4 bg-white/10 p-2 rounded-full">
              <Sparkles className="w-5 h-5 text-white/80" />
            </div>
            <h3 className="text-xl font-bold">Demander un Devis Gratuit</h3>
            <p className="text-sky-100 text-xs mt-1">
              Réponse de notre artisan sous 24h ouvrées. Déplacement inclus.
            </p>
          </div>

          {isSubmitted ? (
            <div className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-gray-900">Demande enregistrée avec succès !</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Merci <strong>{firstName} {lastName}</strong>. Notre artisan vient de recevoir votre demande pré-configurée de devis.
                </p>
                <p className="text-xs text-sky-600 font-semibold mt-2">
                  Un email et message recapitulatif vous a été préparé au {email}.
                </p>
              </div>
              
              <button 
                onClick={() => {
                  setIsSubmitted(false);
                  setClientType('particulier');
                  setCompanyName('');
                  setSiret('');
                  setVatNumber('');
                  setFirstName('');
                  setLastName('');
                  setEmail('');
                  setPhone('');
                  setMessage('');
                }}
                className="bg-sky-50 hover:bg-sky-100 text-sky-600 font-bold px-6 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Faire une nouvelle demande
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequestQuote} className="p-8 space-y-5">
              
              {/* Client Type Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Type de Client *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setClientType('particulier')}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      clientType === 'particulier'
                        ? 'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/10'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    👤 Particulier
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientType('professionnel')}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      clientType === 'professionnel'
                        ? 'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/10'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    🏢 Professionnel
                  </button>
                </div>
              </div>

              {/* Conditional B2B Legal Information */}
              {clientType === 'professionnel' && (
                <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100/80 space-y-3.5 transition-all">
                  <h5 className="text-[10px] font-black text-sky-800 uppercase tracking-wider">Informations Légales Entreprise</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Raison sociale *</label>
                      <input 
                        type="text"
                        required={clientType === 'professionnel'}
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="Raison Sociale SAS"
                        className="w-full px-3 py-2 bg-white rounded-lg border border-sky-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">SIRET *</label>
                      <input 
                        type="text"
                        required={clientType === 'professionnel'}
                        value={siret}
                        onChange={e => setSiret(e.target.value)}
                        placeholder="12345678901234"
                        className="w-full px-3 py-2 bg-white rounded-lg border border-sky-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Numéro TVA Intracom. *</label>
                      <input 
                        type="text"
                        required={clientType === 'professionnel'}
                        value={vatNumber}
                        onChange={e => setVatNumber(e.target.value)}
                        placeholder="FR12345678901"
                        className="w-full px-3 py-2 bg-white rounded-lg border border-sky-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3 text-sky-500" />
                    <span>Prénom de contact *</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Marc"
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3 text-sky-500" />
                    <span>Nom de contact *</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Lambert"
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Mail className="w-3 h-3 text-sky-500" />
                    <span>Email *</span>
                  </label>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="marc.lambert@gmail.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Phone className="w-3 h-3 text-sky-500" />
                    <span>Téléphone *</span>
                  </label>
                  <input 
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Plage horaire souhaitée *</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStartTime('09:00')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      !isNightShiftCrossed(startTime)
                        ? 'bg-sky-50 border-sky-400 text-sky-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ☀️ Journée
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartTime('23:00')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isNightShiftCrossed(startTime)
                        ? 'bg-sky-50 border-sky-400 text-sky-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🌙 Nuit
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 italic mt-1.5 leading-normal">
                  {!isNightShiftCrossed(startTime)
                    ? "(Horaires applicables : 06:00 - 22:00)"
                    : `(⚠️ Soumis à majoration de nuit de ${entrepriseConfig?.majorat_tarif_nuit_pct !== undefined ? entrepriseConfig.majorat_tarif_nuit_pct : 25}% : 22:00 - 06:00)`}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Décrivez l'état de l'objet (taches de vin, café, etc.) / Spécifications
                </label>
                <textarea 
                  rows={3}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Canapé de 3 ans avec tache de thé sur le dossier droit, nécessite un traitement spécial..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all"
                />
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-gray-200 text-white py-4 rounded-xl text-xs font-bold shadow-lg shadow-sky-500/10 cursor-pointer block text-center transition-all duration-200"
              >
                {submitting ? 'Transmission en cours...' : 'Envoyer ma demande de nettoyage'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* REVIEWS SECTION */}
      <section id="testimonials" className="py-20 px-6 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-500">Avis Clients</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Ce que pensent nos clients</h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Retours d'expérience authentiques collectés suite aux prestations terminées.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map(t => (
              <div key={t.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-sm">{t.name}</span>
                    <span className="text-[10px] text-sky-600 font-bold bg-sky-50/50 px-2 py-0.5 rounded-full">{t.category}</span>
                  </div>
                  <p className="text-xs text-gray-600 italic leading-relaxed">
                    "{t.text}"
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-medium">{t.date}</span>
                  <div className="flex space-x-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-amber-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto bg-gray-900 text-gray-400 py-12 px-6 border-t border-gray-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <p className="text-lg font-bold text-white tracking-tight">Shampooine <span className="text-sky-400">Le</span></p>
            <p className="text-xs">
              Savoir-faire artisanal et technologie d'injection-extraction moderne pour canapés, lits et sols textiles.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">Contact Direct</h4>
            <div className="space-y-2 text-xs">
              <p className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-sky-400" />
                <span>06 12 45 78 90</span>
              </p>
              <p className="flex items-center space-x-2">
                <Mail className="w-3.5 h-3.5 text-sky-400" />
                <span>artisan@shampooine.fr</span>
              </p>
              <p className="flex items-center space-x-2">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>Paris et Ile-de-France (rayon 40km)</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">Garanties</h4>
            <ul className="text-xs space-y-1.5 list-disc list-inside">
              <li>Assurance responsabilité civile pro</li>
              <li>Satisfaction garantie à 100%</li>
              <li>Séchage rapide breveté</li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-10 pt-6 border-t border-gray-800 text-center text-[11px] text-gray-500">
          <p>© {new Date().getFullYear()} {entrepriseConfig?.nom_entreprise || 'Shampooine Le'} - France. Tous droits réservés. Propulsé par Cloudflare Pages &amp; D1.</p>
        </div>
      </footer>

    </div>
  );
}
