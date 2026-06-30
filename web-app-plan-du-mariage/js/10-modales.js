"use strict";
/* =============================================================================
   10 — MODALES & FEUILLE RÉGLAGES   ·   Plan du mariage
   -----------------------------------------------------------------------------
   Ajout d'une FORME et d'un ARBRE : on passe d'abord par une modale. Ouverture/
   fermeture des modales, réinitialisation de leurs champs, validation, et la
   feuille « Réglages » en bottom sheet (mobile). Règle d'empilement : une seule
   surface à la fois — ouvrir une modale ferme d'abord la feuille Réglages.

   RESPONSIVE — basculerReglages() ne sert qu'au mobile (la feuille est masquée
   en CSS sur desktop), mais la fonction est inoffensive sur grand écran.

   Dépend de   : 03-etat (arbreChoisi, formeFond/Bord), 08-interface (swatches),
                 09-actions (ajouterForme via creerFormeDepuisModale).
   Utilisé par : 12-init (câblage des boutons), 09-actions (fermerModale).
   ============================================================================= */

// Ouvre une modale. On ferme d'abord la feuille « Réglages » (mobile) : sinon
// la modale, ouverte depuis un bouton DU panneau (lui-même dans la feuille),
// s'empilerait DERRIÈRE elle. Une seule surface à la fois.
function ouvrirModale(id){ basculerReglages(false); document.getElementById(id).hidden = false; }
function fermerModale(id){ document.getElementById(id).hidden = true; }
function fermerToutesModales(){
  for(const m of document.querySelectorAll(".modal")) m.hidden = true;
}

// Feuille « Réglages » (mobile uniquement, via CSS) : ouvre/ferme le panneau en
// bottom sheet + son fond sombre. Sans argument => bascule l'état courant.
function basculerReglages(ouvrir){
  if(ouvrir === undefined) ouvrir = !document.body.classList.contains("reglages-ouverts");
  document.body.classList.toggle("reglages-ouverts", ouvrir);
  document.getElementById("sheet-backdrop").hidden = !ouvrir;
}

// Modale arbre : remet à zéro la sélection puis l'ouvre.
function ouvrirModaleArbre(){
  arbreChoisi = null;
  document.getElementById("arbre-confirmer").disabled = true;
  for(const v of document.getElementById("arbre-grille").children)
    v.classList.remove("active");
  ouvrirModale("modal-arbre");
}

// Modale forme : réinitialise les champs (type rectangle, couleurs par défaut,
// 200×120, sans titre) puis l'ouvre.
function ouvrirModaleForme(){
  formeFond = FORME_FOND_DEFAUT;
  formeBord = FORME_BORD_DEFAUT;
  for(const b of document.querySelectorAll("#forme-types .forme-type"))
    b.classList.toggle("active", b.dataset.type === "rect");
  document.getElementById("forme-titre").value = "";
  document.getElementById("forme-w").value = 200;
  document.getElementById("forme-h").value = 120;
  activerSwatch("forme-fond", formeFond);
  activerSwatch("forme-bord", formeBord);
  ouvrirModale("modal-forme");
}

// Valide la modale forme : lit les champs et crée la forme sur le plan.
function creerFormeDepuisModale(){
  const typeBtn = document.querySelector("#forme-types .forme-type.active");
  ajouterForme({
    type:  typeBtn ? typeBtn.dataset.type : "rect",
    titre: document.getElementById("forme-titre").value.trim(),
    w:     +document.getElementById("forme-w").value,
    h:     +document.getElementById("forme-h").value,
    fond:  formeFond,
    bord:  formeBord,
  });
  fermerModale("modal-forme");
}
