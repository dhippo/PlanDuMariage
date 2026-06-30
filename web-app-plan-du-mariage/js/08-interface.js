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
  majEditeurForme();
}

// L'éditeur de forme FLOTTANT (en haut à droite du plan) n'est visible que si une
// forme est sélectionnée. On ne réécrit pas le champ en cours d'édition (pour ne
// pas gêner la saisie). Les pastilles de fond/contour reflètent la forme.
function majEditeurForme(){
  const ed = document.getElementById("editeur-forme");
  const f = formeSelectionnee();
  if(!f){ ed.hidden = true; return; }
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
