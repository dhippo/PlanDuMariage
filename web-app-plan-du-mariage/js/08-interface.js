"use strict";
/* =============================================================================
   08 — INTERFACE (panneau, compteur, éditeur)   ·   Plan du mariage
   -----------------------------------------------------------------------------
   Synchronise le HTML hors-SVG avec l'état : compteur (tables valides +
   couverts), valeurs des réglages, état du bouton « Supprimer » (panneau ET
   jumeau de la barre mobile), éditeur de forme flottant, et fabrique de
   pastilles de couleur (swatches). Appelé en fin de render() via majInterface().

   Dépend de   : 03-etat, 04-validite (couverts), 09-actions (formeSelectionnee).
   Utilisé par : 05-rendu-base (render appelle majInterface).
   ============================================================================= */

function majInterface(){
  const valides = tables.filter(t => t.planId === planActif && tableValide(t));
  document.getElementById("nb-tables").textContent   = valides.length;
  document.getElementById("nb-couverts").textContent = valides.length * couvertsPourDiametre(settings.diametre);
  document.getElementById("val-diametre").textContent       = settings.diametre;
  document.getElementById("val-espace-chaises").textContent = settings.espaceChaises;
  document.getElementById("val-espace-mur").textContent     = settings.espaceMur;
  document.getElementById("btn-supprimer").disabled = (selection === null);
  const btnMSuppr = document.getElementById("btn-m-suppr");   // jumeau dans la barre mobile
  if(btnMSuppr) btnMSuppr.disabled = (selection === null);

  // Plus de forme sélectionnée → on referme l'outillage tactile associé (éditeur
  // ouvert, mode déplacer/tourner) pour ne pas laisser d'état mobile orphelin.
  if(!formeSelectionnee()){
    editeurOuvert = false;
    if(modeMobile){ modeMobile = null; document.body.classList.remove("mode-deplacer", "mode-tourner"); }
  }

  majEditeurForme();   // feuille d'édition (desktop : liée à la sélection ; mobile : si editeurOuvert)
  majActionsForme();   // menu d'actions tactile (mobile)
  majModeUI();         // bannière + bouton « Valider » du mode tactile (mobile)
}

// L'éditeur de forme FLOTTANT (en haut à droite du plan) n'est visible que si une
// forme est sélectionnée. On ne réécrit pas le champ en cours d'édition (pour ne
// pas gêner la saisie). Les pastilles de fond/contour reflètent la forme.
// MOBILE : il ne s'ouvre PAS automatiquement à la sélection (il masquerait le
// plan) — seulement via le menu d'actions « Éditer » (editeurOuvert). Desktop :
// comportement inchangé (lié à la sélection).
function majEditeurForme(){
  const ed = document.getElementById("editeur-forme");
  const f = formeSelectionnee();
  if(!f || (estMobile() && !editeurOuvert)){ ed.hidden = true; return; }
  ed.hidden = false;
  const actif = document.activeElement;
  const tt = document.getElementById("fe-titre");
  const tw = document.getElementById("fe-w");
  const th = document.getElementById("fe-h");
  const ta = document.getElementById("fe-angle");
  if(actif !== tt) tt.value = f.titre;
  if(actif !== tw) tw.value = Math.round(f.w);
  if(actif !== th) th.value = Math.round(f.h);
  if(actif !== ta) ta.value = Math.round(f.angle || 0);   // reflète la rotation en direct
  activerSwatch("fe-fond", f.fond);
  activerSwatch("fe-bord", f.bord);
}

// Construit une rangée de pastilles de couleur dans le conteneur donné.
// onPick(couleur) est appelé au clic.
function peuplerSwatches(containerId, onPick){
  const c = document.getElementById(containerId);
  c.replaceChildren();
  for(const col of PALETTE_FORME){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pastille-couleur";
    b.style.background = col;
    b.dataset.c = col;
    b.title = col;
    b.addEventListener("click", () => onPick(col));
    c.appendChild(b);
  }
}

// Marque la pastille active (couleur courante) dans un conteneur de swatches.
function activerSwatch(containerId, couleur){
  for(const b of document.getElementById(containerId).children)
    b.classList.toggle("active", b.dataset.c === couleur);
}

/* ---- Interface TACTILE (mobile) : menu d'actions, mode, onglets ---------- */

// Menu d'actions flottant (« Déplacer / Éditer / Tourner ») : visible quand une
// forme est sélectionnée sur mobile, hors éditeur et hors mode. C'est le « hub »
// d'où l'on lance chaque action ; on y revient après (Valider / fermeture).
function majActionsForme(){
  const pop = document.getElementById("forme-actions");
  if(!pop) return;
  const f = formeSelectionnee();
  if(!(estMobile() && f && !editeurOuvert && !modeMobile)){ pop.hidden = true; return; }
  pop.hidden = false;
  positionnerActionsForme(f);
}

// Masque le menu d'actions sans toucher à la sélection (pendant un pan/pinch :
// la forme bouge à l'écran, on le repositionnera à la fin du geste).
function masquerActionsForme(){
  const pop = document.getElementById("forme-actions");
  if(pop) pop.hidden = true;
}

// Place le menu juste au-dessus du centre de la forme (ou en dessous s'il manque
// de place sous le header), en restant dans l'écran.
function positionnerActionsForme(f){
  const pop = document.getElementById("forme-actions");
  const ctm = svg.getScreenCTM();
  if(!pop || !ctm) return;
  const [cx, cy] = centreForme(f);
  const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
  const s = pt.matrixTransform(ctm);            // centre de la forme en pixels écran
  const w = pop.offsetWidth, h = pop.offsetHeight, M = 8, HAUT = 56;   // HAUT ≈ bas du header
  let left = Math.max(M, Math.min(window.innerWidth - w - M, s.x - w/2));
  let top  = s.y - h - 18;                       // au-dessus de la forme par défaut
  if(top < HAUT) top = s.y + 26;                 // pas de place en haut → en dessous
  top = Math.max(HAUT, Math.min(window.innerHeight - h - M, top));
  pop.style.left = Math.round(left) + "px";
  pop.style.top  = Math.round(top)  + "px";
}

// Bannière du mode tactile (le bouton « Valider » et le cadre coloré sont gérés
// en CSS via les classes body.mode-*).
function majModeUI(){
  const ban = document.getElementById("mode-banniere");
  if(!ban) return;
  if(!modeMobile){ ban.hidden = true; return; }
  ban.hidden = false;
  document.getElementById("mode-banniere-txt").textContent =
    modeMobile === "deplacer"
      ? "Déplacement · glissez la forme"
      : "Rotation · glissez pour tourner";
}

// Onglet actif de l'éditeur (mobile) : surligne le bouton + met à jour aria.
function majOngletActif(i){
  for(const b of document.querySelectorAll(".fe-onglet")){
    const actif = +b.dataset.onglet === i;
    b.classList.toggle("active", actif);
    b.setAttribute("aria-selected", actif ? "true" : "false");
  }
}
