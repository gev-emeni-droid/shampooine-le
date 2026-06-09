import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type Bindings = {
  DB: D1Database;
  RESEND_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// Helper to generate IDs if missing
const uuid = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

function stripAccents(str: string): string {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function generateInvoicePDF(doc: any, client: any, lines: any[], companyConfig: any) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.275, 841.89]);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  
  let y = 800;

  // 1. Logo
  let logoEmbedded = false;
  if (companyConfig?.logo_url) {
    try {
      const resp = await fetch(companyConfig.logo_url);
      if (resp.ok) {
        const logoBytes = await resp.arrayBuffer();
        let logoImg;
        if (companyConfig.logo_url.toLowerCase().endsWith('.png')) {
          logoImg = await pdfDoc.embedPng(logoBytes);
        } else {
          logoImg = await pdfDoc.embedJpg(logoBytes);
        }
        if (logoImg) {
          const imgWidth = 80;
          const imgHeight = (logoImg.height / logoImg.width) * imgWidth;
          page.drawImage(logoImg, {
            x: 40,
            y: y - imgHeight,
            width: imgWidth,
            height: imgHeight
          });
          logoEmbedded = true;
          y -= (imgHeight + 10);
        }
      }
    } catch (e) {
      console.error("Failed to embed logo, fallback to text", e);
    }
  }

  if (!logoEmbedded) {
    page.drawRectangle({
      x: 40,
      y: y - 30,
      width: 40,
      height: 30,
      color: rgb(0.05, 0.65, 0.91)
    });
    page.drawText('+', {
      x: 54,
      y: y - 22,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1)
    });
    y -= 40;
  }

  const startY = y + 30;

  // Company coordinates
  y = startY - 50;
  page.drawText(stripAccents(companyConfig?.nom_entreprise || 'Shampooine Le'), { x: 40, y, size: 12, font: fontBold });
  y -= 14;
  page.drawText('Prestige canapes & tapis', { x: 40, y, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
  y -= 12;
  page.drawText(stripAccents(companyConfig?.adresse_siege || 'Paris, France'), { x: 40, y, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
  y -= 12;
  page.drawText(companyConfig?.telephone || '', { x: 40, y, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

  // Document details right
  let docY = startY - 10;
  const isDevis = doc.type === 'devis';
  const typeLabel = isDevis ? 'DEVIS' : 'FACTURE';
  page.drawText(`${typeLabel} #${doc.number}`, { x: 380, y: docY, size: 14, font: fontBold, color: isDevis ? rgb(0.52, 0.3, 0.06) : rgb(0.02, 0.37, 0.27) });
  docY -= 16;
  page.drawText(`Emis le : ${doc.date}`, { x: 380, y: docY, size: 9, font: fontRegular });
  docY -= 12;
  page.drawText(`Echeance : ${doc.due_date}`, { x: 380, y: docY, size: 9, font: fontRegular, color: rgb(0.7, 0.2, 0.2) });

  // 2. Destinataire
  y = Math.min(y, docY) - 30;
  page.drawRectangle({
    x: 350,
    y: y - 75,
    width: 205,
    height: 85,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.9, 0.92, 0.94),
    borderWidth: 1
  });
  
  let destY = y - 12;
  page.drawText('Destinataire :', { x: 360, y: destY, size: 8, font: fontBold, color: rgb(0.5, 0.5, 0.5) });
  destY -= 14;
  page.drawText(`${stripAccents(client.last_name || '').toUpperCase()} ${stripAccents(client.first_name || '')}`, { x: 360, y: destY, size: 10, font: fontBold });
  destY -= 12;
  page.drawText(client.email || '', { x: 360, y: destY, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  destY -= 12;
  page.drawText(client.phone || '', { x: 360, y: destY, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });

  if (client.type_client === 'professionnel') {
    destY -= 12;
    page.drawText(`SIRET: ${client.siret || ''}`, { x: 360, y: destY, size: 8, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
  }

  y = y - 90;

  // 3. Prestations Table
  page.drawText('Designation de la prestation', { x: 40, y, size: 9, font: fontBold, color: rgb(0.5, 0.5, 0.5) });
  page.drawText('Qte', { x: 340, y, size: 9, font: fontBold, color: rgb(0.5, 0.5, 0.5) });
  page.drawText('Prix Unit.', { x: 400, y, size: 9, font: fontBold, color: rgb(0.5, 0.5, 0.5) });
  page.drawText('Total', { x: 500, y, size: 9, font: fontBold, color: rgb(0.5, 0.5, 0.5) });
  
  y -= 6;
  page.drawLine({
    start: { x: 40, y },
    end: { x: 555, y },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9)
  });
  
  y -= 18;

  const isB2B = client.type_client === 'professionnel';
  const totalTTC = doc.total_amount || 0;
  const totalHT = isB2B ? totalTTC : (totalTTC / 1.20);
  const tvaAmt = isB2B ? 0 : (totalTTC - totalHT);

  for (const line of lines) {
    const isNightLine = line.prestation_name.includes('[MAJ. NUIT') || line.prestation_name.startsWith('Majoration Horaires de Nuit');
    const cleanName = line.prestation_name.replace(/ \[MAJ\. NUIT.*?\]/g, '');
    
    page.drawText(stripAccents(cleanName), { x: 40, y, size: 9, font: isNightLine ? fontBold : fontRegular });
    page.drawText(String(line.quantity), { x: 340, y, size: 9, font: fontRegular });
    page.drawText(`${line.unit_price.toFixed(2)} e`, { x: 400, y, size: 9, font: fontRegular });
    page.drawText(`${line.total_price.toFixed(2)} e`, { x: 500, y, size: 9, font: fontBold });

    if (isNightLine) {
      page.drawText('  Tarif horaire de nuit applique', { x: 40, y: y - 9, size: 7, font: fontBold, color: rgb(0.7, 0.4, 0.1) });
      y -= 10;
    }
    
    y -= 16;
  }

  y -= 10;
  page.drawLine({
    start: { x: 40, y },
    end: { x: 555, y },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9)
  });
  
  y -= 20;

  // 4. Totals
  if (isB2B) {
    page.drawText(`Total Global HT : ${totalHT.toFixed(2)} e`, { x: 380, y, size: 10, font: fontBold });
    y -= 14;
    page.drawText('TVA non applicable : 0.00 e', { x: 380, y, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    y -= 16;
    page.drawText(`Total Net a payer : ${totalHT.toFixed(2)} e`, { x: 380, y, size: 12, font: fontBold, color: rgb(0.31, 0.27, 0.9) });
    y -= 14;
    page.drawText('TVA non applicable, art. 293 B du CGI', { x: 380, y, size: 8, font: fontBold, color: rgb(0.31, 0.27, 0.9) });
  } else {
    page.drawText(`TVA (20%) incluse : ${tvaAmt.toFixed(2)} e`, { x: 380, y, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
    page.drawText(`Total Global (TTC) : ${totalTTC.toFixed(2)} e`, { x: 380, y, size: 12, font: fontBold, color: rgb(0.01, 0.52, 0.78) });
  }

  // 5. Footer Mentions
  page.drawText(`${stripAccents(companyConfig?.nom_entreprise || 'Shampooine Le')} - ${stripAccents(companyConfig?.forme_juridique || 'SARL')} au Capital de ${stripAccents(companyConfig?.capital_social || '10 000 e')}`, { x: width / 2 - 150, y: 50, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(`Siege Social : ${stripAccents(companyConfig?.adresse_siege || '')}`, { x: width / 2 - 150, y: 38, size: 7, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
  page.drawText(`SIRET : ${companyConfig?.siret || ''} | Code APE : ${companyConfig?.code_ape || ''} | TVA : ${companyConfig?.tva_intracommunautaire || ''}`, { x: width / 2 - 150, y: 26, size: 7, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ==========================================
// PRESTATIONS / SERVICES
// ==========================================

app.get('/prestations', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM prestations').all<any>();
    const mapped = results.map((r) => ({
      id: r.id,
      category: r.category,
      name: r.name,
      base_price: r.prix_unitaire !== undefined ? r.prix_unitaire : 0,
      unit_label: r.type_tarif === 'm2' ? 'm²' : 'unité',
      type_tarif: r.type_tarif || 'fixe',
      prix_unitaire: r.prix_unitaire !== undefined ? r.prix_unitaire : 0,
      activer_majoration_nuit: r.activer_majoration_nuit === 1,
      temps_estime_minutes: r.temps_estime_minutes !== undefined ? r.temps_estime_minutes : 30
    }));
    return c.json(mapped);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/prestations', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `p-${Date.now()}`;
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO prestations (id, category, name, type_tarif, prix_unitaire, activer_majoration_nuit, temps_estime_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        id,
        body.category,
        body.name,
        body.type_tarif || 'fixe',
        body.prix_unitaire !== undefined ? body.prix_unitaire : body.base_price,
        body.activer_majoration_nuit ? 1 : 0,
        body.temps_estime_minutes !== undefined ? Number(body.temps_estime_minutes) : 30
      )
      .run();
    return c.json({ id, ...body });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.put('/prestations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    await c.env.DB.prepare(
      'UPDATE prestations SET category = ?, name = ?, type_tarif = ?, prix_unitaire = ?, activer_majoration_nuit = ?, temps_estime_minutes = ? WHERE id = ?'
    )
      .bind(
        body.category,
        body.name,
        body.type_tarif || 'fixe',
        body.prix_unitaire !== undefined ? body.prix_unitaire : body.base_price,
        body.activer_majoration_nuit ? 1 : 0,
        body.temps_estime_minutes !== undefined ? Number(body.temps_estime_minutes) : 30,
        id
      )
      .run();
    return c.json({ id, ...body });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete('/prestations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM prestations WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ==========================================
// DEMANDES DE DEVIS
// ==========================================

app.get('/demandes-devis', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM demandes_devis ORDER BY created_at DESC').all();
    const mapped = results.map((r: any) => ({
      ...r,
      demande_visite: r.demande_visite === 1
    }));
    return c.json(mapped);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/demandes-devis', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `req-${Date.now()}`;
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO demandes_devis (id, client_id, nombre_objets, description_etat, surface_dimensions, demande_visite) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(
        id,
        body.client_id,
        body.nombre_objets || null,
        body.description_etat || null,
        body.surface_dimensions || null,
        body.demande_visite ? 1 : 0
      )
      .run();
    return c.json({ id, ...body });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});


// ==========================================
// CLIENTS (CRM)
// ==========================================

app.get('/clients', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get('/clients/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first<any>();
    if (!client) return c.json({ error: 'Client non trouvé' }, 404);
    
    // Fetch documents
    const { results: documents } = await c.env.DB.prepare('SELECT * FROM documents WHERE client_id = ? ORDER BY created_at DESC').bind(id).all();
    
    return c.json({
      ...client,
      documents: documents || []
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/clients', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `c-${Date.now()}`;
    
    // Check if client with email or phone already exists
    let existing = null;
    if (body.email) {
      existing = await c.env.DB.prepare('SELECT * FROM clients WHERE LOWER(email) = LOWER(?)').bind(body.email).first();
    }
    if (!existing && body.phone) {
      existing = await c.env.DB.prepare('SELECT * FROM clients WHERE phone = ?').bind(body.phone).first();
    }

    if (existing) {
      const updatedName = body.first_name || existing.first_name;
      const updatedLastName = body.last_name || existing.last_name;
      const updatedNotes = body.notes || existing.notes;
      const updatedType = body.type_client || existing.type_client;
      const updatedRaison = body.raison_sociale || existing.raison_sociale;
      const updatedSiret = body.siret || existing.siret;
      const updatedTva = body.tva_intracommunautaire || existing.tva_intracommunautaire;

      await c.env.DB.prepare(
        `UPDATE clients SET first_name = ?, last_name = ?, notes = ?, type_client = ?, 
         raison_sociale = ?, siret = ?, tva_intracommunautaire = ? WHERE id = ?`
      )
        .bind(updatedName, updatedLastName, updatedNotes, updatedType, updatedRaison, updatedSiret, updatedTva, existing.id)
        .run();

      const fresh = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(existing.id).first();
      return c.json(fresh);
    }

    // Insert new client
    const newId = body.id || `c-${Date.now()}`;
    await c.env.DB.prepare(
      `INSERT INTO clients (id, first_name, last_name, email, phone, notes, type_client, raison_sociale, siret, tva_intracommunautaire) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        newId,
        body.first_name,
        body.last_name,
        body.email || null,
        body.phone,
        body.notes || null,
        body.type_client || 'particulier',
        body.raison_sociale || null,
        body.siret || null,
        body.tva_intracommunautaire || null
      )
      .run();

    // Insert address into client_adresses if provided
    const addressStr = body.adresse_complete || body.adresse;
    if (addressStr && addressStr.trim()) {
      const addrId = `ca-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await c.env.DB.prepare(
        `INSERT INTO client_adresses (id, client_id, label_adresse, adresse_complete) 
         VALUES (?, ?, ?, ?)`
      )
        .bind(addrId, newId, 'Principale', addressStr.trim())
        .run();
    }

    const fresh = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(newId).first();
    return c.json(fresh);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.put('/clients/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    await c.env.DB.prepare(
      `UPDATE clients SET first_name = ?, last_name = ?, email = ?, phone = ?, notes = ?, 
       type_client = ?, raison_sociale = ?, siret = ?, tva_intracommunautaire = ? WHERE id = ?`
    )
      .bind(
        body.first_name,
        body.last_name,
        body.email,
        body.phone,
        body.notes,
        body.type_client,
        body.raison_sociale,
        body.siret,
        body.tva_intracommunautaire,
        id
      )
      .run();
    return c.json(body);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete('/clients/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ==========================================
// CLIENT ADRESSES
// ==========================================

app.get('/clients/:clientId/adresses', async (c) => {
  try {
    const clientId = c.req.param('clientId');
    const { results } = await c.env.DB.prepare('SELECT * FROM client_adresses WHERE client_id = ?').bind(clientId).all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get('/client_adresses', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM client_adresses').all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/client_adresses', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `addr-${Date.now()}`;
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO client_adresses (id, client_id, label_adresse, adresse_complete) VALUES (?, ?, ?, ?)'
    )
      .bind(id, body.client_id, body.label_adresse, body.adresse_complete)
      .run();
    return c.json({ id, ...body });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete('/client_adresses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM client_adresses WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ==========================================
// DOCUMENTS (DEVIS / FACTURES)
// ==========================================

app.get('/documents', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM documents ORDER BY created_at DESC').all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get('/documents/:devisFactureId/lignes', async (c) => {
  try {
    const docId = c.req.param('devisFactureId');
    const { results } = await c.env.DB.prepare('SELECT * FROM lignes_documents WHERE document_id = ?').bind(docId).all();
    // Map db field document_id back to frontend field devis_facture_id
    const mapped = results.map((r: any) => ({
      id: r.id,
      devis_facture_id: r.document_id,
      prestation_name: r.prestation_name,
      quantity: r.quantity,
      unit_price: r.unit_price,
      total_price: r.total_price
    }));
    return c.json(mapped);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/documents', async (c) => {
  try {
    const { doc, lines } = await c.req.json();
    const docId = doc.id || `doc-${Date.now()}`;
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(doc.client_id).first<any>();
    const isB2B = client?.type_client === 'professionnel';

    const totalAmount = lines.reduce((acc: number, current: any) => acc + current.total_price, 0);
    const totalTtc = totalAmount;
    const totalHt = isB2B ? totalAmount : (totalAmount / 1.20);

    // Determine invoice number
    let docNumber = doc.number;
    if (!docNumber) {
      const prefix = doc.type === 'devis' ? 'DEV' : 'FAC';
      const year = new Date().getFullYear();
      const count = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM documents WHERE type = ? AND date LIKE ?'
      )
        .bind(doc.type, `${year}%`)
        .first<{ count: number }>();
      const nextNum = (count?.count || 0) + 1;
      docNumber = `${prefix}-${year}-${String(nextNum).padStart(3, '0')}`;
    }

    // Insert or replace document
    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO documents (
        id, client_id, type, number, status, date, due_date, total_amount, total_ht, total_ttc, notes,
        signature_client, date_signature, moyen_paiement, paiement_valide, date_paiement, signature_sur_place
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        docId,
        doc.client_id,
        doc.type,
        docNumber,
        doc.status,
        doc.date,
        doc.due_date,
        totalAmount,
        totalHt,
        totalTtc,
        doc.notes || null,
        doc.signature_client || null,
        doc.date_signature || null,
        doc.moyen_paiement || null,
        doc.paiement_valide !== undefined ? (doc.paiement_valide ? 1 : 0) : 0,
        doc.date_paiement || null,
        doc.signature_sur_place !== undefined ? (doc.signature_sur_place ? 1 : 0) : 0
      )
      .run();

    // Delete existing lines
    await c.env.DB.prepare('DELETE FROM lignes_documents WHERE document_id = ?').bind(docId).run();

    // Insert new lines
    const batchStmts = lines.map((line: any, idx: number) => {
      const lineId = line.id || `line-${docId}-${idx}`;
      return c.env.DB.prepare(
        'INSERT INTO lignes_documents (id, document_id, prestation_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(lineId, docId, line.prestation_name, line.quantity, line.unit_price, line.total_price);
    });

    if (batchStmts.length > 0) {
      await c.env.DB.batch(batchStmts);
    }

    const fresh = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(docId).first();
    return c.json(fresh);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/documents/:devisId/convert', async (c) => {
  try {
    const devisId = c.req.param('devisId');
    const devis = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND type = "devis"').bind(devisId).first<any>();
    if (!devis) return c.json({ error: 'Devis non trouvé' }, 404);

    // Update original devis status
    await c.env.DB.prepare('UPDATE documents SET status = "Facturé" WHERE id = ?').bind(devisId).run();

    // Create new invoice
    const factId = `doc-${Date.now()}`;
    const year = new Date().getFullYear();
    const count = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM documents WHERE type = "facture" AND date LIKE ?'
    )
      .bind(`${year}%`)
      .first<{ count: number }>();
    const nextNum = (count?.count || 0) + 1;
    const factNumber = `FAC-${year}-${String(nextNum).padStart(3, '0')}`;

    const todayStr = new Date().toISOString().split('T')[0];
    const dueStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await c.env.DB.prepare(
      `INSERT INTO documents (id, client_id, type, number, status, date, due_date, total_amount, notes) 
       VALUES (?, ?, 'facture', ?, 'Envoyé au client', ?, ?, ?, ?)`
    )
      .bind(
        factId,
        devis.client_id,
        factNumber,
        todayStr,
        dueStr,
        devis.total_amount,
        `Facture émise suite à l'acceptation du devis ${devis.number}.`
      )
      .run();

    // Duplicate lines
    const { results: devisLines } = await c.env.DB.prepare('SELECT * FROM lignes_documents WHERE document_id = ?').bind(devisId).all<any>();
    const batchStmts = devisLines.map((line, idx) => {
      const lineId = `line-${factId}-${idx}`;
      return c.env.DB.prepare(
        'INSERT INTO lignes_documents (id, document_id, prestation_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(lineId, factId, line.prestation_name, line.quantity, line.unit_price, line.total_price);
    });

    if (batchStmts.length > 0) {
      await c.env.DB.batch(batchStmts);
    }

    const fresh = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(factId).first();
    return c.json(fresh);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.patch('/documents/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    await c.env.DB.prepare('UPDATE documents SET status = ? WHERE id = ?').bind(status, id).run();
    const fresh = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first();
    return c.json(fresh);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete('/documents/:id', async (c) => {
  try {
    const id = c.req.param('id');
    // SQLite Cascade will handle deleting lines if set up, but let's do it safely
    await c.env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM lignes_documents WHERE document_id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/documents/:devisId/sign', async (c) => {
  try {
    const devisId = c.req.param('devisId');
    const { signature_client } = await c.req.json();
    const dateSignature = new Date().toISOString();

    // Vérifier d'abord le statut actuel du devis
    const currentDoc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(devisId).first<any>();
    if (!currentDoc) {
      return c.json({ error: 'Document non trouvé' }, 404);
    }
    if (currentDoc.status === 'Signé' || currentDoc.status === 'Signé/Accepté' || currentDoc.status === 'Facturé' || currentDoc.status === 'Payé') {
      return c.json({ error: 'Ce devis a déjà été signé' }, 400);
    }

    // 1. Update quote status and signature
    await c.env.DB.prepare(
      'UPDATE documents SET status = "Signé", signature_client = ?, date_signature = ? WHERE id = ?'
    )
      .bind(signature_client, dateSignature, devisId)
      .run();

    const fresh = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(devisId).first<any>();
    if (!fresh) {
      return c.json({ error: 'Document non trouvé après signature' }, 404);
    }

    // 2. Fetch Client details
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(fresh.client_id).first<any>();
    if (client && client.email) {
      // 3. Fetch configurations_emails for devis_sending
      const config = await c.env.DB.prepare(
        'SELECT * FROM configurations_emails WHERE flux_type = "devis_sending"'
      ).bind().first<any>();

      const companyConfig = await c.env.DB.prepare('SELECT nom_entreprise FROM entreprise_config WHERE id = "default"').first<any>();
      const companyName = companyConfig?.nom_entreprise || 'Shampooine Le';

      let subject = config ? config.sujet : `Votre devis de prestation - ${companyName}`;
      let body = config 
        ? config.corps_message 
        : 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nVotre devis a bien été accepté et signé.\n\nVeuillez planifier votre rendez-vous en ligne via le lien ci-dessous :\n{LIEN_UNIQUE}\n\nCordialement,\nL\'équipe {NOM_ENTREPRISE}';

      // Calcul dynamique de la durée estimée des prestations
      const [ { results: lines }, { results: prestations } ] = await Promise.all([
        c.env.DB.prepare('SELECT * FROM lignes_documents WHERE document_id = ?').bind(devisId).all<any>(),
        c.env.DB.prepare('SELECT * FROM prestations').all<any>()
      ]);

      let totalMinutes = 0;
      for (const line of lines) {
        const lineName = line.prestation_name.replace(/ \[MAJ\. NUIT.*?\]/g, '').trim().toLowerCase();
        const matchedPrestation = prestations.find(p => p.name.trim().toLowerCase() === lineName);
        const matchedDuration = matchedPrestation ? matchedPrestation.temps_estime_minutes : 60; // 60 mins par défaut
        totalMinutes += matchedDuration * line.quantity;
      }

      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      let durationStr = '';
      if (hours > 0) {
        durationStr = `${hours}h${mins > 0 ? String(mins).padStart(2, '0') : '00'}`;
      } else {
        durationStr = `${mins} min`;
      }

      const phraseDuree = `Votre prestation va nécessiter environ ${durationStr} de travail.`;
      
      // Injection de la phrase de durée
      if (body.includes('{DUREE_TRAVAIL}')) {
        body = body.replace(/{DUREE_TRAVAIL}/g, durationStr);
      } else if (!body.includes(phraseDuree)) {
        const helloMatch = body.match(/Bonjour.*?,?\n\n/i);
        if (helloMatch) {
          body = body.replace(helloMatch[0], `${helloMatch[0]}${phraseDuree}\n\n`);
        } else {
          body = `${phraseDuree}\n\n${body}`;
        }
      }

      // 4. Inject dynamic parameters
      const reqOrigin = new URL(c.req.url).origin;
      const schedulerLink = `${reqOrigin}/choix-rdv?devis=${fresh.id}`;

      const replacements: Record<string, string> = {
        PRENOM_CLIENT: client.first_name || '',
        NOM_CLIENT: client.last_name || '',
        NOM_ENTREPRISE: companyName,
        LIEN_UNIQUE: schedulerLink,
        LIEN_DOCUMENT: schedulerLink,
        NUMERO_DOCUMENT: fresh.number || fresh.id,
        TOTAL_DOCUMENT: `${(fresh.total_amount || 0).toFixed(2)} €`
      };

      Object.entries(replacements).forEach(([key, val]) => {
        const tag = `{${key}}`;
        subject = subject.replace(new RegExp(tag, 'g'), val);
        body = body.replace(new RegExp(tag, 'g'), val);
      });

      // 5. Send via Resend or log simulation
      const resendApiKey = c.env.RESEND_API_KEY;
      const from = `${companyName} <notifications@l-iamani.com>`;

      if (resendApiKey) {
        const htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="background: linear-gradient(135deg, #0ea5e9, #6366f1); padding: 20px 24px; border-radius: 12px; margin-bottom: 24px;">
              <h2 style="color: white; font-weight: 800; margin: 0; font-size: 18px;">${companyName}</h2>
            </div>
            <div style="white-space: pre-wrap; line-height: 1.7; font-size: 14px; color: #374151;">
              ${body.replace(/\n/g, '<br/>')}
            </div>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
              Cet email a été envoyé automatiquement depuis votre espace ${companyName}.
            </p>
          </div>
        `;

        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from,
              to: [client.email],
              subject,
              html: htmlBody
            })
          });
        } catch (mailErr) {
          console.error('[Resend Sign Auto-Email] Error:', mailErr);
        }
      } else {
        console.log(`[Resend Auto-Email Simulation] Devis signé. Client email sent to ${client.email}. Link: ${schedulerLink}`);
      }
    }

    return c.json(fresh);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ==========================================
// EMPLOYES (TECHNICIENS)
// ==========================================

app.get('/employees', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM employes ORDER BY created_at DESC').all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/employees', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `emp-${Date.now()}`;
    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO employes (id, first_name, last_name, email, phone, status, color, username, password_hash, compte_actif) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.first_name,
        body.last_name,
        body.email,
        body.phone,
        body.status || 'Actif',
        body.color || '#3b82f6',
        body.username || null,
        body.password_hash || null,
        body.compte_actif !== undefined ? (body.compte_actif ? 1 : 0) : 0
      )
      .run();
    const fresh = await c.env.DB.prepare('SELECT * FROM employes WHERE id = ?').bind(id).first();
    return c.json(fresh);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete('/employees/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM employes WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ==========================================
// PLANNING / APPOINTMENTS
// ==========================================

app.get('/appointments', async (c) => {
  try {
    const start = c.req.query('start');
    const end = c.req.query('end');
    let query = 'SELECT * FROM planning';
    const params: any[] = [];
    if (start && end) {
      query += ' WHERE date >= ? AND date <= ?';
      params.push(start, end);
    }
    
    const { results: appts } = await c.env.DB.prepare(query).bind(...params).all<any>();
    const { results: assignments } = await c.env.DB.prepare('SELECT * FROM planning_employes').all<any>();

    // Merge employee assignments
    const merged = appts.map((appt) => {
      const employeeIds = assignments
        .filter((a) => a.planning_id === appt.id)
        .map((a) => a.employe_id);
      return {
        id: appt.id,
        devis_facture_id: appt.document_id,
        title: appt.title,
        date: appt.date,
        start_time: appt.start_time,
        duration_minutes: appt.duration_minutes,
        final_price: appt.final_price,
        status: appt.status,
        notes: appt.notes,
        source_creation: appt.source_creation || 'admin',
        assigned_employee_ids: employeeIds
      };
    });

    return c.json(merged);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});
app.post('/appointments', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `rv-${Date.now()}`;

    // Récupérer les anciennes liaisons d'employés
    const oldAssignments = await c.env.DB.prepare('SELECT employe_id FROM planning_employes WHERE planning_id = ?').bind(id).all<any>();
    const oldEmpIds = oldAssignments.results ? oldAssignments.results.map((r: any) => r.employe_id) : [];

    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO planning (id, document_id, title, date, start_time, duration_minutes, final_price, status, notes, source_creation) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.devis_facture_id,
        body.title,
        body.date,
        body.start_time,
        body.duration_minutes,
        body.final_price,
        body.status,
        body.notes || null,
        body.source_creation || 'admin'
      )
      .run();

    // Recreate employee assignments
    await c.env.DB.prepare('DELETE FROM planning_employes WHERE planning_id = ?').bind(id).run();

    const newEmpIds = body.assigned_employee_ids || [];
    if (Array.isArray(newEmpIds)) {
      const batchStmts = newEmpIds.map((empId: string) => {
        return c.env.DB.prepare(
          'INSERT INTO planning_employes (planning_id, employe_id) VALUES (?, ?)'
        ).bind(id, empId);
      });
      if (batchStmts.length > 0) {
        await c.env.DB.batch(batchStmts);
      }
    }

    const appt = await c.env.DB.prepare('SELECT * FROM planning WHERE id = ?').bind(id).first<any>();
    const freshAssignments = await c.env.DB.prepare('SELECT employe_id FROM planning_employes WHERE planning_id = ?').bind(id).all<any>();
    const freshEmpIds = freshAssignments.results ? freshAssignments.results.map((r: any) => r.employe_id) : [];

    // Notifier les employés nouvellement assignés
    const newlyAssigned = freshEmpIds.filter((empId: string) => !oldEmpIds.includes(empId));
    if (newlyAssigned.length > 0) {
      try {
        const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(appt.document_id).first<any>();
        const client = doc ? await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(doc.client_id).first<any>() : null;
        
        const emailConfig = await c.env.DB.prepare('SELECT * FROM configurations_emails WHERE flux_type = "employee_notification"').first<any>();
        const companyConfig = await c.env.DB.prepare('SELECT nom_entreprise FROM entreprise_config WHERE id = "default"').first<any>();
        const companyName = companyConfig?.nom_entreprise || 'Shampooine Le';

        for (const empId of newlyAssigned) {
          const emp = await c.env.DB.prepare('SELECT * FROM employes WHERE id = ?').bind(empId).first<any>();
          if (emp && emp.email) {
            let subject = emailConfig ? emailConfig.sujet : `Nouvelle intervention assignee - ${companyName}`;
            let bodyText = emailConfig 
              ? emailConfig.corps_message 
              : 'Bonjour {NOM_EMPLOYE},\n\nUne nouvelle intervention vous a ete assignee le {DATE_RDV} a {HEURE_RDV}.\nClient: {PRENOM_CLIENT} {NOM_CLIENT}.\n\nBonne intervention,\n{NOM_ENTREPRISE}';
              
            const replacements: Record<string, string> = {
              NOM_EMPLOYE: `${emp.first_name} ${emp.last_name}`,
              DATE_RDV: appt.date,
              HEURE_RDV: appt.start_time,
              PRENOM_CLIENT: client ? client.first_name : '',
              NOM_CLIENT: client ? client.last_name : '',
              NOM_ENTREPRISE: companyName
            };
            
            Object.entries(replacements).forEach(([key, val]) => {
              const tag = `{${key}}`;
              subject = subject.replace(new RegExp(tag, 'g'), val);
              bodyText = bodyText.replace(new RegExp(tag, 'g'), val);
            });
            
            const resendApiKey = c.env.RESEND_API_KEY;
            const from = `${companyName} <notifications@l-iamani.com>`;
            
            if (resendApiKey) {
              const htmlBody = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
                  <div style="background: linear-gradient(135deg, #0ea5e9, #6366f1); padding: 20px 24px; border-radius: 12px; margin-bottom: 24px;">
                    <h2 style="color: white; font-weight: 800; margin: 0; font-size: 18px;">${companyName}</h2>
                  </div>
                  <div style="white-space: pre-wrap; line-height: 1.7; font-size: 14px; color: #374151;">
                    ${bodyText.replace(/\n/g, '<br/>')}
                  </div>
                  <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
                  <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
                    Cet email a ete envoye automatiquement depuis votre espace ${companyName}.
                  </p>
                </div>
              `;
              try {
                await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    from,
                    to: [emp.email],
                    subject,
                    html: htmlBody
                  })
                });
                console.log(`[Resend Auto-Email] Employee assigned notification email sent to ${emp.email}`);
              } catch (mailErr) {
                console.error('[Resend Auto-Email] Error:', mailErr);
              }
            } else {
              console.log(`[Resend Auto-Email Simulation] Employee assigned notification. Employee email sent to ${emp.email}`);
            }
          }
        }
      } catch (innerErr: any) {
        console.error('[Employee Notification Process Error]:', innerErr);
      }
    }

    return c.json({
      id: appt.id,
      devis_facture_id: appt.document_id,
      title: appt.title,
      date: appt.date,
      start_time: appt.start_time,
      duration_minutes: appt.duration_minutes,
      final_price: appt.final_price,
      status: appt.status,
      notes: appt.notes,
      source_creation: appt.source_creation || 'admin',
      assigned_employee_ids: freshEmpIds
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete('/appointments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM planning WHERE id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM planning_employes WHERE planning_id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.put('/admin/planning/update', async (c) => {
  try {
    const { appointmentId, apptData, docId, docLines, docData } = await c.req.json();

    // 1. Update appointment
    if (apptData) {
      const apptColumns = Object.keys(apptData)
        .filter((k) => k !== 'assigned_employee_ids' && k !== 'id' && k !== 'devis_facture_id')
        .map((k) => `${k === 'devis_facture_id' ? 'document_id' : k} = ?`)
        .join(', ');

      if (apptColumns) {
        const apptValues = Object.keys(apptData)
          .filter((k) => k !== 'assigned_employee_ids' && k !== 'id' && k !== 'devis_facture_id')
          .map((k) => apptData[k]);
        
        await c.env.DB.prepare(
          `UPDATE planning SET ${apptColumns} WHERE id = ?`
        )
          .bind(...apptValues, appointmentId)
          .run();
      }

      // Handle employee assignment update if present
      if (apptData.assigned_employee_ids && Array.isArray(apptData.assigned_employee_ids)) {
        await c.env.DB.prepare('DELETE FROM planning_employes WHERE planning_id = ?').bind(appointmentId).run();
        const assignmentsStmts = apptData.assigned_employee_ids.map((empId: string) => {
          return c.env.DB.prepare(
            'INSERT INTO planning_employes (planning_id, employe_id) VALUES (?, ?)'
          ).bind(appointmentId, empId);
        });
        if (assignmentsStmts.length > 0) {
          await c.env.DB.batch(assignmentsStmts);
        }
      }
    }

    // 2. Update document and lines
    if (docId && docLines) {
      const totalAmount = docLines.reduce((acc: number, current: any) => acc + current.total_price, 0);
      
      const docUpdates = docData ? { ...docData, total_amount: totalAmount } : { total_amount: totalAmount };
      const docColumns = Object.keys(docUpdates).map((k) => `${k} = ?`).join(', ');
      const docValues = Object.values(docUpdates);

      await c.env.DB.prepare(`UPDATE documents SET ${docColumns} WHERE id = ?`)
        .bind(...docValues, docId)
        .run();

      // Update lines
      await c.env.DB.prepare('DELETE FROM lignes_documents WHERE document_id = ?').bind(docId).run();
      const lineStmts = docLines.map((line: any, lIdx: number) => {
        const lineId = line.id || `line-${docId}-${lIdx}`;
        return c.env.DB.prepare(
          'INSERT INTO lignes_documents (id, document_id, prestation_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(lineId, docId, line.prestation_name, line.quantity, line.unit_price, line.total_price);
      });

      if (lineStmts.length > 0) {
        await c.env.DB.batch(lineStmts);
      }

      // Update planning final price
      await c.env.DB.prepare('UPDATE planning SET final_price = ? WHERE id = ?').bind(totalAmount, appointmentId).run();
    }

    // Fetch fresh values
    const appt = await c.env.DB.prepare('SELECT * FROM planning WHERE id = ?').bind(appointmentId).first<any>();
    const freshAssignments = await c.env.DB.prepare('SELECT employe_id FROM planning_employes WHERE planning_id = ?').bind(appointmentId).all<any>();
    
    let freshDoc = undefined;
    if (docId) {
      freshDoc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(docId).first();
    }

    return c.json({
      appointment: {
        id: appt.id,
        devis_facture_id: appt.document_id,
        title: appt.title,
        date: appt.date,
        start_time: appt.start_time,
        duration_minutes: appt.duration_minutes,
        final_price: appt.final_price,
        status: appt.status,
        notes: appt.notes,
        source_creation: appt.source_creation || 'admin',
        assigned_employee_ids: freshAssignments.results.map((r: any) => r.employe_id)
      },
      document: freshDoc
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ==========================================
// ENTREPRISE CONFIG
// ==========================================

app.get('/entreprise-config', async (c) => {
  try {
    const config = await c.env.DB.prepare('SELECT * FROM entreprise_config WHERE id = "default"').first<any>();
    if (!config) {
      return c.json({
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
        activer_majoration: true,
        admin_username: 'shampooinele.direction',
        admin_email_contact: ''
      });
    }

    return c.json({
      ...config,
      majorat_tarif_nuit_pct: config.majorat_tarif_nuit_pct !== undefined ? config.majorat_tarif_nuit_pct : 25,
      plage_majoration_debut: config.plage_majoration_debut || '19:00',
      plage_majoration_fin: config.plage_majoration_fin || '06:00',
      activer_majoration: config.activer_majoration !== undefined ? (config.activer_majoration ? true : false) : true,
      admin_username: config.admin_username || 'shampooinele.direction',
      admin_email_contact: config.admin_email_contact || ''
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.put('/admin/entreprise-config', async (c) => {
  try {
    const body = await c.req.json();
    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO entreprise_config (
        id, nom_entreprise, telephone, adresse_siege, horaires, siret, code_ape, 
        tva_intracommunautaire, forme_juridique, capital_social, logo_url,
        admin_username, admin_email_contact, admin_password_hash
      ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        body.nom_entreprise,
        body.telephone,
        body.adresse_siege,
        body.horaires,
        body.siret,
        body.code_ape,
        body.tva_intracommunautaire,
        body.forme_juridique,
        body.capital_social,
        body.logo_url,
        body.admin_username || 'shampooinele.direction',
        body.admin_email_contact || '',
        body.admin_password_hash || 'admin123'
      )
      .run();
    return c.json(body);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ==========================================
// PHOTOS (FICHIERS JOINTS)
// ==========================================

app.get('/photos', async (c) => {
  try {
    const devisFactureId = c.req.query('devis_facture_id');
    let query = 'SELECT * FROM fichiers_joint';
    let bindingVal = null;
    if (devisFactureId) {
      query += ' WHERE document_id = ?';
      bindingVal = devisFactureId;
    }

    const stmt = bindingVal ? c.env.DB.prepare(query).bind(bindingVal) : c.env.DB.prepare(query);
    const { results } = await stmt.all<any>();

    // Map database fields to frontend fields
    const mapped = results.map((r) => ({
      id: r.id,
      devis_facture_id: r.document_id,
      photo_url: r.file_url,
      caption: r.caption,
      before_after: r.before_after
    }));

    return c.json(mapped);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/photos', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `photo-${Date.now()}`;
    const fileName = body.file_name || `photo-${id}.jpg`;
    
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO fichiers_joint (id, document_id, file_name, file_url, before_after, caption) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(id, body.devis_facture_id, fileName, body.photo_url, body.before_after, body.caption || '')
      .run();

    return c.json({
      id,
      devis_facture_id: body.devis_facture_id,
      photo_url: body.photo_url,
      caption: body.caption,
      before_after: body.before_after
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete('/photos/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM fichiers_joint WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ==========================================
// EMAIL CONFIG & SENDING
// ==========================================

app.get('/emails/config', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM configurations_emails').all();
    if (results.length === 0) {
      const defaultTemplates = [
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
      ];

      for (const t of defaultTemplates) {
        await c.env.DB.prepare(
          'INSERT OR IGNORE INTO configurations_emails (id, flux_type, sujet, corps_message) VALUES (?, ?, ?, ?)'
        )
          .bind(t.id, t.flux_type, t.sujet, t.corps_message)
          .run();
      }

      const refreshed = await c.env.DB.prepare('SELECT * FROM configurations_emails').all();
      return c.json(refreshed.results);
    }
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/emails/config', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `email-conf-${Date.now()}`;
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO configurations_emails (id, flux_type, sujet, corps_message) VALUES (?, ?, ?, ?)'
    )
      .bind(id, body.flux_type, body.sujet, body.corps_message)
      .run();
    return c.json(body);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/emails/send', async (c) => {
  try {
    const { recipientEmail, subject, body, fromName, fluxType, replacements } = await c.req.json();
    const resendApiKey = c.env.RESEND_API_KEY;

    // Validation de base
    if (!recipientEmail) {
      return c.json({ success: false, error: 'recipientEmail est requis' }, 400);
    }

    let finalSubject = subject || 'Notification Shampooine Le';
    let finalBody = body || '';

    // Handle automated template triggers if fluxType/replacements specified
    if (fluxType && replacements) {
      const config = await c.env.DB.prepare(
        'SELECT * FROM configurations_emails WHERE flux_type = ?'
      )
        .bind(fluxType)
        .first<any>();

      const companyConfig = await c.env.DB.prepare('SELECT nom_entreprise FROM entreprise_config WHERE id = "default"').first<any>();
      const companyName = companyConfig?.nom_entreprise || 'Shampooine Le';

      finalSubject = config ? config.sujet : `Notification de ${companyName}`;
      finalBody = config ? config.corps_message : 'Bonjour, ...';

      // Substitutes
      Object.entries(replacements).forEach(([key, val]) => {
        const tag = `{${key}}`;
        finalSubject = finalSubject.replace(new RegExp(tag, 'g'), String(val));
        finalBody = finalBody.replace(new RegExp(tag, 'g'), String(val));
      });

      if (replacements.NOTE_VIREMENT) {
        finalBody += '\n\n' + replacements.NOTE_VIREMENT;
      }
    }

    if (!resendApiKey) {
      console.warn('[Resend] RESEND_API_KEY manquante dans les variables d\'environnement Cloudflare Pages !');
      console.warn('[Resend] Simulation: to=' + recipientEmail + ' | subject=' + finalSubject);
      return c.json({
        success: true,
        subject: finalSubject,
        body: finalBody,
        sentTo: recipientEmail,
        simulated: true,
        warning: 'RESEND_API_KEY non configuree - email simule uniquement'
      });
    }

    const validatedFromName = fromName || 'Shampooine Le';
    // Domaine verifie l-iamani.com - peut envoyer vers n'importe quelle adresse
    const from = `${validatedFromName} <notifications@l-iamani.com>`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #6366f1); padding: 20px 24px; border-radius: 12px; margin-bottom: 24px;">
          <h2 style="color: white; font-weight: 800; margin: 0; font-size: 18px;">${validatedFromName}</h2>
        </div>
        <div style="white-space: pre-wrap; line-height: 1.7; font-size: 14px; color: #374151;">
          ${finalBody.replace(/\n/g, '<br/>')}
        </div>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          Cet email a été envoyé automatiquement depuis votre espace ${validatedFromName}.
        </p>
      </div>
    `;

    console.log(`[Resend] Tentative envoi email vers: ${recipientEmail} | sujet: ${finalSubject}`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [recipientEmail],
        subject: finalSubject,
        html: htmlBody
      })
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error('[Resend] ERREUR API:', JSON.stringify(data));
      console.error('[Resend] Status HTTP:', response.status);
      console.error('[Resend] From:', from, '| To:', recipientEmail);
      return c.json({ 
        success: false, 
        error: data.message || data.name || 'Erreur API Resend',
        details: data,
        from,
        to: recipientEmail
      }, 400);
    }

    console.log(`[Resend] ✅ Email envoye avec succes! ID: ${data.id}`);
    return c.json({
      success: true,
      subject: finalSubject,
      body: finalBody,
      sentTo: recipientEmail,
      resendData: data
    });
  } catch (e: any) {
    console.error('[Resend] Exception:', e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.post('/admin/documents/renvoyer', async (c) => {
  try {
    const { documentId, origin } = await c.req.json();
    if (!documentId) {
      return c.json({ error: 'documentId est requis' }, 400);
    }

    const resendApiKey = c.env.RESEND_API_KEY;

    // 1. Fetch document
    const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(documentId).first<any>();
    if (!doc) {
      return c.json({ error: 'Document non trouvé' }, 404);
    }

    // 2. Fetch client
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(doc.client_id).first<any>();
    if (!client) {
      return c.json({ error: 'Client non trouvé' }, 404);
    }

    if (!client.email || !client.email.includes('@')) {
      return c.json({ error: `Email client invalide ou manquant: "${client.email}"` }, 400);
    }

    // 3. Fetch email config, company config, document lines
    const targetFlux = doc.type === 'devis' ? 'devis_sending' : 'facture_sending';
    const [emailConfig, companyConfig, { results: lines }] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM configurations_emails WHERE flux_type = ?').bind(targetFlux).first<any>(),
      c.env.DB.prepare('SELECT * FROM entreprise_config WHERE id = "default"').first<any>(),
      c.env.DB.prepare('SELECT * FROM lignes_documents WHERE document_id = ?').bind(documentId).all<any>()
    ]);

    const companyName = companyConfig?.nom_entreprise || 'Shampooine Le';
    const isB2B = client.type_client === 'professionnel';
    const totalTTC = doc.total_amount || 0;
    const totalHT = isB2B ? totalTTC : (totalTTC / 1.20);
    const tvaAmt = isB2B ? 0 : (totalTTC - totalHT);

    // 4. Build email subject/body
    let subject = emailConfig ? emailConfig.sujet : (doc.type === 'devis' ? `Votre devis de prestation - ${companyName}` : `Votre facture de prestation - ${companyName}`);
    let body = emailConfig
      ? emailConfig.corps_message
      : (doc.type === 'devis'
        ? 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nVeuillez trouver ci-joint votre devis concernant nos services de nettoyage de textile.\n\nCordialement,\nL\'équipe {NOM_ENTREPRISE}'
        : 'Bonjour {PRENOM_CLIENT} {NOM_CLIENT},\n\nVeuillez trouver ci-joint votre facture concernant nos services de nettoyage de textile.\n\nCordialement,\nL\'équipe {NOM_ENTREPRISE}');

    const reqOrigin = origin || new URL(c.req.url).origin;
    const documentLink = `${reqOrigin}/signature-devis?id=${doc.id}`;

    const replacements: Record<string, string> = {
      PRENOM_CLIENT: client.first_name || '',
      NOM_CLIENT: client.last_name || '',
      TYPE_DOCUMENT: doc.type === 'devis' ? 'Devis' : 'Facture',
      NUMERO_DOCUMENT: doc.number || doc.id,
      TOTAL_DOCUMENT: `${totalTTC.toFixed(2)} €`,
      TOTAL: `${totalTTC.toFixed(2)} €`,
      LIEN_UNIQUE: documentLink,
      LIEN_DOCUMENT: documentLink,
      NOM_ENTREPRISE: companyName
    };

    Object.entries(replacements).forEach(([key, val]) => {
      const tag = `{${key}}`;
      subject = subject.replace(new RegExp(tag, 'g'), val);
      body = body.replace(new RegExp(tag, 'g'), val);
    });

    // 5. ✅ GÉNÉRATION DU VRAI PDF DU DOCUMENT (pièce jointe PDF)
    const docTypeLabel = doc.type === 'devis' ? 'DEVIS' : 'FACTURE';
    let docBase64 = '';
    try {
      const pdfBytes = await generateInvoicePDF(doc, client, lines, companyConfig);
      const base64Chunks: string[] = [];
      const chunkSize = 8192;
      for (let i = 0; i < pdfBytes.length; i += chunkSize) {
        base64Chunks.push(String.fromCharCode(...pdfBytes.slice(i, i + chunkSize)));
      }
      docBase64 = btoa(base64Chunks.join(''));
    } catch (pdfErr: any) {
      console.error('[PDF Generation Error]:', pdfErr);
      const encoder = new TextEncoder();
      const fallbackBytes = encoder.encode(`Erreur generation PDF: ${pdfErr.message}`);
      docBase64 = btoa(String.fromCharCode(...fallbackBytes));
    }
    const attachmentFilename = `${docTypeLabel}-${doc.number || doc.id}.pdf`;

    // 6. Email HTML body (corps du message)
    const from = `${companyName} <notifications@l-iamani.com>`;
    let emailSent = false;
    let resendData: any = null;
    let resendError: any = null;

    if (resendApiKey) {
      const htmlBody = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;">
          <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:20px 24px;border-radius:12px;margin-bottom:24px;">
            <h2 style="color:white;font-weight:800;margin:0;">${companyName}</h2>
          </div>
          <div style="white-space:pre-wrap;line-height:1.7;font-size:14px;color:#374151;">
            ${body.replace(/\n/g, '<br/>')}
          </div>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 18px;margin:24px 0;display:flex;align-items:center;gap:12px;">
            <span style="font-size:22px;">📎</span>
            <div>
              <div style="font-weight:700;color:#0369a1;font-size:13px;">${attachmentFilename}</div>
              <div style="font-size:11px;color:#64748b;margin-top:2px;">Document joint — ouvrez-le pour consulter et imprimer votre ${doc.type}.</div>
            </div>
          </div>
          <hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0;"/>
          <p style="font-size:11px;color:#94a3b8;text-align:center;margin:0;">
            Cet email a été envoyé automatiquement depuis votre espace ${companyName}.
          </p>
        </div>
      `;

      console.log(`[Resend/renvoyer] Tentative vers: ${client.email} | sujet: ${subject} | pièce jointe: ${attachmentFilename}`);

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: [client.email],
          subject,
          html: htmlBody,
          attachments: [
            {
              filename: attachmentFilename,
              content: docBase64
            }
          ]
        })
      });

      resendData = await response.json() as any;
      if (response.ok) {
        emailSent = true;
        console.log(`[Resend/renvoyer] ✅ Email + pièce jointe envoyés! ID: ${resendData.id}`);
      } else {
        resendError = resendData;
        console.error('[Resend/renvoyer] ERREUR:', JSON.stringify(resendData));
        console.error('[Resend/renvoyer] From:', from, '| To:', client.email);
      }
    } else {
      console.warn('[Resend/renvoyer] RESEND_API_KEY manquante - simulation uniquement.');
      emailSent = true;
    }

    // 7. Update document status if currently 'Brouillon'
    let newStatus = doc.status;
    if (emailSent && (doc.status === 'Brouillon' || (doc.type === 'facture' && doc.status === 'Facturé'))) {
      newStatus = 'Envoyé au client';
      await c.env.DB.prepare('UPDATE documents SET status = ? WHERE id = ?').bind(newStatus, doc.id).run();
    }

    return c.json({
      success: emailSent,
      newStatus,
      sentTo: client.email,
      attachmentIncluded: true,
      attachmentFilename,
      resendData,
      resendError,
      simulated: !resendApiKey
    });

  } catch (e: any) {
    console.error('[Resend/renvoyer] Exception:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

// ==========================================
// REVIEWS / AVIS CLIENTS
// ==========================================

app.get('/reviews', async (c) => {
  try {
    const onlyApproved = c.req.query('approved') === 'true';
    let query = 'SELECT * FROM avis_clients';
    if (onlyApproved) {
      query += ' WHERE approuve = 1';
    }
    query += ' ORDER BY created_at DESC';

    const { results } = await c.env.DB.prepare(query).all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/reviews', async (c) => {
  try {
    const body = await c.req.json();
    const id = `review-${Date.now()}`;
    
    await c.env.DB.prepare(
      `INSERT INTO avis_clients (id, client_id, appointment_id, note, commentaire, afficher_nom, approuve) 
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    )
      .bind(
        id,
        body.client_id,
        body.appointment_id,
        body.note,
        body.commentaire,
        body.afficher_nom !== undefined ? (body.afficher_nom ? 1 : 0) : 1
      )
      .run();

    const fresh = await c.env.DB.prepare('SELECT * FROM avis_clients WHERE id = ?').bind(id).first();
    return c.json(fresh);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/reviews/:id/approve', async (c) => {
  try {
    const id = c.req.param('id');
    const { approved } = await c.req.json();
    await c.env.DB.prepare('UPDATE avis_clients SET approuve = ? WHERE id = ?')
      .bind(approved ? 1 : 0, id)
      .run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete('/reviews/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM avis_clients WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ==========================================
// BUSINESS HOURS & HOLIDAYS
// ==========================================

app.get('/entreprise-horaires', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM entreprise_horaires ORDER BY jour_semaine ASC').all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/entreprise-horaires', async (c) => {
  try {
    const list = await c.req.json();
    const batchStmts = list.map((h: any) => {
      return c.env.DB.prepare(
        `INSERT OR REPLACE INTO entreprise_horaires (id, jour_semaine, heure_debut_matin, heure_fin_matin, heure_debut_apresmidi, heure_fin_apresmidi, est_ouvert) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        h.id,
        h.jour_semaine,
        h.heure_debut_matin,
        h.heure_fin_matin,
        h.heure_debut_apresmidi,
        h.heure_fin_apresmidi,
        h.est_ouvert ? 1 : 0
      );
    });

    if (batchStmts.length > 0) {
      await c.env.DB.batch(batchStmts);
    }
    return c.json(list);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get('/entreprise-fermetures', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM entreprise_fermetures ORDER BY date ASC').all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/entreprise-fermetures', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `f-${Date.now()}`;
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO entreprise_fermetures (id, date, description) VALUES (?, ?, ?)'
    )
      .bind(id, body.date, body.description)
      .run();
    return c.json({ id, ...body });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete('/entreprise-fermetures/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM entreprise_fermetures WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export const onRequest = handle(app);
