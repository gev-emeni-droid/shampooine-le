-- Migration : Ajout des colonnes admin dans entreprise_config
-- Pour gérer le pseudo de connexion, l'email de contact/notification et le mot de passe admin

ALTER TABLE entreprise_config ADD COLUMN admin_username TEXT DEFAULT 'shampooinele.direction';
ALTER TABLE entreprise_config ADD COLUMN admin_email_contact TEXT DEFAULT '';
ALTER TABLE entreprise_config ADD COLUMN admin_password_hash TEXT DEFAULT 'admin123';

-- Initialiser les valeurs par défaut pour l'enregistrement existant
UPDATE entreprise_config 
SET admin_username = 'shampooinele.direction', admin_password_hash = 'admin123'
WHERE id = 'default' AND admin_username IS NULL;
