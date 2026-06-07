-- Migration : Ajout de la colonne temps_estime_minutes dans la table prestations
-- Pour pouvoir gérer la durée estimée unitaire de chaque prestation en minutes

ALTER TABLE prestations ADD COLUMN temps_estime_minutes INTEGER DEFAULT 30;

-- Mettre à jour les prestations existantes avec des durées adaptées cohérentes
UPDATE prestations SET temps_estime_minutes = 120 WHERE id = 'p1'; -- Canapé 2p: 2 heures
UPDATE prestations SET temps_estime_minutes = 180 WHERE id = 'p2'; -- Canapé 3p: 3 heures
UPDATE prestations SET temps_estime_minutes = 240 WHERE id = 'p3'; -- Canapé d'angle: 4 heures
UPDATE prestations SET temps_estime_minutes = 5   WHERE id = 'p4'; -- Moquette: 5 min par m²
UPDATE prestations SET temps_estime_minutes = 45  WHERE id = 'p5'; -- Fauteuil: 45 min
UPDATE prestations SET temps_estime_minutes = 15  WHERE id = 'p6'; -- Traitement acariens: 15 min
