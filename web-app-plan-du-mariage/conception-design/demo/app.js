"use strict";

/* =========================================================================
   PLAN DU MARIAGE — placement de tables rondes
   -------------------------------------------------------------------------
   Architecture (volontairement simple, pour étendre facilement) :

   - PLANS     : DONNÉES des lieux (contour en L + ouvertures), en centimètres.
   - tables    : SEULE source de vérité. Tableau d'objets { id, planId, x, y }.
                 (x, y) = centre de la table, en centimètres, repère du plan.
   - settings  : réglages globaux (diamètre, espaces de dégagement).
   - render()  : redessine TOUT à partir de l'état. Appelée après CHAQUE
                 modification. Le DOM/SVG ne fait que refléter l'état ;
                 on ne lit jamais l'état depuis le DOM.

   Repère : origine en haut à gauche, x vers la droite, y vers le bas (cm).

   Pour ajouter plus tard : rotation (ajouter t.angle), sauvegarde
   (sérialiser `tables` + `settings`), tables rectangulaires (champ t.type),
   noms de tables (t.nom)... sans toucher à la boucle de rendu.
   ========================================================================= */


/* =========================== 1. DONNÉES ================================= */
/* Les cotes viennent des croquis (voir CLAUDE.md). Hypothèses de fermeture
   du L documentées là-bas. Tout est modifiable ici sans toucher la logique. */

const PLANS = {

  salon: {
    nom: "Salon (pièce en L)",
    // Contour, sens horaire depuis le coin haut-gauche.
    // Rectangle 498 x 720 moins une encoche 140 x 314 en bas à droite.
    contour: [ [0,0], [498,0], [498,406], [358,406], [358,720], [0,720] ],
    spawn: [200, 200],   // point d'apparition d'une nouvelle table (intérieur)
    ouvertures: [
      // Ne pas bloquer ces ouvertures : simples repères visuels.
      { type:"fenetre",       label:"fenêtre 174", points:[[107,0],[281,0]] },
      { type:"porte",         label:"porte 83",    points:[[498,170],[498,253]] },
      { type:"porte",         label:"porte 80",    points:[[358,636],[358,716]] },
      // PF1 : porte-fenêtre du bas (axe coin 6 -> coin 5 du salon).
      { type:"porte-fenetre", label:"PF1 (165cm)", points:[[70,720],[235,720]] },
      // PF2 : porte-fenêtre de gauche, placée à 50 cm du coin 6 (bas du mur).
      // Mur gauche y=0..720 ; bas de la PF à 720-50=670, haut à 670-165=505.
      { type:"porte-fenetre", label:"PF2 (165cm)", points:[[0,505],[0,670]] },
    ],
  },

  terrasse: {
    nom: "Terrasse + jardin",
    // Repère : origine = coin haut-gauche du jardin (= du massif de roses).
    // Terrasse en L à droite, HAUTE de 600 (240 + 360). Jardin à gauche,
    // 470 large x 840 haut = 120 de roses (en haut, INTÉRIEUR au plan) + 720
    // utilisable. Le jardin déborde donc EN BAS sous la terrasse (840 > 600).
    //
    // "contour" = zone praticable (murs + collision + grille) = terrasse +
    // jardin SOUS les roses, reliés le long de x = 0 (ouvert de y=120 à y=600).
    contour: [
      [0,0], [300,0], [300,240], [960,240], [960,600],
      [0,600], [0,840], [-470,840], [-470,120], [0,120],
    ],
    // Contour visuel complet (jardin entier + terrasse) : sert au tracé des
    // numéros de coins. Coin 1 = haut-gauche = le massif de roses.
    contourVisuel: [
      [-470,0], [300,0], [300,240], [960,240], [960,600], [0,600], [0,840], [-470,840],
    ],
    spawn: [200, 430],
    // Fonds colorés (teintes), tracés derrière la grille.
    fonds: [
      // Jardin complet 470 x 840 (vert clair) : roses comprises.
      { type:"jardin",   points:[[-470,0],[0,0],[0,840],[-470,840]] },
      // Terrasse en L (gris très clair).
      { type:"terrasse", points:[[0,0],[300,0],[300,240],[960,240],[960,600],[0,600]] },
    ],
    ouvertures: [
      // Le "côté maison" est un mur : repère pour ne pas coller les tables.
      { type:"maison", label:"côté maison", points:[[300,240],[960,240]] },
      { type:"maison", label:"",            points:[[300,0],[300,240]] },
    ],
    // Massif de roses : INTÉRIEUR au jardin, en haut (470 x 120), non praticable.
    // [x, y, largeur, hauteur] en cm. Hors du contour praticable => tables KO.
    zones: [
      { type:"rose", label:"🌹", rect:[-470,0,470,120] },
    ],
    // Cotes affichées manuellement (plus lisible que l'auto sur formes fusionnées).
    cotes: [
      { label:"470 cm", x:-235, y:-34  },  // largeur jardin
      { label:"120 cm", x:-525, y:60   },  // hauteur du massif de roses
      { label:"720 cm", x:-525, y:480  },  // hauteur jardin utilisable
      { label:"300 cm", x:150,  y:-26  },  // haut bande terrasse
      { label:"240 cm", x:345,  y:120  },  // bande gauche terrasse (coin 2->3)
      { label:"660 cm", x:630,  y:222  },  // bas maison
      { label:"360 cm", x:1015, y:420  },  // droite terrasse (coin 4->5)
      { label:"960 cm", x:480,  y:628  },  // bas terrasse
    ],
  },

};

/* ----- Plan global : superposition salon + terrasse/jardin -------------- */
// On imbrique le COIN 6 du salon (0,720) dans le COIN 3 de la terrasse
// (300,240) : il suffit de translater le salon de (300, -480). Le salon vient
// se loger dans l'angle "maison" de la terrasse et la déborde vers le haut.
// On ne modifie PAS les plans salon/terrasse : on en réutilise les données.
PLANS.global = (function(){
  const T = [300, -480];                       // (300 - 0, 240 - 720)
  const s = PLANS.salon, t = PLANS.terrasse;
  const salonC = translater(s.contour, T[0], T[1]);   // salon déplacé

  // Couloir "dalle terrasse" : prolongement de 800 cm vers la droite depuis le
  // coin T4 (960,240). Hauteur 200 cm (et non 360 comme l'arête T4-T5).
  // Coins : haut-gauche = T4 (960,240) ; haut-droite (1760,240) ;
  //         bas-droite (1760,440) ; bas-gauche (960,440).
  const couloir = [ [960,240], [1760,240], [1760,440], [960,440] ];

  // On FUSIONNE le couloir avec la terrasse (passage OUVERT, sans mur entre les
  // deux) : on insère le tour du couloir dans le contour terrasse, juste après
  // le sommet (960,240). Le contour praticable terrasse+couloir n'est utilisé
  // QUE par le plan global (PLANS.terrasse n'est pas modifié).
  const terrasseCouloir = [];
  for(const p of t.contour){
    terrasseCouloir.push(p);
    if(p[0] === 960 && p[1] === 240)
      terrasseCouloir.push([1760,240], [1760,440], [960,440]);
  }

  // "Reste de la maison" : on FERME la maison à droite du salon. Depuis S2
  // (798,-480) on tire un mur horizontal jusqu'à x=1760 (bord droit du
  // couloir), puis on descend jusqu'au coin haut-droite du couloir (1760,240).
  // La surface (à droite du salon, au-dessus du couloir) est PUREMENT VISUELLE :
  // blanche, non quadrillée, NON praticable (elle n'est pas dans "contours").
  const resteMaison = [
    [798,-480], [1760,-480], [1760,240], [658,240], [658,-74], [798,-74],
  ];
  const mursMaison = [ [ [798,-480], [1760,-480], [1760,240] ] ];

  // "Entrée Dalle Terrasse" : nouveau block à droite de la maison et du couloir.
  // 400 x 450. Coin haut-gauche sur le mur de la maison, à 180 cm AU-DESSUS du
  // coin haut-droite du couloir (1760,240) => (1760, 60). Puis +400 à droite
  // (2160,60), +450 en bas (2160,510), retour (1760,510) — soit 70 cm sous le
  // coin bas-droite du couloir (1760,440). Pièce praticable distincte.
  const entree = [ [1760,60], [2160,60], [2160,510], [1760,510] ];

  // "Reste Jardin" : tout le terrain SOUS les zones utilisables (jardin
  // utilisable, terrasse, couloir, entrée). NON praticable (comme "Reste de la
  // maison") : pas dans "contours", donc aucune table valide ; juste un fond
  // vert foncé pastel + une grille (on y placera roses/arbres plus tard).
  //
  // Tracé (départ = coin bas-droite de l'Entrée Dalle Terrasse (2160,510)) :
  //   - descendre de 920 cm => coin bas-droite (2160,1430) ;
  //   - le bas mesure 2630 cm = 470 (roses) + 300 (haut terrasse) + 660 + 800
  //     (maison) + 400 (entrée) => coin bas-gauche (-470,1430), aligné sur le
  //     côté gauche du jardin utilisable (x=-470).
  // Le haut suit EN ESCALIER les bas des zones utilisables : à gauche il
  // "remonte" moins (jardin bas à 840) qu'à droite (entrée bas à 510), car on a
  // plus de terrain à droite. Toutes les arêtes forment des angles droits.
  const resteJardin = [
    [-470, 840],   // haut-gauche = bas-gauche du jardin utilisable
    [0,    840],   // jonction jardin / terrasse (bas du jardin)
    [0,    600],   // remonte au bas de la terrasse
    [960,  600],   // bas de la terrasse
    [960,  440],   // remonte au bas du couloir
    [1760, 440],   // bas du couloir
    [1760, 510],   // redescend au bas de l'entrée
    [2160, 510],   // haut-droite = bas-droite de l'entrée (départ du tracé)
    [2160, 1430],  // coin bas-droite = 510 + 920
    [-470, 1430],  // coin bas-gauche (bas large de 2630 cm)
  ];

  // Rosier de droite (sous l'Entrée Dalle Terrasse) : 70 x 100. Défini une fois
  // pour le fond hachuré (zones) ET ses 4 coins numérotés (coinsContinus). Placé
  // AVANT l'entrée/le feuillage pour qu'il revendique ses 4 coins en numéros
  // consécutifs (offset serré : petit bloc).
  const roseDroite     = [2090, 510, 70, 100];   // [x, y, largeur, hauteur]
  const roseDroitePoly = [
    [2090, 510],   // haut-gauche
    [2160, 510],   // haut-droite (= coin bas-droite de l'entrée)
    [2160, 610],   // bas-droite
    [2090, 610],   // bas-gauche
  ];

  // Bloc "Feuillages" (zone condamnée) — défini une fois, réutilisé pour le
  // fond hachuré (zones) ET la numérotation des coins. Rectangle de base
  // [1650,980]→[2160,1430] + un quadrilatère supplémentaire (QFS) posé dessus,
  // dont l'arête HAUTE est TOUTE l'arête basse des roses sous l'entrée
  // ((2090,610)→(2160,610)). Contour = polygone à 5 sommets ; le côté droit
  // (2160,610)→(2160,1430) est une seule arête (plus de point intermédiaire).
  const feuillagePoly = [
    [1650,  980],   // QFS bas-gauche = haut-gauche du feuillage d'origine
    [2090,  610],   // QFS haut-gauche = coin bas-gauche des roses (sous l'entrée)
    [2160,  610],   // QFS haut-droite = coin bas-droite des roses
    [2160, 1430],   // bas-droite (= coin bas-droite du Reste Jardin)
    [1650, 1430],   // bas-gauche
  ];

  // Bloc "Buissons" : grand rectangle SOUS le plan (hors plan actuel), sur TOUTE
  // la largeur (2630 = de -470 à 2160) et 300 cm de profondeur (y 1430 -> 1730).
  // Même hachure grise que le feuillage. Ses 2 coins du HAUT sont les coins 28
  // (bas-gauche) et 27 (bas-droite) du Reste Jardin : ils gardent leur numéro
  // (dédup). Placé en DERNIER dans coinsContinus, donc 1-30 ne bougent pas et
  // seuls ses 2 coins du bas reçoivent un numéro : 31 (bas-droite), 32 (bas-gauche).
  const buissonsPoly = [
    [-470, 1430],   // haut-gauche (= coin 28)
    [2160, 1430],   // haut-droite (= coin 27)
    [2160, 1730],   // bas-droite (nouveau coin 31)
    [-470, 1730],   // bas-gauche (nouveau coin 32)
  ];

  return {
    nom: "Plan global",
    contours: [ terrasseCouloir, salonC, entree ], // terrasse(+couloir)+salon+entrée
    murs: mursMaison,                          // murs décoratifs (ferme la maison)
    // Coins numérotés en CONTINU (1, 2, 3...), SANS préfixe de lettre : chaque
    // point physique reçoit UN seul numéro unique (les coins partagés entre
    // blocs ne sont numérotés qu'une fois — cf. dessinerCoinsContinus). L'ordre
    // des polygones fixe l'ordre d'attribution. Le rosier de droite est inclus
    // (4 coins, offset serré) ; les autres zones décoratives (massif de roses
    // de gauche, cerisiers) ne le sont pas : on les désigne par leur nom.
    coinsContinus: [ salonC, resteMaison, terrasseCouloir,
                     { poly: roseDroitePoly, off: 30 },     // rosier de droite : 4 coins (20-23)
                     entree, resteJardin, feuillagePoly,
                     buissonsPoly ],                        // buissons : 2 nouveaux coins (31, 32)
    // Placement forcé de certains numéros de coin. Coin 13 (960,440) : rentré
    // DANS la terrasse (à gauche de son point) pour ne pas être recouvert par
    // le bloc Plant posé juste à droite.
    coinsOverride: { "960,440": [920, 462] },
    fonds: [
      { type:"maison-reste", points: resteMaison }, // reste de la maison (blanc)
      ...t.fonds,                              // jardin (vert) + terrasse (gris)
      // reste du jardin (vert foncé pastel), quadrillé + contour, non praticable
      { type:"reste-jardin", points: resteJardin, grille:true, contour:true },
      { type:"couloir", points: couloir },     // couloir (bordeaux pastel)
      { type:"entree",  points: entree },      // entrée (bordeaux pastel)
      { type:"salon",   points: salonC },      // salon (crème)
    ],
    zones: [
      ...t.zones,                              // massif de roses (haut-gauche)
      // Rosier de droite SOUS l'Entrée Dalle Terrasse (70 x 100) : ses 4 coins
      // sont numérotés (cf. coinsContinus).
      { type:"rose", label:"🌹", rect:roseDroite },
      // "Feuillages" : zone CONDAMNÉE (hachuré grisé) au coin bas-droite du
      // Reste Jardin, étendue vers le haut par le "trait" (pentagone). Étiquette
      // placée dans le corps rectangulaire (et non au centroïde, tiré vers le haut).
      { type:"feuillage", label:"Feuillages", points:feuillagePoly, labelXY:[1905,1205] },
      // Buissons : grand bloc grisé SOUS le plan, toute la largeur (2630 x 300).
      { type:"buissons", label:"Buissons", points:buissonsPoly, labelXY:[845,1580] },
      // Bloc "Plant" : petit rectangle vert vif (320 x 120), coin haut-gauche
      // confondu avec le coin 13 (960,440). Pas de numéro de coin.
      { type:"plant", label:"Plant", rect:[960,440,320,120] },
    ],
    arbres: [
      // Grand cerisier : repéré depuis le coin bas-gauche du Feuillages
      // (1650,1430) — 350 cm sur x (vers le jardin ouvert, à GAUCHE du bloc) et
      // 210 cm vers le haut => (1300,1220).
      { type:"cerisier", emoji:"🍒", x:1300, y:1220, r:50 },
      // Petit cerisier : repéré depuis le coin bas-gauche du Reste Jardin
      // (-470,1430) — 220 cm à droite et 140 cm vers le haut => (-250,1290).
      { type:"cerisier", emoji:"🍒", x:-250, y:1290, r:32.5 },
      // Petit arbre (pastille verte, sans emoji, taille du petit cerisier) :
      // depuis le coin 30 (1650,1430) — 180 cm à gauche, 50 cm en haut => (1470,1380).
      { type:"vert", x:1470, y:1380, r:16.25 },
      // Gros arbre (pastille verte, taille du gros cerisier r=50) : depuis le
      // coin 28 (-470,1430) — 680 cm à droite, 120 cm en dessous => (210,1550),
      // dans le bloc Buissons.
      { type:"vert", x:210, y:1550, r:50 },
      // Nouvel arbre (pastille verte, taille du petit cerisier r=32.5) : depuis
      // le coin 28 (-470,1430) — 1130 cm à droite, 40 cm vers le haut => (660,1390).
      { type:"vert", x:660, y:1390, r:16.25 },
      // Arbre (pastille verte) : depuis le coin 28 — 1410 cm à droite, 130 cm
      // vers le haut => (940,1300).
      { type:"vert", x:940, y:1300, r:16.25 },
      // Arbre automne (disque orange + 🍂) : depuis le coin 28 — 1520 cm à
      // droite, 50 cm vers le haut => (1050,1380).
      { type:"orange", emoji:"🍂", x:1050, y:1380, r:32.5 },
    ],
    points: [
      // Demi-cercle "Plant" : centré 180 cm à gauche du coin 12 (1760,440) =>
      // (1580,440), rayon 210, demi-disque inférieur, vert Plant translucide.
      // Pas de point central ; étiquette "Plant" (mêmes classes que le bloc Plant).
      { type:"plant", x:1580, y:440, rayon:210, demi:"bas", label:"Plant", labelXY:[1580,545] },
    ],
    ouvertures: [
      ...t.ouvertures,
      ...s.ouvertures.map(o => ({ type:o.type, label:o.label,
        points: translater(o.points, T[0], T[1]) })),
    ],
    // Cotes curatées (on évite de surcharger : dims clés des espaces).
    cotes: [
      { label:"498 cm", x:549,  y:-512 },      // salon largeur
      { label:"720 cm", x:256,  y:-150 },      // salon hauteur
      { label:"470 cm", x:-235, y:-30  },      // jardin largeur
      { label:"120 cm", x:-525, y:60   },      // massif de roses
      { label:"720 cm", x:-525, y:480  },      // jardin utilisable
      { label:"360 cm", x:905,  y:540  },      // terrasse droite (x=960) ; à gauche (le bloc Plant occupe la droite)
      { label:"960 cm", x:480,  y:628  },      // terrasse bas
      { label:"800 cm", x:1360, y:218  },      // couloir : longueur
      { label:"200 cm", x:1010, y:275  },      // couloir : hauteur
      { label:"180 cm", x:1715, y:150  },      // entrée : décalage au-dessus du couloir
      { label:"400 cm", x:1960, y:38   },      // entrée : largeur
      { label:"450 cm", x:2200, y:285  },      // entrée : hauteur
      { label:"2630 cm", x:845,  y:1765 },     // largeur du bas (Reste Jardin + Buissons) ; sous les buissons
      { label:"100 cm",  x:2215, y:560  },     // coins 21-22 : côté droit du rosier de droite
      { label:"820 cm",  x:2220, y:1020 },     // coins 22-27 : côté droit (bas rosier -> bas du plan)
      { label:"450 cm",  x:1590, y:1205 },     // coins 29-30 : côté gauche du feuillage
      { label:"240 cm",  x:40,   y:720  },     // coins 15-16 : segment vertical x=0 (terrasse -> jardin)
      { label:"300 cm",  x:-515, y:1580 },     // buissons : profondeur (côté gauche)
    ],
    etiquettes: [
      { label:"Salon",    x: 549, y:-277 },   // centré dans le rectangle haut du salon (coins 1-2-3)
      { label:"Terrasse", x: 600, y: 500 },
      { label:["Jardin","Utilisable"], x:-235, y: 480 },   // jardin praticable (2 lignes)
      { label:["Couloir","Dalle Terrasse"], x:1360, y:340, taille:40, couleur:"#8a4a5e" },
      { label:"Reste de la maison", x:1250, y:-120 },
      { label:["Entrée","Dalle Terrasse"], x:1960, y:285, taille:34, couleur:"#8a4a5e" },
      { label:"Reste Jardin", x:845, y:1140 },             // grande zone basse non praticable
    ],
    spawn: [200, 430],
  };
})();


/* ============================ 2. ÉTAT ================================== */

let planActif     = "global"; // identifiant du plan affiché au démarrage (sélecteur modifiable)
const tables      = [];      // <<< SOURCE DE VÉRITÉ (tables rondes)
const rectangles  = [];      // <<< SOURCE DE VÉRITÉ (rectangles libres)
let idSuivant     = 1;       // numérotation des tables
let idSuivantRect = 1;       // numérotation des rectangles
let selection     = null;    // { type:"table"|"rect", id } ou null

// 5 couleurs pastel claires (non utilisées ailleurs sur le plan) pour les
// rectangles libres (buffet, scène, bar...). { fond, bord } par couleur.
const COULEURS_RECT = [
  { nom:"Lavande", fond:"#e3d7f4", bord:"#9b86c9" },
  { nom:"Jaune",   fond:"#f7eeb2", bord:"#c9b34a" },
  { nom:"Pêche",   fond:"#fcdcc4", bord:"#e0a071" },
  { nom:"Ciel",    fond:"#d5e6f7", bord:"#7fa8d4" },
  { nom:"Menthe",  fond:"#d4ecdd", bord:"#7bbf95" },
];

const settings = {
  diametre:      160,  // diamètre d'une table (cm)
  espaceChaises:  50,  // espace réservé pour les chaises AUTOUR DE CHAQUE table (cm)
                       //   = rayon de dégagement de la table (l'anneau affiché).
                       //   Entre deux tables, l'écart vaut donc 2 x espaceChaises.
  espaceMur:      50,  // dégagement minimal entre une table et un mur (cm)
  zoom:            1,  // facteur de zoom du plan (1 = ajusté à la fenêtre)
};


/* ====================== 3. OUTILS DE GÉOMÉTRIE ========================= */

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


/* ===================== 4. VALIDITÉ / COUVERTS ========================== */

// Couverts estimés selon le diamètre (≈ 8 à 150 cm, ≈ 10 à 180 cm).
// Formule simple et éditable : 150→8, 160→8, 180→10, 210→12...
function couvertsPourDiametre(d){
  return 8 + 2 * Math.floor((d - 150) / 30);
}

// Une table est valide si :
//   (a) son centre est dans la pièce ET elle reste à >= espaceMur d'un mur ;
//   (b) elle ne chevauche aucune autre table du même plan (avec espaceTables).
function tableValide(t){
  const plan = PLANS[t.planId];
  const r = settings.diametre / 2;

  // (a) dans les murs, avec le dégagement. Un plan peut contenir plusieurs
  // pièces (ex. "Plan global") : la table doit tenir dans l'UNE d'elles et y
  // respecter l'écart au mur de CETTE pièce.
  let poly = null;
  for(const p of contoursDe(plan)){ if(pointDansPolygone(t.x, t.y, p)){ poly = p; break; } }
  if(!poly) return false;
  if(distanceAuMur(t.x, t.y, poly) < r + settings.espaceMur) return false;

  // (b) pas de chevauchement avec une autre table.
  // Chaque table réserve "espaceChaises" tout autour d'elle (pour ses chaises) ;
  // entre deux tables il faut donc cet espace DEUX FOIS (les chaises de chacune).
  for(const autre of tables){
    if(autre === t || autre.planId !== t.planId) continue;
    const distMini = settings.diametre + 2 * settings.espaceChaises; // 2r + 2 x chaises
    if(Math.hypot(t.x - autre.x, t.y - autre.y) < distMini) return false;
  }
  return true;
}


/* =========================== 5. RENDU ================================== */

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

// Zoom du plan : on dimensionne le SVG = (zone dispo de .scene) x zoom. À zoom=1
// il remplit la scène (aucun débordement) ; au-delà il déborde et .scene passe
// en overflow:auto — on ne scrolle donc QUE dans le cadre du plan. La taille
// est indépendante du plan affiché (le viewBox + preserveAspectRatio gèrent la
// mise à l'échelle interne), donc inutile d'appeler ceci à chaque render().
function appliquerZoom(){
  const z = settings.zoom;
  scene.style.overflow = "hidden";            // mesurer la zone SANS scrollbar
  const w = scene.clientWidth  - 32;          // padding 16 de chaque côté
  const h = scene.clientHeight - 32;
  svg.style.width  = Math.round(w * z) + "px";
  svg.style.height = Math.round(h * z) + "px";
  scene.style.overflow = z > 1 ? "auto" : "hidden";   // scroll seulement si zoomé
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
  defs.appendChild(motifHachures("hachures-rose",      "#f8dde6", "#d98aa6")); // roses (rose poudré)
  defs.appendChild(motifHachures("hachures-feuillage", "#e3e3e0", "#9a9a93")); // feuillages (grisé)
  svg.appendChild(defs);

  dessinerFonds(plan);                    // teintes (crème / vert / gris)
  dessinerGrille(b);                      // grille légère, découpée aux pièces
  for(const c of contours) dessinerContour(c);   // murs de chaque pièce
  // Contours décoratifs des fonds non praticables (ex. "Reste Jardin") : on
  // ferme la forme par un trait. Ses arêtes hautes coïncident avec les bas des
  // pièces utilisables (jardin/terrasse/couloir/entrée) : le tracé se superpose.
  for(const f of (plan.fonds || [])) if(f.contour) dessinerContour(f.points);
  dessinerMurs(plan.murs);                 // murs décoratifs (ex. fermer la maison)
  dessinerEtiquettes(plan.etiquettes);    // libellés de zones (ex. SALON, JARDIN)
  dessinerZones(plan.zones);              // zones non praticables (roses, feuillages...)
  dessinerArbres(plan.arbres);            // arbres ponctuels (cerisiers...)
  dessinerPoints(plan.points);            // points fixes (repères bleus...)
  dessinerCotes(plan, contours[0]);       // cotes manuelles si fournies, sinon auto
  dessinerOuvertures(plan.ouvertures, contours);
  if(plan.coinsActifs !== false){         // numéros des coins (repères bleus)
    if(plan.coinsContinus){               // numérotation continue dédupliquée (global)
      dessinerCoinsContinus(plan.coinsContinus, plan.coinsOverride);
    } else {
      const visuels = plan.contoursVisuels || [plan.contourVisuel || contours[0]];
      for(const v of visuels){
        if(Array.isArray(v)) dessinerCoins(v);        // simple liste de points
        else dessinerCoins(v.poly, v.prefixe);        // { poly, prefixe }
      }
    }
  }
  dessinerRectangles();   // rectangles libres (sous les tables)
  dessinerTables();

  majInterface();
}

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
function dessinerCoinsContinus(polys, overrides){
  overrides = overrides || {};                          // { "x,y": [px, py] } : placement forcé
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
      if(vus.has(cle)) continue;                        // déjà un numéro à ce point
      vus.add(cle);
      const P = poly[(i - 1 + poly.length) % poly.length];
      const N = poly[(i + 1) % poly.length];
      const n1 = normaleSortante(P[0], P[1], V[0], V[1], poly);
      const n2 = normaleSortante(V[0], V[1], N[0], N[1], poly);
      let dx = n1[0] + n2[0], dy = n1[1] + n2[1];       // bissectrice sortante
      const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      // placement par défaut (extérieur), ou forcé si fourni (ex. coin 13 rentré).
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

// L'objet (type, id) est-il l'élément sélectionné ?
function estSelection(type, id){
  return selection && selection.type === type && selection.id === id;
}

// Rectangles libres (buffet, scène, bar...) : déplaçables + redimensionnables.
function dessinerRectangles(){
  const g = el("g", {});
  for(const r of rectangles){
    if(r.planId !== planActif) continue;
    const col = COULEURS_RECT[r.couleur] || COULEURS_RECT[0];
    const sel = estSelection("rect", r.id);

    // Corps du rectangle (seul élément qui capte le pointeur, via data-rect).
    g.appendChild(el("rect", { x:r.x, y:r.y, width:r.w, height:r.h, rx:5,
      "data-rect": r.id, class:"rect" + (sel ? " rect--select" : ""),
      fill: col.fond, stroke: col.bord }));

    // Titre centré.
    if(r.titre){
      const t = el("text", { x:r.x + r.w/2, y:r.y + r.h/2 - 13, class:"rect-titre",
        "text-anchor":"middle", "dominant-baseline":"central" });
      t.textContent = r.titre;
      g.appendChild(t);
    }
    // Dimensions sous le titre.
    const d = el("text", { x:r.x + r.w/2, y:r.y + r.h/2 + 15, class:"rect-dim",
      "text-anchor":"middle", "dominant-baseline":"central" });
    d.textContent = Math.round(r.w) + " × " + Math.round(r.h) + " cm";
    g.appendChild(d);

    // Poignée de redimensionnement (coin bas-droit) quand sélectionné.
    if(sel){
      g.appendChild(el("circle", { cx:r.x + r.w, cy:r.y + r.h, r:11,
        "data-handle": r.id, class:"rect-poignee" }));
    }
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


/* =================== 6. INTERFACE (panneau) =========================== */

function majInterface(){
  const valides = tables.filter(t => t.planId === planActif && tableValide(t));
  document.getElementById("nb-tables").textContent   = valides.length;
  document.getElementById("nb-couverts").textContent = valides.length * couvertsPourDiametre(settings.diametre);
  document.getElementById("val-diametre").textContent       = settings.diametre;
  document.getElementById("val-espace-chaises").textContent = settings.espaceChaises;
  document.getElementById("val-espace-mur").textContent     = settings.espaceMur;
  document.getElementById("btn-supprimer").disabled = (selection === null);
  majEditeurRectangle();
}

// L'éditeur de rectangle n'est visible que si un rectangle est sélectionné.
// On ne réécrit pas le champ en cours d'édition (pour ne pas gêner la saisie).
function majEditeurRectangle(){
  const ed = document.getElementById("editeur-rect");
  const r = rectangleSelectionne();
  if(!r){ ed.hidden = true; return; }
  ed.hidden = false;
  const actif = document.activeElement;
  const tt = document.getElementById("rect-titre");
  const tw = document.getElementById("rect-w");
  const th = document.getElementById("rect-h");
  if(actif !== tt) tt.value = r.titre;
  if(actif !== tw) tw.value = Math.round(r.w);
  if(actif !== th) th.value = Math.round(r.h);
  for(const b of ed.querySelectorAll(".pastille-couleur"))
    b.classList.toggle("active", +b.dataset.couleur === r.couleur);
}


/* ===================== 7. ACTIONS SUR L'ÉTAT ========================== */

function ajouterTable(){
  const s = PLANS[planActif].spawn;
  const n = tables.filter(t => t.planId === planActif).length;
  const decal = (n % 6) * 35;   // léger décalage en cascade pour ne pas empiler
  const t = { id: idSuivant++, planId: planActif, x: s[0] + decal, y: s[1] + decal };
  tables.push(t);
  selection = { type:"table", id: t.id };
  render();
}

function ajouterRectangle(){
  // Apparaît près du centre de la 1re pièce praticable du plan.
  const ctr = centroide(contoursDe(PLANS[planActif])[0]);
  const n = rectangles.filter(r => r.planId === planActif).length;
  const decal = (n % 6) * 30;
  const r = { id: idSuivantRect++, planId: planActif,
    x: Math.round(ctr[0] - 100 + decal), y: Math.round(ctr[1] - 60 + decal),
    w: 200, h: 120, titre: "Zone", couleur: 0 };
  rectangles.push(r);
  selection = { type:"rect", id: r.id };
  render();
}

// Le rectangle actuellement sélectionné, ou null.
function rectangleSelectionne(){
  return (selection && selection.type === "rect")
    ? rectangles.find(x => x.id === selection.id) : null;
}

// Supprime l'élément sélectionné (table OU rectangle).
function supprimerSelection(){
  if(!selection) return;
  const liste = selection.type === "rect" ? rectangles : tables;
  const i = liste.findIndex(x => x.id === selection.id);
  if(i >= 0) liste.splice(i, 1);
  selection = null;
  render();
}


/* =================== 8. DÉPLACEMENT (Pointer Events) ================== */
/* Capture sur le SVG (élément stable) : render() peut reconstruire les
   cercles à volonté sans casser le glissement en cours.                   */

let drag = null;   // { id, dx, dy } : décalage entre le pointeur et le centre

// Convertit des coordonnées écran (clientX/Y) en centimètres du plan.
function ecranVersSvg(clientX, clientY){
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: p.x, y: p.y };
}

svg.addEventListener("pointerdown", e => {
  const p = ecranVersSvg(e.clientX, e.clientY);
  const cherche = sel => e.target.closest && e.target.closest(sel);

  // 1) poignée de redimensionnement d'un rectangle
  const poignee = cherche("[data-handle]");
  if(poignee){
    const id = parseInt(poignee.getAttribute("data-handle"), 10);
    selection = { type:"rect", id };
    drag = { kind:"resize", id };
    svg.setPointerCapture(e.pointerId); render(); return;
  }
  // 2) corps d'un rectangle (déplacement)
  const rectEl = cherche("[data-rect]");
  if(rectEl){
    const id = parseInt(rectEl.getAttribute("data-rect"), 10);
    const r = rectangles.find(x => x.id === id);
    selection = { type:"rect", id };
    drag = { kind:"move-rect", id, dx: p.x - r.x, dy: p.y - r.y };
    svg.setPointerCapture(e.pointerId); render(); return;
  }
  // 3) une table (déplacement)
  const tableEl = cherche("[data-table]");
  if(tableEl){
    const id = parseInt(tableEl.getAttribute("data-table"), 10);
    const t = tables.find(x => x.id === id);
    selection = { type:"table", id };
    drag = { kind:"move-table", id, dx: p.x - t.x, dy: p.y - t.y };
    svg.setPointerCapture(e.pointerId); render(); return;
  }
  // 4) clic dans le vide => désélection
  if(selection){ selection = null; render(); }
});

svg.addEventListener("pointermove", e => {
  if(!drag) return;
  const p = ecranVersSvg(e.clientX, e.clientY);
  if(drag.kind === "move-table"){
    const t = tables.find(x => x.id === drag.id);
    t.x = Math.round(p.x - drag.dx); t.y = Math.round(p.y - drag.dy);
  } else if(drag.kind === "move-rect"){
    const r = rectangles.find(x => x.id === drag.id);
    r.x = Math.round(p.x - drag.dx); r.y = Math.round(p.y - drag.dy);
  } else if(drag.kind === "resize"){
    const r = rectangles.find(x => x.id === drag.id);
    r.w = Math.max(40, Math.round(p.x - r.x));   // largeur mini 40 cm
    r.h = Math.max(40, Math.round(p.y - r.y));
  }
  render();
});

function finDrag(e){
  if(!drag) return;
  drag = null;
  try { svg.releasePointerCapture(e.pointerId); } catch(_){}
  render();
}
svg.addEventListener("pointerup",     finDrag);
svg.addEventListener("pointercancel", finDrag);


/* ========================= 9. INITIALISATION ========================== */

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

  // Boutons.
  document.getElementById("btn-ajouter").addEventListener("click", ajouterTable);
  document.getElementById("btn-ajouter-rect").addEventListener("click", ajouterRectangle);
  document.getElementById("btn-supprimer").addEventListener("click", supprimerSelection);

  // Éditeur de rectangle : pastilles de couleur + champs titre / dimensions.
  const conteneurCouleurs = document.getElementById("rect-couleurs");
  COULEURS_RECT.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "pastille-couleur";
    b.style.background = c.fond;
    b.style.borderColor = c.bord;
    b.title = c.nom;
    b.dataset.couleur = i;
    b.addEventListener("click", () => {
      const r = rectangleSelectionne(); if(!r) return;
      r.couleur = i; render();
    });
    conteneurCouleurs.appendChild(b);
  });
  document.getElementById("rect-titre").addEventListener("input", e => {
    const r = rectangleSelectionne(); if(!r) return;
    r.titre = e.target.value; render();
  });
  const majDim = (champ, prop) => document.getElementById(champ).addEventListener("input", e => {
    const r = rectangleSelectionne(); if(!r) return;
    r[prop] = Math.max(40, Math.round(+e.target.value || 40)); render();
  });
  majDim("rect-w", "w");
  majDim("rect-h", "h");
  document.getElementById("rect-suppr").addEventListener("click", supprimerSelection);

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

  // Zoom du plan : redimensionne le SVG (sans re-render) et active le scroll.
  const rngZoom = document.getElementById("rng-zoom");
  rngZoom.value = Math.round(settings.zoom * 100);
  document.getElementById("val-zoom").textContent = Math.round(settings.zoom * 100);
  rngZoom.addEventListener("input", () => {
    settings.zoom = +rngZoom.value / 100;
    document.getElementById("val-zoom").textContent = rngZoom.value;
    appliquerZoom();
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

  render();
  appliquerZoom();                                   // dimensionne le SVG au démarrage
  window.addEventListener("resize", appliquerZoom);  // garde la taille de base à jour
}

init();
