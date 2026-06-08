-- Fix: recréer la table configurations_emails avec les bons flux_type
-- Étape 1: renommer l'ancienne table
ALTER TABLE configurations_emails RENAME TO configurations_emails_old;

-- Étape 2: créer la nouvelle table avec la bonne contrainte
CREATE TABLE configurations_emails (
  id TEXT PRIMARY KEY,
  flux_type TEXT UNIQUE NOT NULL CHECK (flux_type IN ('appointment_confirmation', 'devis_sending', 'facture_sending', 'employee_notification', 'growth_feedback_request')),
  sujet TEXT NOT NULL,
  corps_message TEXT NOT NULL
);

-- Étape 3: copier les données compatibles
INSERT OR IGNORE INTO configurations_emails SELECT * FROM configurations_emails_old WHERE flux_type IN ('appointment_confirmation', 'devis_sending', 'facture_sending', 'employee_notification', 'growth_feedback_request');

-- Étape 4: supprimer l'ancienne table
DROP TABLE configurations_emails_old;

-- Étape 5: réinsérer les configs manquantes
INSERT OR REPLACE INTO configurations_emails (id, flux_type, sujet, corps_message) VALUES
('email_conf_1', 'appointment_confirmation', 'Confirmation de votre intervention de nettoyage - Shampooine Le', 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nNous vous confirmons votre rendez-vous prévu le {DATE_RDV} à {HEURE_RDV}.\nDurée estimée : {DUREE_ESTIMEE} minutes.\n\nCordialement,\nL''équipe Shampooine Le'),
('email_conf_2', 'devis_sending', 'Votre devis de prestation - Shampooine Le', 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nVeuillez trouver ci-joint votre devis pour nos services de nettoyage de textile.\n\nPour consulter et signer votre devis en ligne :\n{LIEN_DEVIS}\n\nCordialement,\nL''équipe Shampooine Le'),
('email_conf_5', 'facture_sending', 'Votre facture de prestation - Shampooine Le', 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nVeuillez trouver ci-joint votre facture pour nos services de nettoyage de textile.\n\nCordialement,\nL''équipe Shampooine Le'),
('email_conf_3', 'employee_notification', 'Nouvelle intervention assignée - Shampooine Le', 'Bonjour {NOM_EMPLOYE},\n\nUne nouvelle intervention vous a été assignée le {DATE_RDV} à {HEURE_RDV}.\nClient: {PRENOM_CLIENT} {NOM_CLIENT}.\n\nBonne intervention,\nShampooine Le'),
('email_conf_4', 'growth_feedback_request', 'Votre avis nous intéresse ! - Shampooine Le', 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nMerci de votre confiance ! Votre prestation s''est terminée avec succès.\n\nMerci de laisser votre avis :\n{LIEN_AVIS}\n\nCordialement,\nL''équipe Shampooine Le');
