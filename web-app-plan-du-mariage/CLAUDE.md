# Plan du mariage : web-app de placement de tables

## Le besoin

Préparer un mariage en plaçant des **tables rondes** sur les plans des lieux.
Je veux une petite web-app que j'ouvre dans le navigateur pour :

- voir les pièces dessinées **à l'échelle** ;
- **ajouter des tables rondes** et les **déplacer** à la souris ou au doigt ;
- savoir tout de suite si une table **dépasse d'un mur** ou **chevauche** une autre table (avec les marges de dégagement) ;
- régler le **diamètre des tables**, l'**espace entre tables** et l'**espace table/mur** ;
- lire un **compteur** : nombre de tables valides + nombre de couverts estimé.

Deux espaces sont concernés : le **salon** (pièce principale, en L) et la **terrasse** (en L également).

## Source des dimensions

Les cotes viennent de deux croquis faits à la main (`../conception-design/esquisses-a-la-main/`, en centimètres).
Les croquis ne sont pas tracés à l'échelle ; j'ai recoupé les chiffres avec les proportions des dessins.

### Convention

Repère par plan : origine en haut à gauche, **x vers la droite**, **y vers le bas**, unité **centimètre**.

### Salon (pièce principale, en L)

Contour (polygone, sens horaire depuis le coin haut-gauche) :

```
(0,0) -> (498,0) -> (498,406) -> (358,406) -> (358,720) -> (0,720) -> retour
```

La pièce est le grand rectangle 498 x 720 **moins** une encoche en bas à droite de 140 x 314.

| Mur | De / à | Longueur | Ouverture |
|-----|--------|----------|-----------|
| Haut | (0,0) -> (498,0) | 498 cm = 107 + 174 + 217 | Fenêtre 174 cm (de x=107 à x=281) |
| Droite (haut) | (498,0) -> (498,406) | 406 cm = 170 + 83 + 153 | Porte 83 cm (de y=170 à y=253) |
| Encoche horizontale | (498,406) -> (358,406) | 140 cm | - |
| Encoche verticale | (358,406) -> (358,720) | 314 cm (≈ 230 mur + 80 porte) | Porte 80 cm (vers le bas, y=636→716) |
| Bas | (358,720) -> (0,720) | 358 cm (≈ 360 mesuré) | Porte-fenêtre 165 cm |
| Gauche | (0,720) -> (0,0) | 720 cm = 240 (mur vert) + 480 (mur blanc) | Porte-fenêtre 165 cm (section blanche, bas) |

### Terrasse + jardin

À gauche le **jardin** (470 large x **840** haut = 720 utilisable + 120 de roses) ; à droite la **terrasse** en L, haute de **600** (240 + 360). Le **massif de roses** (470 x 120) est **à l'intérieur** du plan, en haut à gauche (coin 1), et n'est pas praticable. Le jardin étant plus haut que la terrasse, il **déborde en bas** : ses coins bas descendent 240 cm sous le bas de la terrasse.

Repère : origine = coin haut-gauche du jardin (haut du massif). Terrasse et jardin sont reliés le long de x = 0 (ouvert de y = 120 à y = 600).

Zone praticable (`contour`, 10 sommets) = terrasse + jardin **sous** le massif :

```
(0,0) (300,0) (300,240) (960,240) (960,600) (0,600) (0,840) (-470,840) (-470,120) (0,120)
```

Contour visuel (`contourVisuel`, 8 sommets) — sert à numéroter les coins, coin 1 = roses :

```
(-470,0) (300,0) (300,240) (960,240) (960,600) (0,600) (0,840) (-470,840)
```

| Élément | Dimension | Note |
|---------|-----------|------|
| Jardin complet | 470 x 840 | Teinte vert clair (720 utile + 120 roses) |
| Massif de roses | 470 x 120 | Coin 1, **dans** le plan, non praticable (hachuré « Rose 🌹 ») |
| Jardin praticable | 470 x 720 | Sous le massif |
| Terrasse | 600 de haut | 240 (coin 2→3) + 360 (coin 4→5) |
| Maison (découpe) | 660 x 240 | Haut-droite, hors terrasse |
| Bas terrasse | 960 | - |

Teintes : jardin **vert clair**, terrasse **gris très clair**, grille par-dessus. Coins numérotés 1→8 en bleu foncé, à l'extérieur. Fonds (`fonds`) et massif (`zones`) peuvent déborder du contour ; le tracé en tient compte.

### Plan global (superposition)

Troisième plan du sélecteur : il **superpose** le salon et la terrasse+jardin. Assemblage : le **coin 6 du salon** (0,720) vient s'**emboîter** dans le **coin 3 de la terrasse** (300,240), c'est-à-dire dans l'angle « maison » de la terrasse. Le salon est donc **translaté de (300, −480)** et se loge dans la découpe maison, en débordant vers le haut.

Ce plan est **construit par programme** à partir des deux autres (objet `PLANS.global`) : on **ne duplique pas** les cotes du salon/terrasse et on **ne modifie pas** les deux plans d'origine. Il définit `contours` = **deux pièces** praticables (**terrasse + couloir + entrée fusionnés** en une seule, et salon translaté) : une table est valide si elle tient dans l'une OU l'autre. (Côté assemblage, le coin 6 du salon s'emboîte dans le coin 3 de la terrasse.)

**Numérotation des coins (plan global)** : les coins ne sont **plus préfixés par une lettre**. Ils sont numérotés en **continu (1, 2, 3...)** sur l'ensemble des blocs via `coinsContinus` (liste ordonnée : salon, reste-maison, terrasse+couloir, **rosier de droite**, entrée, reste-jardin, feuillages, **buissons**) et `dessinerCoinsContinus` : **chaque point physique reçoit un seul numéro unique** (les coins partagés entre deux blocs gardent le numéro du premier polygone qui les revendique, via un `Set` de positions déjà vues). But : pouvoir désigner sans ambiguïté « le coin N ». Une entrée de `coinsContinus` peut être un **polygone** OU un objet `{ poly, off }` (recul du numéro sur mesure) : le **rosier de droite** (sous l'entrée) est placé avant l'entrée/le feuillage avec un `off:30` serré pour que ses **4 coins (19→22)** encadrent ce petit bloc lisiblement. `dessinerCoinsContinus` accepte aussi un **`coinsOverride`** (`{ "x,y": [px,py] }`) qui **force la position** d'un numéro précis — utilisé pour rentrer le **coin 12** (960,440) dans la terrasse, le bloc Plant occupant sa place par défaut. Les autres zones décoratives (massif de roses de gauche, cerisiers) ne sont pas numérotées : on les désigne par leur nom. **Coins masqués** : `dessinerCoinsContinus` accepte un **`coinsMasques`** (liste de `"x,y"`) — points **non numérotés**, le compteur **n'avance pas** dessus (numérotation continue, sans trou). Ici (1760,440) et (1760,510) sont masqués car **recouverts par le demi-cercle Plant opaque** : la numérotation va donc de **1 à 30** (et non 1 à 32 — les anciens coins 12 et 26 sont supprimés, les suivants décalés pour combler).

Libellés de zone en filigrane : **Salon, Terrasse** (casse normale, plus de majuscules), **Jardin Utilisable** (2 lignes), Reste Jardin. Les libellés bordeaux **Couloir / Dalle Terrasse** et **Entrée / Dalle / Terrasse** sont **passés à la ligne** et réduits pour tenir dans leur bloc. Un libellé `label` peut être une **chaîne** (1 ligne) ou un **tableau de chaînes** (plusieurs lignes, rendues en `<tspan>`).

Cohérence vérifiée : la porte-fenêtre basse du salon (165) tombe pile sur la jonction salon/terrasse (passage intérieur → extérieur).

**Couloir Dalle Terrasse** (plan global uniquement) : prolongement de **800 cm** vers la droite depuis le coin **T4** (960,240), **200 cm** de haut (et non 360 comme l'arête T4-T5). Coins : T4 (haut-gauche), (1760,240) haut-droite, (1760,440) bas-droite, (960,440) bas-gauche. Il est **fusionné** au contour de la terrasse (passage ouvert, sans mur entre les deux), teinté **bordeaux pastel** (`.fond--couloir`) et étiqueté. Tout est défini dans `PLANS.global` (objet construit par programme) ; `PLANS.terrasse` et `PLANS.salon` ne sont pas modifiés.

**Fusion terrasse + couloir + entrée** (pour `contours` uniquement) : l'**Entrée Dalle Terrasse** est elle aussi greffée sur le bord droit du couloir (x=1760) via `terrasseCouloirEntree`, de sorte qu'il n'y a **plus de mur interne** entre Couloir et Entrée (sous le coin 8) — les deux dalles roses sont continues. Le mur **au-dessus** du coin 8 (x=1760, y 60→240, côté maison) reste, lui, tracé. `coinsContinus` et `fonds` continuent d'utiliser `terrasseCouloir` et `entree` séparément (numérotation et teintes inchangées) ; seule `contours` utilise la pièce fusionnée. Le **coin 8** (1760,240) est par ailleurs rapproché et rentré **dans « Reste de la maison »** via `coinsOverride` (`[1726,208]`).

**Reste de la maison** (plan global uniquement) : pour « fermer la maison », un mur part de **S2** (798,-480), file horizontalement jusqu'à **x = 1760** (bord droit du couloir), puis descend jusqu'au coin haut-droite du couloir (1760,240). La surface ainsi enfermée (à droite du salon, au-dessus du couloir) est **purement visuelle** : fond **blanc**, **non quadrillée**, **non praticable** (elle n'est pas dans `contours`, donc les tables y sont invalides). Mise en œuvre via un fond `maison-reste` (blanc), une liste `murs` (polylignes décoratives, fonction `dessinerMurs`) et une étiquette « Reste de la maison ».

**Reste Jardin** (plan global uniquement) : tout le terrain **sous** les zones utilisables (jardin utilisable, terrasse, couloir, entrée). **Non praticable** comme « Reste de la maison » (pas dans `contours` → toute table y est invalide), mais cette fois **quadrillé** (on y placera roses / arbres ensuite) et teinté **vert foncé pastel** (`.fond--reste-jardin`). Tracé : on part du **coin bas-droite de l'Entrée Dalle Terrasse** (2160,510), on descend de **920 cm** → coin bas-droite (2160,1430) ; le **bas** mesure **2630 cm** = 470 (roses) + 300 (haut terrasse) + 660 + 800 (maison) + 400 (entrée) → coin bas-gauche (−470,1430), **aligné sur le côté gauche du jardin utilisable** (x=−470). Le **haut suit en escalier** les bas des zones utilisables : à gauche il « remonte » moins (jardin bas à 840) qu'à droite (entrée bas à 510) — on a plus de terrain à droite. **Toutes les arêtes forment des angles droits.** Mise en œuvre par un seul fond `{ type:"reste-jardin", grille:true, contour:true }` : le flag `grille` étend le `clipPath` de la grille à ce fond, `contour` le ferme par un trait (`dessinerContour`) dont les arêtes hautes se superposent aux bas des pièces utilisables. Le **bloc Jardin de gauche est renommé « Jardin Utilisable »** (étiquette sur 2 lignes) : c'est la surface du jardin **où l'on peut placer des tables**, à ne pas confondre avec « Reste Jardin ».

**Éléments du jardin (plan global uniquement)** — décor non praticable posé *dans* le Reste Jardin :
- **Massifs de roses** (`zones`, type `rose`, hachuré rose poudré, étiquette `🌹`). Outre le massif d'origine (haut-gauche, 470×120), un **second massif 70 (x) × 100 (y)** est posé **sous l'Entrée Dalle Terrasse**, son coin haut-droite confondu avec le coin bas-droite de l'entrée (2160,510) → `rect:[2090,510,70,100]`. Ce bloc étant **étroit**, son étiquette « Rosiers » est **verticale et réduite** (`labelVertical:true, labelTaille:22`) pour tenir dedans.
- **Feuillages** (`zones`, type `feuillage`, **hachuré grisé** `#hachures-feuillage`, étiquette grise) : zone **condamnée** au coin bas-droite du Reste Jardin. Rectangle de base [1650,980]→[2160,1430] (coin bas-droite confondu avec celui du Reste Jardin), **étendu vers le haut** par un **quadrilatère supplémentaire (QFS)** dont l'**arête haute épouse toute l'arête basse des roses sous l'entrée** ((2090,610)→(2160,610)) et l'arête basse l'ancien haut du feuillage ((1650,980)→(2160,980)). Contour fusionné = polygone à 5 sommets `points:[[1650,980],[2090,610],[2160,610],[2160,1430],[1650,1430]]` (le côté droit (2160,610)→(2160,1430) est une seule arête ; le point intermédiaire (2160,980) — un ancien coin numéroté devenu inutile — a été retiré). Une zone peut donc être **rectangulaire** (`rect:[x,y,w,h]`) **ou polygonale** (`points:[…]` + `labelXY` optionnel pour placer l'étiquette) — `dessinerZones` gère les deux. L'étiquette accepte aussi **`labelTaille`** (taille px sur mesure, l'emporte sur `.zone-label`) et **`labelVertical`** (rotation −90°, lecture bas→haut) pour tenir dans un bloc étroit.
- **Buissons** (`zones`, type `buissons`, **même hachure grise** que le feuillage `#hachures-feuillage`) : grand bloc **sous le plan** (hors plan actuel), sur **toute la largeur** (2630, de −470 à 2160) et **300 cm** de profondeur (y 1430 → 1730) → `points:[[-470,1430],[2160,1430],[2160,1730],[-470,1730]]`. Ses 2 coins du haut sont les coins **26** (bas-gauche) et **25** (bas-droite) du Reste Jardin (inchangés) ; ses 2 coins du bas sont les **nouveaux coins 29** (bas-droite) et **30** (bas-gauche).
- **Plant** (`zones`, type `plant`, **vert vif plein** `#5fb84e`, *pas* de hachure) : petit rectangle **320 × 120**, coin haut-gauche confondu avec le **coin 12** (960,440) → `rect:[960,440,320,120]`. **Pas de numéro de coin** (absent de `coinsContinus`). Comme il recouvre le placement par défaut du numéro 12, ce dernier est **rentré dans la terrasse** via `coinsOverride` (voir ci-dessous), et la cote « 360 cm » a été déplacée à gauche (x=905) pour ne pas être sous le bloc.
- **Arbres** (`arbres`, `dessinerArbres`) : marqueurs ponctuels (disque coloré + emoji optionnel), **purement décoratifs**. Plus aucun n'est utilisé sur le plan global : tout le décor d'arbres est passé en **vraies illustrations** (voir `arbresImg` ci-dessous). La fonction reste disponible pour qui voudrait reposer une pastille.
- **Arbres-images** (`arbresImg`, `dessinerArbresImg`) : illustrations PNG détourées de `assets/tree-elements/` posées par numéro (`{ id, n, x, y, d }`, cf. section « Décor » de « L'app »). Décor actuel du plan global : les **2 anciens cerisiers → arbre n°39** ((1300,1220) `d:110`, le plus large à droite ; (−250,1290) `d:70`) ; l'**ancien marqueur orange → n°29** ((1050,1380) `d:68`) ; les **3 petites pastilles vertes du Reste Jardin → n°12** ((1470,1380), (660,1390), (940,1300), `d:42`) ; le **gros arbre du bloc Buissons → n°10** ((210,1550), `d:110`).

- **Points / repères** (`points`, `dessinerPoints`, **distinct des `arbres`**) — chaque entrée peut combiner : un **disque central** (si `r` fourni, `.point--*`), un **halo** (`rayon` → grand cercle translucide `.point-halo--*` ; avec `demi:"bas"` ce n'est que le **demi-disque inférieur**, tracé en `<path>` : arc du bas refermé par le diamètre), et une **étiquette** (`label`/`labelXY`, rendue avec les classes de zone `zone-label zone-label--*` pour réutiliser leur style). Tout est en `pointer-events:none`. Instance actuelle : un **demi-cercle vert « Plant »** (type `plant`, `.point-halo--plant`) centré **180 cm à gauche de (1760,440)** → (1580,440), `rayon:210`, **sans disque central**, étiquette « Plant » identique à celle du bloc Plant. Il est rendu **OPAQUE** (même `#A9C28C` que `.zone--plant`, et non plus translucide) ; comme il recouvre les points (1760,440) et (1760,510), ceux-ci sont **masqués** (`coinsMasques`) et la numérotation des coins passe à **1→30** (cf. « Numérotation des coins »).

Le motif de hachures `motifHachures(id, fond, trait)` est **paramétré** (décliné en `hachures-rose` et `hachures-feuillage`). Les étiquettes de zone reçoivent une classe par type (`zone-label--rose`, `zone-label--feuillage`). Les `arbres` sont **purement décoratifs** (ils n'entrent pas dans `tableValide`).

## Hypothèses retenues (cotes ambiguës)

Consigne suivie : quand une cote est ambiguë, choisir l'interprétation qui **ferme la forme proprement** et la documenter.

1. **Mur gauche du salon = 720 cm = 240 (mur vert) + 480 (mur blanc).** Les deux annotations s'**additionnent** (le 480 n'est pas le total du mur). La porte-fenêtre de 165 cm est dans la section blanche (basse).
2. **Côté droit du salon = 406 + 310 ≈ 716 ≈ 720**, ce qui ferme le L face au mur gauche (720). Détail : mur droit haut 406 (170 + porte 83 + 153) ; encoche verticale = 230 (du seuil de la porte jusqu'au coin du L) + porte 80, soit ≈ 310.
3. **Encoche verticale modélisée à 314 cm** (au lieu de 310) pour fermer exactement face au mur gauche de 720 (arrondi de 4 cm, sans impact pratique).
4. **Mur bas du salon = 358 cm** plutôt que 360, pour que largeur haut (498) = encoche (140) + bas (358). Écart de 2 cm.
5. **Positions des ouvertures du salon** : la fenêtre haute et la porte droite sont bien cotées ; les porte-fenêtres (bas et gauche) sont **approximatives**, à ajuster dans `PLANS` (`js/02-plans.js`) si besoin.
6. **Terrasse** : la forme ferme exactement (300 + 660 = 960 en largeur ; 240 + 360 = 600 en hauteur), aucune correction nécessaire.
7. **Jardin** (croquis IMG_0813) : jardin = **470 x 840** (720 utilisable + **120 de roses en haut, à l'intérieur** du plan, coin 1). Terrasse = **600** (240 + 360). Le jardin déborde donc **sous** la terrasse de 240 cm : ses coins bas (7 et 8) ne sont pas à la même hauteur que ceux de la terrasse (coin 5). Massif de roses hachuré, non praticable.

## L'app

HTML/CSS/JS natifs, **aucun framework, aucun build**, **ouvrable par double-clic** : `index.html` + `style.css` + un dossier **`js/`** de **12 scripts classiques** chargés dans l'ordre (`01-geometrie.js` → `12-init.js`). Le JS (autrefois un `app.js` unique) a été **scindé par couches** sans rien réécrire ; le découpage, l'ordre de chargement, les normes de nommage et l'emplacement de chaque fonctionnalité sont documentés dans **`js/00-STRUCTURE.md`** (à lire en premier pour s'orienter). Comme ce sont des scripts classiques (pas de modules ES), tous les fichiers **partagent une portée globale** et **l'ordre des balises `<script>` compte** (ex. `01` avant `02`, `05` avant `11`, `12` en dernier).

### Fonctions attendues

- Plan dessiné **à l'échelle en SVG** : contour en L (`<polygon>`), grille légère, cotes affichées. **Mise en page plein écran** : l'app tient dans la fenêtre (pas de scroll de page sur desktop, `body{overflow:hidden}`).
- **Zoom du plan** : modèle « conteneur défilant ». `appliquerZoom()` fixe la **taille px du SVG = (zone utile de `.scene`) × zoom** (largeur ET hauteur explicites : sinon le SVG, élément remplacé, déduit sa hauteur du `viewBox` et **déborde sous Safari**). À zoom 1 il remplit `.scene` (`overflow:hidden`, aucun scroll) ; au-delà il déborde et `.scene` passe en `overflow:auto` → **on ne scrolle que dans le cadre du plan**. La zone utile est **mémorisée** (`baseScene`, via `mesurerBaseScene()`) pour ne pas re-mesurer (et faire clignoter la barre de défilement) à chaque pas de pinch ; remesurée au `resize` et au début d'un pinch. **Zoom focalisé** (`zoomerVers(zoom, clientX, clientY)`, façon Google Maps) : le point sous le curseur/le centre du pinch reste fixe — on redimensionne le SVG puis on cale `scene.scrollLeft/Top`. Bornes `ZOOM_MIN..ZOOM_MAX` (1→4).
  - **Desktop** : le curseur `#rng-zoom` (panneau gauche) appelle `zoomerVers` centré sur la scène ; la **molette/trackpad** zoome aussi — un pinch trackpad arrive en `wheel` + `ctrlKey` (comme Ctrl+molette), `deltaY` borné pour un pas doux. `majCurseurZoom()` reflète `settings.zoom` dans le curseur (que le pinch/trackpad fait bouger).
  - **Mobile** (`max-width:760px`) : **pas de curseur** (`.reglage--zoom{display:none}`). On zoome **au doigt (pinch)** et on déplace **au doigt (pan)**. `.scene` est `flex:1; min-height:0` dans l'app-shell (hauteur déduite du **viewport**, pas du SVG → pas de boucle avec `appliquerZoom`).
- **Gestes (`js/11-gestes.js`)** : un **contrôleur de pointeurs** unique arbitre, via une `Map` de pointeurs actifs (`pointermove`/`up` écoutés sur **window** pour suivre le geste hors du SVG) : **1 pointeur sur un objet** → déplacement (`debutDragObjet`/`majDragObjet`, inchangé : tables/formes/arbres + poignées) ; **1 doigt (ou stylet) dans le vide** → **pan** (`scene.scrollLeft/Top`), un tap net (< 8 px) désélectionne ; **2 doigts** → **pinch** (`demarrerPinch`/`majPinch`, zoom centré sur le milieu, annule tout drag/pan en cours) ; **souris dans le vide** → désélection (desktop inchangé). `touch-action:none` sur `.scene` laisse le JS gérer pan/pinch (sans effet sur la molette desktop). iOS : `gesturestart` bloqué en plus.
- **Disposition mobile** (`max-width:760px`) : app-shell plein écran sans scroll de page — **header**, puis le **plan juste en dessous** (remplit l'espace), puis une **barre d'outils en bas** (`.barre-mobile` : Table · Forme · Arbre · Supprimer · Réglages ; boutons `#btn-m-*` câblés aux **mêmes** fonctions que le panneau). Le **panneau** (réglages/compteur/légende) devient une **feuille coulissante** (bottom sheet) ouverte par « Réglages » (`basculerReglages()`, classe `body.reglages-ouverts` + `#sheet-backdrop`). L'**éditeur de forme** (`#editeur-forme`) et les **modales** (forme/arbre) deviennent des **feuilles à l'échelle du viewport** (`position:fixed`, défilantes, bas atteignable) — corrige le bug où l'éditeur, en `absolute` dans `.scene`, avait sa partie basse coupée. `.scene` n'établit **pas** de bloc conteneur pour ces `fixed` (pas de `transform`/`filter`/`contain`), donc ils s'ancrent bien au viewport. Empilement : barre 30 < modale 70, feuille `.panneau` 60 < éditeur 65 ; ouvrir une modale **ferme** d'abord la feuille Réglages. **Tout le mobile est dans la media query** `@media (max-width:760px)` (+ `touch-action:none` sur `.scene`, sans effet desktop) : le desktop est inchangé.
- Fenêtres et portes-fenêtres **marquées visuellement** (pour ne pas les bloquer).
- Bouton **« Ajouter une table »** ; chaque table déplaçable souris + tactile via **Pointer Events** (`pointerdown` / `pointermove` / `pointerup` + `setPointerCapture`), pas l'API `draggable`.
- **Collision** : table **rouge** si elle sort d'un mur ou chevauche une autre table (marges incluses), **verte/bleue** sinon.
- **Réglages** : diamètre de table, espace pour les chaises (dégagement réservé autour de **chaque** table ; l'écart entre deux tables vaut donc 2 x cette valeur), espace table/mur.
- **Compteur** : tables valides + couverts estimés (≈ 8 pour 150 cm, ≈ 10 pour 180 cm).
- **Sélecteur de plan** : salon / terrasse+jardin / plan global (superposition).
- **Formes libres** (buffet, scène, bar, DJ…) : bouton « Ajouter une forme » qui **ouvre une modale** (`#modal-forme`) où l'on choisit le **type** (rectangle / triangle / cercle), la **couleur de fond** et la **couleur de contour** (librement, palette `PALETTE_FORME`), un **titre** optionnel, une **largeur** et une **hauteur**. La forme est ensuite déplaçable (Pointer Events), **redimensionnable** (poignée **creuse** au coin bas-droit de sa boîte) et **rotative** (poignée **pleine** au-dessus, voir « Rotation » ci-dessous). Quand une forme est **sélectionnée**, un **éditeur flottant** (`#editeur-forme`, classe `.editeur-flottant`) apparaît **en overlay en haut à droite du plan** (et non dans le panneau gauche) : titre, largeur, hauteur, **rotation** (champ d'angle + bouton « Remettre droit »), fond, contour + croix de fermeture (× = désélectionne) et « Supprimer cette forme ». Modèle : `formes = [{ id, planId, type, x, y, w, h, titre, fond, bord, angle }]` (`angle` en degrés, horaire) ; rendu par `dessinerFormes()` (rect = `<rect>`, triangle = `<polygon>` apex en haut, cercle = `<ellipse>` rx=w/2, ry=h/2), chaque forme enveloppée dans un `<g transform="rotate(angle cx cy)">`. Purement visuelles (pas de collision avec les tables).
- **Arbres-images (décor)** : 40 illustrations d'arbres vus de dessus, détourées dans `assets/tree-elements/` (`tree-01.png` … `tree-40.png`, fond transparent ; planche numérotée `_planche-reference.png` + `manifest.json`). Elles proviennent des 2 planches `assets/jeu-couronnes-arbres*.png` (20 chacune, extraites par `scripts`/PIL). On en pose sur un plan **par numéro** : un plan peut porter une liste `arbresImg` de `{ id, n, x, y, d, angle }` (n = 1→40, (x,y) = centre cm, d = diamètre affiché cm, angle en degrés). Rendu par `dessinerArbresImg()` (un `<image>` en `pointer-events:none` + une **pastille circulaire invisible** `.arbre-img-hit` qui capte le pointeur, pour que les coins transparents ne bloquent ni la grille ni les tables), le tout enveloppé dans un `<g transform="rotate(angle x y)">`. **Sélectionnable / déplaçable / redimensionnable** (poignée creuse) **et rotative** (poignée pleine, cf. « Rotation ») comme une forme, et supprimable. Purement **décoratif** (n'entre pas dans `tableValide`). Ajout via le bouton « Ajouter un arbre » qui **ouvre une modale** (`#modal-arbre`) affichant les **40 vignettes** : on clique l'illustration voulue puis « Ajouter » (pose au centre du plan, sans autre customisation ; on l'agrandit/déplace ensuite). API console : `ajouterArbre(n, x, y, d)` pose l'arbre sur le plan affiché ; `exporterArbres()` recrache le tableau `arbresImg` du plan courant, **à recopier dans `PLANS` (`js/02-plans.js`)** pour rendre le décor permanent (les ajouts/déplacements en mémoire ne sont pas persistés).

### Architecture du code (pour étendre facilement)

- **Découpage en fichiers (`js/`, 12 scripts ordonnés)** — voir **`js/00-STRUCTURE.md`** pour le détail complet. En résumé, rangé **par couches** (du bas-niveau au haut-niveau) : `01-geometrie` (maths pures), `02-plans` (données `PLANS`), `03-etat` (sources de vérité + `settings`), `04-validite` (`tableValide`, couverts), `05-rendu-base` (`svg`/`scene`, `el()`, zoom, **`render()`**), `06-rendu-plan` (décor : grille, zones, cotes, coins, ouvertures, arbres-images), `07-rendu-objets` (tables & formes + poignées), `08-interface` (compteur, éditeur, swatches), `09-actions` (ajouter/supprimer), `10-modales` (modales + feuille Réglages), `11-gestes` (drag/pan/pinch/molette), `12-init` (câblage + démarrage). Les couches basses **ignorent** les hautes ; tout communique par l'**état global partagé** + la boucle **`render()`**. **Où écrire quoi** : nouveau plan → `02` ; nouvelle règle de validité → `04` ; nouveau décor → `06` (+ appel dans `render()`) ; nouvel objet manipulable → `07` + `11` + `09` ; nouveau bouton/réglage → `12` (câblage) + `09` (action) + `08` (affichage).
- **Sources de vérité** : `tables` (chaque table = `{ id, planId, x, y }`) et `formes` (`{ id, planId, type, x, y, w, h, titre, fond, bord, angle }`). Le décor d'arbres vit dans `plan.arbresImg` (avec `angle`). La sélection courante est un objet `selection = { type:"table"|"forme"|"arbre", id }`.

- **Rotation** (formes & arbres ; pas les tables, rondes) : champ `angle` en degrés (sens **horaire**, convention SVG). Rendu via un `<g transform="rotate(angle cx cy)">` qui enveloppe l'objet ET ses poignées (elles suivent donc l'orientation). Une **poignée de rotation** (`poigneeRotation()`, disque **plein** olivier + flèche circulaire, `data-forme-rotate` / `data-arbre-rotate`) est posée **au-dessus** de l'objet, reliée par un trait pointillé (`.poignee-lien`), distincte de la poignée de redimensionnement (creuse, `.poignee`, au coin bas-droit). Glisser la poignée oriente l'objet vers le pointeur ; un **offset** capté au `pointerdown` (`angleVers()`) évite tout saut au démarrage, et **Maj** snap au pas de 15°. Outils géométrie dédiés : `roterPoint()`, `angleVers()`, `centreForme()`, `normaliserAngle()`. Le **redimensionnement d'une forme pivotée** ramène le pointeur dans le repère local autour d'une **ancre** = coin haut-gauche visuel gardé fixe (cf. `resize-forme` dans `pointermove`) ; pour un arbre le resize est radial (distance au centre), donc déjà insensible à l'angle. Ajout : **table** = direct (réglages partagés à gauche) ; **forme** et **arbre** passent par une **modale** (`#modal-forme`, `#modal-arbre`).
- Une fonction **`render()`** rappelée après **chaque** modification (ajout, déplacement, redimensionnement, changement de réglage, changement de plan). Le DOM est un reflet de l'état, jamais l'inverse.
- Les plans sont des **données** (objet `PLANS` : polygone + ouvertures), pour ajouter/corriger un plan sans toucher à la logique. Un plan peut avoir **plusieurs pièces** (`contours`) : le « plan global » s'en sert pour superposer salon et terrasse.
- Code commenté en **français**.

### Extensions prévues (plus tard)

Sauvegarde (localStorage / export JSON ; inclure `angle` des formes/arbres), tables rectangulaires, numérotation et noms de tables, export image/PDF du plan. *(Rotation des formes & arbres : faite.)*
