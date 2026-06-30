# Proposition 3 — « Cyanotype »

> Direction **architecturale, technique, plan professionnel**.
> Une table à dessin numérique : fond ardoise profond, traits cyan, cotes monospace.
> Le plan se lit comme le **calque bleu d'un architecte** (cyanotype / blueprint).

---

## 1. Intention générale

L'app sert d'abord à **mesurer et placer avec précision** (dimensions, dégagements,
collisions, cotes, coins numérotés). « Cyanotype » embrasse pleinement cette nature
**technique** : on bascule en interface **sombre** type logiciel de CAO, on traite le
plan comme un **tirage cyanotype** (linework lumineux sur fond bleu de Prusse), et on
passe toutes les mesures en **chiffres monospace** pour un alignement et une lecture
d'ingénieur.

C'est la proposition la plus **affirmée et la plus différenciante**. Elle valorise le
sérieux du travail de plan, met la donnée en avant, et offre un contraste reposant pour
de longues sessions d'édition. Le rouge des conflits **éclate** littéralement sur le
fond sombre — la détection de collision n'a jamais été aussi lisible.

## 2. Ambiance visuelle

Bleu de Prusse · papier millimétré rétro-éclairé · réticule de visée · néon cyan ·
chiffres machine · règles et repères. Précis, calme, « pro ».

---

## 3. Palette de couleurs

### Surfaces sombres
| Rôle | Hex | Usage |
|------|-----|-------|
| Fond | `#0E1626` | Fond de l'application |
| En-tête | `#0B1322` | Barre supérieure |
| Panneau | `#121E33` | Toolbar gauche |
| Panneau 2 | `#16243C` | Cartes internes, champs |
| Ligne | `#25344E` | Bordures |
| Ligne 2 | `#33476A` | Bordures de champs |

### Encres claires
| Rôle | Hex | Usage |
|------|-----|-------|
| Ink | `#D3E0F2` | Texte principal |
| Ink 2 | `#92A6C6` | Texte secondaire |
| Ink 3 | `#64799C` | Tertiaire, hints |

### Accents techniques
| Rôle | Hex | Usage |
|------|-----|-------|
| **Cyan** | `#54C6F0` | **Signature** : bouton primaire, focus, sélection, cotes, logo |
| Cyan clair | `#8FDCFA` | Hover, numéros de coin |
| Cyan deep | `#1E5C84` | Bords discrets |
| Teal | `#4FD0A6` | Validité (tables valides) |

### Plan (calque cyanotype)
| Élément | Hex |
|---------|-----|
| Fond du plan | `#0C2A4A` (bleu de Prusse) |
| Salon / intérieur | `#123A60` |
| Jardin utilisable | `#15463C` (teal sombre) |
| Reste jardin | `#0F3A33` |
| Terrasse | `#11355A` |
| Dalle (couloir / entrée) | `#2C2F54` / bord `#6271AC` |
| Reste maison (non praticable) | `#0B2240` |
| **Murs** | **`#9FE0FF` · 4 px** (linework lumineux) |
| Grille | `rgba(120,200,240,.12)` / fort `.22` |

### États de table
| État | Fond | Bord |
|------|------|------|
| Valide | `#17564A` | `#4FD0A6` (teal) |
| Sélectionnée | `#1C5A84` | `#7FD4FF` (cyan clair) |
| En conflit | `#5A2330` | `#FF6B7A` (rouge néon) |

### Ouvertures
| Type | Hex |
|------|-----|
| Fenêtre | `#54C6F0` (cyan) |
| Porte-fenêtre | `#4FD0A6` (teal) |
| Porte | `#F2A65A` (ambre) |

> Sur fond sombre, ces accents **rayonnent** : la hiérarchie visuelle est obtenue par la
> luminosité (linework clair, données colorées) plutôt que par des aplats lourds.

---

## 4. Typographies

| Usage | Police | Rôle |
|-------|--------|------|
| **Mesures & repères** (titre, cotes, coins, n° de table, compteur, dimensions, labels d'éditeur) | **IBM Plex Mono** | Le « langage machine » du plan |
| **Texte courant** (réglages, légende, champ titre, aide) | **IBM Plex Sans** | Lisibilité confortable |

Repli `monospace` / `system-ui`. Le **monospace sur toutes les mesures** est le parti
pris central : c'est ce qui donne l'autorité « technique ».

### Hiérarchie typographique
- **Titre app** — Plex Mono 500, 16 px, MAJUSCULES, interlettrage `.16em`.
- **Chiffres compteur** — Plex Mono 600, 25 px, cyan.
- **H2 / labels éditeur** — Plex Mono 600, 11–12 px, MAJUSCULES.
- **Cotes & numéros de coin** — Plex Mono 500/600.
- **Corps** — Plex Sans 400, 12.5–13 px.
- **Étiquettes de plan** — Plex Mono 600, ~60 px, MAJUSCULES, bleu translucide.

---

## 5. Espacement
Grille **4 px**. Panneau padding 18, `gap` 17. Cartes 14–16. Lecture aérée malgré le
fond sombre (le contraste fait le travail, pas la compacité).

## 6. Arrondis
Plus **francs**, registre instrument : `--r-sm 6px` (boutons, champs, pastilles) ·
`--r-md 8px` (cartes) · `--r-lg 10px` (plan). Tables et pastilles de légende = cercles.

## 7. Bordures
Fines et froides : `#25344E` / `#33476A`. Compteur souligné d'un **liseré cyan** à
gauche (accent de données). Murs du plan 4 px en cyan pâle lumineux.

## 8. Ombres & lumière
On remplace en partie l'ombre par la **lueur** :
- Bouton primaire : halo cyan `0 0 0 1px rgba(84,198,240,.4), 0 6px 18px rgba(31,92,132,.45)`.
- Curseurs de réglage : pouce cyan avec glow `0 0 8px rgba(84,198,240,.6)`.
- Plan : ombre portée profonde `0 10px 30px rgba(0,0,0,.45)` + liseré interne cyan.
- **Fond de scène millimétré** (double dégradé linéaire 26 px) → table à dessin.

---

## 9. Boutons
- **Primaire** — aplat **cyan**, texte bleu nuit `#06243B`, halo cyan. Hover : cyan clair.
- **Rectangle** — **contour cyan** (transparent, bord cyan deep, texte cyan). Hover : voile cyan.
- **Supprimer** — fantôme slate (texte ink-2, bord ligne-2). Hover : panneau 2.
- `:disabled` → opacité .4, sans halo.

## 10. Inputs & selects
- Fond `panneau-2`, 1 px ligne-2, rayon 6 px, texte clair.
- **Focus** : bord cyan + halo `0 0 0 3px rgba(84,198,240,.22)`.
- **Select** : `appearance:none` + chevron SVG ink-2, **Plex Mono**, largeur min 178 px.
- Champs de dimensions en **Plex Mono** → cotes alignées.

## 11. Barre supérieure
Bleu nuit, fine ligne basse. Marque (réticule cyan) + titre **monospace en capitales
espacées** (« PLAN DU MARIAGE ») à gauche ; label « PLAN » + select à droite. On dirait
l'en-tête d'un logiciel d'ingénierie.

## 12. Toolbar gauche
Fond `panneau`, sections de 17 px. Cartes internes `panneau-2`. Compteur en dégradé
sombre + liseré cyan. Labels en monospace majuscule : tout respire l'instrument de mesure.

## 13. Panneaux / cartes
`panneau-2`, 1 px ligne-2, rayon 8 px. Contraste obtenu par les **valeurs** (bleu sur
bleu plus clair), rehaussé d'accents cyan ponctuels.

## 14. Icônes
SVG linéaires cyan/clair (1.7 px). Set : table, rectangle, corbeille. Aucun emoji.
Marqueurs de jardin = disques cerclés cyan/teal + labels monospace. Le **réticule** du
logo peut servir de pictogramme « centrer / viser ».

## 15. Éléments du plan
- **Murs** : trait cyan pâle lumineux 4 px (le tracé du blueprint).
- **Grille** : trame cyan translucide, renforcée tous les 100 cm.
- **Cotes** : Plex Mono cyan — l'élément star de cette direction.
- **Étiquettes de zone** : Plex Mono majuscule, bleu translucide.

## 16. Portes / Portes-fenêtres / Fenêtres
Traits 8 px, bouts droits (`butt`) façon symbole technique : fenêtre cyan,
porte-fenêtre teal, porte ambre. Tous **lumineux** sur le fond sombre.

## 17. Rectangles libres
Coins légers, 5 teintes **désaturées sombres** (ardoise, teal, terre, bleu, vert) qui
restent lisibles sur le calque. Titre & dimensions en **Plex Mono** clair. Poignée bleu
nuit cerclée cyan.

## 18. Points numérotés (coins)
**Cyan clair `#8FDCFA`**, Plex Mono, halo bleu nuit (`paint-order:stroke`). Cohérents
avec le linework : ils font partie du dessin technique, plus jamais une couleur orpheline.

## 19. États interactifs
| État | Traitement |
|------|-----------|
| Hover primaire | Cyan clair |
| Hover rectangle | Voile cyan + bord cyan |
| Focus champ | Bord cyan + halo 3 px |
| Curseur réglage | Pouce cyan lumineux (glow) |
| Pastille active | Double anneau (panneau + cyan) |
| Disabled | Opacité .4 |
| Table sélectionnée | Cyan clair (fond + bord) |
| Rectangle sélectionné | Trait 4 px + poignée cyan |

## 20. Responsive
- **Desktop** : en-tête + panneau 300 px + scène (fond millimétré).
- **< 760 px** : panneau pleine largeur empilé, plan `60vh`. Le thème sombre est
  particulièrement confortable sur mobile (faible éblouissement). Boutons pleine largeur.

---

## 21. Tokens CSS (extrait)
```css
--bg:#0E1626; --plan-bg:#0C2A4A; --mur:#9FE0FF;
--cyan:#54C6F0; --teal:#4FD0A6; --ink:#D3E0F2;
--r-sm:6px; --r-md:8px; --r-lg:10px;
/* mesures en IBM Plex Mono ; UI en IBM Plex Sans */
```
Feuille complète : [`demo/style.css`](demo/style.css).

## 22. Comment visualiser
- **Démo** : [`demo/index.html`](demo/index.html).
- **Captures** : `screenshot-desktop-global.png`, `…-detail.png`, `…-mobile.png`.
- **Présentation** : [`index.html`](index.html).

> ⚠️ Direction sombre = à valider sur l'usage réel (lisibilité des cotes fines à
> l'impression, préférence d'un éventuel mode clair jumeau). La démo réutilise `app.js`
> **sans modification** ; mesures et logique strictement inchangées.
