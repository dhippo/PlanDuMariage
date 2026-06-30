# Structure du code JavaScript — `js/`

Ce dossier contient le code de l'application, **scindé depuis l'ancien `app.js`
unique** (≈ 1830 lignes) en **12 fichiers thématiques**. Aucune logique n'a été
réécrite : le code a été **découpé tel quel**, chaque fichier reçoit un en-tête
qui explique son rôle, ses dépendances et sa place dans l'ordre de chargement.

> Objectif : lecture rapide, responsabilités claires, **sans build ni
> framework**, l'app reste **ouvrable par double-clic** sur `index.html`.

---

## 1. Le modèle retenu : « scripts classiques ordonnés »

`index.html` charge les 12 fichiers via **12 balises `<script>` classiques**, dans
l'ordre `01 → 12`. Ce ne sont **pas** des modules ES (`type="module"`) :

- **Pas de `import`/`export`.** Tous les fichiers partagent **une seule portée
  globale**. Une fonction ou une variable déclarée dans un fichier est visible
  dans tous les autres. C'est exactement le comportement de l'ancien `app.js`
  monolithique — on l'a simplement réparti.
- **Pourquoi ce choix ?** Les modules ES ne se chargent **pas** en `file://`
  (bloqués par la sécurité CORS des navigateurs) : ils imposeraient un serveur
  local. Les scripts classiques, eux, **fonctionnent par double-clic**, fidèles
  à la philosophie « aucun build » du projet, et la migration reste **mécanique
  et sûre** (aucune réécriture de l'état partagé).

### Conséquence importante : l'ordre de chargement

Comme tout est partagé, **l'ordre des balises compte** pour le code qui s'exécute
*au chargement* (et pas seulement à l'intérieur d'une fonction). Trois contraintes :

| Contrainte | Pourquoi |
|---|---|
| **01 avant 02** | `PLANS.global` (dans `02-plans`) appelle `translater()` (dans `01-geometrie`) **dès le chargement**, pour construire le plan global. |
| **05 avant 11** | `11-gestes` pose des `addEventListener` sur `svg` et `scene` **au chargement** ; ces constantes sont définies dans `05-rendu-base`. |
| **12 en dernier** | `12-init` appelle `init()` tout en bas : il a besoin que **tout** soit déjà défini, et que le DOM soit présent (les balises sont en fin de `<body>`). |

> Entre **fonctions**, l'ordre n'a aucune importance : une fonction de `11-gestes`
> peut appeler `render()` (défini en `05`) sans souci, car l'appel a lieu *à
> l'exécution*, bien après que tous les fichiers sont chargés. Seules les
> instructions exécutées **immédiatement au chargement** imposent un ordre.

Le **préfixe numérique** des fichiers (`01-`, `02-`…) **encode cet ordre** : il
suffit de lire le dossier de haut en bas pour suivre le flot de chargement.

---

## 2. Rangement : par COUCHES (du bas-niveau vers le haut-niveau)

Les fichiers sont rangés du plus **fondamental** (outils purs, données) au plus
**applicatif** (interactions, démarrage). On lit l'app comme une pile :

```
       ┌─────────────────────────────────────────────────────────────┐
  12   │  INITIALISATION  — câble tout, démarre l'app (point d'entrée) │
  11   │  GESTES          — souris / tactile : drag, pan, pinch, molette│
  10   │  MODALES         — fenêtres d'ajout forme/arbre + feuille Réglages
  09   │  ACTIONS         — ajouter / supprimer (mutent l'état + render)│
  08   │  INTERFACE       — panneau, compteur, éditeur, swatches        │
  07   │  RENDU : OBJETS  — tables & formes (manipulables)             │
  06   │  RENDU : PLAN    — décor : grille, zones, cotes, coins, arbres │
  05   │  RENDU : SOCLE   — <svg>, el(), ZOOM, render() (orchestrateur) │
  04   │  VALIDITÉ        — table valide ? couverts estimés             │
  03   │  ÉTAT            — tables, formes, selection, settings (vérité) │
  02   │  PLANS           — données des lieux (salon, terrasse, global) │
  01   │  GÉOMÉTRIE       — maths pures (polygones, distances, rotation) │
       └─────────────────────────────────────────────────────────────┘
            ▲ les couches hautes utilisent les couches basses
```

**Principe directeur** : les couches **basses ne connaissent pas** les couches
hautes (la géométrie ignore le rendu ; le rendu ignore les gestes). Les couches
**hautes orchestrent** les basses. Cela rend chaque fichier lisible isolément.

---

## 3. Rôle de chaque fichier

| Fichier | Section d'origine | Rôle en une phrase |
|---|---|---|
| `01-geometrie.js`    | §3 Géométrie     | Fonctions **pures** : point-dans-polygone, distances aux murs, boîte, centroïde, translation, rotation, angles. |
| `02-plans.js`        | §1 Données       | L'objet **`PLANS`** : salon, terrasse, et le **plan global** construit par programme (superposition). |
| `03-etat.js`         | §2 État          | Les **sources de vérité** mutables : `tables`, `formes`, `selection`, `settings`, compteurs d'id, helpers arbres, palette. |
| `04-validite.js`     | §4 Validité      | Règles métier : `tableValide()` (murs + chevauchements) et `couvertsPourDiametre()`. |
| `05-rendu-base.js`   | §5 Rendu (1/3)   | Le **socle du rendu** : refs `svg`/`scene`, `el()`, tout le **zoom**, et **`render()`** qui reconstruit l'affichage depuis l'état. |
| `06-rendu-plan.js`   | §5 Rendu (2/3)   | Le **décor** : grille, fonds, hachures, murs/traits, zones, arbres-images, points, cotes, **numéros de coins**, ouvertures, étiquettes. |
| `07-rendu-objets.js` | §5 Rendu (3/3)   | Les **objets manipulables** : `dessinerTables()`, `dessinerFormes()`, poignées de redimension/rotation. |
| `08-interface.js`    | §6 Interface     | Synchronise le **HTML hors-SVG** : compteur, valeurs des réglages, **éditeur de forme flottant**, pastilles de couleur. |
| `09-actions.js`      | §7 Actions       | Les **mutations utilisateur** : ajouter table/forme/arbre, supprimer ; + l'API console (`ajouterArbre`, `exporterArbres`). |
| `10-modales.js`      | §7bis Modales    | Ouverture/fermeture des **modales** (forme, arbre) et de la **feuille « Réglages »** (mobile). |
| `11-gestes.js`       | §8 Gestes        | Tout le **pointeur** : déplacement d'objet, **pan** (1 doigt), **pinch** (2 doigts), molette/trackpad. |
| `12-init.js`         | §9 Initialisation| Le **point d'entrée** : `init()` câble boutons/modales/réglages/clavier, fait le 1ᵉʳ `render()`, puis `init()` démarre l'app. |

---

## 4. Comment les fichiers communiquent

Il n'y a **ni `import` ni bus d'événements** : tout passe par la **portée globale
partagée** et par **une boucle de rendu unique**.

### a) L'état est la seule vérité (`03-etat.js`)

`tables`, `formes`, `settings`, `selection`, `planActif`… sont des variables
globales. **N'importe quel fichier les lit et les modifie directement.** Le
DOM/SVG n'est **jamais** lu pour connaître l'état — il n'en est qu'un reflet.

> Astuce des scripts classiques : un `let selection` déclaré en `03` peut être
> **réassigné** depuis `09-actions`, `11-gestes` ou `12-init` (`selection = …`),
> car c'est **la même variable partagée**. (C'est précisément ce qu'un module ES
> *interdirait* — d'où le choix des scripts classiques.)

### b) `render()` est le pivot (`05-rendu-base.js`)

Le contrat est : **« après chaque modification de l'état, on appelle `render()` ».**

```
   clic / glisser / réglage
            │
            ▼
   09-actions / 11-gestes / 12-init   ──►  modifient l'état (03)
            │
            ▼
        render()  (05)
            │  reconstruit le SVG de zéro :
            ├─►  dessine le décor          (06-rendu-plan)
            ├─►  dessine tables & formes   (07-rendu-objets)
            └─►  majInterface()            (08-interface)  ──► compteur, éditeur…
```

Personne ne manipule le DOM « à la main » pour bouger une table : on change
`table.x/y` dans l'état, puis `render()` redessine tout. C'est ce qui garde les
12 fichiers **découplés** et le comportement **prévisible**.

---

## 5. Normes de nommage

- **Fichiers** : `NN-domaine.js` — préfixe numérique à 2 chiffres = **ordre de
  chargement** ; nom en **kebab-case** décrivant le domaine. Les sous-parties d'une
  même section gardent le même radical (`05-rendu-base`, `06-rendu-plan`,
  `07-rendu-objets`).
- **Code en français** : noms de fonctions et variables explicites en français
  (`dessinerFormes`, `tableValide`, `ouvrirModaleArbre`, `espaceChaises`).
- **Fonctions de dessin** : préfixe **`dessiner…`** (toutes dans `06`/`07`).
- **Fonctions de mise à jour de l'UI** : préfixe **`maj…`** (`majInterface`,
  `majCurseurZoom`, `majDragObjet`).
- **Constantes globales figées** : **MAJUSCULES** (`PLANS`, `PALETTE_FORME`,
  `ZOOM_MIN`, `NB_ARBRES`, `SVGNS`, `PADDING`).
- **Helpers SVG/DOM** : `el(tag, attrs)` fabrique un élément SVG ; les éléments
  qui captent le pointeur portent un attribut **`data-*`** (`data-table`,
  `data-forme`, `data-arbre`, `data-forme-handle`, `data-forme-rotate`…) — c'est
  par ces `data-*` que `11-gestes` retrouve l'objet sous le pointeur.

---

## 6. Où sont dispatchées les fonctionnalités transverses

### Responsive (desktop ↔ mobile, point de bascule `max-width:760px`)

Le responsive est **surtout dans `style.css`** (`@media (max-width:760px)`), mais
sa logique JS est répartie ainsi :

| Aspect responsive | Où |
|---|---|
| **Zoom** (mécanique commune : taille du SVG = zone utile × zoom) | `05-rendu-base` (`appliquerZoom`, `zoomerVers`, `mesurerBaseScene`) |
| **Pinch + pan tactile** (mobile) et **molette/trackpad** (desktop) | `11-gestes` (mêmes fonctions de zoom pour les deux) |
| **Barre d'outils mobile** (`#btn-m-*`) câblée aux **mêmes** actions que le panneau | `12-init` |
| **Feuille « Réglages »** en bottom sheet (mobile) | `10-modales` (`basculerReglages`) |
| **Masquage du curseur de zoom**, bascule panneau/feuille, modales plein écran | `style.css` (media query) |

> Le desktop et le mobile passent par **les mêmes fonctions** : rien n'est
> dupliqué. Le CSS décide *qui s'affiche*, le JS décide *ce qui se passe*.

### Rotation (formes & arbres)

Champ `angle` dans l'état (`03`). Rendu via `<g transform="rotate(…)">` dans
`07-rendu-objets` (`poigneeRotation`, `dessinerFormes`, `dessinerArbresImg` est en
`06`). Le glisser de rotation est géré dans `11-gestes` (`rotate-forme` /
`rotate-arbre`). Maths dans `01-geometrie` (`roterPoint`, `angleVers`,
`normaliserAngle`).

### Décor d'arbres (40 illustrations PNG)

Données par plan : `plan.arbresImg` (dans `02` / ajoutées via `09`). Rendu en
`06-rendu-plan` (`dessinerArbresImg`). Modale de choix en `10-modales` +
construction de la grille des 40 vignettes en `12-init`. API console
(`ajouterArbre`, `exporterArbres`) en `09-actions`.

### Raccourcis clavier (Échap, Entrée, Suppr/Retour)

Tous câblés dans `12-init` (ils ont besoin de l'app entièrement montée).

---

## 7. Ajouter une fonctionnalité : où écrire ?

- **Nouveau plan / corriger des cotes** → `02-plans.js` (données uniquement).
- **Nouvelle règle de validité** → `04-validite.js`.
- **Nouveau type de décor à dessiner** → `06-rendu-plan.js` + un appel dans
  `render()` (`05`).
- **Nouvel objet manipulable** → `07-rendu-objets.js` (rendu + `data-*`),
  `11-gestes.js` (saisie au pointeur), `09-actions.js` (ajout/suppression).
- **Nouveau bouton / réglage** → câblage dans `12-init.js`, action dans
  `09-actions.js`, affichage dans `08-interface.js`.

Et **toujours** : modifier l'état (`03`), puis appeler **`render()`**.

---

## 8. Lancer l'app

- **Double-clic** sur `index.html` (aucun serveur requis), **ou**
- via un petit serveur si on préfère (ex. `python3 -m http.server`), utile pour
  le rechargement automatique pendant le développement.
