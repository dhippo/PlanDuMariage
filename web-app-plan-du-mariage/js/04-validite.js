"use strict";
/* =============================================================================
   04 — VALIDITÉ DES TABLES & COUVERTS   ·   Plan du mariage
   -----------------------------------------------------------------------------
   Règles métier : une table est-elle VALIDE (dans une pièce, à l'écart des murs
   et des autres tables, marges comprises) ? Et estimation du nombre de couverts
   selon le diamètre. Seules les TABLES sont contraintes ; formes et arbres sont
   purement décoratifs (hors validité).

   Dépend de   : 01-geometrie (pointDansPolygone, distanceAuMur, contoursDe),
                 02-plans (PLANS), 03-etat (settings, tables).
   Utilisé par : 05-rendu (couleur des tables), 08-interface (compteur).
   ============================================================================= */

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
