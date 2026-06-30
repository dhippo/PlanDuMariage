"use strict";
/* =============================================================================
   02 — DONNÉES DES PLANS (PLANS)   ·   Plan du mariage
   -----------------------------------------------------------------------------
   SOURCE DE VÉRITÉ des lieux, en centimètres : salon (pièce en L) et
   terrasse+jardin. Le « plan global » (PLANS.global) est CONSTRUIT par
   programme à partir des deux autres (superposition salon + terrasse), sans
   dupliquer ni modifier leurs cotes. Tout ici est de la DONNÉE : on corrige un
   plan sans toucher à la logique.

   Repère : origine en haut à gauche, x vers la droite, y vers le bas (cm).

   Dépend de   : 01-geometrie (translater, appelé au chargement par PLANS.global).
   Utilisé par : 04-validite, 05/06-rendu, 09-actions, 12-init (sélecteur).
   ============================================================================= */

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
