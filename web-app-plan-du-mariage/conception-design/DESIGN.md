# Proposition 1 — « Atelier Floral »

> Direction **éditoriale, douce, mariage premium**.
> Lin, eucalyptus et lumière de bougie. Une papeterie de mariage devenue logiciel.

---

## 1. Intention générale

L'application actuelle vise déjà un registre « mariage » (crème, sauge, rose) mais
l'exécution paraît hésitante : teintes un peu salies, bordures grises, typographie
système, accents criards (bleu vif, orange) qui cassent l'harmonie.

« Atelier Floral » **assume et raffine** cette intention. On garde l'âme végétale et
chaleureuse, mais on la traite avec la rigueur d'une **direction artistique de
papeterie haut de gamme** : une serif élégante pour le titre, une sans-serif neutre
pour l'interface, un vert olivier profond comme couleur signature, un **filet doré**
comme seul ornement, et une palette de plan **harmonisée** (les ouvertures et les
zones ne se battent plus entre elles).

C'est la proposition la plus « émotionnelle » des trois : elle raconte un mariage.

## 2. Ambiance visuelle

Papier ivoire texturé · feuillage d'eucalyptus · sceau de cire · faire-part
letterpress · filet doré fin · lumière chaude. Calme, aéré, soigné. Aucune surcharge.

---

## 3. Palette de couleurs

### Neutres chauds
| Rôle | Hex | Usage |
|------|-----|-------|
| Ivoire | `#F6F2EA` | Fond de l'application |
| Ivoire clair | `#FBF8F2` | Fond du panneau latéral |
| Papier | `#FFFFFF` | Cartes, plan, champs |
| Filet | `#E8E0D2` | Bordures, séparateurs |
| Filet doré | `#DCC9A0` | Accent fin (liseré haut de carte, hover select) |

### Encres
| Rôle | Hex | Usage |
|------|-----|-------|
| Encre | `#2C2823` | Texte principal, murs du plan |
| Encre 2 | `#6F665A` | Texte secondaire, labels |
| Encre 3 | `#9A8F7E` | Texte tertiaire, hints, cotes |

### Accents
| Rôle | Hex | Usage |
|------|-----|-------|
| **Olivier** | `#5C6B57` | **Couleur signature** : bouton principal, compteur, focus, logo |
| Olivier foncé | `#47543F` | Hover du bouton principal |
| Olivier clair | `#E7ECDF` | Fond hover des boutons fantômes |
| Terracotta | `#BC6C4F` | Accent secondaire (portes du plan, rectangles) |
| Rose poudré | `#C6868F` | Accent tertiaire (zones florales) |
| Or | `#B8923C` | Sélection (table sélectionnée), détails |

### Plan (lieux)
| Élément | Hex | Note |
|---------|-----|------|
| Salon / intérieur | `#FFFDF9` | Blanc chaud |
| Jardin utilisable | `#E6EBDD` | Eucalyptus doux |
| Reste jardin | `#C9D6B9` | Sauge plus dense (non praticable) |
| Terrasse | `#F0ECE4` | Gris chaud très clair |
| Dalle (couloir / entrée) | `#ECD7CF` / bord `#C49A8F` | Rose poudré (remplace le terracotta criard actuel) |
| Murs | `#2C2823` · 5 px | Trait encre franc |
| Grille | `rgba(92,84,70,.12)` / fort `.20` | Trame discrète et chaude |

### États de table
| État | Fond | Bord |
|------|------|------|
| Valide | `#BAD0A8` | `#5C6B57` (olivier) |
| Sélectionnée | `#E8CB8E` | `#B8923C` (or) |
| En conflit | `#E2A998` | `#B0573F` (brique) |

### Ouvertures (harmonisées, plus de bleu/orange criards)
| Type | Hex |
|------|-----|
| Fenêtre | `#5B7790` (bleu ardoise) |
| Porte-fenêtre | `#5C6B57` (olivier) |
| Porte | `#BC6C4F` (terracotta) |

---

## 4. Typographies

| Usage | Police | Graisse |
|-------|--------|---------|
| **Affichage** (titre, H2 d'éditeur, chiffres du compteur, étiquettes du plan) | **Cormorant Garamond** (serif) | 600 / 700 |
| **Interface** (boutons, labels, réglages, légende, cotes, numéros) | **Inter** (sans-serif) | 400 → 700 |

Repli : `Georgia, serif` et `system-ui, sans-serif`.

### Hiérarchie typographique
- **Titre app** — Cormorant 600, 27 px, interlettrage léger.
- **H2 éditeur** — Cormorant 600, 18 px.
- **Chiffres compteur** — Cormorant 700, 30 px, olivier (élégant, signature).
- **Labels de section** — Inter 600/700, 11 px, MAJUSCULES, interlettrage `.12–.14em`.
- **Corps / réglages** — Inter 400, 13 px.
- **Cote / hint** — Inter 400/500, 11–12 px.
- **Étiquettes du plan** (SALON, TERRASSE…) — Cormorant 600, ~74 px, ivoire translucide.

---

## 5. Règles d'espacement
- Unité de base **4 px** ; gouttières principales **16–20 px**.
- Panneau : padding 20 px, `gap` 18 px entre sections.
- Cartes : padding 14–17 px.
- En-tête : 16 px vertical, 26 px horizontal.
- Respiration généreuse : la densité reste faible (registre premium).

## 6. Arrondis
`--r-sm 8px` (boutons, champs) · `--r-md 12px` (cartes) · `--r-lg 16px` (plan).
Doux mais jamais « bulle ». Les pastilles couleur et tables restent des cercles parfaits.

## 7. Bordures
- 1 px `#E8E0D2` partout (filet chaud, jamais gris froid).
- **Liseré doré** 2 px en haut du compteur (`--filet-or`) — unique signe ornemental.
- Murs du plan : 5 px encre, jointure `miter` (lecture « architecturale » nette).

## 8. Ombres
Très douces, chaudes, jamais dures.
- `--sh-1` : `0 1px 2px rgba(60,50,40,.05)` (boutons, petites cartes).
- `--sh-2` : `0 8px 26px rgba(70,58,42,.08)` (éditeur, plan).

---

## 9. Boutons
- **Principal** (« Ajouter une table ») — aplat olivier, texte ivoire, icône SVG cercle-plus, ombre `sh-1`. Hover : olivier foncé.
- **Rectangle** (« Ajouter un rectangle ») — **fantôme contour** olivier (fond transparent, bord olivier, texte olivier). Hover : fond olivier clair.
- **Secondaire** (« Supprimer ») — fantôme neutre, texte encre 2, bord filet. `:disabled` → opacité .4.
- Tous : `inline-flex`, `gap 9px`, icône + label, `:active` translation .5 px.

## 10. Inputs & selects
- Fond papier, 1 px filet, rayon 8 px.
- **Focus** : bord olivier + halo `0 0 0 3px rgba(92,107,87,.16)`.
- **Select** : `appearance:none` + chevron SVG encre-2 en data-URI (fini la flèche système). Largeur min 182 px. Hover : bord doré.

## 11. Barre supérieure
Fond blanc, **double filet** en bas (1 px doré + ombre très douce). À gauche : marque
(logo) + titre Cormorant. À droite : label « PLAN » en petites capitales espacées +
select raffiné. Sobre, calme, éditorial.

## 12. Toolbar gauche (panneau)
Fond ivoire clair, bord droit filet. Pile de sections espacées de 18 px : carte zoom,
bloc d'actions, éditeur (carte blanche ombrée), réglages, **compteur** (dégradé subtil
+ liseré doré), légende terminée par une note d'aide séparée d'un filet.

## 13. Panneaux / cartes
Blanc, 1 px filet, rayon 12 px, ombre douce. Le compteur est la seule carte « ornée »
(liseré doré) pour attirer l'œil sur la donnée clé.

## 14. Icônes
**SVG linéaires** uniquement (`stroke=currentColor`, 1.7 px, bouts arrondis), jamais
d'emoji. Jeu fourni : table (cercle +), rectangle (rect + barre), corbeille. Les
emojis du plan (🌹🍒🍂) sont **remplacés** par des marqueurs sobres (disques + label
texte « Rosiers »). → cf. `LOGO.md` pour le set complet recommandé.

## 15. Éléments du plan
- **Murs** : trait encre 5 px, net.
- **Grille** : trame chaude translucide, renforcée tous les 100 cm.
- **Cotes** : Inter 500, encre 3 — discrètes mais lisibles.
- **Étiquettes de zone** : Cormorant ivoire translucide, en filigrane.

## 16. Portes / Portes-fenêtres / Fenêtres
Traits épais (8 px) à bouts **arrondis**, couleurs harmonisées : fenêtre bleu ardoise,
porte-fenêtre olivier, porte terracotta. Plus de trio bleu-vif / teal / orange.

## 17. Rectangles libres
Coins légèrement arrondis, 5 teintes **coordonnées à la palette** (lin, sauge,
terracotta poudré, brume d'eucalyptus, miel) — fini les pastels génériques. Titre Inter
700, dimensions Inter 400 (encre 2), poignée blanche cerclée olivier.

## 18. Points numérotés (coins)
Couleur **taupe `#8A7F6C`** (et non bleu vif) avec halo ivoire (`paint-order:stroke`).
Discrets, lisibles, cohérents avec la palette : ils repèrent sans crier.

## 19. États interactifs
| État | Traitement |
|------|-----------|
| Hover bouton | Assombrissement de l'aplat / fond teinté pour les fantômes |
| Hover pastille couleur | `scale(1.12)` |
| Focus champ | Bord olivier + halo 3 px translucide |
| Active bouton | Translation verticale .5 px |
| Pastille active | Double anneau (papier + olivier) |
| Disabled | Opacité .4, curseur `not-allowed` |
| Table sélectionnée | Remplissage **or** + bord or |
| Rectangle sélectionné | Trait épaissi (4.5 px) + poignée |

## 20. Responsive
- **Desktop** : en-tête fixe, panneau 300 px fixe, scène fluide. Aucun scroll de page.
- **< 760 px** : le panneau passe pleine largeur au-dessus du plan (bord bas filet),
  le plan prend `height:60vh`. Titre réduit (23 px), select min 150 px, paddings
  resserrés. Boutons pleine largeur, confortables au doigt.

---

## 21. Tokens CSS (extrait)
La feuille complète est dans [`demo/style.css`](demo/style.css) (tout est piloté par
variables `:root`, donc réintégrable tel quel).

```css
--olivier:#5C6B57;  --or:#B8923C;  --terracotta:#BC6C4F;
--ivoire:#F6F2EA;   --papier:#FFFFFF;  --encre:#2C2823;
--r-sm:8px; --r-md:12px; --r-lg:16px;
--sh-2:0 8px 26px rgba(70,58,42,.08);
```

## 22. Comment visualiser
- **Démo interactive** : ouvrir [`demo/index.html`](demo/index.html) dans un navigateur
  (glisser-déposer le fichier). Tables et rectangle de démonstration pré-placés.
- **Captures** : `screenshot-desktop-global.png`, `screenshot-desktop-detail.png`
  (éditeur de rectangle ouvert), `screenshot-mobile.png`.
- **Page de présentation** : [`index.html`](index.html).

> ⚠️ La démo contient une copie *non modifiée* de `app.js` ; seuls la feuille de style,
> un petit `demo.js` (scaffolding visuel) et le logo sont nouveaux. La précision des
> mesures et la logique du plan sont strictement inchangées.
