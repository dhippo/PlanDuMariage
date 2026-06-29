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
      { type:"rose", label:"Rosiers", rect:[-470,0,470,120] },
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

  // Terrasse + couloir + entrée FUSIONNÉS en UNE seule pièce praticable : on
  // greffe le tour de l'entrée sur le bord droit du couloir (x=1760). Résultat :
  // plus de mur interne entre Couloir et Entrée Dalle Terrasse (sous le coin 8) ;
  // le mur AU-DESSUS du coin 8 (x=1760, y 60→240, côté maison) reste, lui, tracé.
  // Sert UNIQUEMENT à "contours" (collision + murs) ; coinsContinus et fonds
  // continuent d'utiliser terrasseCouloir et entree séparément.
  const terrasseCouloirEntree = [];
  for(const p of terrasseCouloir){
    terrasseCouloirEntree.push(p);
    if(p[0] === 1760 && p[1] === 240)
      terrasseCouloirEntree.push([1760,60], [2160,60], [2160,510], [1760,510]);
  }

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
  // Même hachure grise que le feuillage. Ses 2 coins du HAUT sont les coins 26
  // (bas-gauche) et 25 (bas-droite) du Reste Jardin : ils gardent leur numéro
  // (dédup). Placé en DERNIER dans coinsContinus, donc 1-28 ne bougent pas et
  // seuls ses 2 coins du bas reçoivent un numéro : 29 (bas-droite), 30 (bas-gauche).
  const buissonsPoly = [
    [-470, 1430],   // haut-gauche (= coin 26)
    [2160, 1430],   // haut-droite (= coin 25)
    [2160, 1730],   // bas-droite (nouveau coin 29)
    [-470, 1730],   // bas-gauche (nouveau coin 30)
  ];

  // ÉPAISSEURS DE TRAIT (cf. dessinerTraits). Le plan global gère lui-même ses
  // murs (contourAuto:false) pour distinguer deux poids :
  //  - MOYEN  = tout le contour du Reste Jardin (frontière avec les zones
  //    utilisables : 16-15-14-13-12-couloir-entrée, + rose droite, + feuillages,
  //    + bas vers les buissons) ;
  //  - ÉPAIS  = murs réels + PÉRIMÈTRE EXTÉRIEUR (gauche/haut du jardin, haut
  //    terrasse/couloir/entrée, côté droit complet, et tour des buissons).
  // Le périmètre extérieur est UNE polyligne ouverte ; il recouvre le moyen sur
  // les arêtes communes (côté droit x=2160), d'où l'ordre moyen → épais.
  const perimetreExt = [
    [-470, 840],  [-470, 120], [0, 120], [0, 0], [300, 0], [300, 240],
    [960, 240], [1760, 240], [1760, 60], [2160, 60],   // jardin g/haut + terrasse/couloir/entrée haut
    [2160, 1730],                                       // tout le côté droit (entrée+jardin+buissons)
    [-470, 1730], [-470, 1430],                         // bas + gauche des buissons
  ];

  return {
    nom: "Plan global",
    contours: [ terrasseCouloirEntree, salonC ], // terrasse+couloir+entrée fusionnés, + salon
    murs: mursMaison,                          // murs décoratifs (ferme la maison)
    // Coins numérotés en CONTINU (1, 2, 3...), SANS préfixe de lettre : chaque
    // point physique reçoit UN seul numéro unique (les coins partagés entre
    // blocs ne sont numérotés qu'une fois — cf. dessinerCoinsContinus). L'ordre
    // des polygones fixe l'ordre d'attribution. Le rosier de droite est inclus
    // (4 coins, offset serré) ; les autres zones décoratives (massif de roses
    // de gauche, cerisiers) ne le sont pas : on les désigne par leur nom.
    coinsContinus: [ salonC, resteMaison, terrasseCouloir,
                     { poly: roseDroitePoly, off: 30 },     // rosier de droite : 4 coins (19-22)
                     entree, resteJardin, feuillagePoly,
                     buissonsPoly ],                        // buissons : 2 nouveaux coins (29, 30)
    // Placement forcé de certains numéros de coin. (960,440) : rentré DANS la
    // terrasse (à gauche de son point) pour ne pas être recouvert par le bloc
    // Plant posé juste à droite. (1760,240) = coin 8 : rapproché et rentré DANS
    // « Reste de la maison » (haut-gauche de son point) plutôt que dans l'entrée.
    coinsOverride: { "960,440": [920, 462], "1760,240": [1726, 208] },
    // Coins CACHÉS (non numérotés) : recouverts par le demi-cercle Plant opaque
    // ((1580,440), rayon 210, demi-disque bas). On retire (1760,440) et
    // (1760,510) (anciens 12 et 26) : le compteur ne les compte plus, donc la
    // numérotation reste continue 1→30 (au lieu de 1→32, sans trou).
    coinsMasques: [ "1760,440", "1760,510" ],
    // Le plan global trace ses murs via "traits" (deux épaisseurs), pas via le
    // contour fermé automatique.
    contourAuto: false,
    traits: [
      // MOYEN : tout le contour du Reste Jardin + les blocs rose droite &
      // feuillages (frontières internes avec les zones utilisables).
      // Reste Jardin : polyligne OUVERTE qui parcourt tout le contour SAUF les
      // arêtes 14-15 (0,600)->(0,840) et 15-16 (0,840)->(-470,840), volontairement
      // non tracées. On démarre au coin 14 et on termine au coin 16.
      { poids:"moyen", ferme:false, points: [
        [0,    600],   // coin 14
        [960,  600],   // 13
        [960,  440],   // 12
        [1760, 440],
        [1760, 510],
        [2160, 510],
        [2160, 1430],
        [-470, 1430],
        [-470, 840],   // coin 16
      ] },
      { poids:"moyen", points: feuillagePoly,  ferme:true },
      { poids:"moyen", points: roseDroitePoly, ferme:true },
      // ÉPAIS : salon + périmètre extérieur (recouvre le moyen sur le côté droit).
      { poids:"epais", points: salonC,       ferme:true },
      { poids:"epais", points: perimetreExt, ferme:false },
    ],
    fonds: [
      { type:"maison-reste", points: resteMaison }, // reste de la maison (blanc)
      ...t.fonds,                              // jardin (vert) + terrasse (gris)
      // reste du jardin (vert foncé pastel), quadrillé ; son contour est tracé
      // via plan.traits (poids "moyen"), pas par le contour auto.
      { type:"reste-jardin", points: resteJardin, grille:true },
      { type:"couloir", points: couloir },     // couloir (bordeaux pastel)
      { type:"entree",  points: entree },      // entrée (bordeaux pastel)
      { type:"salon",   points: salonC },      // salon (crème)
    ],
    zones: [
      ...t.zones,                              // massif de roses (haut-gauche)
      // Rosier de droite SOUS l'Entrée Dalle Terrasse (70 x 100) : ses 4 coins
      // sont numérotés (cf. coinsContinus). Bloc étroit => label VERTICAL et plus
      // petit (22px) pour tenir dedans (sinon "Rosiers" déborde en horizontal).
      { type:"rose", label:"Rosiers", rect:roseDroite, labelVertical:true, labelTaille:22 },
      // "Feuillages" : zone CONDAMNÉE (hachuré grisé) au coin bas-droite du
      // Reste Jardin, étendue vers le haut par le "trait" (pentagone). Étiquette
      // placée dans le corps rectangulaire (et non au centroïde, tiré vers le haut).
      { type:"feuillage", label:"Feuillages", points:feuillagePoly, labelXY:[1905,1205] },
      // Buissons : grand bloc grisé SOUS le plan, toute la largeur (2630 x 300).
      { type:"buissons", label:"Buissons", points:buissonsPoly, labelXY:[845,1580] },
      // Bloc "Plant" : petit rectangle vert vif (320 x 120), coin haut-gauche
      // confondu avec le coin 12 (960,440). Pas de numéro de coin.
      { type:"plant", label:"Plant", rect:[960,440,320,120] },
    ],
    // Arbres-images (illustrations PNG détourées, cf. assets/tree-elements/).
    // Décor posé par numéro : (x,y) = centre cm, d = diamètre affiché cm.
    // (Plus de pastilles `arbres` : tout le décor d'arbres passe par des images.)
    arbresImg: [
      // Les 2 anciens cerisiers -> arbre n°39. Celui de DROITE (ex grand cerisier)
      // reste le plus large ; celui de gauche (ex petit cerisier) plus modeste.
      { n:39, x:1300, y:1220, d:110 },   // droite (ex grand cerisier r=50)
      { n:39, x:-250, y:1290, d:70  },   // gauche (ex petit cerisier r=32.5)
      // Ancien disque pastel orange -> arbre n°29 (gardé petit).
      { n:29, x:1050, y:1380, d:68 },
      // Les 3 petits points verts du Reste Jardin -> arbre n°12 (gardés petits).
      { n:12, x:1470, y:1380, d:42 },
      { n:12, x:660,  y:1390, d:42 },
      { n:12, x:940,  y:1300, d:42 },
      // Gros arbre du bloc Buissons (ex pastille verte r=50) -> arbre n°10.
      { n:10, x:210, y:1550, d:110 },
    ],
    points: [
      // Demi-cercle "Plant" : centré 180 cm à gauche du point (1760,440) =>
      // (1580,440), rayon 210, demi-disque inférieur, vert Plant OPAQUE (= bloc
      // Plant). Pas de point central ; étiquette "Plant" (mêmes classes que le bloc).
      // Il recouvre (1760,440) et (1760,510), d'où leur masquage dans coinsMasques.
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
      { label:"100 cm",  x:2215, y:560  },     // coins 20-21 : côté droit du rosier de droite
      { label:"820 cm",  x:2110, y:1020 },     // coins 21-25 : côté droit (bas rosier -> bas du plan)
      { label:"450 cm",  x:1590, y:1205 },     // coins 27-28 : côté gauche du feuillage
      { label:"240 cm",  x:40,   y:720  },     // coins 14-15 : segment vertical x=0 (terrasse -> jardin)
      { label:"300 cm",  x:-515, y:1580 },     // buissons : profondeur (côté gauche)
      { label:"590 cm",  x:-505, y:1135 },     // coins 16-26 : côté gauche (bas jardin -> bas reste jardin)
      { label:"300 cm",  x:2110, y:1580 },     // coins 25-29 : côté droit (bas reste jardin -> bas buissons)
      { label:"962 cm",  x:1279, y:-515 },     // coins 2-7 : haut de la maison (S2 -> coin 7)
      { label:"540 cm",  x:1815, y:-210 },     // coins 7-23 : côté droit de la maison (vers l'entrée)
      { label:"406 cm",  x:855,  y:-277 },     // coins 2-3 : mur droit haut du salon
    ],
    etiquettes: [
      { label:"Salon",    x: 549, y:-277 },   // centré dans le rectangle haut du salon (coins 1-2-3)
      { label:"Terrasse", x: 600, y: 500 },
      { label:["Jardin","Utilisable"], x:-235, y: 480 },   // jardin praticable (2 lignes)
      { label:["Couloir","Dalle Terrasse"], x:1360, y:340, taille:40, couleur:"#8a4a5e" },
      { label:"Reste de la maison", x:1250, y:-120 },
      { label:["Entrée","Dalle Terrasse"], x:1960, y:285, taille:34, couleur:"#8a4a5e" },
      { label:"Reste Jardin", x:845, y:1140 },             // grande zone basse non praticable
      // PORTAIL : au-dessus de l'arête 23-24 (haut de l'entrée, y=60) et de sa
      // cote "400 cm" (y=38). Police spéciale (.etiquette = Cormorant Garamond),
      // couleur verte olivier du bouton "Ajouter une table" (--olivier #5C6B57).
      { label:"PORTAIL", x:1960, y:-15, taille:60, couleur:"#5C6B57", graisse:700 },
    ],
    spawn: [200, 430],
  };
})();


/* ============================ 2. ÉTAT ================================== */

let planActif      = "global"; // identifiant du plan affiché au démarrage (sélecteur modifiable)
const tables       = [];      // <<< SOURCE DE VÉRITÉ (tables rondes)
const formes       = [];      // <<< SOURCE DE VÉRITÉ (formes libres : rect/triangle/cercle)
let idSuivant      = 1;       // numérotation des tables
let idSuivantForme = 1;       // numérotation des formes
let idSuivantArbre = 1;       // numérotation interne des arbres-images posés
let selection      = null;    // { type:"table"|"forme"|"arbre", id } ou null

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


/* =================== 6. INTERFACE (panneau) =========================== */

function majInterface(){
  const valides = tables.filter(t => t.planId === planActif && tableValide(t));
  document.getElementById("nb-tables").textContent   = valides.length;
  document.getElementById("nb-couverts").textContent = valides.length * couvertsPourDiametre(settings.diametre);
  document.getElementById("val-diametre").textContent       = settings.diametre;
  document.getElementById("val-espace-chaises").textContent = settings.espaceChaises;
  document.getElementById("val-espace-mur").textContent     = settings.espaceMur;
  document.getElementById("btn-supprimer").disabled = (selection === null);
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

// Crée une forme (depuis la modale). opts = { type, titre, w, h, fond, bord }.
// Apparaît près du centre de la 1re pièce praticable, en cascade légère.
function ajouterForme(opts){
  const ctr = centroide(contoursDe(PLANS[planActif])[0]);
  const n = formes.filter(f => f.planId === planActif).length;
  const decal = (n % 6) * 30;
  const w = Math.max(40, Math.round(opts.w || 200));
  const h = Math.max(40, Math.round(opts.h || 120));
  const f = { id: idSuivantForme++, planId: planActif, type: opts.type || "rect",
    x: Math.round(ctr[0] - w/2 + decal), y: Math.round(ctr[1] - h/2 + decal),
    w, h, titre: opts.titre || "", angle: 0,
    fond: opts.fond || FORME_FOND_DEFAUT, bord: opts.bord || FORME_BORD_DEFAUT };
  formes.push(f);
  selection = { type:"forme", id: f.id };
  render();
  return f;
}

// La forme actuellement sélectionnée, ou null.
function formeSelectionnee(){
  return (selection && selection.type === "forme")
    ? formes.find(x => x.id === selection.id) : null;
}

// Supprime l'élément sélectionné (table, forme OU arbre-image).
function supprimerSelection(){
  if(!selection) return;
  let liste;
  if(selection.type === "forme")      liste = formes;
  else if(selection.type === "arbre") liste = arbresImgDe(PLANS[planActif]);
  else                                liste = tables;
  const i = liste.findIndex(x => x.id === selection.id);
  if(i >= 0) liste.splice(i, 1);
  selection = null;
  render();
}


/* ----- Arbres-images : pose par numéro (API + bouton) ------------------- */

// Pose l'arbre n (1→40) sur le PLAN AFFICHÉ, centré en (x,y) cm, diamètre d cm.
// Renvoie l'entrée créée. Pensé pour la console :  ajouterArbre(24, 1500, 900)
// (le diamètre est optionnel). Le décor n'est PAS persistant : pour le figer,
// recopier le résultat d'exporterArbres() dans les données (PLANS) de app.js.
function ajouterArbre(n, x, y, d){
  n = Math.max(1, Math.min(NB_ARBRES, Math.round(n)));
  const a = { id: idSuivantArbre++, n, angle: 0,
    x: Math.round(x), y: Math.round(y), d: Math.round(d || ARBRE_D_DEFAUT) };
  arbresImgDe(PLANS[planActif]).push(a);
  selection = { type:"arbre", id: a.id };
  render();
  return a;
}

// Pose l'arbre CHOISI dans la modale près du centre du plan (à déplacer ensuite
// à la souris/au doigt). Léger décalage en cascade pour ne pas empiler.
function poserArbreChoisi(){
  if(!arbreChoisi) return;
  const plan = PLANS[planActif];
  const ctr = plan.spawn || centroide(contoursDe(plan)[0]);
  const decal = (arbresImgDe(plan).length % 6) * 35;
  ajouterArbre(arbreChoisi, ctr[0] + decal, ctr[1] + decal);
  fermerModale("modal-arbre");
}

// Affiche dans la console le tableau "arbresImg" du plan courant, prêt à coller
// dans les DONNÉES (PLANS) de app.js pour rendre le décor permanent.
function exporterArbres(){
  const liste = PLANS[planActif].arbresImg || [];
  const txt = "arbresImg: [\n" +
    liste.map(a => `      { n:${a.n}, x:${a.x}, y:${a.y}, d:${a.d} },`).join("\n") +
    "\n    ],";
  console.log("// plan « " + planActif + " »\n" + txt);
  return txt;
}

// Accessibles depuis la console du navigateur.
window.ajouterArbre   = ajouterArbre;
window.exporterArbres = exporterArbres;


/* ========================= 7 bis. MODALES ============================== */
/* Ajout d'un ARBRE et d'une FORME : on passe d'abord par une modale. */

function ouvrirModale(id){ document.getElementById(id).hidden = false; }
function fermerModale(id){ document.getElementById(id).hidden = true; }
function fermerToutesModales(){
  for(const m of document.querySelectorAll(".modal")) m.hidden = true;
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
    svg.setPointerCapture(e.pointerId); render(); return;
  }
  // 1 bis) poignée de redimensionnement d'un arbre-image
  const poigneeArbre = cherche("[data-arbre-handle]");
  if(poigneeArbre){
    const id = parseInt(poigneeArbre.getAttribute("data-arbre-handle"), 10);
    selection = { type:"arbre", id };
    drag = { kind:"resize-arbre", id };
    svg.setPointerCapture(e.pointerId); render(); return;
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
    svg.setPointerCapture(e.pointerId); render(); return;
  }
  // 1 quater) poignée de ROTATION d'un arbre-image
  const rotArbre = cherche("[data-arbre-rotate]");
  if(rotArbre){
    const id = parseInt(rotArbre.getAttribute("data-arbre-rotate"), 10);
    const a = arbreImgParId(id);
    selection = { type:"arbre", id };
    drag = { kind:"rotate-arbre", id, offset:(a.angle || 0) - angleVers(a.x, a.y, p.x, p.y) };
    svg.setPointerCapture(e.pointerId); render(); return;
  }
  // 2) corps d'une forme (déplacement)
  const formeEl = cherche("[data-forme]");
  if(formeEl){
    const id = parseInt(formeEl.getAttribute("data-forme"), 10);
    const f = formes.find(x => x.id === id);
    selection = { type:"forme", id };
    drag = { kind:"move-forme", id, dx: p.x - f.x, dy: p.y - f.y };
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
  // 4) un arbre-image (déplacement) — sous les tables : testé après elles
  const arbreEl = cherche("[data-arbre]");
  if(arbreEl){
    const id = parseInt(arbreEl.getAttribute("data-arbre"), 10);
    const a = arbreImgParId(id);
    selection = { type:"arbre", id };
    drag = { kind:"move-arbre", id, dx: p.x - a.x, dy: p.y - a.y };
    svg.setPointerCapture(e.pointerId); render(); return;
  }
  // 5) clic dans le vide => désélection
  if(selection){ selection = null; render(); }
});

svg.addEventListener("pointermove", e => {
  if(!drag) return;
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

  // Boutons d'ajout. Table = direct (réglages partagés à gauche) ; forme & arbre
  // passent d'abord par une modale.
  document.getElementById("btn-ajouter").addEventListener("click", ajouterTable);
  document.getElementById("btn-ajouter-forme").addEventListener("click", ouvrirModaleForme);
  document.getElementById("btn-ajouter-arbre").addEventListener("click", ouvrirModaleArbre);
  document.getElementById("btn-supprimer").addEventListener("click", supprimerSelection);

  // Fermeture des modales : croix, clic sur le fond, bouton « Annuler », touche Échap.
  for(const b of document.querySelectorAll("[data-close]"))
    b.addEventListener("click", () => fermerModale(b.dataset.close));
  document.addEventListener("keydown", e => { if(e.key === "Escape") fermerToutesModales(); });
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
  document.getElementById("fe-fermer").addEventListener("click", () => { selection = null; render(); });
  document.getElementById("fe-suppr").addEventListener("click", supprimerSelection);

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

  normaliserArbres();                                // ids stables pour le décor "en dur"
  render();
  appliquerZoom();                                   // dimensionne le SVG au démarrage
  window.addEventListener("resize", appliquerZoom);  // garde la taille de base à jour
}

init();
