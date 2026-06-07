-- ==========================================
-- SCHÉMA SQL COMPLET POUR CLOUDFLARE D1
-- APPLICATION 'SHAMPOOINE LE'
-- (Clients, Documents, Lignes, Fichiers joint, Employés, Planning)
-- ==========================================

PRAGMA foreign_keys = ON;

-- 1. Table principale des Clients (CRM automatique)
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  type_client TEXT DEFAULT 'particulier' CHECK (type_client IN ('particulier', 'professionnel')),
  raison_sociale TEXT,
  siret TEXT,
  tva_intracommunautaire TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- Table des adresses multiples de la clientèle (Multi-adresses)
CREATE TABLE IF NOT EXISTS client_adresses (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  label_adresse TEXT NOT NULL,
  adresse_complete TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_client_adresses_client ON client_adresses(client_id);

-- 2. Table des Documents (Devis et Factures unifiés)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('devis', 'facture')),
  number TEXT UNIQUE NOT NULL, -- ex: DEV-2026-001 / FAC-2026-001
  status TEXT NOT NULL CHECK (status IN ('Brouillon', 'Envoyé au client', 'Signé/Accepté', 'Facturé', 'Payé', 'Signé')),
  date TEXT NOT NULL,          -- YYYY-MM-DD
  due_date TEXT NOT NULL,      -- YYYY-MM-DD
  total_amount REAL NOT NULL DEFAULT 0.0,  -- = TTC (net à payer)
  total_ht REAL DEFAULT 0.0,               -- HT (pour B2B = total_amount / 1.20)
  total_ttc REAL DEFAULT 0.0,              -- TTC explicite (= total_amount)
  notes TEXT,
  signature_client TEXT,
  date_signature TEXT,
  moyen_paiement TEXT CHECK (moyen_paiement IN ('ESPECES', 'VIREMENT')),
  paiement_valide INTEGER DEFAULT 0 CHECK (paiement_valide IN (0, 1)),
  date_paiement TEXT,
  signature_sur_place INTEGER DEFAULT 0 CHECK (signature_sur_place IN (0, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);

-- 3. Table des Lignes de Documents (Détails des prestations associées)
CREATE TABLE IF NOT EXISTS lignes_documents (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  prestation_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1.0,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lignes_doc ON lignes_documents(document_id);

-- 4. Table des Fichiers Joints (Photos avant/après de canapé, états des lieux)
CREATE TABLE IF NOT EXISTS fichiers_joint (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- images/png, etc.
  caption TEXT,
  before_after TEXT CHECK (before_after IN ('before', 'after', 'spec')), -- État initial (before) / final (after)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 5. Table des Employés (Techniciens d'intervention)
CREATE TABLE IF NOT EXISTS employes (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Actif' CHECK (status IN ('Actif', 'Inactif')),
  color TEXT NOT NULL, -- Code couleur hexadécimal pour l'agenda/planning
  username TEXT UNIQUE,
  password_hash TEXT,
  compte_actif INTEGER DEFAULT 0 CHECK (compte_actif IN (0,1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table du Planning d'intervention (Rattaché aux devis signés ou facturés)
CREATE TABLE IF NOT EXISTS planning (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL, -- Doit être lié à un devis signé/accepté ou facture
  title TEXT NOT NULL,
  date TEXT NOT NULL,          -- YYYY-MM-DD
  start_time TEXT NOT NULL,    -- HH:MM
  duration_minutes INTEGER NOT NULL,
  final_price REAL NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'Planifié' CHECK (status IN ('Planifié', 'En cours', 'Terminé', 'Annulé')),
  notes TEXT,
  source_creation TEXT DEFAULT 'admin' CHECK (source_creation IN ('client_auto', 'admin')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_planning_date ON planning(date);

-- Table des horaires d'ouverture de l'entreprise
CREATE TABLE IF NOT EXISTS entreprise_horaires (
  id TEXT PRIMARY KEY,
  jour_semaine INTEGER NOT NULL UNIQUE CHECK (jour_semaine BETWEEN 0 AND 6), -- 0=Dimanche, 1=Lundi, ..., 6=Samedi
  heure_debut_matin TEXT,         -- HH:MM
  heure_fin_matin TEXT,           -- HH:MM
  heure_debut_apresmidi TEXT,     -- HH:MM
  heure_fin_apresmidi TEXT,       -- HH:MM
  est_ouvert INTEGER DEFAULT 1 CHECK (est_ouvert IN (0, 1)) -- Booleen (0=Fermé, 1=Ouvert)
);

-- Seed des horaires d'ouverture par défaut (Lundi au Samedi: 8h-12h et 14h-19h, Dimanche: Fermé)
INSERT OR REPLACE INTO entreprise_horaires (id, jour_semaine, heure_debut_matin, heure_fin_matin, heure_debut_apresmidi, heure_fin_apresmidi, est_ouvert) VALUES
('h0', 0, NULL, NULL, NULL, NULL, 0),
('h1', 1, '08:00', '12:00', '14:00', '19:00', 1),
('h2', 2, '08:00', '12:00', '14:00', '19:00', 1),
('h3', 3, '08:00', '12:00', '14:00', '19:00', 1),
('h4', 4, '08:00', '12:00', '14:00', '19:00', 1),
('h5', 5, '08:00', '12:00', '14:00', '19:00', 1),
('h6', 6, '08:00', '12:00', '14:00', '19:00', 1);

-- Table des fermetures exceptionnelles
CREATE TABLE IF NOT EXISTS entreprise_fermetures (
  id TEXT PRIMARY KEY,
  date TEXT UNIQUE NOT NULL, -- YYYY-MM-DD
  description TEXT NOT NULL
);

-- 7. Table de jointure pour l'assignation multiple des techniciens
CREATE TABLE IF NOT EXISTS planning_employes (
  planning_id TEXT NOT NULL,
  employe_id TEXT NOT NULL,
  PRIMARY KEY (planning_id, employe_id),
  FOREIGN KEY (planning_id) REFERENCES planning(id) ON DELETE CASCADE,
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE
);

-- 8. Table des Configurations d'e-mails (flux emails automatiques)
CREATE TABLE IF NOT EXISTS configurations_emails (
  id TEXT PRIMARY KEY,
  flux_type TEXT UNIQUE NOT NULL CHECK (flux_type IN ('appointment_confirmation', 'document_sending', 'employee_notification', 'growth_feedback_request')),
  sujet TEXT NOT NULL,
  corps_message TEXT NOT NULL
);

-- 9. Table des Avis Clients (modération et boucle de croissance)
CREATE TABLE IF NOT EXISTS avis_clients (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  appointment_id TEXT NOT NULL,
  note INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire TEXT NOT NULL,
  afficher_nom INTEGER NOT NULL DEFAULT 1 CHECK (afficher_nom IN (0,1)), -- 0 = pseudonyme/anonyme, 1 = public complet
  approuve INTEGER NOT NULL DEFAULT 0 CHECK (approuve IN (0,1)), -- Modéré par l'artisan
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES planning(id) ON DELETE CASCADE
);


-- ==========================================
-- JEU DE DONNÉES DE DAMPARRAGE (SEED INITIAL)
-- ==========================================

-- Clients par défaut
INSERT OR REPLACE INTO clients (id, first_name, last_name, email, phone, notes) VALUES
('c1', 'Marc', 'Lefebvre', 'marc.lefebvre@gmail.com', '06 14 25 36 47', 'Canapé 3 places en tissu lin gris clair. Taches incrustées de café.'),
('c2', 'Sophie', 'Dubois', 'sophie.dubois@hotmail.fr', '06 88 56 42 11', 'Grande moquette en laine blanche dans la chambre principale. Animaux de compagnie.'),
('c3', 'Valérie', 'Rousseau', 'valerie.rousseau@outlook.com', '07 55 43 89 21', 'Chaise ancienne en velours rouge. Tissu fragile à traiter avec soin.');

-- Employés par défaut
INSERT OR REPLACE INTO employes (id, first_name, last_name, email, phone, status, color) VALUES
('emp1', 'Karim', 'Bennani', 'karim@shampooine.le', '06 12 34 56 78', 'Actif', '#0ea5e9'),
('emp2', 'Julie', 'Durand', 'julie@shampooine.le', '06 98 76 54 32', 'Actif', '#10b981');

-- Devis initial (Brouillon)
INSERT OR REPLACE INTO documents (id, client_id, type, number, status, date, due_date, total_amount, notes) VALUES
('doc1', 'c1', 'devis', 'DEV-2026-001', 'Brouillon', '2026-06-01', '2026-07-01', 150.0, 'Prestation de nettoyage canapé à domicile.');

INSERT OR REPLACE INTO lignes_documents (id, document_id, prestation_name, quantity, unit_price, total_price) VALUES
('line1', 'doc1', 'Nettoyage complet canapé 3 places', 1, 150.0, 150.0);

-- Devis signé/accepté
INSERT OR REPLACE INTO documents (id, client_id, type, number, status, date, due_date, total_amount, notes) VALUES
('doc2', 'c2', 'devis', 'DEV-2026-002', 'Signé/Accepté', '2026-06-03', '2026-07-03', 270.0, 'Nettoyage moquette grande surface.');

INSERT OR REPLACE INTO lignes_documents (id, document_id, prestation_name, quantity, unit_price, total_price) VALUES
('line2', 'doc2', 'Nettoyage et désinfection moquette (m²)', 20, 12.0, 240.0),
('line3', 'doc2', 'Traitement anti-acariens / anti-odeurs protecteur', 1, 30.0, 30.0);

-- Rendez-vous planifié correspondant
INSERT OR REPLACE INTO planning (id, document_id, title, date, start_time, duration_minutes, final_price, status, notes) VALUES
('appt1', 'doc2', 'Chantier Moquette Dubois', '2026-06-09', '14:00', 180, 270.0, 'Planifié', 'Prendre l''injecteur-extracteur v4 de rechange.');

-- Assignation des employés
INSERT OR REPLACE INTO planning_employes (planning_id, employe_id) VALUES
('appt1', 'emp1'),
('appt1', 'emp2');

-- Configurations d'e-mails par défaut
INSERT OR REPLACE INTO configurations_emails (id, flux_type, sujet, corps_message) VALUES
('email_conf_1', 'appointment_confirmation', 'Confirmation de votre intervention de nettoyage - Shampooine Le', 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nNous vous confirmons votre rendez-vous de nettoyage prévu le {DATE_RDV} à {HEURE_RDV}.\nDurée estimée de l''intervention : {DUREE_ESTIMEE} minutes.\nL''un de nos experts interviendra chez vous.\n\nCordialement,\nL''équipe Shampooine Le'),
('email_conf_2', 'document_sending', 'Votre document de prestation - Shampooine Le', 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nVeuillez trouver ci-joint votre document concernant nos services de nettoyage de textile.\n\nCordialement,\nL''équipe Shampooine Le'),
('email_conf_3', 'employee_notification', 'Nouvelle intervention assignée - Shampooine Le', 'Bonjour {NOM_EMPLOYE},\n\nUne nouvelle intervention vous a été assignée le {DATE_RDV} à {HEURE_RDV}.\nClient: {PRENOM_CLIENT} {NOM_CLIENT}.\n\nBonne intervention,\nShampooine Le'),
('email_conf_4', 'growth_feedback_request', 'Votre avis nous intéresse ! Merci pour votre confiance - Shampooine Le', 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nVotre prestation de nettoyage de canapé/tapis s''est terminée avec succès !\nNous espérons que le résultat répond à vos attentes.\n\nMerci de bien vouloir prendre 1 minute pour évaluer notre travail et nous laisser votre avis :\n{LIEN_AVIS}\n\nCordialement,\nL''équipe Shampooine Le');

-- Avis clients par défaut
INSERT OR REPLACE INTO avis_clients (id, client_id, appointment_id, note, commentaire, afficher_nom, approuve) VALUES
('av1', 'c1', 'appt1', 5, 'Résultat impressionnant sur mon canapé en lin ! Les taches de café incrustées depuis 1 an ont entièrement disparu. Karim est très pro.', 1, 1),
('av2', 'c2', 'appt1', 4, 'Très bon service pour la moquette de notre chambre. Julie et Karim sont venus à l''heure et ont travaillé proprement.', 0, 1);



-- 10. Table de configuration de l'entreprise (Identité et Mentions Légales)
CREATE TABLE IF NOT EXISTS entreprise_config (
  id TEXT PRIMARY KEY,
  nom_entreprise TEXT NOT NULL,
  telephone TEXT NOT NULL,
  adresse_siege TEXT NOT NULL,
  horaires TEXT,
  siret TEXT,
  code_ape TEXT,
  tva_intracommunautaire TEXT,
  forme_juridique TEXT,
  capital_social TEXT,
  logo_url TEXT,
  admin_username TEXT DEFAULT 'shampooinele.direction',  -- Pseudo de connexion admin
  admin_email_contact TEXT DEFAULT '',                   -- Email de contact/notification artisan
  admin_password_hash TEXT DEFAULT 'admin123'            -- Mot de passe (stockage local uniquement)
);

-- Seed configuration par défaut de l'entreprise
INSERT OR REPLACE INTO entreprise_config (id, nom_entreprise, telephone, adresse_siege, horaires, siret, code_ape, tva_intracommunautaire, forme_juridique, capital_social, logo_url) VALUES
('default', 'Shampooine Le', '06 12 34 56 78', '42 Avenue de la Propreté, 75008 Paris', 'Lundi au Samedi : 8h00 - 19h00', '123 456 789 00021', '8121Z', 'FR 12 123456789', 'SARL', '10 000 €', 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=120&h=120&q=80');


-- 11. Table des Prestations / Services
CREATE TABLE IF NOT EXISTS prestations (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  type_tarif TEXT DEFAULT 'fixe', -- 'fixe' ou 'm2'
  prix_unitaire REAL NOT NULL,
  activer_majoration_nuit INTEGER DEFAULT 1 -- 0 ou 1
);

INSERT OR REPLACE INTO prestations (id, category, name, type_tarif, prix_unitaire, activer_majoration_nuit) VALUES
('p1', 'canape', 'Nettoyage complet canapé 2 places', 'fixe', 120.0, 1),
('p2', 'canape', 'Nettoyage complet canapé 3 places', 'fixe', 150.0, 1),
('p3', 'canape', 'Nettoyage complet canapé d''angle (4-5 places)', 'fixe', 210.0, 1),
('p4', 'moquette', 'Nettoyage en profondeur moquette / tapis', 'm2', 12.0, 1),
('p5', 'fauteuil', 'Nettoyage complet fauteuil simple', 'fixe', 65.0, 1),
('p6', 'autre', 'Traitement anti-acariens / anti-odeurs protecteur', 'fixe', 25.0, 1);

-- 12. Table des Demandes de devis du site public
CREATE TABLE IF NOT EXISTS demandes_devis (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  nombre_objets TEXT,
  description_etat TEXT,
  surface_dimensions TEXT,
  demande_visite INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);



