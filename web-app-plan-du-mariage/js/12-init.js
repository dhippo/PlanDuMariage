"use strict";
/* =============================================================================
   12 — INITIALISATION (câblage & démarrage)   ·   Plan du mariage
   -----------------------------------------------------------------------------
   Le POINT D'ENTRÉE. init() remplit le sélecteur de plan, câble tous les boutons
   (panneau + barre mobile), les modales, l'éditeur de forme, les réglages, le
   zoom et les raccourcis clavier (Échap, Entrée, Suppr), puis fait le premier
   render() et dimensionne le SVG. L'appel init() en bas DOIT rester le dernier
   code exécuté de toute l'app.

   RESPONSIVE — les boutons #btn-m-* de la barre mobile sont câblés ici aux
   MÊMES fonctions que le panneau ; le CSS décide lesquels sont visibles.

   Dépend de   : TOUS les fichiers précédents (01 à 11).
   Position 12 — DOIT être chargé en dernier.
   ============================================================================= */

function init(){
  // Sélecteur de plan, rempli depuis PLANS.
  const sel = document.getElementById("select-plan");
  for(const id in PLANS){
    const o = document.createElement("option");
    o.value = id; o.textContent = PLANS[id].nom;
    sel.appendChild(o);
  }
  sel.value = planActif;
  sel.addEventListener("change", () => {
    planActif = sel.value; selection = null; drag = null; render();
  });

  // Boutons d'ajout. Table = direct (réglages partagés à gauche) ; forme & arbre
  // passent d'abord par une modale.
  document.getElementById("btn-ajouter").addEventListener("click", ajouterTable);
  document.getElementById("btn-ajouter-forme").addEventListener("click", ouvrirModaleForme);
  document.getElementById("btn-ajouter-arbre").addEventListener("click", ouvrirModaleArbre);
  document.getElementById("btn-supprimer").addEventListener("click", supprimerSelection);

  // Barre d'outils mobile : MÊMES actions que le panneau + ouverture de la
  // feuille « Réglages ». (Les boutons n'existent qu'une fois ; le CSS décide
  // lesquels sont visibles selon la taille d'écran.)
  document.getElementById("btn-m-table").addEventListener("click", ajouterTable);
  document.getElementById("btn-m-forme").addEventListener("click", ouvrirModaleForme);
  document.getElementById("btn-m-arbre").addEventListener("click", ouvrirModaleArbre);
  document.getElementById("btn-m-suppr").addEventListener("click", supprimerSelection);
  document.getElementById("btn-m-reglages").addEventListener("click", () => basculerReglages());
  document.getElementById("btn-fermer-reglages").addEventListener("click", () => basculerReglages(false));
  document.getElementById("sheet-backdrop").addEventListener("click", () => basculerReglages(false));

  // Fermeture des modales : croix, clic sur le fond, bouton « Annuler », touche Échap.
  for(const b of document.querySelectorAll("[data-close]"))
    b.addEventListener("click", () => fermerModale(b.dataset.close));
  document.addEventListener("keydown", e => {
    if(e.key === "Escape"){ fermerToutesModales(); basculerReglages(false); }
  });
  // Touche Entrée dans une modale ouverte : équivaut à cliquer « Ajouter ».
  // Forme : toujours possible (un type est sélectionné par défaut).
  // Arbre : seulement si une vignette est sélectionnée (sinon le bouton est désactivé).
  document.addEventListener("keydown", e => {
    if(e.key !== "Enter") return;
    if(!document.getElementById("modal-forme").hidden){
      e.preventDefault();
      creerFormeDepuisModale();
    } else if(!document.getElementById("modal-arbre").hidden && arbreChoisi){
      e.preventDefault();
      poserArbreChoisi();
    }
  });

  // --- Modale ARBRE : grille des 40 vignettes (sélection puis « Ajouter ») ---
  const grille = document.getElementById("arbre-grille");
  for(let n = 1; n <= NB_ARBRES; n++){
    const b = document.createElement("button");
    b.type = "button"; b.className = "arbre-vignette"; b.dataset.n = n; b.title = "Arbre " + n;
    const img = document.createElement("img");
    img.src = urlArbre(n); img.alt = "Arbre " + n; img.loading = "lazy";
    b.appendChild(img);
    b.addEventListener("click", () => {
      arbreChoisi = n;
      for(const v of grille.children) v.classList.toggle("active", +v.dataset.n === n);
      document.getElementById("arbre-confirmer").disabled = false;
    });
    grille.appendChild(b);
  }
  document.getElementById("arbre-confirmer").addEventListener("click", poserArbreChoisi);

  // --- Modale FORME : choix du type + pastilles fond/contour + validation ---
  for(const b of document.querySelectorAll("#forme-types .forme-type"))
    b.addEventListener("click", () => {
      for(const x of document.querySelectorAll("#forme-types .forme-type"))
        x.classList.toggle("active", x === b);
    });
  peuplerSwatches("forme-fond", c => { formeFond = c; activerSwatch("forme-fond", c); });
  peuplerSwatches("forme-bord", c => { formeBord = c; activerSwatch("forme-bord", c); });
  document.getElementById("forme-confirmer").addEventListener("click", creerFormeDepuisModale);

  // --- Éditeur de forme FLOTTANT (visible quand une forme est sélectionnée) ---
  document.getElementById("fe-titre").addEventListener("input", e => {
    const f = formeSelectionnee(); if(!f) return; f.titre = e.target.value; render();
  });
  const majDimForme = (champ, prop) =>
    document.getElementById(champ).addEventListener("input", e => {
      const f = formeSelectionnee(); if(!f) return;
      f[prop] = Math.max(40, Math.round(+e.target.value || 40)); render();
    });
  majDimForme("fe-w", "w");
  majDimForme("fe-h", "h");
  // Rotation : champ numérique (saisie d'un angle précis) + bouton « Remettre droit ».
  document.getElementById("fe-angle").addEventListener("input", e => {
    const f = formeSelectionnee(); if(!f) return;
    f.angle = normaliserAngle(+e.target.value || 0); render();
  });
  document.getElementById("fe-angle-reset").addEventListener("click", () => {
    const f = formeSelectionnee(); if(!f) return; f.angle = 0; render();
  });
  peuplerSwatches("fe-fond", c => { const f = formeSelectionnee(); if(!f) return; f.fond = c; render(); });
  peuplerSwatches("fe-bord", c => { const f = formeSelectionnee(); if(!f) return; f.bord = c; render(); });
  // Fermeture (×) : desktop → désélection (inchangé). Mobile → retour au menu
  // d'actions, la forme restant sélectionnée.
  document.getElementById("fe-fermer").addEventListener("click", () => {
    if(estMobile() && editeurOuvert) fermerEditeurMobile(true);
    else { selection = null; render(); }
  });
  document.getElementById("fe-suppr").addEventListener("click", supprimerSelection);

  // --- Interaction TACTILE des formes (mobile) : menu d'actions, modes, onglets ---
  // « Enregistrer » : referme la feuille (modifs déjà appliquées) et revient au plan.
  document.getElementById("fe-enregistrer").addEventListener("click", () => fermerEditeurMobile(false));
  document.getElementById("fa-deplacer").addEventListener("click", () => entrerModeMobile("deplacer"));
  document.getElementById("fa-editer").addEventListener("click", ouvrirEditeurMobile);
  document.getElementById("fa-tourner").addEventListener("click", () => entrerModeMobile("tourner"));
  document.getElementById("btn-valider-mode").addEventListener("click", sortirModeMobile);

  // Onglets de l'éditeur : le bouton fait défiler vers son panneau ; le balayage
  // (scroll horizontal) met à jour l'onglet actif. Inerte sur desktop (onglets
  // masqués, fe-panels en display:contents donc clientWidth = 0).
  const fePanels = document.getElementById("fe-panels");
  for(const b of document.querySelectorAll(".fe-onglet"))
    b.addEventListener("click", () => {
      const i = +b.dataset.onglet;
      if(fePanels && fePanels.clientWidth)
        fePanels.scrollTo({ left: i * fePanels.clientWidth, behavior:"smooth" });
      majOngletActif(i);
    });
  if(fePanels)
    fePanels.addEventListener("scroll", () => {
      const w = fePanels.clientWidth;
      if(w) majOngletActif(Math.round(fePanels.scrollLeft / w));
    });

  // Réglages (chaque changement => render()).
  const rngD = document.getElementById("rng-diametre");
  const rngC = document.getElementById("rng-espace-chaises");
  const rngM = document.getElementById("rng-espace-mur");
  rngD.value = settings.diametre;
  rngC.value = settings.espaceChaises;
  rngM.value = settings.espaceMur;
  rngD.addEventListener("input", () => { settings.diametre      = +rngD.value; render(); });
  rngC.addEventListener("input", () => { settings.espaceChaises = +rngC.value; render(); });
  rngM.addEventListener("input", () => { settings.espaceMur     = +rngM.value; render(); });

  // Zoom du plan (curseur desktop) : zoom centré sur le MILIEU de la scène, via
  // le même chemin que le trackpad/pinch (zoomerVers gère SVG + scroll + maj).
  const rngZoom = document.getElementById("rng-zoom");
  majCurseurZoom();
  rngZoom.addEventListener("input", () => {
    const sr = scene.getBoundingClientRect();
    zoomerVers(+rngZoom.value / 100, sr.left + sr.width / 2, sr.top + sr.height / 2);
  });

  // Touche Suppr / Retour arrière : effacer l'élément sélectionné.
  // (sauf si on est en train de saisir du texte dans un champ)
  document.addEventListener("keydown", e => {
    const saisie = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ""));
    if((e.key === "Delete" || e.key === "Backspace") && selection && !saisie){
      e.preventDefault();
      supprimerSelection();
    }
  });

  normaliserArbres();                                // ids stables pour le décor "en dur"
  render();
  mesurerBaseScene();                                // zone utile de la scène
  appliquerZoom();                                   // dimensionne le SVG au démarrage
  // Au resize / rotation d'écran : on remesure la base puis on réapplique. Un
  // simple repositionnement du menu d'actions suffit (léger) ; on ne reconstruit
  // le SVG (render) qu'au FRANCHISSEMENT du seuil mobile/desktop, où l'on purge
  // aussi tout état tactile résiduel.
  let etaitMobile = estMobile();
  window.addEventListener("resize", () => {
    mesurerBaseScene(); appliquerZoom();
    const mobile = estMobile();
    if(mobile !== etaitMobile){
      etaitMobile = mobile;
      if(!mobile){
        editeurOuvert = false; modeMobile = null;
        document.body.classList.remove("mode-deplacer", "mode-tourner");
      }
      render();
    } else {
      majInterface();
    }
  });
}

init();
