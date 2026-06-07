import { Client, Prestation, DevisFacture, LigneDocument, Employe, RendezVousPlanning, DocumentPhoto, EmailConfiguration, AvisClient, ClientAdresse, EntrepriseConfig, EntrepriseHoraire, EntrepriseFermeture } from '../types';
import { 
  INITIAL_PRESTATIONS, 
  INITIAL_CLIENTS, 
  INITIAL_EMPLOYEES, 
  INITIAL_DEVIS_FACTURES, 
  INITIAL_LIGNES_DOCUMENTS, 
  INITIAL_RENDEZ_VOUS 
} from '../data/mockData';

// --- CONFIGURATION API CLOUDFLARE WORKER ---
// En production, mettez à jour cette URL vers votre service Cloudflare Worker
const CLOUDFLARE_WORKER_URL = (import.meta as any).env?.VITE_WORKER_URL || '';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper d'initialisation de la mémoire locale (émulateur D1 en LocalStorage)
const getStored = <T>(key: string, defaultVal: T): T => {
  const data = localStorage.getItem(`shampooine_${key}`);
  return data ? JSON.parse(data) : defaultVal;
};

const setStored = <T>(key: string, value: T): void => {
  localStorage.setItem(`shampooine_${key}`, JSON.stringify(value));
};

// Initialisation de la base de données
export const initializeStorage = () => {
  if (!localStorage.getItem('shampooine_entreprise_config')) {
    setStored('entreprise_config', {
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
      logo_url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=120&h=120&q=80',
      majorat_tarif_nuit_pct: 25,
      plage_majoration_debut: '19:00',
      plage_majoration_fin: '06:00',
      activer_majoration: true
    });
  }
  if (!localStorage.getItem('shampooine_prestations')) {
    setStored('prestations', INITIAL_PRESTATIONS);
  }
  if (!localStorage.getItem('shampooine_clients')) {
    setStored('clients', INITIAL_CLIENTS);
  }
  if (!localStorage.getItem('shampooine_client_adresses')) {
    setStored('client_adresses', [
      { id: 'addr_c1_1', client_id: 'c1', label_adresse: 'Maison principale', adresse_complete: '12 Rue de la Paix, Paris 75001' },
      { id: 'addr_c1_2', client_id: 'c1', label_adresse: 'Appartement locatif', adresse_complete: '45 Boulevard Hausmann, Paris 75009' },
      { id: 'addr_c2_1', client_id: 'c2', label_adresse: 'Maison principale', adresse_complete: '8 Avenue des Champs-Élysées, Paris 75008' },
      { id: 'addr_c3_1', client_id: 'c3', label_adresse: 'Bureaux', adresse_complete: '101 Rue de Sèvres, Paris 75006' }
    ]);
  }
  if (!localStorage.getItem('shampooine_employees')) {
    setStored('employees', INITIAL_EMPLOYEES);
  }
  if (!localStorage.getItem('shampooine_devis_factures')) {
    setStored('devis_factures', INITIAL_DEVIS_FACTURES);
  }
  if (!localStorage.getItem('shampooine_lignes_documents')) {
    setStored('lignes_documents', INITIAL_LIGNES_DOCUMENTS);
  }
  if (!localStorage.getItem('shampooine_appointments')) {
    setStored('appointments', INITIAL_RENDEZ_VOUS);
  }
  if (!localStorage.getItem('shampooine_document_photos')) {
    setStored('document_photos', [
      {
        id: 'dp1',
        devis_facture_id: 'df1',
        photo_url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=600&q=80',
        caption: "État initial Canapé vert - Taches de sébum et d'usure incrustées",
        before_after: 'before'
      },
      {
        id: 'dp2',
        devis_facture_id: 'df2',
        photo_url: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&w=600&q=80',
        caption: 'Moquette bureau 120m² après lavage thermique thermique haute pression',
        before_after: 'after'
      }
    ]);
  }
  if (!localStorage.getItem('shampooine_email_configurations')) {
    setStored('email_configurations', [
      {
        id: 'email_conf_1',
        flux_type: 'appointment_confirmation',
        sujet: 'Confirmation de votre intervention de nettoyage - Shampooine Le',
        corps_message: 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nNous vous confirmons votre rendez-vous de nettoyage prévu le {DATE_RDV} à {HEURE_RDV}.\nDurée estimée de l\'intervention : {DUREE_ESTIMEE} minutes.\nL\'un de nos experts interviendra chez vous.\n\nCordialement,\nL\'équipe Shampooine Le'
      },
      {
        id: 'email_conf_2',
        flux_type: 'devis_sending',
        sujet: 'Votre devis de prestation - Shampooine Le',
        corps_message: 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nVeuillez trouver ci-joint votre devis concernant nos services de nettoyage de textile.\n\nCordialement,\nL\'équipe Shampooine Le'
      },
      {
        id: 'email_conf_5',
        flux_type: 'facture_sending',
        sujet: 'Votre facture de prestation - Shampooine Le',
        corps_message: 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nVeuillez trouver ci-joint votre facture concernant nos services de nettoyage de textile.\n\nCordialement,\nL\'équipe Shampooine Le'
      },
      {
        id: 'email_conf_3',
        flux_type: 'employee_notification',
        sujet: 'Nouvelle intervention assignée - Shampooine Le',
        corps_message: 'Bonjour {NOM_EMPLOYE},\n\nUne nouvelle intervention vous a été assignée le {DATE_RDV} à {HEURE_RDV}.\nClient: {PRENOM_CLIENT} {NOM_CLIENT}.\n\nBonne intervention,\nShampooine Le'
      },
      {
        id: 'email_conf_4',
        flux_type: 'growth_feedback_request',
        sujet: 'Votre avis nous intéresse ! Merci pour votre confiance - Shampooine Le',
        corps_message: 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nVotre prestation de nettoyage de canapé/tapis s\'est terminée avec succès !\nNous espérons que le résultat répond à vos attentes.\n\nMerci de bien vouloir prendre 1 minute pour évaluer notre travail et nous laisser votre avis :\n{LIEN_AVIS}\n\nCordialement,\nL\'équipe Shampooine Le'
      }
    ]);
  }
  if (!localStorage.getItem('shampooine_client_reviews')) {
    setStored('client_reviews', [
      {
        id: 'av1',
        client_id: 'c1',
        appointment_id: 'appt1',
        note: 5,
        commentaire: 'Résultat impressionnant sur mon canapé en lin ! Les taches de café incrustées depuis 1 an ont entièrement disparu. Karim est très pro.',
        afficher_nom: true,
        approuve: true,
        created_at: '2026-06-05T14:30:00Z'
      },
      {
        id: 'av2',
        client_id: 'c2',
        appointment_id: 'appt1',
        note: 4,
        commentaire: 'Très bon service pour la moquette de notre chambre. Julie et Karim sont venus à l\'heure et ont travaillé proprement.',
        afficher_nom: false,
        approuve: true,
        created_at: '2026-06-06T10:15:00Z'
      }
    ]);
  }
  if (!localStorage.getItem('shampooine_entreprise_horaires')) {
    setStored('entreprise_horaires', [
      { id: 'h0', jour_semaine: 0, heure_debut_matin: null, heure_fin_matin: null, heure_debut_apresmidi: null, heure_fin_apresmidi: null, est_ouvert: false },
      { id: 'h1', jour_semaine: 1, heure_debut_matin: '08:00', heure_fin_matin: '12:00', heure_debut_apresmidi: '14:00', heure_fin_apresmidi: '19:00', est_ouvert: true },
      { id: 'h2', jour_semaine: 2, heure_debut_matin: '08:00', heure_fin_matin: '12:00', heure_debut_apresmidi: '14:00', heure_fin_apresmidi: '19:00', est_ouvert: true },
      { id: 'h3', jour_semaine: 3, heure_debut_matin: '08:00', heure_fin_matin: '12:00', heure_debut_apresmidi: '14:00', heure_fin_apresmidi: '19:00', est_ouvert: true },
      { id: 'h4', jour_semaine: 4, heure_debut_matin: '08:00', heure_fin_matin: '12:00', heure_debut_apresmidi: '14:00', heure_fin_apresmidi: '19:00', est_ouvert: true },
      { id: 'h5', jour_semaine: 5, heure_debut_matin: '08:00', heure_fin_matin: '12:00', heure_debut_apresmidi: '14:00', heure_fin_apresmidi: '19:00', est_ouvert: true },
      { id: 'h6', jour_semaine: 6, heure_debut_matin: '08:00', heure_fin_matin: '12:00', heure_debut_apresmidi: '14:00', heure_fin_apresmidi: '19:00', est_ouvert: true }
    ]);
  }
  if (!localStorage.getItem('shampooine_entreprise_fermetures')) {
    setStored('entreprise_fermetures', [
      { id: 'f1', date: '2026-07-14', description: 'Fête nationale' },
      { id: 'f2', date: '2026-08-15', description: 'Assomption' }
    ]);
  }
};

// Initialisation immédiate
initializeStorage();

export const apiService = {
  // ==========================================
  // MODULE PRESTATIONS / SERVICES
  // ==========================================
  async getPrestations(): Promise<Prestation[]> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/prestations`);
      return res.json();
    }
    await delay(300);
    return getStored<Prestation[]>('prestations', []);
  },

  async createPrestation(prestation: Omit<Prestation, 'id'>): Promise<Prestation> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/prestations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prestation),
      });
      return res.json();
    }
    await delay(250);
    const list = getStored<Prestation[]>('prestations', []);
    const newPrestation: Prestation = {
      ...prestation,
      id: `p-${Date.now()}`
    };
    list.push(newPrestation);
    setStored('prestations', list);
    return newPrestation;
  },

  async updatePrestation(prestation: Prestation): Promise<Prestation> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/prestations/${prestation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prestation),
      });
      return res.json();
    }
    await delay(250);
    const list = getStored<Prestation[]>('prestations', []);
    const index = list.findIndex(p => p.id === prestation.id);
    if (index !== -1) {
      list[index] = prestation;
      setStored('prestations', list);
    }
    return prestation;
  },

  async deletePrestation(id: string): Promise<boolean> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/prestations/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    }
    await delay(200);
    const list = getStored<Prestation[]>('prestations', []);
    const filtered = list.filter(p => p.id !== id);
    setStored('prestations', filtered);
    return true;
  },

  async createDemandeDevis(demande: Omit<DemandeDevis, 'id' | 'created_at'>): Promise<DemandeDevis> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/demandes-devis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demande)
      });
      return res.json();
    }
    await delay(250);
    const list = getStored<DemandeDevis[]>('demandes_devis', []);
    const newDemande: DemandeDevis = {
      ...demande,
      id: `req-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    list.push(newDemande);
    setStored('demandes_devis', list);
    return newDemande;
  },

  async getDemandesDevis(): Promise<DemandeDevis[]> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/demandes-devis`);
      return res.json();
    }
    await delay(250);
    return getStored<DemandeDevis[]>('demandes_devis', []);
  },

  // ==========================================
  // MODULE CLIENTS (CRM)
  // ==========================================
  async getClients(): Promise<Client[]> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/clients`);
      return res.json();
    }
    await delay(400);
    return getStored<Client[]>('clients', []);
  },

  async getClientById(id: string): Promise<Client | null> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/clients/${id}`);
      return res.json();
    }
    await delay(200);
    const clients = getStored<Client[]>('clients', []);
    return clients.find(c => c.id === id) || null;
  },

  async createOrUpdateClient(clientData: Omit<Client, 'id' | 'created_at'> & { id?: string }): Promise<Client> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });
      return res.json();
    }
    await delay(300);
    const clients = getStored<Client[]>('clients', []);
    
    // Si email ou tel existe déjà, on le met à jour ou on le retourne
    let existing = clients.find(c => 
      c.email.toLowerCase() === clientData.email.toLowerCase() || 
      c.phone.replace(/\s+/g, '') === clientData.phone.replace(/\s+/g, '')
    );

    if (existing) {
      existing.first_name = clientData.first_name;
      existing.last_name = clientData.last_name;
      existing.notes = clientData.notes || existing.notes;
      existing.type_client = clientData.type_client || existing.type_client;
      existing.raison_sociale = clientData.raison_sociale || existing.raison_sociale;
      existing.siret = clientData.siret || existing.siret;
      existing.tva_intracommunautaire = clientData.tva_intracommunautaire || existing.tva_intracommunautaire;
      setStored('clients', clients);
      return existing;
    }

    // Nouveau client
    const newClient: Client = {
      id: clientData.id || `c-${Date.now()}`,
      first_name: clientData.first_name,
      last_name: clientData.last_name,
      email: clientData.email,
      phone: clientData.phone,
      notes: clientData.notes,
      type_client: clientData.type_client || 'particulier',
      raison_sociale: clientData.raison_sociale,
      siret: clientData.siret,
      tva_intracommunautaire: clientData.tva_intracommunautaire,
      created_at: new Date().toISOString()
    };
    clients.push(newClient);
    setStored('clients', clients);

    const addressStr = (clientData as any).adresse_complete || (clientData as any).adresse;
    if (addressStr && addressStr.trim()) {
      const allAddresses = getStored<ClientAdresse[]>('client_adresses', []);
      const addrId = `ca-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      allAddresses.push({
        id: addrId,
        client_id: newClient.id,
        label_adresse: 'Principale',
        adresse_complete: addressStr.trim()
      });
      setStored('client_adresses', allAddresses);
    }

    return newClient;
  },

  async updateClient(client: Client): Promise<Client> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client),
      });
      return res.json();
    }
    await delay(250);
    const list = getStored<Client[]>('clients', []);
    const index = list.findIndex(c => c.id === client.id);
    if (index !== -1) {
      list[index] = client;
      setStored('clients', list);
    }
    return client;
  },

  // ==========================================
  // MODULE ADRESSES DE CLIENTS
  // ==========================================
  async getClientAdresses(clientId: string): Promise<ClientAdresse[]> {
    if (CLOUDFLARE_WORKER_URL) {
      try {
        const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/clients/${clientId}/adresses`);
        return res.json();
      } catch (e) {
        console.error("Cloudflare Worker Error, falling back to storage", e);
      }
    }
    await delay(150);
    const list = getStored<ClientAdresse[]>('client_adresses', []);
    return list.filter(addr => addr.client_id === clientId);
  },

  async getAllClientAdresses(): Promise<ClientAdresse[]> {
    if (CLOUDFLARE_WORKER_URL) {
      try {
        const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/client_adresses`);
        return res.json();
      } catch (e) {
        console.error("Cloudflare Worker Error, falling back to storage", e);
      }
    }
    await delay(150);
    return getStored<ClientAdresse[]>('client_adresses', []);
  },

  async saveClientAdresse(adresse: ClientAdresse): Promise<ClientAdresse> {
    if (CLOUDFLARE_WORKER_URL) {
      try {
        const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/client_adresses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adresse),
        });
        return res.json();
      } catch (e) {
         console.error("Cloudflare Worker Error, falling back to storage", e);
      }
    }
    await delay(150);
    const list = getStored<ClientAdresse[]>('client_adresses', []);
    const index = list.findIndex(addr => addr.id === adresse.id);
    if (index !== -1) {
      list[index] = adresse;
    } else {
      if (!adresse.id) adresse.id = `addr-${Date.now()}`;
      list.push(adresse);
    }
    setStored('client_adresses', list);
    return adresse;
  },

  async deleteClientAdresse(id: string): Promise<boolean> {
    if (CLOUDFLARE_WORKER_URL) {
      try {
        const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/client_adresses/${id}`, {
          method: 'DELETE',
        });
        return res.ok;
      } catch (e) {
        console.error("Cloudflare Worker Error, falling back to storage", e);
      }
    }
    await delay(150);
    const list = getStored<ClientAdresse[]>('client_adresses', []);
    const filtered = list.filter(addr => addr.id !== id);
    setStored('client_adresses', filtered);
    return true;
  },

  async deleteClient(id: string): Promise<boolean> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/clients/${id}`, {
        method: 'DELETE',
      });
      return res.ok;
    }
    await delay(300);
    const list = getStored<Client[]>('clients', []);
    const filtered = list.filter(c => c.id !== id);
    setStored('clients', filtered);
    return true;
  },

  // ==========================================
  // MODULE DEVIS & FACTURES
  // ==========================================
  async getDevisFactures(): Promise<DevisFacture[]> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/documents`);
      return res.json();
    }
    await delay(350);
    return getStored<DevisFacture[]>('devis_factures', []);
  },

  async getLignesDocument(devisFactureId: string): Promise<LigneDocument[]> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/documents/${devisFactureId}/lignes`);
      return res.json();
    }
    await delay(150);
    const allLines = getStored<LigneDocument[]>('lignes_documents', []);
    return allLines.filter(line => line.devis_facture_id === devisFactureId);
  },

  async saveDevisFacture(
    doc: Omit<DevisFacture, 'id' | 'number' | 'created_at' | 'total_amount'> & { id?: string },
    lines: Omit<LigneDocument, 'id' | 'devis_facture_id'>[]
  ): Promise<DevisFacture> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc, lines }),
      });
      return res.json();
    }
    await delay(450);
    const docs = getStored<DevisFacture[]>('devis_factures', []);
    const allLines = getStored<LigneDocument[]>('lignes_documents', []);

    const docId = doc.id || `doc-${Date.now()}`;
    const totalAmount = lines.reduce((acc, current) => acc + current.total_price, 0);

    // Déterminer le numéro du devis/facture
    let docNumber = '';
    const prefix = doc.type === 'devis' ? 'DEV' : 'FAC';
    const year = new Date().getFullYear();
    const countThisYear = docs.filter(d => d.type === doc.type && d.date.startsWith(year.toString())).length + 1;
    docNumber = `${prefix}-${year}-${String(countThisYear).padStart(3, '0')}`;

    const newDoc: DevisFacture = {
      id: docId,
      client_id: doc.client_id,
      type: doc.type,
      number: doc.id ? (docs.find(d => d.id === doc.id)?.number || docNumber) : docNumber,
      status: doc.status,
      date: doc.date,
      due_date: doc.due_date,
      total_amount: totalAmount,
      notes: doc.notes,
      signature_client: doc.signature_client,
      date_signature: doc.date_signature,
      moyen_paiement: doc.moyen_paiement,
      paiement_valide: doc.paiement_valide,
      date_paiement: doc.date_paiement,
      signature_sur_place: doc.signature_sur_place,
      created_at: new Date().toISOString()
    };

    // Gestion de la sauvegarde
    const existingIndex = docs.findIndex(d => d.id === docId);
    if (existingIndex !== -1) {
      // Met à jour
      docs[existingIndex] = newDoc;
    } else {
      // Ajoute
      docs.push(newDoc);
    }
    setStored('devis_factures', docs);

    // Mettre à jour les lignes associées
    const sanitizedLines: LigneDocument[] = lines.map((line, idx) => ({
      id: `line-${docId}-${idx}`,
      devis_facture_id: docId,
      prestation_name: line.prestation_name,
      quantity: line.quantity,
      unit_price: line.unit_price,
      total_price: line.total_price
    }));

    // Supprimer les anciennes lignes de ce document puis pousser les nouvelles
    const linesFiltered = allLines.filter(line => line.devis_facture_id !== docId);
    setStored('lignes_documents', [...linesFiltered, ...sanitizedLines]);

    return newDoc;
  },

  async convertDevisToFacture(devisId: string): Promise<DevisFacture> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/documents/${devisId}/convert`, {
        method: 'POST'
      });
      return res.json();
    }
    await delay(400);

    const docs = getStored<DevisFacture[]>('devis_factures', []);
    const allLines = getStored<LigneDocument[]>('lignes_documents', []);
    
    const devisIndex = docs.findIndex(d => d.id === devisId);
    if (devisIndex === -1) throw new Error('Devis non trouvé');
    const devis = docs[devisIndex];

    // Muter le devis d'origine en statut 'Facturé'
    devis.status = 'Facturé';

    // Créer la nouvelle facture
    const factId = `doc-${Date.now()}`;
    const year = new Date().getFullYear();
    const factCount = docs.filter(d => d.type === 'facture' && d.date.startsWith(year.toString())).length + 1;
    const factNumber = `FAC-${year}-${String(factCount).padStart(3, '0')}`;

    const newInvoice: DevisFacture = {
      id: factId,
      client_id: devis.client_id,
      type: 'facture',
      number: factNumber,
      status: 'Envoyé au client',
      date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 jours
      total_amount: devis.total_amount,
      notes: `Facture émise suite à l'acceptation du devis ${devis.number}.`,
      created_at: new Date().toISOString()
    };

    docs.push(newInvoice);
    setStored('devis_factures', docs);

    // Dupliquer les lignes vers la nouvelle facture
    const devisLines = allLines.filter(l => l.devis_facture_id === devisId);
    const newInvoiceLines: LigneDocument[] = devisLines.map((line, idx) => ({
      id: `line-${factId}-${idx}`,
      devis_facture_id: factId,
      prestation_name: line.prestation_name,
      quantity: line.quantity,
      unit_price: line.unit_price,
      total_price: line.total_price
    }));

    setStored('lignes_documents', [...allLines, ...newInvoiceLines]);

    return newInvoice;
  },

  async updateDocumentStatus(id: string, status: DevisFacture['status']): Promise<DevisFacture> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/documents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      return res.json();
    }
    await delay(200);
    const docs = getStored<DevisFacture[]>('devis_factures', []);
    const index = docs.findIndex(d => d.id === id);
    if (index !== -1) {
      docs[index].status = status;
      setStored('devis_factures', docs);
      return docs[index];
    }
    throw new Error('Document non trouvé');
  },

  async deleteDocument(id: string): Promise<boolean> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/documents/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    }
    await delay(200);
    const docs = getStored<DevisFacture[]>('devis_factures', []);
    const lines = getStored<LigneDocument[]>('lignes_documents', []);

    setStored('devis_factures', docs.filter(d => d.id !== id));
    setStored('lignes_documents', lines.filter(l => l.devis_facture_id !== id));
    return true;
  },

  // ==========================================
  // MODULE EMPLOYES
  // ==========================================
  async getEmployees(): Promise<Employe[]> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/employees`);
      return res.json();
    }
    await delay(300);
    return getStored<Employe[]>('employees', []);
  },

  async saveEmployee(employee: Omit<Employe, 'id' | 'created_at'> & { id?: string }): Promise<Employe> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee),
      });
      return res.json();
    }
    await delay(250);
    const list = getStored<Employe[]>('employees', []);
    const id = employee.id || `emp-${Date.now()}`;

    const newEmp: Employe = {
      id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      status: employee.status,
      color: employee.color || '#3b82f6',
      username: employee.username,
      password_hash: employee.password_hash,
      compte_actif: employee.compte_actif,
      created_at: new Date().toISOString()
    };

    const idx = list.findIndex(e => e.id === id);
    if (idx !== -1) {
      list[idx] = newEmp;
    } else {
      list.push(newEmp);
    }
    setStored('employees', list);
    return newEmp;
  },

  async deleteEmployee(id: string): Promise<boolean> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/employees/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    }
    await delay(200);
    const list = getStored<Employe[]>('employees', []);
    setStored('employees', list.filter(e => e.id !== id));
    return true;
  },

  // ==========================================
  // MODULE PLANNING / RENDEZ-VOUS
  // ==========================================
  async getAppointments(start?: string, end?: string): Promise<RendezVousPlanning[]> {
    if (CLOUDFLARE_WORKER_URL) {
      let url = `${CLOUDFLARE_WORKER_URL}/api/appointments`;
      if (start && end) {
        url += `?start=${start}&end=${end}`;
      }
      const res = await fetch(url);
      return res.json();
    }
    await delay(300);
    const all = getStored<RendezVousPlanning[]>('appointments', []);
    if (start && end) {
      return all.filter(a => a.date >= start && a.date <= end);
    }
    return all;
  },

  async saveAppointment(appt: Omit<RendezVousPlanning, 'id'> & { id?: string }): Promise<RendezVousPlanning> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appt),
      });
      return res.json();
    }
    await delay(300);
    const appts = getStored<RendezVousPlanning[]>('appointments', []);
    const id = appt.id || `rv-${Date.now()}`;

    const newAppt: RendezVousPlanning = {
      id,
      devis_facture_id: appt.devis_facture_id,
      title: appt.title,
      date: appt.date,
      start_time: appt.start_time,
      duration_minutes: appt.duration_minutes,
      final_price: appt.final_price,
      status: appt.status,
      notes: appt.notes,
      assigned_employee_ids: appt.assigned_employee_ids,
      source_creation: appt.source_creation || 'admin'
    };

    const idx = appts.findIndex(a => a.id === id);
    if (idx !== -1) {
      appts[idx] = newAppt;
    } else {
      appts.push(newAppt);
    }
    setStored('appointments', appts);
    return newAppt;
  },

  async getEntrepriseConfig(): Promise<EntrepriseConfig> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/entreprise-config`);
      return res.json();
    }
    await delay(150);
    const config = getStored<EntrepriseConfig>('entreprise_config', {
      id: 'default',
      nom_entreprise: 'Shampooine Le',
      telephone: '06 12 34 56 78',
      adresse_siege: '42 Avenue de la Propreté, 75008 Paris',
      horaires: 'Lundi au Samedi : 8h00 - 19h59',
      siret: '123 456 789 00021',
      code_ape: '8121Z',
      tva_intracommunautaire: 'FR 12 123456789',
      forme_juridique: 'SARL',
      capital_social: '10 000 €',
      logo_url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=120&h=120&q=80',
      majorat_tarif_nuit_pct: 25,
      plage_majoration_debut: '19:00',
      plage_majoration_fin: '06:00',
      activer_majoration: true
    });
    if (config.majorat_tarif_nuit_pct === undefined) {
      config.majorat_tarif_nuit_pct = 25;
    }
    if (config.plage_majoration_debut === undefined) {
      config.plage_majoration_debut = '19:00';
    }
    if (config.plage_majoration_fin === undefined) {
      config.plage_majoration_fin = '06:00';
    }
    if (config.activer_majoration === undefined) {
      config.activer_majoration = true;
    }
    return config;
  },

  async saveEntrepriseConfig(config: EntrepriseConfig): Promise<EntrepriseConfig> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/admin/entreprise-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return res.json();
    }
    await delay(250);
    setStored('entreprise_config', config);
    return config;
  },

  async deleteAppointment(id: string): Promise<boolean> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/appointments/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    }
    await delay(200);
    const appts = getStored<RendezVousPlanning[]>('appointments', []);
    setStored('appointments', appts.filter(a => a.id !== id));
    return true;
  },

  async updateAppointmentFull(
    appointmentId: string,
    apptData: Partial<RendezVousPlanning>,
    docId?: string,
    docLines?: Omit<LigneDocument, 'id' | 'devis_facture_id'>[],
    docData?: Partial<DevisFacture>
  ): Promise<{ appointment: RendezVousPlanning; document?: DevisFacture }> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/admin/planning/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, apptData, docId, docLines, docData }),
      });
      return res.json();
    }
    await delay(400);

    const appts = getStored<RendezVousPlanning[]>('appointments', []);
    const idx = appts.findIndex(a => a.id === appointmentId);
    let updatedAppt: RendezVousPlanning | null = null;
    if (idx !== -1) {
      updatedAppt = {
        ...appts[idx],
        ...apptData,
        assigned_employee_ids: apptData.assigned_employee_ids || appts[idx].assigned_employee_ids,
      };
      appts[idx] = updatedAppt;
      setStored('appointments', appts);
    }

    let updatedDoc: DevisFacture | undefined = undefined;
    if (docId && docLines) {
      const docs = getStored<DevisFacture[]>('devis_factures', []);
      const docIdx = docs.findIndex(d => d.id === docId);
      if (docIdx !== -1) {
        const totalAmount = docLines.reduce((acc, current) => acc + current.total_price, 0);
        updatedDoc = {
          ...docs[docIdx],
          total_amount: totalAmount,
          ...docData
        };
        docs[docIdx] = updatedDoc;
        setStored('devis_factures', docs);

        const allLines = getStored<LigneDocument[]>('lignes_documents', []);
        const sanitizedLines: LigneDocument[] = docLines.map((line, lIdx) => ({
          id: `line-${docId}-${lIdx}`,
          devis_facture_id: docId,
          prestation_name: line.prestation_name,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total_price: line.total_price,
        }));
        const linesFiltered = allLines.filter(line => line.devis_facture_id !== docId);
        setStored('lignes_documents', [...linesFiltered, ...sanitizedLines]);

        if (updatedAppt) {
          updatedAppt.final_price = totalAmount;
          const freshAppts = getStored<RendezVousPlanning[]>('appointments', []);
          const freshIdx = freshAppts.findIndex(a => a.id === appointmentId);
          if (freshIdx !== -1) {
            freshAppts[freshIdx] = updatedAppt;
            setStored('appointments', freshAppts);
          }
        }
      }
    }

    return {
      appointment: updatedAppt || (apptData as RendezVousPlanning),
      document: updatedDoc,
    };
  },

  // ==========================================
  // MODULE ALBUMS, PHOTOS ET DOCUMENTS DE CHANTIER (Fichiers joints)
  // ==========================================
  async getDocumentPhotos(devisFactureId?: string): Promise<DocumentPhoto[]> {
    if (CLOUDFLARE_WORKER_URL) {
      const url = devisFactureId 
        ? `${CLOUDFLARE_WORKER_URL}/api/photos?devis_facture_id=${devisFactureId}`
        : `${CLOUDFLARE_WORKER_URL}/api/photos`;
      const res = await fetch(url);
      return res.json();
    }
    await delay(150);
    const photos = getStored<DocumentPhoto[]>('document_photos', []);
    if (devisFactureId) {
      return photos.filter(p => p.devis_facture_id === devisFactureId);
    }
    return photos;
  },

  async saveDocumentPhoto(photo: Omit<DocumentPhoto, 'id'> & { id?: string }): Promise<DocumentPhoto> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(photo)
      });
      return res.json();
    }
    await delay(200);
    const photos = getStored<DocumentPhoto[]>('document_photos', []);
    const id = photo.id || `photo-${Date.now()}`;
    const newPhoto: DocumentPhoto = {
      id,
      devis_facture_id: photo.devis_facture_id,
      photo_url: photo.photo_url || "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=600&q=80",
      caption: photo.caption,
      before_after: photo.before_after
    };
    const idx = photos.findIndex(p => p.id === id);
    if (idx !== -1) {
      photos[idx] = newPhoto;
    } else {
      photos.push(newPhoto);
    }
    setStored('document_photos', photos);
    return newPhoto;
  },

  async deleteDocumentPhoto(id: string): Promise<boolean> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/photos/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    }
    await delay(100);
    const photos = getStored<DocumentPhoto[]>('document_photos', []);
    setStored('document_photos', photos.filter(p => p.id !== id));
    return true;
  },

  // ==========================================
  // CONFIGURATION EMAILS & AUTOMATISATION (RESEND)
  // ==========================================
  async getEmailConfigurations(): Promise<EmailConfiguration[]> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/emails/config`);
      const list = await res.json() as any[];
      return list.map(item => ({
        ...item,
        sujet_template: item.sujet_template || item.sujet || '',
        corps_template: item.corps_template || item.corps_message || ''
      }));
    }
    await delay(150);
    const list = getStored<any[]>('email_configurations', []);
    return list.map(item => ({
      ...item,
      sujet_template: item.sujet_template || item.sujet || '',
      corps_template: item.corps_template || item.corps_message || ''
    }));
  },

  async saveEmailConfiguration(config: EmailConfiguration): Promise<EmailConfiguration> {
    const payload = {
      ...config,
      sujet: config.sujet_template || config.sujet || '',
      corps_message: config.corps_template || config.corps_message || ''
    };
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/emails/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.json();
    }
    await delay(200);
    const configs = getStored<any[]>('email_configurations', []);
    const idx = configs.findIndex(c => c.flux_type === config.flux_type);
    if (idx !== -1) {
      configs[idx] = payload;
    } else {
      configs.push(payload);
    }
    setStored('email_configurations', configs);
    return config;
  },

  async sendAutomatedEmail(
    fluxType: EmailConfiguration['flux_type'],
    replacements: Record<string, string>,
    recipientEmail: string
  ): Promise<{ success: boolean; subject: string; body: string; sentTo: string }> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fluxType, replacements, recipientEmail })
      });
      return res.json();
    }

    const configs = getStored<EmailConfiguration[]>('email_configurations', []);
    const config = configs.find(c => c.flux_type === fluxType);
    
    // Retrieve custom enterprise brand name
    const corpConfig = getStored<any>('entreprise_config', null);
    const companyName = corpConfig?.nom_entreprise || "Shampooine Le";
    
    let subject = config ? (config.sujet_template || config.sujet || `Notification de ${companyName}`) : `Notification de ${companyName}`;
    let body = config ? (config.corps_template || config.corps_message || "Bonjour, ...") : "Bonjour, ...";

    // Replace dynamic tags
    Object.entries(replacements).forEach(([key, val]) => {
      const tag = `{${key}}`;
      subject = subject.replace(new RegExp(tag, 'g'), val);
      body = body.replace(new RegExp(tag, 'g'), val);
    });

    if (replacements.NOTE_VIREMENT) {
      body += "\n\n" + replacements.NOTE_VIREMENT;
    }

    try {
      console.log(`[API CLIENT] Envoi d'un e-mail via le serveur proxy local Resend...`);
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          subject,
          body,
          fromName: companyName
        })
      });

      if (response.ok) {
        const json = await response.json();
        console.log("✅ E-mail envoyé avec succès via Resend !", json);
        return {
          success: true,
          subject,
          body,
          sentTo: recipientEmail
        };
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn("⚠️ Échec d'envoi d'e-mail via le proxy local. Simulation en cours d'exécution.", errJson);
      }
    } catch (e) {
      console.warn("⚠️ Impossible de se connecter au serveur proxy d'e-mail local (Resend). Simulation en cours d'exécution.", e);
    }

    await delay(200); // Simulate API latency fallback
    console.log(`[RESEND SIMULATION] E-mail envoyée à ${recipientEmail}`);
    console.log(`Sujet: ${subject}`);
    console.log(`Corps: ${body}`);

    return {
      success: true,
      subject,
      body,
      sentTo: recipientEmail
    };
  },

  // ==========================================
  // MODULE AVIS CLIENTS & BOUCLE DE CROISSANCE
  // ==========================================
  async getClientReviews(onlyApproved = false): Promise<AvisClient[]> {
    if (CLOUDFLARE_WORKER_URL) {
      const url = onlyApproved 
        ? `${CLOUDFLARE_WORKER_URL}/api/reviews?approved=true`
        : `${CLOUDFLARE_WORKER_URL}/api/reviews`;
      const res = await fetch(url);
      return res.json();
    }
    await delay(150);
    const reviews = getStored<AvisClient[]>('client_reviews', []);
    if (onlyApproved) {
      return reviews.filter(r => r.approuve);
    }
    return reviews;
  },

  async submitClientReview(review: Omit<AvisClient, 'id' | 'approuve' | 'created_at'>): Promise<AvisClient> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review)
      });
      return res.json();
    }
    await delay(300);
    const reviews = getStored<AvisClient[]>('client_reviews', []);
    const newReview: AvisClient = {
      ...review,
      id: `review-${Date.now()}`,
      approuve: false, // Default holds for moderation!
      created_at: new Date().toISOString()
    };
    reviews.push(newReview);
    setStored('client_reviews', reviews);
    return newReview;
  },

  async approveClientReview(id: string, approveValue = true): Promise<boolean> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/reviews/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: approveValue })
      });
      return res.ok;
    }
    await delay(150);
    const reviews = getStored<AvisClient[]>('client_reviews', []);
    const idx = reviews.findIndex(r => r.id === id);
    if (idx !== -1) {
      reviews[idx].approuve = approveValue;
      setStored('client_reviews', reviews);
      return true;
    }
    return false;
  },

  async deleteClientReview(id: string): Promise<boolean> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/reviews/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    }
    await delay(100);
    const reviews = getStored<AvisClient[]>('client_reviews', []);
    setStored('client_reviews', reviews.filter(r => r.id !== id));
    return true;
  },

  async getEntrepriseHoraires(): Promise<EntrepriseHoraire[]> {
    if (CLOUDFLARE_WORKER_URL) {
      try {
        const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/entreprise-horaires`);
        if (res.ok) return res.json();
      } catch (e) {}
    }
    await delay(100);
    return getStored<EntrepriseHoraire[]>('entreprise_horaires', []);
  },

  async saveEntrepriseHoraires(horaires: EntrepriseHoraire[]): Promise<EntrepriseHoraire[]> {
    if (CLOUDFLARE_WORKER_URL) {
      try {
        const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/entreprise-horaires`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(horaires)
        });
        if (res.ok) return res.json();
      } catch (e) {}
    }
    await delay(200);
    setStored('entreprise_horaires', horaires);
    return horaires;
  },

  async getEntrepriseFermetures(): Promise<EntrepriseFermeture[]> {
    if (CLOUDFLARE_WORKER_URL) {
      try {
        const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/entreprise-fermetures`);
        if (res.ok) return res.json();
      } catch (e) {}
    }
    await delay(100);
    return getStored<EntrepriseFermeture[]>('entreprise_fermetures', []);
  },

  async saveEntrepriseFermeture(fermeture: EntrepriseFermeture): Promise<EntrepriseFermeture> {
    if (CLOUDFLARE_WORKER_URL) {
      try {
        const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/entreprise-fermetures`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fermeture)
        });
        if (res.ok) return res.json();
      } catch (e) {}
    }
    await delay(150);
    const list = getStored<EntrepriseFermeture[]>('entreprise_fermetures', []);
    const idx = list.findIndex(f => f.id === fermeture.id || f.date === fermeture.date);
    if (idx !== -1) {
      list[idx] = fermeture;
    } else {
      if (!fermeture.id) fermeture.id = `f-${Date.now()}`;
      list.push(fermeture);
    }
    setStored('entreprise_fermetures', list);
    return fermeture;
  },

  async deleteEntrepriseFermeture(id: string): Promise<boolean> {
    if (CLOUDFLARE_WORKER_URL) {
      try {
        const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/entreprise-fermetures/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) return true;
      } catch (e) {}
    }
    await delay(100);
    const list = getStored<EntrepriseFermeture[]>('entreprise_fermetures', []);
    setStored('entreprise_fermetures', list.filter(f => f.id !== id));
    return true;
  },

  async signDevis(devisId: string, signatureClient: string): Promise<DevisFacture> {
    if (CLOUDFLARE_WORKER_URL) {
      try {
        const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/documents/${devisId}/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signature_client: signatureClient })
        });
        if (res.ok) return res.json();
      } catch (e) {}
    }
    await delay(300);
    const docs = getStored<DevisFacture[]>('devis_factures', []);
    const idx = docs.findIndex(d => d.id === devisId);
    if (idx === -1) throw new Error("Document non trouvé");
    const d = docs[idx];
    d.status = 'Signé';
    d.signature_client = signatureClient;
    d.date_signature = new Date().toISOString();
    docs[idx] = d;
    setStored('devis_factures', docs);

    // Get client info to simulate email notification
    const clients = getStored<Client[]>('clients', []);
    const client = clients.find(c => c.id === d.client_id);
    const clientName = client ? `${client.first_name} ${client.last_name}` : "Client";
    const clientEmail = client ? client.email : "client@example.com";

    // 1. Email to artisan:
    await this.sendAutomatedEmail(
      'employee_notification',
      {
        NOM_EMPLOYE: 'Karim Bennani (Direction)',
        DATE_RDV: 'À planifier de manière autonome',
        HEURE_RDV: 'À planifier',
        PRENOM_CLIENT: client ? client.first_name : '',
        NOM_CLIENT: client ? client.last_name : '',
      },
      'artisan@shampooine.fr'
    );
    console.log(`[EMAIL NOTIFICATION TO ARTISAN]: Le devis de ${clientName} a été signé avec succès !`);

    // 2. Email confirmation with unique link to client:
    const schedulerLink = `${window.location.origin}${window.location.pathname}?devis_id=${d.id}&action=planifier`;
    await this.sendAutomatedEmail(
      'devis_sending',
      {
        PRENOM_CLIENT: client ? client.first_name : '',
        NOM_CLIENT: client ? client.last_name : '',
        DATE_RDV: 'À planifier',
        HEURE_RDV: 'À planifier',
      },
      clientEmail
    );
    console.log(`[EMAIL TO CLIENT]: Félicitations ${clientName}, votre devis ${d.number} est signé ! Planifiez votre RDV ici : ${schedulerLink}`);

    return d;
  },

  async sendOrResendDocument(documentId: string): Promise<{ success: boolean; newStatus: DevisFacture['status']; sentTo: string; simulated?: boolean }> {
    if (CLOUDFLARE_WORKER_URL) {
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/admin/documents/renvoyer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, origin: window.location.origin })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de l\'envoi du document');
      }
      return res.json();
    }

    // Offline / LocalStorage Simulation Fallback
    const docs = getStored<DevisFacture[]>('devis_factures', []);
    const docIndex = docs.findIndex(d => d.id === documentId);
    if (docIndex === -1) throw new Error('Document non trouvé');
    const doc = docs[docIndex];

    const clients = getStored<Client[]>('clients', []);
    const client = clients.find(c => c.id === doc.client_id);
    if (!client) throw new Error('Client non trouvé');

    // Update status if it's currently Brouillon (or Facturé for invoice)
    let newStatus = doc.status;
    if (doc.status === 'Brouillon' || (doc.type === 'facture' && doc.status === 'Facturé')) {
      newStatus = 'Envoyé au client';
      doc.status = newStatus;
      setStored('devis_factures', docs);
    }

    await delay(300);

    return {
      success: true,
      newStatus,
      sentTo: client.email,
      simulated: true
    };
  }
};
