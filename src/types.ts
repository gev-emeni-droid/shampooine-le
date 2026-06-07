export interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'superadmin';
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes?: string;
  type_client?: 'particulier' | 'professionnel';
  raison_sociale?: string;
  siret?: string;
  tva_intracommunautaire?: string;
  created_at: string;
}

export interface ClientAdresse {
  id: string;
  client_id: string;
  label_adresse: string; // ex: Maison, Appartement, Bureau
  adresse_complete: string;
}

export interface Prestation {
  id: string;
  category: 'canape' | 'moquette' | 'fauteuil' | 'autre';
  name: string;
  base_price: number;
  unit_label: string; // "place", "m²", "unité"
  type_tarif?: 'fixe' | 'm2';
  prix_unitaire?: number;
  activer_majoration_nuit?: boolean;
  temps_estime_minutes?: number;
}

export interface DemandeDevis {
  id: string;
  client_id: string;
  nombre_objets: string;
  description_etat: string;
  surface_dimensions: string;
  demande_visite: boolean;
  created_at: string;
}

export type DocumentType = 'devis' | 'facture';
export type DocumentStatus = 'Brouillon' | 'Envoyé au client' | 'Signé/Accepté' | 'Facturé' | 'Payé' | 'Signé';

export interface DevisFacture {
  id: string;
  client_id: string;
  type: DocumentType;
  number: string; // e.g., "DEV-2026-001" or "FAC-2026-001"
  status: DocumentStatus;
  date: string;
  due_date: string;
  total_amount: number;   // = total TTC (net à payer)
  total_ht?: number;     // montant HT (pour B2B, = total_amount / 1.20)
  total_ttc?: number;    // montant TTC (= total_amount, explicite pour clarté)
  notes?: string;
  signature_client?: string;
  date_signature?: string;
  created_at: string;
  moyen_paiement?: 'ESPECES' | 'VIREMENT' | null;
  paiement_valide?: boolean;
  date_paiement?: string | null;
  signature_sur_place?: boolean;
}

export interface LigneDocument {
  id: string;
  devis_facture_id: string;
  prestation_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface DocumentPhoto {
  id: string;
  devis_facture_id: string;
  photo_url: string;
  caption: string;
  before_after: 'before' | 'after' | 'spec';
}

export interface Employe {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: 'Actif' | 'Inactif';
  color: string; // Tailind class or hex for calendar highlights
  created_at: string;
  username?: string;
  password_hash?: string;
  compte_actif?: boolean;
}

export type AppointmentStatus = 'Planifié' | 'En cours' | 'Terminé' | 'Annulé';

export interface RendezVousPlanning {
  id: string;
  devis_facture_id: string; // Related to clean quote
  title: string;
  date: string;
  start_time: string; // "14:00"
  duration_minutes: number;
  final_price: number;
  status: AppointmentStatus;
  notes?: string;
  assigned_employee_ids: string[]; // List of assigned employees
  source_creation?: 'client_auto' | 'admin';
}

export interface EntrepriseHoraire {
  id: string;
  jour_semaine: number; // 0=Dimanche, 1=Lundi, ..., 6=Samedi
  heure_debut_matin: string | null;
  heure_fin_matin: string | null;
  heure_debut_apresmidi: string | null;
  heure_fin_apresmidi: string | null;
  est_ouvert: boolean;
}

export interface EntrepriseFermeture {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
}

export interface ClientWithHistory extends Client {
  devis_factures: DevisFacture[];
  photos: DocumentPhoto[];
}

export interface EmailConfiguration {
  id: string;
  flux_type: 'appointment_confirmation' | 'document_sending' | 'employee_notification' | 'growth_feedback_request';
  sujet: string;
  corps_message: string;
}

export interface AvisClient {
  id: string;
  client_id: string;
  appointment_id: string;
  note: number;
  commentaire: string;
  afficher_nom: boolean;
  approuve: boolean;
  created_at: string;
}

export interface EntrepriseConfig {
  id: string;
  nom_entreprise: string;
  telephone: string;
  adresse_siege: string;
  horaires: string;
  siret: string;
  code_ape: string;
  tva_intracommunautaire: string;
  forme_juridique: string;
  capital_social: string;
  logo_url?: string;
  majorat_tarif_nuit_pct?: number; // e.g. 25
  plage_majoration_debut?: string; // e.g. "19:00"
  plage_majoration_fin?: string; // e.g. "06:00"
  activer_majoration?: boolean; // e.g. true
}


