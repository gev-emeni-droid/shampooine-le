-- Migration : Modification de la contrainte CHECK de configurations_emails et scission de document_sending en devis_sending et facture_sending

-- Puisqu'on ne peut pas facilement modifier un CHECK sur SQLite/D1 sans recréer la table, ou en désactivant temporairement les contraintes.
-- Nous allons créer une table temporaire, copier les données, modifier les flux, et renommer la table.

CREATE TABLE configurations_emails_new (
  id TEXT PRIMARY KEY,
  flux_type TEXT UNIQUE NOT NULL CHECK (flux_type IN ('appointment_confirmation', 'devis_sending', 'facture_sending', 'employee_notification', 'growth_feedback_request')),
  sujet TEXT NOT NULL,
  corps_message TEXT NOT NULL
);

-- Copier les anciennes configurations
INSERT INTO configurations_emails_new (id, flux_type, sujet, corps_message)
SELECT id, 
       CASE WHEN flux_type = 'document_sending' THEN 'devis_sending' ELSE flux_type END,
       sujet, 
       corps_message
FROM configurations_emails;

-- Insérer la nouvelle configuration pour facture_sending si elle n'existe pas
INSERT INTO configurations_emails_new (id, flux_type, sujet, corps_message)
VALUES (
  'email_conf_5', 
  'facture_sending', 
  'Votre facture de prestation - Shampooine Le', 
  'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nVeuillez trouver ci-joint votre facture n°{NUMERO_DOCUMENT} concernant nos prestations de nettoyage.\n\nCordialement,\nL''équipe Shampooine Le'
);

-- Remplacer l'ancienne table
DROP TABLE configurations_emails;
ALTER TABLE configurations_emails_new RENAME TO configurations_emails;
