# Proposition 2 — « Studio Linéaire »

> Direction **moderne, minimaliste, SaaS**.
> L'esprit d'un outil de design pro (Linear, Figma, Notion) : neutres froids, un seul
> accent indigo, beaucoup de blanc, des lignes nettes et une typographie unique.

---

## 1. Intention générale

Faire passer l'application du statut de « petit projet HTML » à celui de **produit
logiciel crédible**. On retire toute couleur décorative superflue, on impose une grille
neutre, une seule famille typographique (Inter) et **un accent unique** (indigo) qui
sert d'identité et de fil conducteur (boutons primaires, focus, sélection).

C'est la proposition la plus **neutre et la plus universelle** : elle vieillit bien,
s'intègre sans friction et inspire immédiatement la confiance d'un outil maîtrisé.
Le plan, lui, est rendu dans des **gris froids** très clairs pour que les tables et les
ouvertures (les seuls éléments colorés) ressortent comme de la donnée.

## 2. Ambiance visuelle

Dashboard clair · whitespace · cartes blanches sur fond gris perle · micro-ombres
nettes · coins 7–8 px · accent indigo électrique · chiffres tabulaires. Sobre, précis,
contemporain.

---

## 3. Palette de couleurs

### Surfaces (neutres froids)
| Rôle | Hex | Usage |
|------|-----|-------|
| Fond | `#F6F7F9` | Fond de l'application |
| Surface | `#FFFFFF` | En-tête, panneau, plan |
| Surface 2 | `#FBFBFD` | Cartes internes (éditeur, compteur) |
| Ligne | `#E7E9EE` | Bordures |
| Ligne 2 | `#DCDFE6` | Bordures de champs, hover |

### Encres
| Rôle | Hex | Usage |
|------|-----|-------|
| Ink | `#16181D` | Texte principal |
| Ink 2 | `#5B6472` | Texte secondaire |
| Ink 3 | `#8A93A3` | Tertiaire, hints, cotes, coins |

### Accent
| Rôle | Hex | Usage |
|------|-----|-------|
| **Indigo** | `#5B5BD6` | **Accent unique** : bouton primaire, focus, sélection, logo |
| Indigo hover | `#4A49C4` | Hover primaire |
| Indigo tint | `#ECECFB` | Fonds légers |
| Vert | `#1F9D63` | Validité (tables valides) |

### Plan
| Élément | Hex |
|---------|-----|
| Salon / intérieur | `#FFFFFF` |
| Jardin utilisable | `#EAF2EC` |
| Reste jardin | `#D3E1D4` |
| Terrasse | `#F1F3F8` |
| Dalle (couloir / entrée) | `#ECE7F7` / bord `#B6ABDC` |
| Murs | `#1B1E24` · 4 px |
| Grille | `rgba(20,24,33,.07)` / fort `.13` |

### États de table
| État | Fond | Bord |
|------|------|------|
| Valide | `#D6EFE0` | `#1F9D63` (vert) |
| Sélectionnée | `#DCDCFB` | `#5B5BD6` (indigo) |
| En conflit | `#FBDFE0` | `#E5484D` (rouge) |

### Ouvertures
| Type | Hex |
|------|-----|
| Fenêtre | `#5B5BD6` (indigo) |
| Porte-fenêtre | `#0EA5A0` (teal) |
| Porte | `#E08A1E` (ambre) |

> Le rouge `#E5484D`, le vert `#1F9D63` et l'indigo forment un **système d'état** clair
> (erreur / succès / sélection) — la sémantique d'un vrai produit.

---

## 4. Typographies

| Usage | Police | Graisse |
|-------|--------|---------|
| **Tout** (titre, UI, plan, chiffres) | **Inter** | 400 → 700 |

Une seule famille, déclinée en graisses. Repli `system-ui`.
Chiffres en **`tabular-nums`** partout (compteur, dimensions, cotes) → alignement
parfait, lecture « data ».

### Hiérarchie typographique
- **Titre app** — Inter 600, 16.5 px, `letter-spacing -.01em`.
- **Chiffres compteur** — Inter 680, 22 px, ink, tabulaires.
- **H2 éditeur** — Inter 600, 13 px.
- **Labels** — Inter 500, 12 px.
- **Légende / titres de bloc** — Inter 600, 11 px, MAJUSCULES légères.
- **Étiquettes de plan** — Inter 700, ~66 px, ink translucide, interlettrage négatif.

---

## 5. Espacement
Grille **4 px**. Panneau padding 16, `gap` 16. Cartes padding 13–14. En-tête compact
(12 px vertical). Densité « productivité » : informatif sans être vide.

## 6. Arrondis
`--r-sm 7px` (boutons, champs, **pastilles couleur en carrés arrondis**) ·
`--r-md 10px` (cartes) · `--r-lg 12px` (plan). Cohérence stricte, jamais de cercle sauf
les tables/pastilles de légende.

## 7. Bordures
1 px `#E7E9EE` (séparateurs) / `#DCDFE6` (champs). Murs du plan 4 px (un peu plus fins
qu'en P1 → registre « écran » plutôt que « papier »).

## 8. Ombres
Nettes, à deux couches façon design system :
- `--sh-1` : `0 1px 2px rgba(16,24,40,.05)`.
- `--sh-2` : `0 1px 2px rgba(16,24,40,.06), 0 8px 24px rgba(16,24,40,.07)`.
- Bouton primaire : ombre **teintée indigo** `0 1px 2px rgba(91,91,214,.35)`.

---

## 9. Boutons
- **Primaire** — aplat indigo, texte blanc, ombre indigo, icône SVG. Hover : indigo foncé.
- **Rectangle** — bouton **blanc** bordé (style « secondary » SaaS), texte ink, ombre `sh-1`.
- **Supprimer** — fantôme neutre, texte ink 2. `:disabled` → opacité .45, ombre retirée.
- Compacts (9 px vertical), `font-weight 550`, `gap 8px`.

## 10. Inputs & selects
- Fond blanc, 1 px `ligne-2`, rayon 7 px.
- **Focus** : bord indigo + halo `0 0 0 3px rgba(91,91,214,.16)` (le « ring » SaaS).
- **Select** : `appearance:none` + chevron SVG ink-2, ombre `sh-1`, largeur min 172 px.
- Champs numériques en `tabular-nums`.

## 11. Barre supérieure
Très épurée, compacte (≈ 54 px). Marque (app-tile indigo) + titre Inter à gauche ;
label « Plan » + select à droite. Une seule ligne de séparation. Aucun ornement.

## 12. Toolbar gauche
Fond blanc, sections espacées de 16 px. Cartes internes en `surface-2` (gris très
clair) pour hiérarchiser sans bordures lourdes. Bloc d'actions en tête, éditeur,
réglages, compteur, légende, aide.

## 13. Panneaux / cartes
`surface-2` + 1 px ligne + rayon 10 px. Pas d'ombre forte : la hiérarchie vient des
**tons** (blanc vs gris perle), pas des ombres → look « flat » maîtrisé.

## 14. Icônes
SVG linéaires Inter-compatibles (1.7 px, bouts arrondis). Set : table, rectangle,
corbeille. Aucun emoji. Marqueurs de jardin = disques + label texte. Set complet
recommandé dans `LOGO.md`.

## 15. Éléments du plan
Murs ink 4 px ; grille froide à deux niveaux ; cotes ink-3 tabulaires ; étiquettes de
zone en gris translucide, graisse 700, façon watermark d'app.

## 16. Portes / Portes-fenêtres / Fenêtres
Traits 7 px bouts arrondis, code couleur **système** : fenêtre indigo, porte-fenêtre
teal, porte ambre. Lisible, moderne, cohérent avec l'accent.

## 17. Rectangles libres
Coins arrondis, 5 teintes douces et froides (indigo pâle, teal, pêche, bleu, vert).
Titre Inter 650, dimensions tabulaires. Poignée blanche cerclée indigo.

## 18. Points numérotés (coins)
Gris froid `#98A1B1`, graisse 600, tabulaires, halo blanc. Quasi invisibles tant qu'on
ne les cherche pas → l'inverse des numéros bleus criards actuels.

## 19. États interactifs
| État | Traitement |
|------|-----------|
| Hover primaire | Indigo plus foncé |
| Hover secondaire | Fond gris perle + bord plus marqué |
| Focus champ | Bord indigo + ring 3 px |
| Pastille active | Double anneau (surface + indigo), forme carrée arrondie |
| Disabled | Opacité .45, sans ombre |
| Table sélectionnée | Indigo (fond + bord) |
| Rectangle sélectionné | Trait 4 px + poignée indigo |

## 20. Responsive
- **Desktop** : en-tête + panneau 296 px + scène fluide.
- **< 760 px** : panneau pleine largeur empilé, plan `60vh`. Boutons confortables,
  champs pleine largeur. La densité compacte rend l'usage mobile très naturel.

---

## 21. Tokens CSS (extrait)
```css
--accent:#5B5BD6; --accent-hover:#4A49C4; --vert:#1F9D63;
--bg:#F6F7F9; --surface:#FFFFFF; --ink:#16181D;
--r-sm:7px; --r-md:10px; --r-lg:12px;
--sh-2:0 1px 2px rgba(16,24,40,.06),0 8px 24px rgba(16,24,40,.07);
```
Feuille complète : [`demo/style.css`](demo/style.css) (100 % piloté par variables).

## 22. Comment visualiser
- **Démo** : [`demo/index.html`](demo/index.html).
- **Captures** : `screenshot-desktop-global.png`, `…-detail.png`, `…-mobile.png`.
- **Présentation** : [`index.html`](index.html).

> La démo réutilise `app.js` **sans modification** ; seuls la feuille de style, un
> `demo.js` (scaffolding visuel) et le logo sont ajoutés. Mesures et logique inchangées.
