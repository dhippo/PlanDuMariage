"use strict";
/* =============================================================================
   06 — RENDU : LE PLAN & SON DÉCOR   ·   Plan du mariage
   -----------------------------------------------------------------------------
   Tous les dessinerXxx() qui tracent le LIEU (pas les objets manipulables) :
   grille, fonds colorés, hachures, contours/murs/traits d'épaisseur, zones non
   praticables (roses, feuillages, buissons, plant), arbres ponctuels et
   arbres-images, points/repères, cotes, numéros de coins (simples & continus),
   ouvertures (fenêtres/portes) et étiquettes de zones. Appelés par render() (05).

   Dépend de   : 01-geometrie, 02-plans, 03-etat, 05-rendu-base (el, svg, PADDING…).
   Utilisé par : 05-rendu-base (render en orchestre l'appel).
   ============================================================================= */

function dessinerGrille(b){
  const pas = 50;
  const g = el("g", { "clip-path":"url(#clip-piece)" });
  const x0 = Math.floor(b.minX/pas)*pas, x1 = Math.ceil(b.maxX/pas)*pas;
  const y0 = Math.floor(b.minY/pas)*pas, y1 = Math.ceil(b.maxY/pas)*pas;
  for(let x = x0; x <= x1; x += pas)
    g.appendChild(el("line", { x1:x, y1:y0, x2:x, y2:y1,
      class:"grille" + (x % 100 === 0 ? " grille--fort" : "") }));
  for(let y = y0; y <= y1; y += pas)
    g.appendChild(el("line", { x1:x0, y1:y, x2:x1, y2:y,
      class:"grille" + (y % 100 === 0 ? " grille--fort" : "") }));
  svg.appendChild(g);
}

// Fonds colorés (teintes). Servent aussi de cible au clic "dans le vide" pour
// désélectionner. Soit les fonds définis par le plan (jardin vert + terrasse
// gris), soit, par défaut, le contour en crème (salon).
function dessinerFonds(plan){
  if(plan.fonds){
    for(const f of plan.fonds){
      const pts = f.points.map(p => p.join(",")).join(" ");
      svg.appendChild(el("polygon", { points:pts, class:"fond fond--" + f.type }));
    }
  } else {
    const pts = plan.contour.map(p => p.join(",")).join(" ");
    svg.appendChild(el("polygon", { points:pts, class:"piece-fond" }));
  }
}

// Motif de hachures réutilisable (massifs de roses, feuillages...). Paramétré
// pour décliner la même trame en plusieurs teintes (rose poudré, grisé...).
function motifHachures(id, fond, trait){
  const p = el("pattern", { id, width:18, height:18,
    patternUnits:"userSpaceOnUse", patternTransform:"rotate(45)" });
  p.appendChild(el("rect",  { width:18, height:18, fill:fond }));
  p.appendChild(el("line",  { x1:0, y1:0, x2:0, y2:18, stroke:trait, "stroke-width":3 }));
  return p;
}

// Contour = les murs, tracés par-dessus la grille.
function dessinerContour(poly){
  const pts = poly.map(p => p.join(",")).join(" ");
  svg.appendChild(el("polygon", { points:pts, class:"piece-contour" }));
}

// Murs décoratifs : polylignes ouvertes (ex. fermer la maison sur le plan
// global). Même trait que les murs des pièces, mais sans surface praticable.
function dessinerMurs(murs){
  if(!murs) return;
  for(const ligne of murs){
    const pts = ligne.map(p => p.join(",")).join(" ");
    svg.appendChild(el("polyline", { points:pts, class:"mur" }));
  }
}

// Traits d'épaisseur sur mesure (plan global) : un plan peut définir plan.traits
// = [{ poids:"moyen"|"epais", points:[...], ferme:bool }]. "ferme" => polygone
// (contour fermé), sinon polyline ouverte. Sert à donner des épaisseurs
// différentes selon les arêtes (contour Reste Jardin "moyen" vs périmètre
// extérieur "épais"), ce que le contour fermé automatique ne permet pas.
function dessinerTraits(traits){
  if(!traits) return;
  const g = el("g", {});
  for(const t of traits){
    const pts = t.points.map(p => p.join(",")).join(" ");
    g.appendChild(el(t.ferme ? "polygon" : "polyline",
      { points:pts, class:"trait-plan trait-plan--" + (t.poids || "moyen") }));
  }
  svg.appendChild(g);
}

// Zones non praticables (décor / obstacles) : rectangles étiquetés.
// On n'y pose pas de tables : elles sont hors du contour praticable, donc
// déjà invalidées par la détection de collision (sortie de mur).
function dessinerZones(zones){
  if(!zones) return;
  for(const z of zones){
    let cx, cy;                               // centre de l'étiquette
    if(z.points){                             // zone POLYGONALE (ex. feuillage = pentagone)
      svg.appendChild(el("polygon", { points: z.points.map(p => p.join(",")).join(" "),
        class:"zone zone--" + (z.type || "def") }));
      const c = z.labelXY || centroide(z.points); cx = c[0]; cy = c[1];
    } else {                                  // zone RECTANGULAIRE (ex. massifs de roses)
      const [x, y, w, h] = z.rect;
      svg.appendChild(el("rect", { x, y, width:w, height:h,
        class:"zone zone--" + (z.type || "def") }));
      cx = x + w/2; cy = y + h/2;
    }
    if(z.label){
      const t = el("text", { x:cx, y:cy,
        class:"zone-label zone-label--" + (z.type || "def"),
        "text-anchor":"middle", "dominant-baseline":"central" });
      // Taille sur mesure (inline, pour l'emporter sur la règle CSS .zone-label).
      if(z.labelTaille) t.style.fontSize = z.labelTaille + "px";
      // Label vertical (lecture bas->haut) pour tenir dans un bloc étroit.
      if(z.labelVertical) t.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);
      t.textContent = z.label;
      svg.appendChild(t);
    }
  }
}

// Arbres / marqueurs ponctuels (cerisiers...) : un disque clair avec un emoji
// au centre. Purement décoratifs (n'entrent pas dans la validité des tables).
function dessinerArbres(arbres){
  if(!arbres) return;
  for(const a of arbres){
    const r = a.r || 80;
    svg.appendChild(el("circle", { cx:a.x, cy:a.y, r,
      class:"arbre arbre--" + (a.type || "def") }));
    if(a.emoji){                                  // emoji optionnel (sinon simple pastille)
      const t = el("text", { x:a.x, y:a.y, class:"arbre-emoji",
        "text-anchor":"middle", "dominant-baseline":"central" });
      t.setAttribute("font-size", Math.round(r * 1.15));
      t.textContent = a.emoji;
      svg.appendChild(t);
    }
  }
}

// Arbres-images : illustrations PNG détourées posées en DÉCOR. L'image elle-même
// est en pointer-events:none ; une pastille circulaire INVISIBLE (rayon = d/2)
// capte le clic/glisser — ainsi les coins transparents de la vignette ne bloquent
// ni la grille ni les tables. Sélectionnable, déplaçable et redimensionnable.
function dessinerArbresImg(plan){
  const liste = plan.arbresImg;
  if(!liste || !liste.length) return;
  const g = el("g", {});
  for(const a of liste){
    const d = a.d || ARBRE_D_DEFAUT;
    const sel = estSelection("arbre", a.id);
    const angle = a.angle || 0;

    // Groupe pivotable : l'illustration ET ses poignées tournent d'un bloc autour
    // du centre (a.x, a.y). (L'anneau et la zone de capture sont circulaires :
    // la rotation ne les change pas, mais les poignées, elles, suivent l'angle.)
    const ga = el("g", angle ? { transform:`rotate(${angle} ${a.x} ${a.y})` } : {});

    // Vignette (purement visuelle). On pose href ET xlink:href pour ouvrir aussi
    // bien via un serveur que par double-clic (file://).
    const img = el("image", { x:a.x - d/2, y:a.y - d/2, width:d, height:d,
      preserveAspectRatio:"xMidYMid meet", class:"arbre-img" });
    img.setAttribute("href", urlArbre(a.n));
    img.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", urlArbre(a.n));
    img.setAttribute("pointer-events", "none");
    ga.appendChild(img);

    // Anneau de sélection (visuel).
    if(sel)
      ga.appendChild(el("circle", { cx:a.x, cy:a.y, r:d/2, class:"arbre-img-select" }));

    // Zone de capture circulaire (seul élément qui reçoit le pointeur).
    ga.appendChild(el("circle", { cx:a.x, cy:a.y, r:d/2,
      "data-arbre": a.id, class:"arbre-img-hit" }));

    // Poignées (arbre sélectionné) : redimensionnement (sur l'anneau, à 45°,
    // bas-droite) + ROTATION (au-dessus de l'anneau, reliée par un trait).
    if(sel){
      const k = Math.SQRT1_2 * d/2;
      ga.appendChild(el("circle", { cx:a.x + k, cy:a.y + k, r:11,
        "data-arbre-handle": a.id, class:"poignee" }));
      const hy = a.y - d/2 - 30;                    // poignée de rotation au-dessus
      ga.appendChild(el("line", { x1:a.x, y1:a.y - d/2, x2:a.x, y2:hy + 12,
        class:"poignee-lien" }));
      ga.appendChild(poigneeRotation(a.x, hy, a.id, "arbre"));
    }
    g.appendChild(ga);
  }
  svg.appendChild(g);
}

// Points fixes : repères ponctuels (petit disque plein coloré, ex. point bleu).
// Purement décoratifs (n'entrent pas dans la validité des tables).
function dessinerPoints(points){
  if(!points) return;
  for(const p of points){
    if(p.rayon){                                  // halo translucide autour du point
      const clsHalo = "point-halo point-halo--" + (p.type || "def");
      if(p.demi === "bas"){                        // demi-disque INFÉRIEUR (sous le centre)
        // arc du bas (sweep 0 => passe par le bas) refermé par le diamètre horizontal.
        const d = "M " + (p.x - p.rayon) + " " + p.y +
                  " A " + p.rayon + " " + p.rayon + " 0 0 0 " + (p.x + p.rayon) + " " + p.y + " Z";
        svg.appendChild(el("path", { d, class:clsHalo }));
      } else {
        svg.appendChild(el("circle", { cx:p.x, cy:p.y, r:p.rayon, class:clsHalo }));
      }
    }
    if(p.r){                                       // point central (optionnel)
      svg.appendChild(el("circle", { cx:p.x, cy:p.y, r:p.r,
        class:"point point--" + (p.type || "def") }));
    }
    if(p.label){                                   // étiquette (mêmes classes que les zones)
      const xy = p.labelXY || [p.x, p.y];
      const t = el("text", { x:xy[0], y:xy[1],
        class:"zone-label zone-label--" + (p.type || "def"),
        "text-anchor":"middle", "dominant-baseline":"central" });
      t.textContent = p.label;
      svg.appendChild(t);
    }
  }
}

// Cotes. Si le plan fournit une liste manuelle (plan.cotes), on l'utilise
// (plus lisible quand des formes sont fusionnées). Sinon, on déduit la
// longueur de chaque mur du contour et on la pose en face, à l'extérieur.
function dessinerCotes(plan, poly){
  const g = el("g", {});
  if(plan.cotes){
    for(const cote of plan.cotes){
      const txt = el("text", { x:cote.x, y:cote.y, class:"cote",
        "text-anchor":"middle", "dominant-baseline":"middle" });
      txt.textContent = cote.label;
      g.appendChild(txt);
    }
    svg.appendChild(g);
    return;
  }
  const c = centroide(poly);
  for(let i = 0; i < poly.length; i++){
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const longueur = Math.round(Math.hypot(b[0]-a[0], b[1]-a[1]));
    const mx = (a[0]+b[0])/2, my = (a[1]+b[1])/2;
    // normale au mur
    let nx = -(b[1]-a[1]), ny = (b[0]-a[0]);
    const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
    // la faire pointer vers l'extérieur (loin du centroïde)
    const versExt = (mx + nx - c[0])**2 + (my + ny - c[1])**2;
    const versInt = (mx - c[0])**2 + (my - c[1])**2;
    if(versExt < versInt){ nx = -nx; ny = -ny; }
    const off = 32;
    const txt = el("text", { x: mx + nx*off, y: my + ny*off,
      class:"cote", "text-anchor":"middle", "dominant-baseline":"middle" });
    txt.textContent = longueur + " cm";
    g.appendChild(txt);
  }
  svg.appendChild(g);
}

// Numéros des coins : un repère bleu foncé, en gras, posé à l'EXTÉRIEUR de
// chaque sommet (le long de la normale sortante, bissectrice des deux arêtes).
// Marche aussi pour les coins rentrants. Sert à désigner facilement un coin
// ("le coin 4") quand on discute du plan.
function dessinerCoins(poly, prefixe){
  prefixe = prefixe || "";                             // ex. "S" / "T" (plan global)
  const g = el("g", {});
  for(let i = 0; i < poly.length; i++){
    const P = poly[(i - 1 + poly.length) % poly.length];
    const V = poly[i];
    const N = poly[(i + 1) % poly.length];
    const n1 = normaleSortante(P[0], P[1], V[0], V[1], poly);
    const n2 = normaleSortante(V[0], V[1], N[0], N[1], poly);
    let dx = n1[0] + n2[0], dy = n1[1] + n2[1];        // bissectrice sortante
    const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    const off = 48;                                    // recul du numéro (cm)
    const t = el("text", { x: V[0] + dx*off, y: V[1] + dy*off, class:"coin",
      "text-anchor":"middle", "dominant-baseline":"middle" });
    t.textContent = prefixe + (i + 1);                 // coins numérotés 1, 2, 3...
    g.appendChild(t);
  }
  svg.appendChild(g);
}

// Numérotation CONTINUE des coins sur PLUSIEURS polygones (plan global) : un
// seul compteur 1, 2, 3... pour tout le plan, SANS lettre. Chaque point
// physique n'est numéroté qu'UNE fois : les coins partagés par deux blocs
// (ex. le bas de la terrasse = le haut du Reste Jardin) gardent le numéro du
// premier bloc qui les revendique. Placement à l'extérieur (même bissectrice
// que dessinerCoins). But : pouvoir désigner n'importe quel coin par « coin N ».
function dessinerCoinsContinus(polys, overrides, masques){
  overrides = overrides || {};                          // { "x,y": [px, py] } : placement forcé
  const caches = new Set(masques || []);                // "x,y" : coins NON numérotés (cachés)
  const g = el("g", {});
  const vus = new Set();                                // points déjà numérotés
  let n = 1;
  for(const item of polys){
    const poly = Array.isArray(item) ? item : item.poly;      // polygone, ou { poly, off }
    const off  = Array.isArray(item) ? 48 : (item.off || 48); // recul du numéro (cm) ;
                                                              // plus serré pour un petit bloc
    for(let i = 0; i < poly.length; i++){
      const V = poly[i];
      const cle = V[0] + "," + V[1];
      if(vus.has(cle)) continue;                        // déjà traité à ce point
      vus.add(cle);
      // Coin caché (ex. recouvert par le demi-cercle Plant opaque) : on ne lui
      // donne PAS de numéro et le compteur N'AVANCE PAS → numérotation continue
      // sans trou (les suivants se décalent pour combler).
      if(caches.has(cle)) continue;
      const P = poly[(i - 1 + poly.length) % poly.length];
      const N = poly[(i + 1) % poly.length];
      const n1 = normaleSortante(P[0], P[1], V[0], V[1], poly);
      const n2 = normaleSortante(V[0], V[1], N[0], N[1], poly);
      let dx = n1[0] + n2[0], dy = n1[1] + n2[1];       // bissectrice sortante
      const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      // placement par défaut (extérieur), ou forcé si fourni (ex. coin 12 rentré).
      const pos = overrides[cle] || [V[0] + dx*off, V[1] + dy*off];
      const t = el("text", { x: pos[0], y: pos[1], class:"coin",
        "text-anchor":"middle", "dominant-baseline":"middle" });
      t.textContent = n++;
      g.appendChild(t);
    }
  }
  svg.appendChild(g);
}

// Normale d'une arête [a,b], orientée vers l'EXTÉRIEUR du polygone : on teste
// en avançant depuis le milieu de l'arête ; si on entre dans le polygone, on
// inverse. Robuste quel que soit le sens de parcours du contour.
function normaleSortante(ax, ay, bx, by, poly){
  let dx = bx - ax, dy = by - ay;
  const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  let nx = dy, ny = -dx;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  if(pointDansPolygone(mx + nx, my + ny, poly)){ nx = -nx; ny = -ny; }
  return [nx, ny];
}

// Ouvertures : traits colorés sur les murs + petite étiquette posée du côté
// INTÉRIEUR (celui qui tombe dans une pièce). Marche avec plusieurs pièces.
function dessinerOuvertures(ouvertures, contours){
  const g = el("g", {});
  for(const o of ouvertures){
    const a = o.points[0], b = o.points[1];
    g.appendChild(el("line", { x1:a[0], y1:a[1], x2:b[0], y2:b[1],
      class:"ouverture ouverture--" + o.type }));
    if(o.label){
      const mx = (a[0]+b[0])/2, my = (a[1]+b[1])/2;
      // normale au trait ; on garde le côté qui est dans une pièce.
      let nx = -(b[1]-a[1]), ny = (b[0]-a[0]);
      const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
      const dedans = contours.some(p => pointDansPolygone(mx + nx*20, my + ny*20, p));
      if(!dedans){ nx = -nx; ny = -ny; }
      const t = el("text", { x: mx + nx*26, y: my + ny*26,
        class:"ouverture-label", "text-anchor":"middle", "dominant-baseline":"middle" });
      t.textContent = o.label;
      g.appendChild(t);
    }
  }
  svg.appendChild(g);
}

// Libellés de zones (ex. "SALON", "TERRASSE", "JARDIN") en filigrane.
function dessinerEtiquettes(etiquettes){
  if(!etiquettes) return;
  for(const e of etiquettes){
    const t = el("text", { x:e.x, y:e.y, class:"etiquette",
      "text-anchor":"middle", "dominant-baseline":"central" });
    // En style INLINE (et non en attribut de présentation) : sinon la règle CSS
    // `.etiquette` (font-size:72px, fill:gris) l'emporterait et taille/couleur
    // seraient ignorées.
    if(e.taille)  t.style.fontSize = e.taille + "px";      // taille sur mesure
    if(e.couleur) t.style.fill     = e.couleur;            // couleur sur mesure
    if(e.graisse) t.style.fontWeight = e.graisse;          // graisse sur mesure
    // label = chaîne (1 ligne) ou tableau de chaînes (plusieurs lignes via tspan).
    const lignes = Array.isArray(e.label) ? e.label : [e.label];
    if(lignes.length === 1){
      t.textContent = lignes[0];
    } else {
      const taille = e.taille || 72;          // doit refléter .etiquette (style.css)
      const interligne = taille * 1.1;
      lignes.forEach((ligne, i) => {          // bloc centré verticalement sur e.y
        const ts = el("tspan", { x:e.x,
          dy: i === 0 ? -(lignes.length - 1) / 2 * interligne : interligne });
        ts.textContent = ligne;
        t.appendChild(ts);
      });
    }
    svg.appendChild(t);
  }
}
