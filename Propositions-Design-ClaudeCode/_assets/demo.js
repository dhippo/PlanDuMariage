"use strict";
/* =========================================================================
   DÉMO (captures uniquement) — n'altère AUCUNE logique métier.
   Ce fichier ne sert qu'à présenter une direction de design :
     1. lit les couleurs du thème dans les variables CSS (:root) ;
     2. remplace les emojis du plan par des marqueurs sobres (pas d'emoji-icône) ;
     3. injecte des icônes SVG minimalistes dans la barre d'actions ;
     4. pose une petite marque (logo) dans l'en-tête ;
     5. dépose des tables / un rectangle de démonstration selon ?shot=…
   La précision des mesures et le comportement du plan restent inchangés.
   ========================================================================= */
(function () {
  const css = getComputedStyle(document.documentElement);
  const v = (n, f) => { const x = css.getPropertyValue(n).trim(); return x || (f || ""); };

  /* 1) Couleurs des rectangles libres, pilotées par le thème (vars CSS). */
  if (v("--rect-1-fill")) {
    for (let i = 0; i < 5; i++) {
      const f = v("--rect-" + (i + 1) + "-fill"), b = v("--rect-" + (i + 1) + "-bord");
      if (f && b && COULEURS_RECT[i]) { COULEURS_RECT[i].fond = f; COULEURS_RECT[i].bord = b; }
    }
  }

  /* 2) Hachures thématisées : on enveloppe motifHachures pour lire les vars CSS. */
  const hatch = {
    "hachures-rose":      [v("--hatch-rose-bg", "#f8dde6"), v("--hatch-rose-line", "#d98aa6")],
    "hachures-feuillage": [v("--hatch-leaf-bg", "#e3e3e0"), v("--hatch-leaf-line", "#9a9a93")],
  };
  const _motif = motifHachures;
  motifHachures = function (id, fond, trait) {
    const h = hatch[id];
    return _motif(id, h ? h[0] : fond, h ? h[1] : trait);
  };

  /* 3) Sobriété : on retire les emojis du plan (remplacés par du texte discret). */
  const RE_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️]/u;
  Object.values(PLANS).forEach(plan => {
    (plan.zones || []).forEach(z => {
      if (z.label && RE_EMOJI.test(z.label)) z.label = z.type === "rose" ? "Rosiers" : "";
    });
    (plan.arbres || []).forEach(a => { delete a.emoji; });
  });

  /* 4) Icônes SVG sobres (stroke = couleur héritée) + marque dans l'en-tête. */
  const I = {
    table: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7.2"/><path d="M12 8.6v6.8M8.6 12h6.8"/></svg>',
    rect:  '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="6" width="17" height="12" rx="1.6"/><path d="M8.5 12h7"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9.5 7V5h5v2M6.5 7l.9 12.2a1 1 0 0 0 1 .8h7.2a1 1 0 0 0 1-.8L17.5 7"/></svg>',
  };
  const setBtn = (id, icon, label) => {
    const b = document.getElementById(id);
    if (b) b.innerHTML = icon + "<span>" + label + "</span>";
  };
  setBtn("btn-ajouter", I.table, "Ajouter une table");
  setBtn("btn-ajouter-rect", I.rect, "Ajouter un rectangle");
  setBtn("btn-supprimer", I.trash, "Supprimer la sélection");
  setBtn("rect-suppr", I.trash, "Supprimer ce rectangle");

  // Marque (logo) : on enveloppe le titre + une pastille .marque (stylée en CSS).
  const ent = document.querySelector(".entete");
  if (ent && !ent.querySelector(".entete__brand")) {
    const h1 = ent.querySelector("h1");
    const brand = document.createElement("div");
    brand.className = "entete__brand";
    const mark = document.createElement("span");
    mark.className = "marque";
    mark.setAttribute("aria-hidden", "true");
    brand.appendChild(mark);
    if (h1) brand.appendChild(h1);
    ent.insertBefore(brand, ent.firstChild);
  }

  /* 5) Données de démonstration (uniquement pour la capture du Plan global). */
  const shot = new URLSearchParams(location.search).get("shot") || "global";
  const addT = (x, y) => tables.push({ id: idSuivant++, planId: "global", x, y });
  const addR = (x, y, w, h, titre, couleur) =>
    rectangles.push({ id: idSuivantRect++, planId: "global", x, y, w, h, titre, couleur });

  if (planActif === "global") {
    addT(150, 420);   // 1 — valide (jonction jardin / terrasse)
    addT(470, 470);   // 2 — valide (terrasse)
    addT(760, 470);   // 3 — valide (terrasse)
    addT(560, -300);  // 4 — valide (salon) -> sélectionnée plus bas
    addT(520, 860);   // 5 — en conflit (posée hors zone praticable) -> rouge
    addR(360, 20, 190, 92, "Buffet", 2);   // salon (partie basse en L)

    if (shot === "detail") {
      selection = { type: "rect", id: rectangles[rectangles.length - 1].id };
    } else {
      selection = { type: "table", id: 4 };
    }
    if (typeof render === "function") render();
    if (typeof appliquerZoom === "function") appliquerZoom();
  }
})();
