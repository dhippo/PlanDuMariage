"use strict";
/* =============================================================================
   07 — RENDU : OBJETS MANIPULABLES   ·   Plan du mariage
   -----------------------------------------------------------------------------
   Le rendu des éléments que l'utilisateur SÉLECTIONNE et MANIPULE : tables
   rondes (avec anneau de dégagement + état valide/invalide/sélection) et formes
   libres (rect/triangle/cercle, titre, cotes), plus les poignées de
   redimensionnement et de ROTATION. estSelection() teste l'élément actif.
   (Les arbres-images, eux, sont dessinés en 06 car ils relèvent du décor.)

   Dépend de   : 03-etat (selection, formes, tables, settings), 04-validite
                 (tableValide), 05-rendu-base (el, svg).
   Utilisé par : 05-rendu-base (render), 11-gestes (poignées = cibles du pointeur).
   ============================================================================= */

// L'objet (type, id) est-il l'élément sélectionné ?
function estSelection(type, id){
  return selection && selection.type === type && selection.id === id;
}

// Construit une poignée de ROTATION centrée en (hx,hy) : un disque plein olivier
// orné d'une flèche circulaire (repère « tourner »). `type` = "forme" | "arbre" :
// pose le data-attribut capté au pointerdown. Visuellement distincte de la
// poignée de redimensionnement (creuse, en coin) : pleine et posée AU-DESSUS de
// l'objet, reliée à lui par un trait (cf. dessinerFormes / dessinerArbresImg).
function poigneeRotation(hx, hy, id, type){
  const g = el("g", { class:"poignee-rotation-g" });
  g.setAttribute("data-" + type + "-rotate", id);
  g.appendChild(el("circle", { cx:hx, cy:hy, r:12, class:"poignee-rotation" }));
  // Arc circulaire (~280°) tracé en blanc à l'intérieur du disque.
  const r = 6, rad = deg => deg * Math.PI/180;
  const x0 = hx + r*Math.cos(rad(40)),  y0 = hy + r*Math.sin(rad(40));
  const x1 = hx + r*Math.cos(rad(320)), y1 = hy + r*Math.sin(rad(320));
  g.appendChild(el("path", { class:"poignee-rotation-fleche",
    d:`M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 1 1 ${x1.toFixed(1)} ${y1.toFixed(1)}` }));
  return g;
}

// Formes libres (buffet, scène, bar...) : rectangle, triangle ou cercle, posées
// sur une boîte (x, y, w, h). Déplaçables + redimensionnables. Couleurs de fond
// et de contour choisies librement. Purement visuelles (hors tableValide).
function dessinerFormes(){
  const g = el("g", {});
  for(const f of formes){
    if(f.planId !== planActif) continue;
    const sel = estSelection("forme", f.id);
    const cx = f.x + f.w/2, cy = f.y + f.h/2;
    const angle = f.angle || 0;

    // Tout le rendu d'une forme est groupé pour pivoter d'un bloc autour de son
    // centre (corps, titre, cotes ET poignées : elles restent solidaires de
    // l'orientation). On ne pose le transform que si l'angle est non nul.
    const gf = el("g", angle ? { transform:`rotate(${angle} ${cx} ${cy})` } : {});

    // Corps de la forme (seul élément qui capte le pointeur, via data-forme).
    let corps;
    if(f.type === "cercle"){
      corps = el("ellipse", { cx, cy, rx:f.w/2, ry:f.h/2 });
    } else if(f.type === "triangle"){
      const pts = [[f.x, f.y + f.h], [f.x + f.w, f.y + f.h], [cx, f.y]];
      corps = el("polygon", { points: pts.map(p => p.join(",")).join(" ") });
    } else {
      corps = el("rect", { x:f.x, y:f.y, width:f.w, height:f.h, rx:5 });
    }
    corps.setAttribute("data-forme", f.id);
    corps.setAttribute("class", "forme" + (sel ? " forme--select" : ""));
    corps.setAttribute("fill", f.fond);
    corps.setAttribute("stroke", f.bord);
    gf.appendChild(corps);

    // Titre centré (optionnel).
    if(f.titre){
      const t = el("text", { x:cx, y:cy - 13, class:"forme-titre",
        "text-anchor":"middle", "dominant-baseline":"central" });
      t.textContent = f.titre;
      gf.appendChild(t);
    }
    // Dimensions sous le titre.
    const d = el("text", { x:cx, y:cy + 15, class:"forme-dim",
      "text-anchor":"middle", "dominant-baseline":"central" });
    d.textContent = Math.round(f.w) + " × " + Math.round(f.h) + " cm";
    gf.appendChild(d);

    // Poignées (forme sélectionnée) : redimensionnement (coin bas-droit) +
    // ROTATION (au-dessus, reliée par un trait). Placées dans le groupe pivoté :
    // elles suivent donc l'orientation de la forme.
    if(sel){
      gf.appendChild(el("circle", { cx:f.x + f.w, cy:f.y + f.h, r:11,
        "data-forme-handle": f.id, class:"poignee" }));
      const hy = f.y - 42;                          // poignée de rotation au-dessus
      gf.appendChild(el("line", { x1:cx, y1:f.y, x2:cx, y2:hy + 12,
        class:"poignee-lien" }));
      gf.appendChild(poigneeRotation(cx, hy, f.id, "forme"));
    }
    g.appendChild(gf);
  }
  svg.appendChild(g);
}

function dessinerTables(){
  const r = settings.diametre / 2;
  const g = el("g", {});
  for(const t of tables){
    if(t.planId !== planActif) continue;

    const valide = tableValide(t);
    const etat = !valide ? "invalide" : (estSelection("table", t.id) ? "select" : "valide");

    // Anneau = espace réservé pour les chaises autour de la table (purement visuel).
    g.appendChild(el("circle", { cx:t.x, cy:t.y, r: r + settings.espaceChaises,
      class:"degagement" }));

    // La table elle-même (seul élément qui capte le pointeur, via data-table).
    g.appendChild(el("circle", { cx:t.x, cy:t.y, r:r,
      "data-table": t.id, class:"table table--" + etat }));

    // Numéro de table.
    const num = el("text", { x:t.x, y:t.y, class:"table-num",
      "text-anchor":"middle", "dominant-baseline":"central" });
    num.textContent = t.id;
    g.appendChild(num);
  }
  svg.appendChild(g);
}
