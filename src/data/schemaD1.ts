export const schemaD1SQL = `-- ==========================================
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
  status TEXT NOT NULL CHECK (status IN ('Brouillon', 'Envoyé au client', 'Signé/Accepté', 'Facturé', 'Payé')),
  date TEXT NOT NULL,          -- YYYY-MM-DD
  due_date TEXT NOT NULL,      -- YYYY-MM-DD
  total_amount REAL NOT NULL DEFAULT 0.0,
  notes TEXT,
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
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_planning_date ON planning(date);

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
  afficher_nom INTEGER NOT NULL DEFAULT 1 CHECK (afficher_nom IN (0,1)), -- 0 = anonyme, 1 = public
  approuve INTEGER NOT NULL DEFAULT 0 CHECK (approuve IN (0,1)), -- Modéré par l'artisan
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES planning(id) ON DELETE CASCADE
);
`;
