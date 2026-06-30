"use strict";
/* =============================================================================
   11 — GESTES (déplacement, pan, pinch, molette)   ·   Plan du mariage
   -----------------------------------------------------------------------------
   Toute l'interaction au pointeur. Un déplacement saisit un objet au
   pointerdown puis le suit. Un CONTRÔLEUR DE POINTEURS unique arbitre, via une
   Map de pointeurs actifs (move/up écoutés sur window pour suivre le geste hors
   du SVG) :
     • 1 pointeur sur un objet      -> déplacement / redimension / rotation ;
     • 1 doigt (ou stylet) dans le vide -> pan (.scene scroll) ; tap net = désélection ;
     • 2 doigts                     -> pinch (zoom centré sur leur milieu) ;
     • souris dans le vide          -> désélection (desktop).
   La molette/trackpad (wheel + ctrlKey) zoome façon Google Maps.

   RESPONSIVE — c'est ici que vit le tactile mobile (pan + pinch). Le desktop
   passe par les mêmes fonctions (zoomerVers) ; rien à dupliquer.

   Dépend de   : 05-rendu-base (svg, scene, render, zoom…), 03-etat (drag,
                 selection…), 01-geometrie (roterPoint, angleVers…), 07 (poignées).
   Position 11 — pose des addEventListener sur svg/scene AU CHARGEMENT :
   ces constantes doivent déjà exister (définies en 05).
   ============================================================================= */

let drag = null;   // déplacement d'objet en cours : { kind, id, ... }

// Convertit des coordonnées écran (clientX/Y) en centimètres du plan.
function ecranVersSvg(clientX, clientY){
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: p.x, y: p.y };
}

// Hit-test d'un pointerdown : saisit l'objet (ou la poignée) sous le pointeur et
// démarre son déplacement. Renvoie true si quelque chose a été saisi, sinon false.
function debutDragObjet(e){
  const p = ecranVersSvg(e.clientX, e.clientY);
  const cherche = sel => e.target.closest && e.target.closest(sel);

  // 1) poignée de redimensionnement d'une forme
  const poignee = cherche("[data-forme-handle]");
  if(poignee){
    const id = parseInt(poignee.getAttribute("data-forme-handle"), 10);
    const f = formes.find(x => x.id === id);
    const [cx, cy] = centreForme(f);
    // Ancre = coin haut-gauche VISUEL (pivoté), gardé fixe pendant le resize :
    // le redimensionnement reste donc cohérent même quand la forme est tournée.
    const A = roterPoint(f.x, f.y, cx, cy, f.angle || 0);
    selection = { type:"forme", id };
    drag = { kind:"resize-forme", id, ax:A[0], ay:A[1] };
    svg.setPointerCapture(e.pointerId); render(); return true;
  }
  // 1 bis) poignée de redimensionnement d'un arbre-image
  const poigneeArbre = cherche("[data-arbre-handle]");
  if(poigneeArbre){
    const id = parseInt(poigneeArbre.getAttribute("data-arbre-handle"), 10);
    selection = { type:"arbre", id };
    drag = { kind:"resize-arbre", id };
    svg.setPointerCapture(e.pointerId); render(); return true;
  }
  // 1 ter) poignée de ROTATION d'une forme
  const rotForme = cherche("[data-forme-rotate]");
  if(rotForme){
    const id = parseInt(rotForme.getAttribute("data-forme-rotate"), 10);
    const f = formes.find(x => x.id === id);
    const [cx, cy] = centreForme(f);
    selection = { type:"forme", id };
    // offset = écart entre l'angle actuel de la forme et l'angle pointeur->centre,
    // pour une rotation FLUIDE quel que soit l'endroit où l'on saisit la poignée
    // (pas de saut au démarrage du glisser).
    drag = { kind:"rotate-forme", id, offset:(f.angle || 0) - angleVers(cx, cy, p.x, p.y) };
    svg.setPointerCapture(e.pointerId); render(); return true;
  }
  // 1 quater) poignée de ROTATION d'un arbre-image
  const rotArbre = cherche("[data-arbre-rotate]");
  if(rotArbre){
    const id = parseInt(rotArbre.getAttribute("data-arbre-rotate"), 10);
    const a = arbreImgParId(id);
    selection = { type:"arbre", id };
    drag = { kind:"rotate-arbre", id, offset:(a.angle || 0) - angleVers(a.x, a.y, p.x, p.y) };
    svg.setPointerCapture(e.pointerId); render(); return true;
  }
  // 2) corps d'une forme (déplacement)
  const formeEl = cherche("[data-forme]");
  if(formeEl){
    const id = parseInt(formeEl.getAttribute("data-forme"), 10);
    const f = formes.find(x => x.id === id);
    selection = { type:"forme", id };
    if(estMobile()){
      // Tactile : on NE déplace PAS directement (l'éditeur masquait le plan et
      // empêchait le glisser). On sélectionne et on affiche le menu d'actions
      // (08) ; déplacement/rotation se font ensuite dans un mode dédié.
      drag = null; render(); return true;            // geste consommé (pas de pan)
    }
    drag = { kind:"move-forme", id, dx: p.x - f.x, dy: p.y - f.y };
    svg.setPointerCapture(e.pointerId); render(); return true;
  }
  // 3) une table (déplacement)
  const tableEl = cherche("[data-table]");
  if(tableEl){
    const id = parseInt(tableEl.getAttribute("data-table"), 10);
    const t = tables.find(x => x.id === id);
    selection = { type:"table", id };
    drag = { kind:"move-table", id, dx: p.x - t.x, dy: p.y - t.y };
    svg.setPointerCapture(e.pointerId); render(); return true;
  }
  // 4) un arbre-image (déplacement) — sous les tables : testé après elles
  const arbreEl = cherche("[data-arbre]");
  if(arbreEl){
    const id = parseInt(arbreEl.getAttribute("data-arbre"), 10);
    const a = arbreImgParId(id);
    selection = { type:"arbre", id };
    drag = { kind:"move-arbre", id, dx: p.x - a.x, dy: p.y - a.y };
    svg.setPointerCapture(e.pointerId); render(); return true;
  }
  // rien sous le pointeur : le contrôleur gérera pan / pinch / désélection.
  return false;
}

// Applique le mouvement courant à l'objet en cours de déplacement (drag.kind).
function majDragObjet(e){
  const p = ecranVersSvg(e.clientX, e.clientY);
  if(drag.kind === "move-table"){
    const t = tables.find(x => x.id === drag.id);
    t.x = Math.round(p.x - drag.dx); t.y = Math.round(p.y - drag.dy);
  } else if(drag.kind === "move-forme"){
    const f = formes.find(x => x.id === drag.id);
    f.x = Math.round(p.x - drag.dx); f.y = Math.round(p.y - drag.dy);
  } else if(drag.kind === "resize-forme"){
    const f = formes.find(x => x.id === drag.id);
    const ang = f.angle || 0;
    // Pointeur ramené dans le repère LOCAL (non pivoté) autour de l'ancre (coin
    // haut-gauche visuel, gardé fixe) : largeur/hauteur restent intuitives à
    // toute orientation. Minimum 40 cm.
    const pl = roterPoint(p.x, p.y, drag.ax, drag.ay, -ang);
    const w = Math.max(40, Math.round(pl[0] - drag.ax));
    const h = Math.max(40, Math.round(pl[1] - drag.ay));
    // Nouveau centre = ancre + R(ang)·(w/2, h/2) ; on en déduit le coin (x, y).
    const C = roterPoint(drag.ax + w/2, drag.ay + h/2, drag.ax, drag.ay, ang);
    f.w = w; f.h = h;
    f.x = Math.round(C[0] - w/2); f.y = Math.round(C[1] - h/2);
  } else if(drag.kind === "rotate-forme"){
    const f = formes.find(x => x.id === drag.id);
    const [cx, cy] = centreForme(f);
    let ang = angleVers(cx, cy, p.x, p.y) + drag.offset;
    if(e.shiftKey) ang = Math.round(ang / 15) * 15;   // Maj enfoncée = pas de 15°
    f.angle = normaliserAngle(ang);
  } else if(drag.kind === "move-arbre"){
    const a = arbreImgParId(drag.id);
    a.x = Math.round(p.x - drag.dx); a.y = Math.round(p.y - drag.dy);
  } else if(drag.kind === "resize-arbre"){
    const a = arbreImgParId(drag.id);
    a.d = Math.max(30, Math.round(2 * Math.hypot(p.x - a.x, p.y - a.y)));  // diamètre mini 30 cm
  } else if(drag.kind === "rotate-arbre"){
    const a = arbreImgParId(drag.id);
    let ang = angleVers(a.x, a.y, p.x, p.y) + drag.offset;
    if(e.shiftKey) ang = Math.round(ang / 15) * 15;
    a.angle = normaliserAngle(ang);
  }
  render();
}

/* ---- Contrôleur de pointeurs : arbitre déplacement / pan / pinch --------
   1 pointeur sur un objet      -> déplacement de l'objet (souris ou doigt) ;
   1 doigt dans le vide         -> pan (on fait défiler .scene) ;
   2 doigts                     -> pinch : zoom centré sur leur milieu ;
   souris dans le vide          -> désélection (comportement desktop conservé).
   On écoute move/up sur window pour suivre le geste même hors du SVG (et gérer
   le multi-touch sans dépendre de la capture de pointeur).                  */

const pointers = new Map();   // pointerId -> { x, y } : positions écran courantes
let pan   = null;             // pan tactile : { x0, y0, gauche0, haut0, bouge }
let pinch = null;             // pinch : { startDist, startZoom, fx, fy }

svg.addEventListener("pointerdown", e => {
  pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });

  // 2e doigt -> pinch : on annule tout déplacement / pan en cours.
  if(pointers.size === 2){
    if(drag){ drag = null; render(); }
    pan = null;
    masquerActionsForme();                   // le menu suivra la forme à la fin du geste
    for(const id of pointers.keys()){ try{ svg.releasePointerCapture(id); }catch(_){} }
    demarrerPinch();
    return;
  }
  if(pointers.size > 2) return;              // 3e doigt et + : ignorés

  // MODE TACTILE actif (mobile) : 1 doigt manipule la forme sélectionnée — peu
  // importe où l'on appuie sur le plan. (Le 2e doigt déclenche le pinch ci-dessus.)
  if(modeMobile){
    const f = formeSelectionnee();
    if(f){
      const p = ecranVersSvg(e.clientX, e.clientY);
      if(modeMobile === "deplacer"){
        drag = { kind:"move-forme", id:f.id, dx: p.x - f.x, dy: p.y - f.y };
      } else {                               // "tourner" : offset pour éviter tout saut
        const [cx, cy] = centreForme(f);
        drag = { kind:"rotate-forme", id:f.id, offset:(f.angle || 0) - angleVers(cx, cy, p.x, p.y) };
      }
      try{ svg.setPointerCapture(e.pointerId); }catch(_){}
    }
    return;                                  // ni pan ni désélection en mode
  }

  // 1er pointeur : objet ? sinon pan (tactile) / désélection (souris).
  if(debutDragObjet(e)) return;

  if(e.pointerType !== "mouse"){             // doigt OU stylet (pen) : pan
    pan = { x0:e.clientX, y0:e.clientY,
            gauche0:scene.scrollLeft, haut0:scene.scrollTop, bouge:false };
    masquerActionsForme();                   // pan : on cache le menu (repositionné à la fin)
    try{ svg.setPointerCapture(e.pointerId); }catch(_){}
  } else if(selection){                      // souris dans le vide : désélection (desktop)
    selection = null; render();
  }
});

window.addEventListener("pointermove", e => {
  if(pointers.has(e.pointerId)) pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });

  if(pinch){ majPinch(); return; }

  if(pan){
    const dx = e.clientX - pan.x0, dy = e.clientY - pan.y0;
    // Seuil tap/pan : au-delà, c'est un pan (et non un tap qui désélectionne).
    // 8 px tolère la gigue du doigt sans confondre avec un vrai glissement.
    if(Math.abs(dx) > 8 || Math.abs(dy) > 8) pan.bouge = true;
    scene.scrollLeft = pan.gauche0 - dx;
    scene.scrollTop  = pan.haut0  - dy;
    return;
  }

  if(drag) majDragObjet(e);
});

function finPointeur(e){
  pointers.delete(e.pointerId);
  try{ svg.releasePointerCapture(e.pointerId); }catch(_){}

  if(pinch){
    if(pointers.size < 2){ pinch = null; mesurerBaseScene(); majActionsForme(); }   // fin du pinch
    return;                                    // ne pas reprendre un drag ensuite
  }
  if(pan){
    const bouge = pan.bouge;
    pan = null;
    if(!bouge){ if(selection){ selection = null; render(); } }   // tap net = désélection
    else majActionsForme();                                      // fin de pan → repositionne le menu
    return;
  }
  if(drag){ drag = null; render(); }
}
window.addEventListener("pointerup",     finPointeur);
window.addEventListener("pointercancel", finPointeur);

// Démarre un pinch à partir des deux pointeurs actifs : mémorise l'écart, le
// zoom et la fraction du SVG sous le milieu des deux doigts.
function demarrerPinch(){
  const pts = [...pointers.values()];
  const a = pts[0], b = pts[1];
  const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
  mesurerBaseScene();
  const r = svg.getBoundingClientRect();
  pinch = {
    startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
    startZoom: settings.zoom,
    fx: r.width  ? (midX - r.left) / r.width  : .5,
    fy: r.height ? (midY - r.top)  / r.height : .5,
  };
}

// Met à jour le pinch : zoom = zoom initial x (écart courant / écart initial) ;
// on garde la fraction de départ sous le MILIEU courant -> zoom + pan combinés.
function majPinch(){
  const pts = [...pointers.values()];
  if(pts.length < 2) return;
  const a = pts[0], b = pts[1];
  const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
  const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
  settings.zoom = bornerZoom(pinch.startZoom * dist / pinch.startDist);
  appliquerZoom();
  const sr = scene.getBoundingClientRect();
  scene.scrollLeft = svg.offsetLeft + pinch.fx * svg.offsetWidth  - (midX - sr.left);
  scene.scrollTop  = svg.offsetTop  + pinch.fy * svg.offsetHeight - (midY - sr.top);
  majCurseurZoom();
}

// Molette / trackpad : un pinch trackpad arrive en `wheel` avec ctrlKey=true
// (comme Ctrl+molette à la souris) -> zoom centré sur le curseur, façon Google
// Maps. Une molette simple garde le défilement natif. passive:false pour pouvoir
// bloquer le zoom de page du navigateur.
scene.addEventListener("wheel", e => {
  if(!e.ctrlKey) return;
  e.preventDefault();
  // deltaY borné : le trackpad envoie de petits pas (zoom fluide), la molette de
  // souris de gros crans — on évite ainsi un saut de zoom violent par cran.
  const dy = Math.max(-60, Math.min(60, e.deltaY));
  zoomerVers(settings.zoom * Math.exp(-dy * 0.01), e.clientX, e.clientY);
}, { passive:false });

// iOS Safari : empêcher le zoom de page si le geste démarre sur le plan
// (ceinture + bretelles, en plus de touch-action:none sur .scene).
scene.addEventListener("gesturestart", e => e.preventDefault());
