"use strict";
/* =============================================================================
   03 — ÉTAT DE L'APPLICATION   ·   Plan du mariage
   -----------------------------------------------------------------------------
   SOURCES DE VÉRITÉ mutables, partagées par toute l'app : le plan affiché, les
   tables, les formes libres, la sélection courante, les compteurs d'id, les
   réglages (settings) et les helpers du décor d'arbres + la palette de couleurs.
   Tout le reste (le DOM/SVG) n'est qu'un REFLET de cet état : on ne lit jamais
   l'état depuis le DOM. Après chaque modification d'état, on rappelle render().

   Note (scripts classiques) : ces variables `let`/`const` vivent dans la portée
   GLOBALE partagée entre tous les fichiers js/, donc 09-actions, 11-gestes et
   12-init peuvent les lire ET les réassigner (ex. selection, planActif).

   Dépend de   : rien (declarations) — urlArbre/arbresImgDe utilisent PLANS (02)
                 mais seulement à l'exécution.
   Utilisé par : quasiment tous les fichiers suivants.
   ============================================================================= */

let planActif      = "global"; // identifiant du plan affiché au démarrage (sélecteur modifiable)
const tables       = [];      // <<< SOURCE DE VÉRITÉ (tables rondes)
const formes       = [];      // <<< SOURCE DE VÉRITÉ (formes libres : rect/triangle/cercle)
let idSuivant      = 1;       // numérotation des tables
let idSuivantForme = 1;       // numérotation des formes
let idSuivantArbre = 1;       // numérotation interne des arbres-images posés
let selection      = null;    // { type:"table"|"forme"|"arbre", id } ou null

/* ---- État de l'interface TACTILE (mobile ≤ 760px uniquement) -----------
   Sur écran tactile, sélectionner une forme n'ouvre PAS directement l'éditeur
   (il masquerait le plan et empêcherait le glisser) : on affiche d'abord un
   petit menu d'actions « Déplacer / Éditer / Faire tourner » (voir 08-interface),
   puis on bascule dans un MODE dédié (déplacer ou tourner) où le doigt manipule
   la forme, avec un bouton « Valider » pour en sortir. Ces deux variables ne
   sont jamais activées sur desktop (où l'éditeur flottant reste lié à la
   sélection, comportement inchangé). */
let editeurOuvert  = false;   // mobile : la feuille d'édition de forme est-elle ouverte ?
let modeMobile     = null;    // mobile : null | "deplacer" | "tourner" (forme = selection)

// Sommes-nous sur petit écran (tactile) ? Aligné sur la media query CSS
// @media (max-width:760px) : une seule source de vérité pour la bascule mobile.
function estMobile(){ return window.matchMedia("(max-width:760px)").matches; }

/* ---- Arbres-images (illustrations PNG vues de dessus) ------------------ */
// 40 éléments détourés dans assets/tree-elements/ (tree-01.png … tree-40.png),
// numérotés 1→40 (voir la planche assets/tree-elements/_planche-reference.png).
// On les pose comme DÉCOR sur un plan : chaque entrée d'un plan.arbresImg vaut
// { id, n, x, y, d } où n = numéro 1→40, (x,y) = centre en cm, d = diamètre
// affiché en cm. Purement décoratif : un arbre n'entre PAS dans tableValide.
const DOSSIER_ARBRES = "assets/tree-elements/";
const NB_ARBRES      = 40;
const ARBRE_D_DEFAUT = 120;            // diamètre par défaut d'un arbre posé (cm)

// URL de l'illustration n (1→40), nom à 2 chiffres (tree-07.png…).
function urlArbre(n){
  return DOSSIER_ARBRES + "tree-" + String(n).padStart(2, "0") + ".png";
}

// Liste (mutable) des arbres-images d'un plan ; créée à la volée si absente.
function arbresImgDe(plan){
  return plan.arbresImg || (plan.arbresImg = []);
}

// L'arbre-image d'id donné dans le plan affiché (ou undefined).
function arbreImgParId(id){
  return (PLANS[planActif].arbresImg || []).find(a => a.id === id);
}

// Donne un id stable à tout arbre écrit "en dur" dans les données (PLANS) qui
// n'en aurait pas encore. Appelé une fois à l'initialisation.
function normaliserArbres(){
  for(const id in PLANS)
    for(const a of (PLANS[id].arbresImg || []))
      if(a.id == null) a.id = idSuivantArbre++;
}

// Palette « Atelier Floral » pour les formes libres (buffet, scène, bar...) :
// on choisit LIBREMENT une couleur de fond ET une couleur de contour.
const PALETTE_FORME = [
  "#E7E0D2", "#D9E0CC", "#ECD7CF", "#DCE6E6", "#F1E3C5", "#FFFFFF",
  "#C2B189", "#8AA277", "#C49A8F", "#8FAAAC", "#C9A24B",
  "#5C6B57", "#BC6C4F", "#5B7790", "#3D4A39",
];
const FORME_FOND_DEFAUT = "#D9E0CC";   // sauge clair
const FORME_BORD_DEFAUT = "#8AA277";   // sauge

// Sélections courantes dans la modale « Ajouter une forme ».
let formeFond = FORME_FOND_DEFAUT;
let formeBord = FORME_BORD_DEFAUT;
// Numéro d'arbre sélectionné dans la modale « Choisir un arbre » (ou null).
let arbreChoisi = null;

const settings = {
  diametre:      160,  // diamètre d'une table (cm)
  espaceChaises:  50,  // espace réservé pour les chaises AUTOUR DE CHAQUE table (cm)
                       //   = rayon de dégagement de la table (l'anneau affiché).
                       //   Entre deux tables, l'écart vaut donc 2 x espaceChaises.
  espaceMur:      50,  // dégagement minimal entre une table et un mur (cm)
  zoom:            1,  // facteur de zoom du plan (1 = ajusté à la fenêtre)
};
