import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiClient';
import { Client, RendezVousPlanning } from '../types';
import { Sparkles, Star, Check, ShieldCheck, HelpCircle } from 'lucide-react';

interface ReviewViewProps {
  onBackToHome: () => void;
  onToast: (msg: string, type: 'success' | 'info') => void;
  entrepriseConfig?: any;
}

export default function ReviewView({ onBackToHome, onToast, entrepriseConfig: propConfig }: ReviewViewProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [appointment, setAppointment] = useState<RendezVousPlanning | null>(null);
  const [corpConfig, setCorpConfig] = useState<any>(propConfig || null);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [showNamePublicly, setShowNamePublicly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (propConfig) {
      setCorpConfig(propConfig);
    }
  }, [propConfig]);

  useEffect(() => {
    const loadDetails = async () => {
      const params = new URLSearchParams(window.location.search);
      const clientId = params.get('client_id');
      const rdvId = params.get('rdv_id');

      if (!clientId) {
        setLoading(false);
        return;
      }

      try {
        if (!propConfig) {
          const configRes = await apiService.getEntrepriseConfig();
          setCorpConfig(configRes);
        }

        const allClients = await apiService.getClients();
        const foundClient = allClients.find(c => c.id === clientId);
        if (foundClient) {
          setClient(foundClient);
        }

        if (rdvId) {
          const allRdv = await apiService.getAppointments();
          const foundRdv = allRdv.find(r => r.id === rdvId);
          if (foundRdv) {
            setAppointment(foundRdv);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) {
      onToast("Client introuvable. Impossible d'enregistrer l'avis.", "info");
      return;
    }

    try {
      await apiService.submitClientReview({
        client_id: client.id,
        appointment_id: appointment?.id || 'manual-feedback',
        note: rating,
        commentaire: comment,
        afficher_nom: showNamePublicly
      });

      setSubmitted(true);
      onToast("Merci infiniment ! Votre avis a été enregistré avec succès.", "success");
    } catch (err) {
      console.error(err);
      onToast("Une erreur est survenue lors de l'envoi de votre avis.", "info");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold tracking-wide text-slate-500">Chargement de votre espace personnalisé...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 to-blue-50/30 py-16 px-6 flex flex-col justify-center items-center relative select-none">
      
      {/* Background ambient accents */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[10%] w-96 h-96 bg-sky-200/50 rounded-full filter blur-[120px]" />
        <div className="absolute bottom-[10%] left-[5%] w-96 h-96 bg-indigo-100/50 rounded-full filter blur-[120px]" />
      </div>

      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100/80 shadow-2xl p-8 relative z-10 space-y-8">
        
        {/* Brand Header */}
        <div className="text-center space-y-3 flex flex-col items-center">
          {corpConfig?.logo_url ? (
            <img 
              src={corpConfig.logo_url} 
              alt="Logo" 
              className="h-16 w-16 object-contain rounded-2xl shadow-lg border border-slate-100 flex-shrink-0 mb-1" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="inline-flex space-x-1 items-center bg-sky-50 text-sky-600 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest leading-none">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Boucle de satisfaction</span>
            </div>
          )}
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {corpConfig?.nom_entreprise || 'Shampooine Le'}
          </h1>
          <p className="text-slate-500 text-xs leading-normal max-w-sm mx-auto">
            Votre artisan d'excellence pour le nettoyage haute performance de canapés, tapis et textiles de luxe.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-8 space-y-6">
            <div className="h-16 w-16 bg-sky-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-sky-500/20">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900">Un grand merci pour votre retour !</h2>
              <p className="text-slate-500 text-xs px-2 leading-relaxed">
                Votre avis a été transmis à notre équipe d'artisans. Il contribuera à valoriser notre savoir-faire et à maintenir notre charte de qualité d'intervention.
              </p>
            </div>
            
            <button 
              onClick={onBackToHome}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3.5 rounded-xl uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center space-x-2"
            >
              <span>Découvrir notre site</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">ESPACE CLIENT PRÉ-REMPLI</span>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9.5px] uppercase font-bold text-slate-500">Prénom</label>
                  <input 
                    type="text" 
                    value={client ? client.first_name : "Client"} 
                    disabled 
                    className="w-full bg-slate-100 border border-slate-200 text-slate-600 text-xs p-3 rounded-xl cursor-not-allowed outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9.5px] uppercase font-bold text-slate-500">Nom de famille</label>
                  <input 
                    type="text" 
                    value={client ? client.last_name.toUpperCase() : (corpConfig?.nom_entreprise || "Shampooine Le")} 
                    disabled 
                    className="w-full bg-slate-100 border border-slate-200 text-slate-600 text-xs p-3 rounded-xl cursor-not-allowed outline-none font-semibold"
                  />
                </div>
              </div>

              {appointment && (
                <div className="pt-2 border-t border-slate-200/50">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Prestation évaluée</span>
                  <p className="text-[11px] font-semibold text-slate-700 mt-0.5">{appointment.title} — Réalisée le {appointment.date}</p>
                </div>
              )}
            </div>

            {/* Stars Selector */}
            <div className="text-center space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Quelle note attribuez-vous à notre intervention ?</span>
              
              <div className="flex justify-center items-center space-x-1.5">
                {[1, 2, 3, 4, 5].map(star => {
                  const isGold = hoverRating ? star <= hoverRating : star <= rating;
                  return (
                    <button 
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform duration-100 hover:scale-110 cursor-pointer p-1"
                    >
                      <Star 
                        className={`w-9 h-9 ${
                          isGold 
                            ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm' 
                            : 'text-slate-200 fill-none'
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-3.5 py-1 rounded-full inline-block mt-1">
                {rating === 5 ? "⭐️⭐️⭐️⭐️⭐️ Excellent" : 
                 rating === 4 ? "⭐️⭐️⭐️⭐️ Très bien" :
                 rating === 3 ? "⭐️⭐️⭐️ Moyen" :
                 rating === 2 ? "⭐️⭐️ Décevant" : "⭐️ Très décevant"}
              </span>
            </div>

            {/* Comment Area */}
            <div className="space-y-1.5 block">
              <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Votre message / votre avis de client *</label>
              <textarea 
                placeholder="Racontez-nous brièvement comment s'est déroulée votre expérience... (Désincrustation des taches, ponctualité de l'artisan, efficacité...)"
                rows={4}
                required
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs p-4 rounded-2xl focus:ring-1 focus:ring-sky-500 outline-none transition-all resize-none placeholder-slate-400"
              />
            </div>

            {/* Verification & Consent Toggle */}
            <div className="bg-sky-50/50 rounded-2xl border border-sky-100/50 p-4 space-y-3">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showNamePublicly} 
                  onChange={e => setShowNamePublicly(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer" 
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block">Afficher mon nom et mon prénom publiquement</span>
                  <span className="text-[10px] text-slate-500 leading-normal block mt-0.5">
                    Si vous décochez cette option, votre avis s'affichera sous une forme confidentielle (ex: Sophie D. ou Client Anonyme).
                  </span>
                </div>
              </label>

              <div className="flex items-center space-x-2 text-[9.5px] text-sky-700/80 font-semibold pt-1">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Intervention certifiée authentique et protégée par notre charte de confiance de l'artisanat.</span>
              </div>
            </div>

            {/* Action Submit */}
            <button 
              type="submit" 
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs py-4 rounded-2xl uppercase tracking-wider transition-all shadow-xl shadow-sky-500/20 cursor-pointer text-center block"
            >
              Envoyer mon avis d'intervention
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 text-center text-[10px] text-slate-400/80 font-medium">
        <span>© 2026 {corpConfig?.nom_entreprise || 'Shampooine Le'} — Tous droits réservés.</span>
      </div>
    </div>
  );
}
