"use strict";
/* =============================================================================
   01 — OUTILS DE GÉOMÉTRIE   ·   Plan du mariage
   -----------------------------------------------------------------------------
   Fonctions PURES de géométrie (aucun accès au DOM, aucun état) : test
   d'appartenance à un polygone, distances aux murs, boîte englobante,
   centroïde, translation/rotation de points, angles. Réutilisables partout.

   Dépend de   : rien.
   Utilisé par : 02-plans (translater, au chargement), 04-validite,
                 05/06/07-rendu, 11-gestes.
   Position 01 — DOIT être chargé en premier : 02-plans appelle translater()
   dès le chargement (construction de PLANS.global).
   ============================================================================= */

// Le point (x,y) est-il à l'intérieur du polygone ? (lancer de rayon)
function pointDansPolygone(x, y, poly){
  let dedans = false;
  for(let i = 0, j = poly.length - 1; i < poly.length; j = i++){
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const coupe = ((yi > y) !== (yj > y)) &&
                  (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if(coupe) dedans = !dedans;
  }
  return dedans;
}

// Distance d'un point au segment [a,b].
function distancePointSegment(px, py, ax, ay, bx, by){
  const dx = bx - ax, dy = by - ay;
  const long2 = dx*dx + dy*dy;
  let t = long2 === 0 ? 0 : ((px - ax)*dx + (py - ay)*dy) / long2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t*dx), py - (ay + t*dy));
}

// Distance d'un point au mur le plus proche (bord du polygone).
function distanceAuMur(x, y, poly){
  let min = Infinity;
  for(let i = 0, j = poly.length - 1; i < poly.length; j = i++){
    const d = distancePointSegment(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]);
    if(d < min) min = d;
  }
  return min;
}

// Boîte englobante d'un polygone.
function boite(poly){
  const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
  return { minX:Math.min(...xs), minY:Math.min(...ys),
           maxX:Math.max(...xs), maxY:Math.max(...ys) };
}

// Centroïde approximatif (moyenne des sommets) : sert à orienter les cotes
// vers l'extérieur de la pièce.
function centroide(poly){
  let sx = 0, sy = 0;
  for(const p of poly){ sx += p[0]; sy += p[1]; }
  return [ sx/poly.length, sy/poly.length ];
}

// Liste des pièces (sous-contours) d'un plan. Un plan simple a un seul
// "contour" ; un plan composite (ex. "Plan global") a plusieurs "contours".
function contoursDe(plan){
  return plan.contours || [plan.contour];
}

// Translater une liste de points de (tx, ty).
function translater(points, tx, ty){
  return points.map(p => [p[0] + tx, p[1] + ty]);
}

// Rotation du point (px,py) autour du centre (cx,cy), de `deg` degrés.
// Convention SVG : angle HORAIRE positif (y vers le bas), identique à
// l'attribut transform="rotate(deg cx cy)" — les deux restent donc cohérents.
function roterPoint(px, py, cx, cy, deg){
  const a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
  const dx = px - cx, dy = py - cy;
  return [ cx + dx*co - dy*si, cy + dx*si + dy*co ];
}

// Angle (en degrés) du vecteur centre->point, mesuré depuis le HAUT (0 = vers le
// haut) et dans le sens HORAIRE (convention SVG). Sert à orienter un objet vers
// le pointeur pendant un glisser de rotation.
function angleVers(cx, cy, px, py){
  return Math.atan2(px - cx, -(py - cy)) * 180 / Math.PI;
}

// Centre de la boîte d'une forme (x, y, w, h).
function centreForme(f){ return [ f.x + f.w/2, f.y + f.h/2 ]; }

// Ramène un angle (degrés) dans [0, 360), arrondi à l'entier.
function normaliserAngle(deg){ return ((Math.round(deg) % 360) + 360) % 360; }
