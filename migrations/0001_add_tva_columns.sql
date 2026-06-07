-- Migration : Ajout des colonnes TVA à la table documents
-- B2B : total_ht = total_amount / 1.20, total_ttc = total_amount
-- B2C : total_ht = total_amount, total_ttc = total_amount (TVA non applicable)

ALTER TABLE documents ADD COLUMN total_ht REAL DEFAULT 0.0;
ALTER TABLE documents ADD COLUMN total_ttc REAL DEFAULT 0.0;

-- Remplir les colonnes pour les documents existants (B2C par défaut : HT = TTC)
UPDATE documents SET total_ttc = total_amount, total_ht = total_amount WHERE total_ht = 0.0;
