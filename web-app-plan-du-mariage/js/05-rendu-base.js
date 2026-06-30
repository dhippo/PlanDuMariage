"use strict";
/* =============================================================================
   05 — RENDU : SOCLE & ZOOM   ·   Plan du mariage
   -----------------------------------------------------------------------------
   Le cœur du rendu : références au <svg> et à la .scene, fabrique d'éléments SVG
   el(), tout le SYSTÈME DE ZOOM (modèle « conteneur défilant » : taille px du
   SVG = zone utile de .scene × zoom ; zoom focalisé façon Google Maps) et la
   fonction centrale render() qui RECONSTRUIT tout l'affichage depuis l'état.
   render() orchestre les dessinerXxx() (fichiers 06 et 07) puis majInterface().

   RESPONSIVE — c'est ici que vit la mécanique de zoom commune desktop/mobile
   (appliquerZoom, zoomerVers, mesurerBaseScene). Le pinch/pan tactile, lui, est
   dans 11-gestes ; les bascules d'affichage (curseur masqué, bottom sheet) sont
   en CSS (@media max-width:760px) et dans 10-modales.

   Dépend de   : 01-geometrie, 02-plans, 03-etat, 04-validite, et appelle (à
                 l'exécution) les dessinerXxx() de 06/07 + majInterface (08).
   Utilisé par : 11-gestes (svg, scene, render, zoom…), 12-init.
   Position 05 — définit `svg` et `scene` : DOIT précéder 11-gestes (qui pose
   des addEventListener sur eux au chargement).
   ============================================================================= */

const SVGNS   = "http://www.w3.org/2000/svg";
const svg     = document.getElementById("plan");
const scene   = svg.parentElement;   // .scene : conteneur (scrollable quand zoomé)
const PADDING = 95;   // marge autour du plan (cm) pour afficher les cotes

// Petit utilitaire : créer un élément SVG avec ses attributs.
function el(nom, attrs){
  const e = document.createElementNS(SVGNS, nom);
  for(const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

// Bornes de zoom (1 = ajusté à la fenêtre ; 4 = max, comme le curseur).
const ZOOM_MIN = 1, ZOOM_MAX = 4;
function bornerZoom(z){ return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)); }

// Zone utile de .scene (hors padding), MÉMORISÉE : sert de base à appliquerZoom.
// On ne la remesure pas à chaque pinch (mesurer force overflow:hidden, ce qui
// ferait clignoter la barre de défilement) — seulement au resize / début de geste.
let baseScene = null;
function mesurerBaseScene(){
  const o = scene.style.overflow;
  scene.style.overflow = "hidden";            // mesurer SANS barre de défilement
  const cs = getComputedStyle(scene);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop)  + parseFloat(cs.paddingBottom);
  baseScene = { w: scene.clientWidth - padX, h: scene.clientHeight - padY };
  scene.style.overflow = o;
  return baseScene;
}

// Zoom du plan : on dimensionne le SVG = (zone utile de .scene) x zoom. À zoom=1
// il remplit la scène (aucun débordement) ; au-delà il déborde et .scene passe
// en overflow:auto — on ne scrolle donc QUE dans le cadre du plan. La taille
// est indépendante du plan affiché (le viewBox + preserveAspectRatio gèrent la
// mise à l'échelle interne), donc inutile d'appeler ceci à chaque render().
function appliquerZoom(){
  if(!baseScene) mesurerBaseScene();
  const z = settings.zoom;
  svg.style.width  = Math.round(baseScene.w * z) + "px";
  svg.style.height = Math.round(baseScene.h * z) + "px";
  scene.style.overflow = z > 1 ? "auto" : "hidden";   // scroll seulement si zoomé
}

// Zoom CENTRÉ sur un point écran (clientX, clientY), façon Google Maps : le
// point sous le curseur (ou le milieu d'un pinch) reste fixe. On redimensionne
// le SVG puis on cale le scroll de .scene pour réancrer ce point. Utilisé par le
// curseur de zoom (centre), la molette/trackpad (curseur) et le pinch (milieu).
function zoomerVers(nouveauZoom, clientX, clientY){
  nouveauZoom = bornerZoom(nouveauZoom);
  const r = svg.getBoundingClientRect();                 // fraction du SVG sous le point
  const fx = r.width  ? (clientX - r.left) / r.width  : .5;
  const fy = r.height ? (clientY - r.top)  / r.height : .5;
  settings.zoom = nouveauZoom;
  appliquerZoom();                                       // redimensionne le SVG
  const sr = scene.getBoundingClientRect();
  scene.scrollLeft = svg.offsetLeft + fx * svg.offsetWidth  - (clientX - sr.left);
  scene.scrollTop  = svg.offsetTop  + fy * svg.offsetHeight - (clientY - sr.top);
  majCurseurZoom();
}

// Reflète settings.zoom dans le curseur + l'étiquette (le pinch et le trackpad
// le font bouger hors du curseur). Sans effet si le curseur est masqué (mobile).
function majCurseurZoom(){
  const pct = Math.round(settings.zoom * 100);
  const rng = document.getElementById("rng-zoom");
  const val = document.getElementById("val-zoom");
  if(rng) rng.value = pct;
  if(val) val.textContent = pct;
}

// LA fonction centrale : reconstruit l'affichage depuis l'état.
function render(){
  const plan = PLANS[planActif];
  const contours = contoursDe(plan);   // une ou plusieurs pièces

  // Boîte englobante : tous les contours + fonds + zones (qui peuvent déborder).
  const b = boite(contours[0]);
  const debords = [];
  for(const c of contours) debords.push(...c);
  for(const f of (plan.fonds || [])) debords.push(...f.points);
  for(const m of (plan.murs  || [])) debords.push(...m);
  for(const z of (plan.zones || [])){
    if(z.points) debords.push(...z.points);
    else debords.push([z.rect[0], z.rect[1]], [z.rect[0]+z.rect[2], z.rect[1]+z.rect[3]]);
  }
  for(const a of (plan.arbresImg || [])){
    const r = (a.d || ARBRE_D_DEFAUT) / 2;
    debords.push([a.x - r, a.y - r], [a.x + r, a.y + r]);
  }
  for(const p of debords){
    b.minX = Math.min(b.minX, p[0]); b.minY = Math.min(b.minY, p[1]);
    b.maxX = Math.max(b.maxX, p[0]); b.maxY = Math.max(b.maxY, p[1]);
  }

  // viewBox en centimètres => tout est dessiné à l'échelle, automatiquement.
  svg.setAttribute("viewBox",
    `${b.minX - PADDING} ${b.minY - PADDING} ` +
    `${(b.maxX - b.minX) + 2*PADDING} ${(b.maxY - b.minY) + 2*PADDING}`);

  svg.replaceChildren();          // on repart de zéro (le SVG reflète l'état)

  // defs : découpe de la grille (toutes les pièces) + hachures du massif.
  const defs = el("defs", {});
  const clip = el("clipPath", { id:"clip-piece" });
  for(const c of contours)
    clip.appendChild(el("polygon", { points: c.map(p => p.join(",")).join(" ") }));
  // Fonds décoratifs non praticables mais QUADRILLÉS (ex. "Reste Jardin") :
  // ils ne sont pas dans "contours" (pas de tables), on étend juste la grille.
  for(const f of (plan.fonds || []))
    if(f.grille) clip.appendChild(el("polygon", { points: f.points.map(p => p.join(",")).join(" ") }));
  defs.appendChild(clip);
  defs.appendChild(motifHachures("hachures-rose",      "#EFE0DA", "#C49A8F")); // roses (rose poudré — Atelier Floral)
  defs.appendChild(motifHachures("hachures-feuillage", "#E5E7DD", "#9AA38C")); // feuillages (sauge grisé)
  svg.appendChild(defs);

  dessinerFonds(plan);                    // teintes (crème / vert / gris)
  dessinerGrille(b);                      // grille légère, découpée aux pièces
  // Murs par contour fermé automatique (épais) — sauf si le plan trace lui-même
  // ses murs via plan.traits (plan global : contourAuto:false).
  if(plan.contourAuto !== false){
    for(const c of contours) dessinerContour(c);   // murs de chaque pièce
    // Contours décoratifs des fonds non praticables (ex. "Reste Jardin").
    for(const f of (plan.fonds || [])) if(f.contour) dessinerContour(f.points);
  }
  dessinerMurs(plan.murs);                 // murs décoratifs (ex. fermer la maison)
  dessinerEtiquettes(plan.etiquettes);    // libellés de zones (ex. SALON, JARDIN)
  // Zones SAUF "plant" (ses blocs passent PAR-DESSUS les traits, voir plus bas).
  dessinerZones((plan.zones || []).filter(z => z.type !== "plant"));
  // Traits d'épaisseur sur mesure (plan global) : moyen = contour Reste Jardin ;
  // épais = murs + périmètre extérieur. Au-dessus des fonds et des zones décor.
  dessinerTraits(plan.traits);
  // Blocs "Plant" : tracés APRÈS les traits pour que le trait moyen du bas du
  // couloir passe DERRIÈRE eux.
  dessinerZones((plan.zones || []).filter(z => z.type === "plant"));
  dessinerArbres(plan.arbres);            // arbres ponctuels (cerisiers...)
  dessinerArbresImg(plan);                // arbres-images PNG (décor posé par numéro)
  dessinerPoints(plan.points);            // points fixes (demi-cercle Plant...) — sur les traits
  dessinerCotes(plan, contours[0]);       // cotes manuelles si fournies, sinon auto
  dessinerOuvertures(plan.ouvertures, contours);
  if(plan.coinsActifs !== false){         // numéros des coins (repères bleus)
    if(plan.coinsContinus){               // numérotation continue dédupliquée (global)
      dessinerCoinsContinus(plan.coinsContinus, plan.coinsOverride, plan.coinsMasques);
    } else {
      const visuels = plan.contoursVisuels || [plan.contourVisuel || contours[0]];
      for(const v of visuels){
        if(Array.isArray(v)) dessinerCoins(v);        // simple liste de points
        else dessinerCoins(v.poly, v.prefixe);        // { poly, prefixe }
      }
    }
  }
  dessinerFormes();       // formes libres (sous les tables)
  dessinerTables();

  majInterface();
}
