import React, { useState, useEffect } from 'react';
import PublicView from './components/PublicView';
import AdminView from './components/AdminView';
import ReviewView from './components/ReviewView';
import EmployeeView from './components/EmployeeView';
import ClientDevisView from './components/ClientDevisView';
import { Employe } from './types';
import { apiService } from './services/apiClient';
import { Sparkles, Lock, ArrowLeft, RefreshCw, X, ShieldCheck } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'public' | 'login' | 'admin' | 'review' | 'employee' | 'client_devis'>('public');
  const [entrepriseConfig, setEntrepriseConfig] = useState<any>(null);
  
  // Load Enterprise Configuration on mount
  useEffect(() => {
    async function loadCompany() {
      try {
        const conf = await apiService.getEntrepriseConfig();
        setEntrepriseConfig(conf);
      } catch (err) {
        console.error("Error loading initial company config", err);
      }
    }
    loadCompany();
  }, []);

  // Login fields
  const [email, setEmail] = useState('shampooinele.direction');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState('');
  const [loggedEmployee, setLoggedEmployee] = useState<Employe | null>(null);

  // Toast Notification states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Check custom route parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('client_id') || window.location.search.includes('review') || window.location.pathname.includes('laisser-un-avis')) {
      setView('review');
    } else if (params.get('devis_id') || params.get('id')) {
      setView('client_devis');
    }
  }, []);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'info') => {
    setToast({ message, type });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIdent = email.trim();
    const cleanPass = password.trim();

    // 1. UNIQUE ADMIN ACCOUNT
    const savedAdmin = localStorage.getItem('shampooine_admin_credentials');
    let targetAdminEmail = 'shampooinele.direction';
    let targetAdminPass = 'admin123';
    if (savedAdmin) {
      try {
        const parsed = JSON.parse(savedAdmin);
        targetAdminEmail = parsed.email || targetAdminEmail;
        targetAdminPass = parsed.password || targetAdminPass;
      } catch (e) {}
    }

    if (
      (cleanIdent.toLowerCase() === targetAdminEmail.toLowerCase() || 
       cleanIdent.toLowerCase() === 'shampooinele.direction' || 
       cleanIdent.toLowerCase() === 'artisan@shampooine.fr') && 
      cleanPass === targetAdminPass
    ) {
      setView('admin');
      setLoggedEmployee(null);
      setErrorMsg('');
      showToast("Bienvenue sur votre Dashboard Direction !", "success");
      return;
    }

    // 2. CHECK EMPLOYEES ACCOUNTS WITH ACTIVE OPTION
    try {
      const dbEmployees = await apiService.getEmployees();
      
      const activeEmployees = dbEmployees.filter(emp => emp.compte_actif === true || (emp as any).compte_actif === 1 || (emp as any).compte_actif === '1');
      
      const found = activeEmployees.find(emp => {
        // Generate automatic username
        const firstLetter = emp.first_name?.[0] ? emp.first_name[0].toLowerCase() : '';
        const lastNamePart = emp.last_name ? emp.last_name.toLowerCase().replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
        const generatedUsername = `${firstLetter}.${lastNamePart}`;
        const storedUsername = emp.username ? emp.username.toLowerCase() : '';

        // Generate automatic default password
        const defaultPassword = `${lastNamePart}2025`;
        const storedPassword = emp.password_hash || '';

        const usernameMatches = 
          (cleanIdent.toLowerCase() === generatedUsername) || 
          (cleanIdent.toLowerCase() === storedUsername) || 
          (cleanIdent.toLowerCase() === emp.email.toLowerCase());
          
        const passwordMatches = 
          (cleanPass === defaultPassword) || 
          (cleanPass === storedPassword);

        return usernameMatches && passwordMatches;
      });

      if (found) {
        setLoggedEmployee(found);
        setView('employee');
        setErrorMsg('');
        showToast(`Bonjour ${found.first_name}, bienvenue sur votre Espace Technicien !`, "success");
      } else {
        // Look up if disabled account matched to give specific notice
        const inactiveFound = dbEmployees.find(emp => {
          const firstLetter = emp.first_name?.[0] ? emp.first_name[0].toLowerCase() : '';
          const lastNamePart = emp.last_name ? emp.last_name.toLowerCase().replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
          const generatedUsername = `${firstLetter}.${lastNamePart}`;
          const storedUsername = emp.username ? emp.username.toLowerCase() : '';
          const defaultPassword = `${lastNamePart}2025`;
          const storedPassword = emp.password_hash || '';

          const usernameMatches = 
            (cleanIdent.toLowerCase() === generatedUsername) || 
            (cleanIdent.toLowerCase() === storedUsername) || 
            (cleanIdent.toLowerCase() === emp.email.toLowerCase());
            
          const passwordMatches = 
            (cleanPass === defaultPassword) || 
            (cleanPass === storedPassword);

          return usernameMatches && passwordMatches;
        });

        if (inactiveFound) {
          setErrorMsg("Votre compte employé existe mais n'est pas activé par la direction.");
        } else {
          setErrorMsg(`Identifiants incorrects. Pour l'admin : ${targetAdminEmail} / ******`);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erreur lors de la validation des identifiants.");
    }
  };

  return (
    <div className="min-h-screen relative font-sans text-gray-800">
      
      {/* Dynamic Toast Alerts Container */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-5 py-4 rounded-2xl shadow-xl border animate-bounce ${
          toast.type === 'success' 
            ? 'bg-slate-900 border-sky-500/30 text-white' 
            : 'bg-white border-sky-100 text-slate-800'
        }`}>
          <div className="bg-sky-500 p-1.5 rounded-full text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold leading-normal">{toast.message}</p>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white transition-colors cursor-pointer pl-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary Layout Router */}
      {view === 'public' && (
        <PublicView 
          onSwitchToAdmin={() => setView('login')} 
          onToast={showToast} 
          entrepriseConfig={entrepriseConfig}
        />
      )}

      {view === 'login' && (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
          {/* Subtle ambient mesh background */}
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500 rounded-full filter blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full filter blur-[100px]" />
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-8 w-full max-w-md shadow-2xl space-y-8 relative z-10 text-slate-300">
            
            <div className="text-center space-y-3">
              {entrepriseConfig?.logo_url ? (
                <div className="flex justify-center">
                  <img
                    src={entrepriseConfig.logo_url}
                    alt={entrepriseConfig.nom_entreprise || 'Logo'}
                    className="w-auto h-12 md:h-20 object-contain rounded-2xl shadow-lg border border-slate-700/50 bg-slate-800/40 p-1 logo-dynamique-net"
                  />
                </div>
              ) : (
                <div className="bg-gradient-to-tr from-sky-400 to-blue-600 p-3 h-14 w-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-sky-500/10">
                  <Lock className="w-7 h-7 text-white" />
                </div>
              )}
              <div>
                <span className="text-lg font-bold text-white tracking-tight">
                  {entrepriseConfig?.nom_entreprise || 'Espace Pro Shampooine Le'}
                </span>
                <p className="text-[10px] uppercase text-sky-400 font-extrabold tracking-widest mt-1">Authentification sécurisée</p>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs font-semibold text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Identifiant (Utilisateur ou Email)</label>
                <input 
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs p-3 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Mot de passe</label>
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs p-3 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-sky-500/20 cursor-pointer text-center block"
              >
                Se connecter
              </button>
            </form>

            {/* Quick Demo Assist Block */}
            <div className="pt-6 border-t border-slate-800 space-y-3">
              <p className="text-[11px] text-slate-500 text-center leading-normal">
                🔑 Accès rapide de démonstration :
              </p>
              
              <button 
                onClick={() => {
                  setEmail('shampooinele.direction');
                  setPassword('admin123');
                  setView('admin');
                  showToast("Connexion réussie en tant que Direction !", "success");
                }}
                className="w-full bg-slate-950/40 hover:bg-slate-800/40 border border-slate-800 text-sky-400 hover:text-sky-300 font-extrabold py-3 rounded-xl text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Direction (shampooinele.direction)</span>
              </button>
            </div>

            <button 
              onClick={() => setView('public')}
              className="w-full text-slate-500 hover:text-slate-300 transition-colors text-center text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour au site vitrine</span>
            </button>

          </div>
        </div>
      )}

      {view === 'admin' && (
        <AdminView 
          onSwitchToPublic={() => setView('public')} 
          onToast={showToast} 
          onUpdateEntrepriseConfig={async (newCfg: any) => {
            setEntrepriseConfig(newCfg);
            // Reload depuis l'API pour sûr avoir les données à jour (logo inclus)
            try {
              const fresh = await apiService.getEntrepriseConfig();
              setEntrepriseConfig(fresh);
            } catch {}
          }}
        />
      )}

      {view === 'employee' && loggedEmployee && (
        <EmployeeView 
          employee={loggedEmployee}
          onLogout={() => {
            setView('public');
            setLoggedEmployee(null);
            showToast("Déconnexion réussie.", "info");
          }}
          onToast={showToast}
          entrepriseConfig={entrepriseConfig}
        />
      )}

      {view === 'review' && (
        <ReviewView 
          onBackToHome={() => setView('public')} 
          onToast={showToast} 
          entrepriseConfig={entrepriseConfig}
        />
      )}

      {view === 'client_devis' && (
        <ClientDevisView 
          backToHome={() => setView('public')} 
          onToast={(msg, type) => showToast(msg, type === 'error' ? 'info' : type)} 
          entrepriseConfig={entrepriseConfig}
        />
      )}

    </div>
  );
}
