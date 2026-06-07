import { Client, Prestation, DevisFacture, LigneDocument, Employe, RendezVousPlanning } from '../types';

export const INITIAL_PRESTATIONS: Prestation[] = [
  { id: 'p1', category: 'canape', name: 'Nettoyage complet canapé 2 places', base_price: 120.0, unit_label: 'unité' },
  { id: 'p2', category: 'canape', name: 'Nettoyage complet canapé 3 places', base_price: 150.0, unit_label: 'unité' },
  { id: 'p3', category: 'canape', name: 'Nettoyage complet canapé d\'angle (4-5 places)', base_price: 210.0, unit_label: 'unité' },
  { id: 'p4', category: 'moquette', name: 'Nettoyage en profondeur moquette / tapis', base_price: 12.0, unit_label: 'm²' },
  { id: 'p5', category: 'fauteuil', name: 'Nettoyage complet fauteuil simple', base_price: 65.0, unit_label: 'unité' },
  { id: 'p6', category: 'autre', name: 'Traitement anti-acariens / anti-odeurs protecteur', base_price: 25.0, unit_label: 'unité' }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'c1',
    first_name: 'Laetitia',
    last_name: 'Dubois',
    email: 'laetitia.dubois@gmail.com',
    phone: '06 23 45 67 89',
    notes: 'Canapé en velours côtelé vert forêt extrêmement fragile. Attention aux produits alcalins.',
    created_at: '2026-05-15T10:00:00Z'
  },
  {
    id: 'c2',
    first_name: 'Marc',
    last_name: 'Lambert',
    email: 'm.lambert@entreprise.fr',
    phone: '06 87 65 43 21',
    notes: 'Moquette de bureaux administratifs de 120m² au 2ème étage avec ascenseur.',
    created_at: '2026-05-20T14:30:00Z'
  },
  {
    id: 'c3',
    first_name: 'Sophie',
    last_name: 'Moreau',
    email: 'sophie.moreau@outlook.fr',
    phone: '07 12 34 56 78',
    notes: 'Possède deux bergers australiens, poils incrustés et odeur de chien mouillé sur canapé d\'angle.',
    created_at: '2026-06-01T08:15:00Z'
  }
];

export const INITIAL_EMPLOYEES: Employe[] = [
  {
    id: 'emp1',
    first_name: 'Karim',
    last_name: 'Bennani',
    email: 'karim@shampooine.le',
    phone: '06 12 34 56 78',
    status: 'Actif',
    color: '#0ea5e9', // Deep Water Blue
    created_at: '2026-05-01T09:00:00Z'
  },
  {
    id: 'emp2',
    first_name: 'Julie',
    last_name: 'Durand',
    email: 'julie@shampooine.le',
    phone: '06 98 76 54 32',
    status: 'Actif',
    color: '#10b981', // Clean Emerald Green
    created_at: '2026-05-01T09:00:00Z'
  },
  {
    id: 'emp3',
    first_name: 'Nadir',
    last_name: 'Cherif',
    email: 'nadir@shampooine.le',
    phone: '06 88 44 22 11',
    status: 'Actif',
    color: '#8b5cf6', // Clear Violet
    created_at: '2026-05-12T10:00:00Z'
  }
];

export const INITIAL_DEVIS_FACTURES: DevisFacture[] = [
  {
    id: 'df1',
    client_id: 'c1',
    type: 'devis',
    number: 'DEV-2026-001',
    status: 'Signé/Accepté',
    date: '2026-06-02',
    due_date: '2026-07-02',
    total_amount: 175.0,
    notes: 'Prestation prévue le 10 juin pour canapé velours côtelé.',
    created_at: '2026-06-02T10:30:00Z'
  },
  {
    id: 'df2',
    client_id: 'c2',
    type: 'facture',
    number: 'FAC-2026-001',
    status: 'Payé',
    date: '2026-05-24',
    due_date: '2026-06-24',
    total_amount: 1440.0,
    notes: 'Nettoyage de moquette 120m² réalisé avec succès. Règlement reçu par virement.',
    created_at: '2026-05-24T17:00:00Z'
  },
  {
    id: 'df3',
    client_id: 'c3',
    type: 'devis',
    number: 'DEV-2026-002',
    status: 'Envoyé au client',
    date: '2026-06-05',
    due_date: '2026-07-05',
    total_amount: 235.0,
    notes: 'Devis envoyé avec l\'option traitement anti-odeurs animaux forte pénétration.',
    created_at: '2026-06-05T09:00:00Z'
  }
];

export const INITIAL_LIGNES_DOCUMENTS: LigneDocument[] = [
  // Lignes pour df1 (Laetitia, canapé 3 places + option anti-acariens)
  {
    id: 'ld1',
    devis_facture_id: 'df1',
    prestation_name: 'Nettoyage complet canapé 3 places',
    quantity: 1,
    unit_price: 150.0,
    total_price: 150.0
  },
  {
    id: 'ld2',
    devis_facture_id: 'df1',
    prestation_name: 'Traitement anti-acariens / anti-odeurs protecteur',
    quantity: 1,
    unit_price: 25.0,
    total_price: 25.0
  },
  
  // Lignes pour df2 (Marc Lambert, Moquette 120m²)
  {
    id: 'ld3',
    devis_facture_id: 'df2',
    prestation_name: 'Nettoyage en profondeur moquette / tapis',
    quantity: 120,
    unit_price: 12.0,
    total_price: 1440.0
  },
  
  // Lignes pour df3 (Sophie Moreau, canapé d'angle + traitement odeurs)
  {
    id: 'ld4',
    devis_facture_id: 'df3',
    prestation_name: 'Nettoyage complet canapé d\'angle (4-5 places)',
    quantity: 1,
    unit_price: 210.0,
    total_price: 210.0
  },
  {
    id: 'ld5',
    devis_facture_id: 'df3',
    prestation_name: 'Traitement anti-acariens / anti-odeurs protecteur',
    quantity: 1,
    unit_price: 25.0,
    total_price: 25.0
  }
];

export const INITIAL_RENDEZ_VOUS: RendezVousPlanning[] = [
  {
    id: 'rv1',
    devis_facture_id: 'df1',
    title: 'Nettoyage canapé vert velours - Dubois',
    date: '2026-06-10',
    start_time: '14:00',
    duration_minutes: 120,
    final_price: 175.0,
    status: 'Planifié',
    notes: 'Apporter la brosse douce spéciale velours et l\'injecteur-extracteur compact.',
    assigned_employee_ids: ['emp1']
  }
];

// Initial customer review/avis data for public layout
export const TESTIMONIALS = [
  {
    id: 1,
    name: "Laurence R.",
    category: "Canapé d'angle tissu",
    rating: 5,
    date: "Il y a 2 semaines",
    text: "Un canapé beige en lin complètement tacheté par le café et l'usure quotidienne remis à neuf ! Le travail de l'artisan est minutieux et le tarif très correct au vu du résultat. Je recommande Shampooine Le !"
  },
  {
    id: 2,
    name: "Frédéric M.",
    category: "Moquette de chambre",
    rating: 5,
    date: "Il y a 3 semaines",
    text: "Excellente intervention sur notre moquette de chambre d'enfant. Odeurs, taches rebelles de feutres : tout a disparu. L'équipe est ponctuelle et de bon conseil pour entretenir après séchage."
  },
  {
    id: 3,
    name: "Camille P.",
    category: "Fauteuil & Canapé velours",
    rating: 5,
    date: "Il y a un mois",
    text: "Incroyable ! Mon canapé en velours côtelé vert a retrouvé son éclat d'origine et la texture douce n'a absolument pas été altérée. Hyper professionnels et à l'écoute des spécificités techniques."
  }
];
