/* Nauticonnect – décoration des fêtes
   Active automatiquement du 23 novembre au 25 décembre (Noël compris).
   Pour la voir avant : ouvrir l'appli avec ?noel=1 (et ?noel=0 pour revenir au réglage auto). */
(function () {
  var d = new Date(), m = d.getMonth(), j = d.getDate();
  var saison = (m === 10 && j >= 23) || (m === 11 && j <= 25);
  var force = null;
  try {
    var q = new URLSearchParams(location.search).get("noel");
    if (q === "1") localStorage.setItem("nc-noel", "1");
    if (q === "0") localStorage.removeItem("nc-noel");
    force = localStorage.getItem("nc-noel");
  } catch (e) {}
  if (!saison && force !== "1") return;

  var hero = document.getElementById("hero");
  if (!hero) return;
  document.documentElement.classList.add("noel");
  var calme = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* guirlande lumineuse en haut de la bannière */
  var cols = ["#ff5a4e", "#ffd34d", "#5fd38a", "#ffffff", "#6cc4ff"];
  var n = 13, w = 400, bulbs = "";
  for (var i = 0; i < n; i++) {
    var x = 12 + i * (w - 24) / (n - 1);
    var t = (x % (w / 4)) / (w / 4);            // position dans l'arc
    var y = 6 + Math.sin(t * Math.PI) * 12;     // le fil pend entre les accroches
    bulbs += '<g class="nb" style="--c:' + cols[i % cols.length] + ';animation-delay:' + ((i % 4) * 0.45) + 's">' +
      '<rect x="' + (x - 2) + '" y="' + (y - 1) + '" width="4" height="4" rx="1" fill="#1d3a2a"/>' +
      '<ellipse cx="' + x + '" cy="' + (y + 8) + '" rx="4.2" ry="6.4"/></g>';
  }
  var g = document.createElement("div");
  g.className = "noel-guirlande";
  g.setAttribute("aria-hidden", "true");
  g.innerHTML = '<svg viewBox="0 0 ' + w + ' 34" preserveAspectRatio="none">' +
    '<path d="M0 6 Q50 30 100 6 Q150 30 200 6 Q250 30 300 6 Q350 30 400 6" fill="none" stroke="#1d3a2a" stroke-width="1.6"/>' + bulbs + '</svg>';
  hero.appendChild(g);

  /* petit message de saison sous le slogan */
  var s = hero.querySelector(".hero-s");
  if (s) {
    var p = document.createElement("p");
    p.className = "noel-voeux";
    /* compte à rebours jusqu'à Noël, puis « Joyeux Noël » le 25 */
    var noel = new Date(d.getFullYear(), 11, 25), jours = Math.ceil((noel - new Date(d.getFullYear(), m, j)) / 864e5);
    p.textContent = jours <= 0 ? "Joyeux Noël sur le Léman !" : jours === 1 ? "Joyeuses fêtes sur le Léman · Noël, c'est demain !" : "Joyeuses fêtes sur le Léman · Noël dans " + jours + " jours";
    s.parentNode.insertBefore(p, s.nextSibling);
  }

  /* neige qui tombe sur la bannière */
  var cv = document.createElement("canvas");
  cv.className = "noel-neige";
  cv.setAttribute("aria-hidden", "true");
  hero.insertBefore(cv, hero.querySelector(".hero-in"));
  var cx = cv.getContext("2d"), W = 0, H = 0, R = 1, flocons = [];
  function taille() {
    R = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * R; cv.height = H * R;
    var nb = Math.round(Math.min(90, W * H / 6000));
    while (flocons.length < nb) flocons.push(nouveau(true));
    flocons.length = nb;
  }
  function nouveau(partout) {
    return { x: Math.random() * W, y: partout ? Math.random() * H : -6, r: 0.8 + Math.random() * 2.2,
      v: 0.25 + Math.random() * 0.6, o: Math.random() * 6.28, a: 0.45 + Math.random() * 0.5 };
  }
  function dessine() {
    cx.setTransform(R, 0, 0, R, 0, 0);
    cx.clearRect(0, 0, W, H);
    for (var i = 0; i < flocons.length; i++) {
      var f = flocons[i];
      cx.globalAlpha = f.a;
      cx.fillStyle = "#fff";
      cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 6.283); cx.fill();
    }
  }
  function bouge() {
    for (var i = 0; i < flocons.length; i++) {
      var f = flocons[i];
      f.o += 0.012; f.y += f.v * (0.6 + f.r / 3); f.x += Math.sin(f.o) * 0.35;
      if (f.y > H + 6 || f.x < -10 || f.x > W + 10) flocons[i] = nouveau(false);
    }
  }
  var on = false;
  function boucle() {
    if (!on) return;
    if (hero.classList.contains("compact")) { on = false; return; } /* dans l'appli : pas de neige */
    bouge(); dessine();
    requestAnimationFrame(boucle);
  }
  function demarre() { if (!on && !calme && !document.hidden) { on = true; requestAnimationFrame(boucle); } }
  taille();
  if (calme) dessine(); else demarre();
  window.addEventListener("resize", function () { taille(); if (calme) dessine(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) on = false; else demarre(); });
  /* la bannière change de taille quand on entre dans l'appli */
  if (window.ResizeObserver) new ResizeObserver(function () { taille(); if (calme) dessine(); else demarre(); }).observe(hero);
})();
