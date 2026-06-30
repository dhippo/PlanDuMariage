# Comparatif des 3 directions de design — Plan du Mariage

Trois directions artistiques **réellement distinctes** pour la refonte visuelle de
l'application, sans toucher à la logique du plan ni à la précision des mesures.

| | **P1 · Atelier Floral** | **P2 · Studio Linéaire** | **P3 · Cyanotype** |
|---|---|---|---|
| **Registre** | Éditorial, mariage premium | SaaS moderne, minimal | Architectural, technique |
| **Ambiance** | Lin, eucalyptus, or | Dashboard clair, indigo | Blueprint sombre, cyan |
| **Couleur clé** | Olivier `#5C6B57` + or `#B8923C` | Indigo `#5B5BD6` | Cyan `#54C6F0` |
| **Fond** | Ivoire chaud | Gris perle / blanc | Ardoise nuit |
| **Typo** | Cormorant + Inter | Inter (unique) | IBM Plex Mono + Sans |
| **Personnalité** | Émotionnelle, raconte un mariage | Neutre, professionnelle | Affirmée, « instrument » |
| **Modernité** | ●●●○○ intemporel-chic | ●●●●● très actuel | ●●●●○ pointu/niche |
| **Intégration** | ●●●●○ facile | ●●●●● la plus simple | ●●●○○ (passage en sombre) |
| **Adéquation « mariage »** | ●●●●● évidente | ●●●○○ correcte mais neutre | ●●○○○ indirecte |
| **Lisibilité des mesures** | ●●●●○ | ●●●●○ | ●●●●● (monospace + contraste) |
| **Risque** | Faible | Très faible | Moyen (sombre à valider) |

> Les captures comparables sont dans chaque dossier :
> `screenshot-desktop-global.png`, `…-detail.png`, `…-mobile.png`.
> État actuel (avant refonte) : [`_assets/etat-actuel-avant.png`](_assets/etat-actuel-avant.png).

---

## P1 — Atelier Floral

**Avantages**
- Adéquation immédiate au sujet (un plan de **mariage**) : c'est la seule qui « raconte »
  l'évènement.
- Raffine l'intention déjà présente (crème/sauge) au lieu de la jeter → transition douce.
- Palette de plan **harmonisée** (ouvertures bleu ardoise / olivier / terracotta), coins
  en taupe discret, sélection or élégante.
- Très différenciante face aux outils génériques : un produit « de marque ».

**Limites**
- Direction plus « signée » : demande de la rigueur pour ne pas glisser vers le kitsch.
- Dépend de **deux** polices web (Cormorant + Inter).
- Un peu moins « neutre » si l'app devait servir au-delà du mariage.

**Pour qui** — si l'app a une vocation **produit grand public mariage** (clientes,
prestataires, image de marque).

---

## P2 — Studio Linéaire

**Avantages**
- **L'intégration la plus simple** : une seule police, un seul accent, des tokens
  ultra-standards → réutilisable tel quel, maintenance triviale.
- **Système d'états** clair (vert = valide, rouge = conflit, indigo = sélection) : la
  sémantique d'un vrai logiciel.
- Vieillit très bien, neutre, crédible immédiatement. Excellent socle si on prévoit
  d'ajouter des fonctionnalités (export, comptes, etc.).

**Limites**
- **Moins d'émotion** : ne « dit » pas spécialement mariage (registre outil).
- Risque de ressembler à beaucoup d'outils SaaS si on ne soigne pas les détails.

**Pour qui** — si la priorité est un **outil fiable, évolutif et sans risque**, où la
fonction prime sur l'ambiance.

---

## P3 — Cyanotype

**Avantages**
- **La plus différenciante et mémorable** : personne ne fait ça pour un plan de mariage.
- Valorise la **précision** (cotes monospace, contraste, conflit rouge éclatant) — le
  cœur technique de l'app.
- Confort visuel en session longue ; superbe pour des captures « waouh ».

**Limites**
- **Thème sombre** : à valider sur l'usage réel (préférence utilisateur, impression
  papier des cotes fines, accessibilité). Idéalement prévoir un **mode clair jumeau**.
- Adéquation « mariage » **indirecte** : très belle mais froide pour certaines clientes.
- Intégration un peu plus lourde (toutes les surfaces basculent en sombre).

**Pour qui** — si on assume un positionnement **« outil de pro du placement »**, ou en
**mode sombre optionnel** à côté d'une des deux autres directions.

---

## Recommandation finale

**Recommandée : P1 — Atelier Floral**, comme direction principale.

C'est le meilleur compromis pour *cette* application : elle corrige précisément ce qui
clochait (palette salie, accents criards, coins bleu vif, emojis, typo système, titre et
select ternes) **tout en respectant l'esprit mariage** que le projet visait déjà. Le
résultat est élégant, cohérent et crédible, sans pari risqué.

**Plan d'action suggéré**
1. Adopter **P1** comme thème par défaut.
2. Récupérer le **système d'états et les tokens** de **P2** (rigueur, nommage,
   `tabular-nums`) — les deux sont compatibles et P2 est un excellent socle technique.
3. Garder **P3** en réserve comme **mode sombre / « vue technique »** optionnel : c'est
   le geste qui impressionne et il réutilise exactement la même structure CSS.

> Les trois partagent la même architecture (variables `:root`, mêmes sélecteurs, même
> `app.js` non modifié) : **on peut livrer les trois comme thèmes commutables** et laisser
> le choix se faire à l'usage. Aucune des trois n'altère les mesures ni le comportement.

---

## Points à valider avant intégration (commun aux 3)
- **Polices web** : héberger en local (ou `font-display:swap`) pour la perf / l'offline ;
  prévoir des replis système (déjà en place).
- **Icônes** : remplacer définitivement les emojis du plan (🌹🍒🍂) par le **set SVG**
  documenté — fait dans les démos via `demo.js`, à porter proprement dans `app.js`
  (`dessinerArbres` / `dessinerZones`).
- **Petit correctif repéré** : dans l'app actuelle, l'éditeur de rectangle reste affiché
  même sans sélection, car `.editeur{display:flex}` l'emporte sur l'attribut `[hidden]`.
  Corrigé dans les démos par `.editeur[hidden]{display:none}` (CSS seul, sans toucher au JS).
- **Accessibilité** : vérifier les contrastes AA (surtout P3 sombre et les textes gris).
- **Impression / export** : si un export PDF du plan est prévu, prévoir une variante
  d'impression claire (notamment pour P3).
