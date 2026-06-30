"use strict";
/* =============================================================================
   09 — ACTIONS SUR L'ÉTAT   ·   Plan du mariage
   -----------------------------------------------------------------------------
   Les mutations de l'état déclenchées par l'utilisateur : ajouter une table /
   une forme / un arbre, lire la forme sélectionnée, supprimer la sélection.
   Chaque action modifie l'état PUIS appelle render(). Inclut l'API console
   (window.ajouterArbre / window.exporterArbres) pour figer le décor d'arbres.

   Dépend de   : 02-plans, 03-etat, 01-geometrie (centroide), 05-rendu (render),
                 10-modales (fermerModale, à l'exécution).
   Utilisé par : 08-interface (formeSelectionnee), 10-modales, 12-init (boutons).
   ============================================================================= */

function ajouterTable(){
  const s = PLANS[planActif].spawn;
  const n = tables.filter(t => t.planId === planActif).length;
  const decal = (n % 6) * 35;   // léger décalage en cascade pour ne pas empiler
  const t = { id: idSuivant++, planId: planActif, x: s[0] + decal, y: s[1] + decal };
  tables.push(t);
  selection = { type:"table", id: t.id };
  render();
}

// Crée une forme (depuis la modale). opts = { type, titre, w, h, fond, bord }.
// Apparaît près du centre de la 1re pièce praticable, en cascade légère.
function ajouterForme(opts){
  const ctr = centroide(contoursDe(PLANS[planActif])[0]);
  const n = formes.filter(f => f.planId === planActif).length;
  const decal = (n % 6) * 30;
  const w = Math.max(40, Math.round(opts.w || 200));
  const h = Math.max(40, Math.round(opts.h || 120));
  const f = { id: idSuivantForme++, planId: planActif, type: opts.type || "rect",
    x: Math.round(ctr[0] - w/2 + decal), y: Math.round(ctr[1] - h/2 + decal),
    w, h, titre: opts.titre || "", angle: 0,
    fond: opts.fond || FORME_FOND_DEFAUT, bord: opts.bord || FORME_BORD_DEFAUT };
  formes.push(f);
  selection = { type:"forme", id: f.id };
  render();
  return f;
}

// La forme actuellement sélectionnée, ou null.
function formeSelectionnee(){
  return (selection && selection.type === "forme")
    ? formes.find(x => x.id === selection.id) : null;
}

// Supprime l'élément sélectionné (table, forme OU arbre-image).
function supprimerSelection(){
  if(!selection) return;
  let liste;
  if(selection.type === "forme")      liste = formes;
  else if(selection.type === "arbre") liste = arbresImgDe(PLANS[planActif]);
  else                                liste = tables;
  const i = liste.findIndex(x => x.id === selection.id);
  if(i >= 0) liste.splice(i, 1);
  selection = null;
  render();
}


/* ----- Arbres-images : pose par numéro (API + bouton) ------------------- */

// Pose l'arbre n (1→40) sur le PLAN AFFICHÉ, centré en (x,y) cm, diamètre d cm.
// Renvoie l'entrée créée. Pensé pour la console :  ajouterArbre(24, 1500, 900)
// (le diamètre est optionnel). Le décor n'est PAS persistant : pour le figer,
// recopier le résultat d'exporterArbres() dans les données (PLANS) de app.js.
function ajouterArbre(n, x, y, d){
  n = Math.max(1, Math.min(NB_ARBRES, Math.round(n)));
  const a = { id: idSuivantArbre++, n, angle: 0,
    x: Math.round(x), y: Math.round(y), d: Math.round(d || ARBRE_D_DEFAUT) };
  arbresImgDe(PLANS[planActif]).push(a);
  selection = { type:"arbre", id: a.id };
  render();
  return a;
}

// Pose l'arbre CHOISI dans la modale près du centre du plan (à déplacer ensuite
// à la souris/au doigt). Léger décalage en cascade pour ne pas empiler.
function poserArbreChoisi(){
  if(!arbreChoisi) return;
  const plan = PLANS[planActif];
  const ctr = plan.spawn || centroide(contoursDe(plan)[0]);
  const decal = (arbresImgDe(plan).length % 6) * 35;
  ajouterArbre(arbreChoisi, ctr[0] + decal, ctr[1] + decal);
  fermerModale("modal-arbre");
}

// Affiche dans la console le tableau "arbresImg" du plan courant, prêt à coller
// dans les DONNÉES (PLANS) de app.js pour rendre le décor permanent.
function exporterArbres(){
  const liste = PLANS[planActif].arbresImg || [];
  const txt = "arbresImg: [\n" +
    liste.map(a => `      { n:${a.n}, x:${a.x}, y:${a.y}, d:${a.d} },`).join("\n") +
    "\n    ],";
  console.log("// plan « " + planActif + " »\n" + txt);
  return txt;
}

// Accessibles depuis la console du navigateur.
window.ajouterArbre   = ajouterArbre;
window.exporterArbres = exporterArbres;
