/* =====================================================================
   NAUTICONNECT · application (Supabase + GitHub Pages)
   ===================================================================== */
"use strict";
var $ = function (i) { return document.getElementById(i); };
function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
/* une erreur inattendue s'affiche en bas de l'écran (pour pouvoir la signaler) au lieu de bloquer l'appli en silence */
function showErr(e) { try { console.error(e); var m = (e && (e.message || e.reason && e.reason.message)) || String(e), w = document.getElementById("ncErr"); if (!w) { w = document.createElement("div"); w.id = "ncErr"; w.style.cssText = "position:fixed;left:8px;right:8px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:200;background:#7a1010;color:#fff;font:12px/1.35 monospace;padding:8px 10px;border-radius:8px;white-space:pre-wrap"; w.onclick = function () { w.remove(); }; document.body.appendChild(w); } var st = (e && e.stack ? String(e.stack).split("\n").slice(0, 3).join("\n") : ""); w.textContent = "Erreur (touchez pour fermer) : " + m + (st ? "\n" + st : ""); } catch (x) {} }
window.addEventListener("error", function (ev) { showErr(ev.error || ev.message); });
window.addEventListener("unhandledrejection", function (ev) { showErr(ev.reason); });
function ls(k, v) { try { if (v == null) return localStorage.getItem(k) || ""; localStorage.setItem(k, v); } catch (e) { return ""; } }
function km(a, b, c, d) { var r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2), h = x * x + Math.cos(a * r) * Math.cos(c * r) * y * y; return 12742 * Math.asin(Math.sqrt(h)); }
function ts(v) { return typeof v === "number" ? v : Date.parse(v) || 0; }
function ago(v) { var m = Math.max(0, Math.round((Date.now() - ts(v)) / 60000)); return m < 1 ? "à l’instant" : m < 60 ? "il y a " + m + " min" : m < 1440 ? "il y a " + Math.round(m / 60) + " h" : "il y a " + Math.round(m / 1440) + " j"; }
function iso(msAgo) { return new Date(Date.now() - msAgo).toISOString(); }
function nowIso() { return new Date().toISOString(); }
function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
var toastT = null;
function toast(t, ms) { var d = $("toastEl"); if (!d) { d = el("div", "toast"); d.id = "toastEl"; document.body.appendChild(d); } d.textContent = t; d.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { d.hidden = true; }, ms || 2800); }

/* ---------------- connexion à Supabase ---------------- */
var CFG = window.NC_CONFIG || {};
var configured = /^https:\/\/.+/.test(CFG.url || "") && (CFG.key || "").length > 30;
var sb = null;
if (configured && window.supabase) sb = window.supabase.createClient(CFG.url, CFG.key);
var session = null, uid = null, isAdmin = false, guest = false;
/* guest = visiteur sans compte (connexion anonyme Supabase, invisible pour lui) */
/* aperçu admin : voir l'appli comme un membre ou un invité */
var realAdmin = false, viewAs = "admin";
try { viewAs = sessionStorage.getItem("nc-view") || "admin"; } catch (e) {}
function preview() { return realAdmin && viewAs !== "admin"; }
function real() { return !!uid && !guest && !(realAdmin && viewAs === "invite"); }

/* ---------------- données ---------------- */
/* sorties : mises en pause (true pour les réactiver) */
var SORTIES_ON = false; /* Places à bord : mis en pause (nov. 2026), remettre à true pour réactiver */
/* Abonnement « Nauticonnect+ » : préparé mais désactivé. Passer à true le jour du lancement (il faudra aussi le paiement Google Play). */
var PREMIUM_ON = false;
function isPremium() { return !PREMIUM_ON || !!(typeof P !== "undefined" && uid && P[uid] && P[uid].premium); } /* réactivé en « Place à bord » (nov. 2026) */
var SO = [], SI = [], CK = [], LK = [], SL = [], LO = [], EV = [], FS = [], PA = [], P = {}, A = [], O = [], M = [], AV = [], VO = [], PL = [], RU = [], EP = [], AN = [], PH = [], SC = [], REG = {};
function me() { return real() && P[uid] ? P[uid] : null; }
/* sous-titre d'un membre : son bateau, sinon « Sans bateau » / « Je loue des bateaux », sinon son port */
function NOBOAT(t) { return t === "Sans bateau (équipier, passager)" || t === "Je loue des bateaux"; }
function subOf(p) { p = p || {}; return p.bateau || (NOBOAT(p.type) ? (p.type === "Je loue des bateaux" ? "Loue des bateaux" : "Sans bateau") : "") || p.port || ""; }
function nameOf(id, fb) { var p = P[id]; return p ? p.pseudo + (p.bateau ? " · " + p.bateau : "") : (fb || "Plaisancier"); }
function initial(id) { var p = P[id]; return ((p && p.pseudo) || "?").charAt(0).toUpperCase(); }
function photoOf(id) { var p = P[id]; return p && p.photo ? photoUrl(p.photo) : ""; }
function putPhoto(a, id) { var u = photoOf(id); if (u) { a.textContent = ""; a.style.backgroundImage = "url(\"" + u + "\")"; a.classList.add("ph"); } return a; }
/* toucher une photo de profil l'agrandit (chat, amis, listes) */
function zoomable(a, id) { var u = photoOf(id); if (u) { a.style.cursor = "zoom-in"; a.setAttribute("role", "button"); a.setAttribute("aria-label", "Agrandir la photo"); a.onclick = function (e) { e.preventDefault(); e.stopPropagation(); viewPhoto(u); }; } return a; }
function badge(id, fb) { var b = el("span", "badge"); b.appendChild(zoomable(putPhoto(el("span", "av", initial(id)), id), id)); b.appendChild(document.createTextNode(nameOf(id, fb))); return b; }

var Q = {
  profils: function () { return sb.from("profils").select("id,pseudo,bateau,type,port,immat,photo,photo_ok").limit(5000); },
  alertes: function () { return sb.from("alertes").select("*").gte("maj", iso(12 * 36e5)); },
  ouverts: function () { return sb.from("ouverts").select("*").gte("maj", iso(2 * 36e5)); },
  likes: function () { return sb.from("salon_likes").select("salon_id,uid,emoji").limit(5000); },
  salon: function () { return sb.from("salon").select("*").order("t", { ascending: false }).limit(200); },
  messages: function () { return uid ? sb.from("messages").select("*").gte("t", iso(7 * 864e5)).order("t").limit(800) : null; },
  avis: function () { return sb.from("avis").select("*").order("t", { ascending: false }).limit(300); },
  votes: function () { return sb.from("votes").select("*").limit(5000); },
  places: function () { return sb.from("places").select("*").gte("t", iso(12 * 36e5)); },
  carnet: function () { return real() ? sb.from("carnet").select("*").order("debut", { ascending: false }).limit(120) : null; },
  carbu: function () { return sb.from("carbu").select("*").gte("t", iso(90 * 864e5)).order("t", { ascending: false }).limit(1000); },
  restos: function () { return sb.from("restos").select("*").order("t", { ascending: false }).limit(300); },
  epaves: function () { return sb.from("epaves").select("*").limit(500); },
  locations: function () { return sb.from("locations").select("*").order("maj", { ascending: false }).limit(300); },
  annonces: function () { return sb.from("annonces").select("*").gte("maj", iso(90 * 864e5)).order("maj", { ascending: false }).limit(300); },
  photos: function () { return sb.from("photos").select("*").order("t", { ascending: false }).limit(400); },
  reglages: function () { return sb.from("reglages").select("*"); },
  sauvetages: function () { return sb.from("sauvetages").select("*"); },
  evenements: function () { return sb.from("evenements").select("*").order("debut").limit(300); },
  amities: function () { return real() ? sb.from("amities").select("*") : null; },
  partenaires: function () { return sb.from("partenaires").select("*").order("t"); },
  sorties: function () { return SORTIES_ON ? sb.from("sorties").select("*").order("jour").limit(300) : null; },
  sortie_inscrits: function () { return SORTIES_ON ? sb.from("sortie_inscrits").select("*").limit(5000) : null; },
  blocages: function () { return real() ? sb.from("blocages").select("bloque") : null; }
};
/* membres bloqués : on ne voit plus leurs messages, ils ne peuvent plus nous écrire */
var BL = [];
function isBl(id) { return BL.indexOf(id) >= 0; }
function toggleBlock(id) {
  if (!real() || !id || id === uid) return;
  var nm = (P[id] && P[id].pseudo) || "ce membre";
  if (isBl(id)) {
    sb.from("blocages").delete().eq("auteur", uid).eq("bloque", id).then(function (r) { if (r.error) { toast("Action impossible. Réessayez."); return; } load("blocages"); toast(nm + " est débloqué."); });
    return;
  }
  if (!confirm("Bloquer " + nm + " ? Vous ne verrez plus ses messages et il ne pourra plus vous écrire en privé.")) return;
  sb.from("blocages").insert({ bloque: id }).then(function (r) { if (r.error) { toast("Blocage impossible. Réessayez."); return; } load("blocages"); toast(nm + " est bloqué."); });
}
function store(t, rows) {
  rows = rows || [];
  if (t === "blocages") { BL = rows.map(function (r) { return r.bloque; }); return; }
  if (t === "profils") { var o = {}; rows.forEach(function (r) { o[r.id] = r; }); P = o; }
  else if (t === "alertes") { sosCheck(rows); A = rows; } else if (t === "ouverts") O = rows; else if (t === "messages") M = rows; else if (t === "salon") SL = rows.slice().reverse(); else if (t === "likes") LK = rows;
  else if (t === "avis") AV = rows; else if (t === "votes") VO = rows; else if (t === "places") PL = rows; else if (t === "carbu") CB = rows; else if (t === "carnet") CK = rows;
  else if (t === "restos") RU = rows; else if (t === "epaves") EP = rows; else if (t === "annonces") AN = rows; else if (t === "locations") LO = rows;
  else if (t === "partenaires") PA = rows;
  else if (t === "sorties") SO = rows; else if (t === "sortie_inscrits") SI = rows;
  if (t === "sorties" || t === "sortie_inscrits" || t === "alertes") badgesSoon();
  else if (t === "amities") FS = rows;
  else if (t === "evenements") EV = rows;
  else if (t === "photos") PH = rows; else if (t === "sauvetages") SC = rows;
  else if (t === "reglages") { var g = {}; rows.forEach(function (r) { g[r.k] = r.v; }); REG = g; applyBanner(); renderNw(); if ($("modWel") && document.activeElement !== $("modWel")) $("modWel").value = welText(); }
}
var pending = {}, reloadT = {};
function load(t) {
  if (!sb) return Promise.resolve();
  var q = Q[t](); if (!q) { store(t, []); return Promise.resolve(); }
  return q.then(function (r) { if (!r.error) store(t, r.data); renderAll(); });
}
function reload(t) { clearTimeout(reloadT[t]); reloadT[t] = setTimeout(function () { load(t); }, 250); }
var channel = null;
function subscribeAll() {
  if (!sb) return;
  if (channel) sb.removeChannel(channel);
  channel = sb.channel("nauticonnect-" + Date.now());
  Object.keys(Q).forEach(function (t) { channel.on("postgres_changes", { event: "*", schema: "public", table: t === "likes" ? "salon_likes" : t }, function () { reload(t); }); });
  var me_ = channel;
  channel.subscribe(function (st) {
    if (me_ !== channel) return;
    if (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") { clearTimeout(resubT); resubT = setTimeout(function () { if (me_ === channel) subscribeAll(); }, 4000); }
  });
}
/* le téléphone coupe la connexion en veille : à chaque retour dans l'appli, on rattrape et on se reconnecte */
var resubT = null;
function catchUp() {
  if (!sb || document.hidden) return;
  ["salon", "likes", "messages", "amities", "alertes"].forEach(function (t) { load(t); });
  if (!channel || channel.state !== "joined") subscribeAll();
}
document.addEventListener("visibilitychange", catchUp); window.addEventListener("focus", catchUp); window.addEventListener("online", catchUp); window.addEventListener("pageshow", catchUp);
/* filet de sécurité : sur le chat, on vérifie toutes les 15 s */
setInterval(function () { if (sb && !document.hidden && cur() === "ponton") { load("salon"); load("messages"); load("likes"); } }, 15000);
function loadAll() { loadBadges(); return Promise.all(Object.keys(Q).map(load)); }
setInterval(function () { if (sb && !document.hidden) { load("ouverts"); load("places"); load("alertes"); } }, 120000);

/* ---------------- navigation ---------------- */
var VIEWS = ["accueil", "compte", "profil", "panne", "ponton", "avis", "ports", "meteo", "webcams", "restos", "epaves", "vitesse", "noeuds", "boussole", "carnet", "aide", "annonces", "location", "evenements", "admin"].concat(SORTIES_ON ? ["sorties"] : []);
var NEEDS_AUTH = { profil: 1, admin: 1, location: 1, annonces: 1, vitesse: 1, epaves: 1, noeuds: 1 };
var WHYV = {
  location: "La location de bateaux entre plaisanciers est réservée aux membres. Créez votre compte gratuit pour voir les bateaux disponibles.",
  annonces: "Les petites annonces (vente, troc, dons) sont réservées aux membres. Créez votre compte gratuit pour les voir.",
  vitesse: "Le compteur de vitesse est réservé aux membres. Créez votre compte gratuit pour l'utiliser.",
  epaves: "La carte des épaves du Léman est réservée aux membres. Créez votre compte gratuit pour la découvrir.",
  noeuds: "Le guide des nœuds marins est réservé aux membres. Créez votre compte gratuit pour y accéder."
};
function cur() { var h = location.hash.slice(1); return VIEWS.indexOf(h) < 0 ? "accueil" : h; }
function goAuth(ret, why) { try { sessionStorage.setItem("nc-ret", ret || cur()); sessionStorage.setItem("nc-why", why || ""); } catch (e) {} location.hash = "compte"; }
/* Consulter = libre. Participer (publier, voter, aider, notifications) = compte gratuit */
function memberOk(msgEl, why) {
  if (!sb) { if (msgEl) msgEl.textContent = "L'appli n'est pas encore configurée."; return false; }
  if (real()) return true;
  goAuth(cur(), why); return false;
}
function requireProfile(msgEl, why) {
  if (!sb) { if (msgEl) msgEl.textContent = "L'appli n'est pas encore configurée."; return false; }
  if (!real()) { goAuth(cur(), why); return false; }
  if (!me()) { try { sessionStorage.setItem("nc-ret", cur()); } catch (e) {} location.hash = "profil"; toast("Choisissez d'abord votre prénom"); return false; }
  return true;
}
/* Fonctions ouvertes à tous : sans compte, on crée en silence une session invité */
var guestBusy = false;
function guestOk(retry, msgEl) {
  if (!sb) { if (msgEl) msgEl.textContent = "L'appli n'est pas encore configurée."; return false; }
  if (preview() && viewAs === "invite") { toast("Mode aperçu invité : action désactivée."); return false; }
  if (uid) return true;
  if (guestBusy) return false; guestBusy = true;
  sb.auth.signInAnonymously().then(function (r) {
    guestBusy = false;
    if (r.error || !r.data || !r.data.session) { var t = "Action impossible pour le moment. Réessayez dans un instant."; if (msgEl) { msgEl.className = "err"; msgEl.textContent = t; } else toast(t); return; }
    onSession(r.data.session, "SIGNED_IN"); retry();
  }).catch(function () { guestBusy = false; toast("Pas de connexion internet ?"); });
  return false;
}
var prevView = "accueil", lastView = "accueil";
function route() {
  var h = cur(); if (h !== lastView) { prevView = lastView; lastView = h; if (SEL) selEnd(true); }
  if (h !== "compte" && prevView === "compte") { try { sessionStorage.removeItem("nc-why"); } catch (e) {} }
  if (NEEDS_AUTH[h] && !real() && sb) { goAuth(h, WHYV[h]); return; }
  if (h === "admin" && !realAdmin && sb) { if (uid) { location.hash = "profil"; return; } }
  VIEWS.forEach(function (v) { var e = $("v-" + v); if (e) e.hidden = v !== h; });
  Array.prototype.forEach.call($("nav").querySelectorAll("a[data-v]"), function (a) { a.classList.toggle("on", a.dataset.v === h); });
  if (h === "profil") fillProfile();
  if (h === "compte" && authMode !== "reset") setAuthMode(real() ? "in" : preview() ? "up" : uid && !guest ? "in" : authMode);
  if (h === "ponton") markRead();
  if (h === "webcams") wcFromHash();
  renderAll(); window.scrollTo(0, 0); heroStart();
  if (h === "ponton" && waTab === "salon" && !SEL) { slBottom(true); setTimeout(function () { if (cur() === "ponton" && waTab === "salon") window.scrollTo(0, document.body.scrollHeight); }, 600); } /* le salon s'ouvre sur les derniers messages */
  if (h === "boussole") bsEnter(); else bsLeave();
}
/* écran d'ouverture : l'en-tête avec le chat en démo, puis bouton « Entrer » */
function enterApp() {
  var h = $("hero"); if (!h || !h.classList.contains("splash")) return;
  try { sessionStorage.setItem("nc-in", "1"); } catch (e) {}
  h.classList.remove("splash"); h.classList.add("compact"); document.documentElement.classList.remove("splashing"); window.scrollTo(0, 0);
}
$("enterBtn").onclick = enterApp;
/* Chat › Amis : listes « Mes amis » et « Tous les membres » repliées, on touche pour les ouvrir */
var FOLD = { am: false, mb: false, se: false };
function foldUI() {
  var a = $("amAllH"), m = $("mbHead"); if (!a || !m) return;
  var srch = !!(($("mbSearch") || {}).value || "").trim(), mo = FOLD.mb || srch;
  var se = $("amSentH"); se.classList.toggle("open", FOLD.se); se.setAttribute("aria-expanded", FOLD.se ? "true" : "false"); $("amSent").style.display = FOLD.se ? "" : "none";
  a.classList.toggle("open", FOLD.am); a.setAttribute("aria-expanded", FOLD.am ? "true" : "false"); $("amList").style.display = FOLD.am ? "" : "none";
  m.classList.toggle("open", mo); m.setAttribute("aria-expanded", mo ? "true" : "false"); ["mbChips", "mbHint", "mbList"].forEach(function (id) { $(id).style.display = mo ? "" : "none"; });
}
function foldKey(k) { return function (e) { if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return; if (e.type === "keydown") e.preventDefault(); FOLD[k] = !FOLD[k]; foldUI(); }; }
$("amSentH").onclick = foldKey("se"); $("amSentH").onkeydown = foldKey("se"); $("amAllH").onclick = foldKey("am"); $("amAllH").onkeydown = foldKey("am"); $("mbHead").onclick = foldKey("mb"); $("mbHead").onkeydown = foldKey("mb");
/* écran d'entrée (photo + se connecter / créer un compte / découvrir) */
function nceClose() { var n = $("ncEntry"); if (n && !n.hidden) { n.classList.add("out"); setTimeout(function () { n.hidden = true; n.classList.remove("out"); }, 300); } if ($("ncIntro").hidden) document.documentElement.classList.remove("splashing"); }
$("nceSkip").onclick = nceClose;
/* retour dans l'appli (sans la fermer) : le logo 1 seconde, si on est parti plus de 10 secondes */
var bgAt = 0;
document.addEventListener("visibilitychange", function () {
  var i = $("ncIntro"); if (!i) return;
  if (document.hidden) { bgAt = Date.now(); i.classList.remove("out"); i.hidden = false; return; }
  if (Date.now() - bgAt < 10000) { i.hidden = true; return; }
  setTimeout(function () { i.classList.add("out"); setTimeout(function () { i.hidden = true; i.classList.remove("out"); }, 400); }, 1000);
});
Array.prototype.forEach.call(document.querySelectorAll("#ncEntry [data-am]"), function (a) { a.onclick = function () { authMode = a.dataset.am; try { sessionStorage.setItem("nc-ret", "accueil"); } catch (e) {} nceClose(); }; });
window.addEventListener("hashchange", enterApp);
window.addEventListener("hashchange", route);

/* ---------------- géographie commune ---------------- */
var Z = [["Hermance",46.301,6.243],["Corsier-Port",46.268,6.226],["Genève – Port-Noir / Eaux-Vives",46.222,6.168],["Genève – Pâquis",46.213,6.155],["Genthod",46.257,6.158],["Versoix",46.280,6.165],["Coppet",46.316,6.191],["Nyon",46.381,6.240],["Gland",46.415,6.267],["Yvoire (F)",46.371,6.329],["Rolle",46.454,6.337],["Sciez (F)",46.386,6.371],["Saint-Prex",46.483,6.455],["Thonon (F)",46.409,6.489],["Morges",46.506,6.495],["Préverenges",46.512,6.528],["Saint-Sulpice",46.511,6.557],["Lausanne – Vidy",46.515,6.590],["Évian (F)",46.401,6.589],["Lausanne – Ouchy",46.508,6.627],["Pully",46.507,6.660],["Lutry",46.503,6.687],["Cully",46.488,6.729],["Saint-Saphorin",46.471,6.795],["Saint-Gingolph",46.399,6.806],["Vevey",46.459,6.840],["Le Bouveret",46.392,6.857],["La Tour-de-Peilz",46.453,6.859],["Clarens / Montreux",46.432,6.911],["Territet",46.433,6.925],["Villeneuve",46.399,6.926]];
function alpha(a, b) { return String(a || "").localeCompare(String(b || ""), "fr", { sensitivity: "base" }); }
Z.sort(function (a, b) { return a[2] - b[2]; });
function ZA() { return Z.slice().sort(function (a, b) { return alpha(a[0], b[0]); }); } /* ports par ordre alphabétique pour les listes */
var OUT = [[6.155,46.213],[6.158,46.257],[6.165,46.28],[6.191,46.316],[6.24,46.381],[6.267,46.415],[6.337,46.454],[6.455,46.483],[6.495,46.506],[6.627,46.508],[6.687,46.503],[6.729,46.488],[6.84,46.459],[6.911,46.432],[6.926,46.399],[6.857,46.392],[6.806,46.399],[6.71,46.4],[6.59,46.401],[6.489,46.409],[6.371,46.386],[6.329,46.371],[6.243,46.301],[6.226,46.268],[6.168,46.222]];
var TOWNS = [["Genève",6.155,46.213,16,"start"],["Nyon",6.24,46.381,-9,"middle"],["Lausanne",6.627,46.508,-9,"middle"],["Vevey",6.84,46.459,-9,"middle"],["Montreux",6.911,46.432,18,"middle"],["Évian",6.589,46.401,18,"middle"],["Thonon",6.489,46.409,18,"middle"]];
function X(o) { return (o - 6.14) * 808.5; } function Y(a) { return (46.54 - a) * 1165.5; }
var NS = "http://www.w3.org/2000/svg";
function baseMap(s, labels) {
  s.textContent = "";
  function mk(t, a, st) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (st) e.setAttribute("style", st); s.appendChild(e); return e; }
  mk("polygon", { points: OUT.map(function (q) { return X(q[0]).toFixed(0) + "," + Y(q[1]).toFixed(0); }).join(" ") }, "fill:var(--ac);fill-opacity:.18;stroke:var(--ac);stroke-width:2");
  if (labels) TOWNS.forEach(function (r) { var t = mk("text", { x: X(r[1]), y: Y(r[2]) + r[3], "text-anchor": r[4], "font-size": 15 }, "fill:var(--mu)"); t.textContent = r[0]; });
  return mk;
}
function svgPoint(s, e) { var r = s.getBoundingClientRect(); return { lon: 6.14 + ((e.clientX - r.left) / r.width * 680) / 808.5, lat: 46.54 - ((e.clientY - r.top) / r.height * 410) / 1165.5 }; }
/* carte détaillée (webcams, restos) */
var SHORE = [[46.208,6.145],[46.255,6.155],[46.283,6.168],[46.315,6.192],[46.382,6.240],[46.405,6.262],[46.458,6.337],[46.478,6.455],[46.505,6.497],[46.508,6.560],[46.517,6.597],[46.505,6.627],[46.507,6.660],[46.502,6.685],[46.488,6.730],[46.461,6.842],[46.453,6.858],[46.440,6.893],[46.432,6.910],[46.400,6.925],[46.383,6.857],[46.390,6.803],[46.408,6.722],[46.402,6.590],[46.393,6.530],[46.375,6.480],[46.358,6.425],[46.347,6.358],[46.372,6.327],[46.360,6.300],[46.325,6.268],[46.302,6.243],[46.276,6.223],[46.218,6.180],[46.203,6.150]];
function X2(lo) { return 30 + (lo - 6.13) * 0.689 * 680; } function Y2(la) { return 20 + (46.54 - la) * 680; }
function svgEl(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; }
function detailedLake(svg) {
  svg.textContent = "";
  svgEl("path", { class: "lakefill", d: "M" + SHORE.map(function (p) { return X2(p[1]).toFixed(1) + "," + Y2(p[0]).toFixed(1); }).join(" L") + "Z" }, svg);
  svg.setAttribute("viewBox", "16 16 408 254");
  return svgEl("g", {}, svg);
}
function mapsSearch(q) { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q); }

/* ================= COMPTE ================= */
var authMode = "up";
function setAuthMode(m) {
  authMode = m;
  Array.prototype.forEach.call($("auTabs").children, function (b) { b.classList.toggle("on", b.dataset.m === m); });
  var reset = m === "reset";
  $("auTabs").hidden = reset;
  $("auTitle").textContent = reset ? "Nouveau mot de passe" : m === "up" ? "Rejoindre l'équipage" : "Bon retour à bord";
  $("auLead").textContent = reset ? "Choisissez votre nouveau mot de passe." : m === "up" ? "Gratuit. Il vous permet d'écrire sur le Ponton, de recevoir l'alerte vaudaire, d'aider en cas de panne, de profiter des offres membres chez les restos partenaires et de partager vos bons plans. La météo, les cartes et les infos restent libres d'accès." : "Connectez-vous avec votre e-mail.";
  var why = ""; try { why = sessionStorage.getItem("nc-why") || ""; } catch (e) {}
  var W = $("auWhy"); W.hidden = reset || !why || real(); W.textContent = why;
  $("auGo").textContent = reset ? "Enregistrer le mot de passe" : m === "up" ? "Créer mon compte" : "Me connecter";
  $("auPassL").textContent = m === "in" ? "Mot de passe" : "Mot de passe (8 caractères min.)";
  $("auPass").autocomplete = m === "in" ? "current-password" : "new-password";
  $("auEmail").parentNode.querySelector('label[for="auEmail"]').hidden = reset; $("auEmail").hidden = reset;
  $("auForgot").hidden = m !== "in";
  $("auMsg").textContent = ""; $("auMsg").className = "err";
  if (real() && !reset) { $("auMsg").className = "okm"; $("auMsg").textContent = "Vous êtes connecté."; }
}
Array.prototype.forEach.call($("auTabs").children, function (b) { b.onclick = function () { setAuthMode(b.dataset.m); }; });
function authErr(e) {
  var m = (e && e.message) || "";
  if (/Invalid login/i.test(m)) return "E-mail ou mot de passe incorrect.";
  if (/Email not confirmed/i.test(m)) return "Confirmez d'abord votre e-mail (lien reçu par e-mail).";
  if (/already registered/i.test(m)) return "Cette adresse a déjà un compte : utilisez « J'ai déjà un compte ».";
  if (/Password should/i.test(m)) return "Mot de passe trop court (8 caractères minimum).";
  if (/rate limit/i.test(m)) return "Trop de tentatives : réessayez dans quelques minutes.";
  return "Erreur : " + (m || "réessayez.");
}
$("auGo").onclick = function () {
  if (preview()) { toast("Mode aperçu : revenez en mode admin pour vous connecter."); return; }
  var m = $("auMsg"); m.className = "err"; m.textContent = "";
  if (!sb) { m.textContent = "L'appli n'est pas encore configurée (fichier config.js)."; return; }
  var em = $("auEmail").value.trim(), pw = $("auPass").value;
  if (authMode !== "reset" && !/^\S+@\S+\.\S+$/.test(em)) { m.textContent = "Adresse e-mail invalide."; return; }
  if (pw.length < 8) { m.textContent = "Mot de passe : 8 caractères minimum."; return; }
  $("auGo").disabled = true;
  /* inscription par la fonction serveur : compte créé déjà confirmé, sans e-mail (évite la limite d'envoi), puis connexion directe */
  var p = authMode === "up" ? sb.functions.invoke("inscription", { body: { email: em, password: pw } }).then(function (r) {
      if (!r.error) return sb.auth.signInWithPassword({ email: em, password: pw });
      var ctx = r.error.context;
      return (ctx && ctx.json ? ctx.json() : Promise.resolve({})).catch(function () { return {}; }).then(function (j) {
        var c = j && j.error;
        return { error: { message: c === "existe" ? "User already registered" : c === "limite" ? "rate limit" : c === "password" ? "Password should be at least 8 characters" : c === "email" ? "Adresse e-mail invalide." : "inscription impossible, réessayez." } };
      });
    })
    : authMode === "in" ? sb.auth.signInWithPassword({ email: em, password: pw })
    : sb.auth.updateUser({ password: pw });
  p.then(function (r) {
    if (r.error) { m.textContent = authErr(r.error); return; }
    if (authMode === "up" && !r.data.session) { m.className = "okm"; m.textContent = "Presque fini ! Ouvrez l'e-mail reçu et touchez le lien de confirmation, puis revenez vous connecter."; setAuthMode("in"); $("auMsg").className = "okm"; $("auMsg").textContent = "Lien de confirmation envoyé à " + em + "."; return; }
    if (authMode === "reset") { toast("Mot de passe modifié"); authMode = "in"; }
    $("auPass").value = "";
  }).catch(function () { m.textContent = "Pas de connexion internet ?"; }).then(function () { $("auGo").disabled = false; });
};
$("auForgot").onclick = function () {
  var em = $("auEmail").value.trim(), m = $("auMsg");
  if (!/^\S+@\S+\.\S+$/.test(em)) { m.className = "err"; m.textContent = "Indiquez d'abord votre e-mail ci-dessus."; return; }
  sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname }).then(function (r) {
    m.className = r.error ? "err" : "okm"; m.textContent = r.error ? authErr(r.error) : "E-mail envoyé : touchez le lien pour choisir un nouveau mot de passe.";
  });
};
function onSession(s, ev) {
  var was = uid; session = s; uid = s ? s.user.id : null; guest = !!(s && s.user && s.user.is_anonymous);
  if (ev === "PASSWORD_RECOVERY") { location.hash = "compte"; setAuthMode("reset"); }
  if (uid !== was) {
    isAdmin = false; realAdmin = false;
    if (uid) sb.from("admins").select("uid").eq("uid", uid).then(function (r) { realAdmin = !!(r.data && r.data.length); applyView(); if (realAdmin) load("photos"); renderAll(); });
    subscribeAll(); loadAll().then(function () { pushRefresh();
      if (real() && cur() === "compte" && authMode !== "reset") {
        var ret = ""; try { ret = sessionStorage.getItem("nc-ret") || ""; sessionStorage.removeItem("nc-ret"); sessionStorage.removeItem("nc-why"); } catch (e) {}
        location.hash = me() ? (ret && ret !== "compte" ? ret : "") : (ret === "ponton" ? "ponton" : "profil");
      }
    });
  }
  renderAll();
}

/* ================= PROFIL ================= */
var o0 = el("option", 0, "— choisir —"); o0.value = ""; $("pPort").appendChild(o0);
ZA().forEach(function (z) { var o = el("option", 0, z[0]); o.value = z[0]; $("pPort").appendChild(o); });
function pfClose() { if (prevView && prevView !== "profil" && prevView !== "compte") location.hash = prevView === "accueil" ? "" : prevView; else location.hash = ""; }
$("pfClose").onclick = pfClose;
function fillProfile() {
  drawPfPhoto(); var vb = $("vpBox"); if (vb) { vb.hidden = !me(); if (vpGo && me()) { vpGo = false; vb.open = true; vpOpen(); setTimeout(function () { try { vb.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {} }, 250); } }
  var pp = me(); $("accFiche").open = !pp; $("pfLead").hidden = !!pp;
  $("accFicheSum").textContent = pp ? [pp.pseudo, pp.bateau, pp.port].filter(Boolean).join(" · ") : "À remplir pour rejoindre le chat";
  var p = me(); $("pfTitle").textContent = p ? "Mon profil" : "Créez votre profil";
  $("pSave").textContent = p ? "Mettre à jour" : "Rejoindre l'équipage";
  if (p) { $("pPseudo").value = p.pseudo || ""; $("pBoat").value = p.bateau || ""; $("pType").value = p.type || ""; $("pPort").value = p.port || ""; $("pImm").value = p.immat || ""; }
  $("pEmail").textContent = session ? "Connecté avec " + session.user.email : "";
  $("pMsg").textContent = "";
}
$("pSave").onclick = function () {
  var m = $("pMsg"); m.className = "err"; m.textContent = "";
  if (!real()) { goAuth("profil"); return; }
  var ps = $("pPseudo").value.trim(), bt = $("pBoat").value.trim();
  if (ps.length < 2) { m.textContent = "Indiquez un prénom ou un pseudo (2 caractères min.)."; return; }
  var taken = Object.keys(P).some(function (k) { return k !== uid && norm(P[k].pseudo) === norm(ps) && norm(P[k].bateau) === norm(bt); });
  if (taken) { m.textContent = bt ? "Ce pseudo est déjà pris avec ce nom de bateau. Changez de pseudo." : "Ce pseudo est déjà pris. Ajoutez une initiale (ex. Julien B.) ou le nom de votre bateau."; return; }
  var first = !me();
  var d = { id: uid, pseudo: ps, bateau: bt, type: $("pType").value, port: $("pPort").value, immat: $("pImm").value.trim().toUpperCase(), maj: nowIso() };
  $("pSave").disabled = true;
  sb.from("profils").upsert(d).then(function (r) {
    if (r.error) { m.textContent = "Enregistrement impossible : " + r.error.message; return; }
    P[uid] = Object.assign({}, P[uid], d); m.className = "okm"; m.textContent = first ? "Bienvenue à bord, " + ps + " !" : "Fiche mise à jour.";
    renderAll();
    var ret = ""; try { ret = sessionStorage.getItem("nc-ret") || ""; sessionStorage.removeItem("nc-ret"); sessionStorage.removeItem("nc-why"); } catch (e) {}
    if (first) setTimeout(function () { welcome(ret); }, 600);
    else if (ret) setTimeout(function () { location.hash = ret !== "profil" ? ret : "ponton"; }, 900);
    else { toast("Fiche mise à jour"); $("accFiche").open = false; $("accFicheSum").textContent = [ps, bt, d.port].filter(Boolean).join(" · "); }
  }).then(function () { $("pSave").disabled = false; });
};
$("pLogout").onclick = function () { (mySub ? sb.from("push_abos").delete().eq("endpoint", mySub.endpoint).then(function () { mySub = null; myAbo = null; }) : Promise.resolve()).catch(function () {}).then(function () { return sb.auth.signOut(); }).then(function () { location.hash = ""; toast("Déconnecté. À bientôt sur l'eau !"); }); };
var delStep = 0;
$("pDelete").onclick = function () {
  var m = $("pDelMsg");
  if (!delStep) { delStep = 1; $("pDelete").textContent = "Confirmer : tout supprimer définitivement"; m.textContent = "Votre fiche, vos messages, alertes, avis, annonces et photos seront effacés. Touchez encore pour confirmer."; return; }
  $("pDelete").disabled = true; m.textContent = "Suppression…";
  sb.storage.from("photos").list(uid, { limit: 1000 }).then(function (r) {
    var files = (r.data || []).map(function (f) { return uid + "/" + f.name; });
    return files.length ? sb.storage.from("photos").remove(files) : null;
  }).then(function () { return sb.rpc("supprimer_mon_compte"); }).then(function (r) {
    if (r && r.error) throw r.error;
    return sb.auth.signOut();
  }).then(function () { location.hash = ""; toast("Compte supprimé."); })
    .catch(function (e) { m.textContent = "Suppression impossible : " + ((e && e.message) || "réessayez."); $("pDelete").disabled = false; });
};

/* ================= ACCUEIL ================= */
/* coordonnées façon carnet de bord sous le titre : port d'attache du membre, sinon le Léman */
function dms(v, pos, neg) { var a = Math.abs(v), d = Math.floor(a), m = Math.round((a - d) * 60); if (m === 60) { d++; m = 0; } return d + "°" + ("0" + m).slice(-2) + "′" + (v >= 0 ? pos : neg); }
function renderCoord() {
  var e = $("heroCoord"); if (!e) return;
  var p = me(), z = p && p.port ? Z.filter(function (x) { return x[0] === p.port; })[0] : null;
  var lat = z ? z[1] : 46.45, lon = z ? z[2] : 6.55, nom = z ? z[0].replace(/\s*\((F|CH)\)\s*$/, "") : "Le Léman";
  var d = new Date(), J = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"], M = ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"];
  e.textContent = dms(lat, "N", "S") + " " + dms(lon, "E", "O") + " · " + nom.toUpperCase() + " · " + J[d.getDay()] + " " + d.getDate() + " " + M[d.getMonth()];
}
function renderChip() {
  renderCoord();
  var c = $("meChip"), p = me(); c.textContent = "";
  if (p) { c.className = "me"; c.href = "#profil"; c.appendChild(putPhoto(el("span", "av", initial(uid)), uid)); c.appendChild(el("span", 0, p.pseudo)); }
  else if (real()) { c.className = "me new"; c.href = "#profil"; c.textContent = "Mon profil"; }
  else { c.className = "me new"; c.href = "#compte"; c.textContent = "Se connecter"; }
}
var AVC = ["#f29a5b", "#9fe3c4", "#a9c8f5", "#f5d07a", "#e9a8d0", "#c7b8f5"];
function openNow() { var l = Date.now() - 2 * 36e5; return O.filter(function (x) { return ts(x.maj) > l; }); }
/* visites sans compte : à partir de la 3e journée, petit bandeau d'invitation */
(function () { var d = new Date().toISOString().slice(0, 10); if (ls("nc-vday") !== d) { ls("nc-vday", d); ls("nc-visits", String((+ls("nc-visits") || 0) + 1)); } })();
function renderJoinBar(nm) {
  var J = $("joinBar"); if (!J) return;
  var later = +ls("nc-join-later") || 0;
  J.hidden = !sb || real() || (+ls("nc-visits") || 0) < 3 || Date.now() - later < 7 * 864e5;
  if (J.hidden) return;
  $("joinTxt").textContent = nm >= 10 ? "Rejoignez les " + nm + " plaisanciers du Léman" : "Rejoignez les plaisanciers du Léman";
}
function renderHome() {
  renderChip();
  Array.prototype.forEach.call(document.querySelectorAll("a.tile"), function (a) { a.classList.toggle("locked", !!NEEDS_AUTH[a.getAttribute("href").slice(1)] && !real()); }); var ph = document.querySelector(".p-how"); if (ph) ph.hidden = !!me();
  var op = openNow();
  var nm = Object.keys(P).length; $("stMembers").textContent = !sb ? "–" : nm; $("stMembers").nextElementSibling.textContent = nm === 1 ? "membre" : "membres"; $("stOpen").textContent = sb ? op.length : "–";
  renderJoinBar(nm);
  var HS = $("heroStat"); HS.hidden = !sb || !nm; HS.textContent = ""; HS.appendChild(el("b", 0, String(nm))); HS.appendChild(document.createTextNode(" plaisancier" + (nm > 1 ? "s" : "") + " inscrit" + (nm > 1 ? "s" : "")));
  if (op.length) { HS.appendChild(el("i")); HS.appendChild(el("b", 0, String(op.length))); HS.appendChild(document.createTextNode(" sur l\u2019eau")); }
  var N = $("pNow"); N.textContent = "";
  var fo = real() ? friendIds().filter(function (id) { return P[id] && onWater(id); }) : [];
  fo.slice(0, 3).forEach(function (id, i) { var a = el("span", 0, initial(id)); a.style.background = AVC[i % AVC.length]; N.appendChild(putPhoto(a, id)); });
  if (!fo.length) N.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>';
  $("pmT").textContent = fo.length === 1 ? ((P[fo[0]] && P[fo[0]].pseudo) || "Un ami") + " est sur le lac" : fo.length ? fo.length + " amis sur le lac" : real() ? "Aucun ami sur le lac pour l'instant" : "Le Ponton, le chat du lac";
  var c = $("ctaMain"), p = me();
  c.textContent = p ? "Hisser le pavillon" : "Rejoindre l'équipage"; c.href = p ? "#ponton" : real() ? "#profil" : "#compte";
  var n = activeAlerts().length; $("alertPill").hidden = !n; $("alertPill").textContent = n + " alerte" + (n > 1 ? "s" : "") + " active" + (n > 1 ? "s" : "");
  var u = unread() + pendingIn().length; $("msgChip").hidden = !u; $("unreadHome").textContent = u; $("unreadNav").hidden = !u; $("unreadNav").textContent = u;
  $("avCount").textContent = AV.length ? AV.length + " avis · donner le vôtre ›" : "Donner mon avis ›";
  if (real() && !$("ncEntry").hidden) nceClose();
  Array.prototype.forEach.call(document.querySelectorAll('a[href="#sorties"],#nwInGo option[value="sorties"]'), function (a) { a.hidden = !SORTIES_ON; });
  $("phBtn").hidden = !isAdmin; $("nwAdm").hidden = !isAdmin; renderNw();
  var pq = isAdmin ? PH.filter(function (p) { return !pub(p); }).length : 0, hm = $("homeMod");
  hm.hidden = !pq; hm.textContent = pq + " photo" + (pq > 1 ? "s" : "") + " à vérifier ›";
}
/* bannière animée */
var heroRunning = false;
function heroStart() { if (document.querySelector(".hero").classList.contains("photo")) return; if (!heroRunning && !$("v-accueil").hidden) { heroRunning = true; heroSize(); requestAnimationFrame(heroDraw); } }
var cv = $("heroCv"), cx = cv.getContext("2d"), t0 = performance.now(), still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
function heroSize() { var r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; cx.setTransform(d, 0, 0, d, 0, 0); }
function ridge(w, base, amp, seed, col) { cx.beginPath(); cx.moveTo(0, base); for (var x = 0; x <= w; x += 6) { var y = base - amp * (.55 * Math.sin(x * .012 + seed) + .3 * Math.sin(x * .031 + seed * 2) + .15 * Math.sin(x * .07 + seed * 3)); y -= amp * .9 * Math.max(0, 1 - Math.abs(x - w * (.62 + seed * .05)) / (w * .18)); cx.lineTo(x, y); } cx.lineTo(w, base + 400); cx.lineTo(0, base + 400); cx.closePath(); cx.fillStyle = col; cx.fill(); }
function heroDraw(now) {
  var r = cv.getBoundingClientRect(), w = r.width, h = r.height, t = (now - t0) / 1000; cx.clearRect(0, 0, w, h);
  var hz = h * .72, g = cx.createRadialGradient(w * .78, hz - 6, 4, w * .78, hz - 6, 140);
  g.addColorStop(0, "rgba(255,214,150,.95)"); g.addColorStop(.18, "rgba(255,176,110,.55)"); g.addColorStop(1, "rgba(255,160,100,0)"); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
  cx.fillStyle = "rgba(255,230,190,.95)"; cx.beginPath(); cx.arc(w * .78, hz - 4, 16, 0, 7); cx.fill();
  for (var i = 0; i < 22; i++) { cx.fillStyle = "rgba(255,255,255," + (.25 + .35 * Math.abs(Math.sin(t * .6 + i))) + ")"; cx.fillRect((i * 97.3) % w, (i * 41.7) % (h * .32) + 8, 1.6, 1.6); }
  ridge(w, hz, 46, .4, "rgba(52,74,120,.55)"); ridge(w, hz + 4, 30, 1.7, "rgba(28,48,84,.8)");
  var lg = cx.createLinearGradient(0, hz, 0, h); lg.addColorStop(0, "#2a5c86"); lg.addColorStop(1, "#0d3557"); cx.fillStyle = lg; cx.fillRect(0, hz + 4, w, h - hz);
  cx.fillStyle = "rgba(255,190,130,.5)"; for (var k = 0; k < 7; k++) { var ww = 40 - k * 4 + 6 * Math.sin(t * 1.3 + k); cx.fillRect(w * .78 - ww / 2, hz + 10 + k * 7, ww, 2); }
  cx.strokeStyle = "rgba(255,255,255,.14)"; cx.lineWidth = 1.2;
  for (var j = 0; j < 5; j++) { var y0 = hz + 18 + j * 12; cx.beginPath(); cx.moveTo(0, y0); for (var x = 0; x <= w; x += 8) cx.lineTo(x, y0 + 2.5 * Math.sin(x * .04 + t * (still ? 0 : 1.2) + j)); cx.stroke(); }
  var bx = w * .24 + (still ? 0 : Math.sin(t * .25) * 10), by = hz + 20 + (still ? 0 : Math.sin(t * 1.4) * 1.5);
  cx.fillStyle = "rgba(255,255,255,.92)"; cx.beginPath(); cx.moveTo(bx, by - 34); cx.lineTo(bx, by - 4); cx.lineTo(bx + 20, by - 4); cx.closePath(); cx.fill();
  cx.fillStyle = "rgba(255,255,255,.7)"; cx.beginPath(); cx.moveTo(bx - 2, by - 28); cx.lineTo(bx - 2, by - 4); cx.lineTo(bx - 14, by - 4); cx.closePath(); cx.fill();
  cx.fillStyle = "#0a2740"; cx.beginPath(); cx.moveTo(bx - 18, by - 2); cx.lineTo(bx + 24, by - 2); cx.lineTo(bx + 18, by + 4); cx.lineTo(bx - 13, by + 4); cx.closePath(); cx.fill();
  if (!still && !document.hidden && !$("v-accueil").hidden && !document.querySelector(".hero.photo")) requestAnimationFrame(heroDraw); else heroRunning = false;
}
window.addEventListener("resize", heroSize); document.addEventListener("visibilitychange", heroStart);
function photoUrl(path) { return sb ? sb.storage.from("photos").getPublicUrl(path).data.publicUrl : ""; }
function applyBanner() {
  var h = document.querySelector(".hero"), p = REG.banniere;
  $("heroPh").style.backgroundImage = 'url("' + (p ? photoUrl(p) : "fond-accueil.svg?v=1") + '")'; if ($("nceBg")) $("nceBg").style.backgroundImage = $("heroPh").style.backgroundImage; h.classList.add("photo"); h.classList.toggle("art", !p);
}
$("phIn").onchange = function () {
  var f = this.files && this.files[0], inp = this; if (!f || !isAdmin) return; var lb = $("phPick"); lb.firstChild.textContent = "Envoi… ";
  shrink(f, 2000).then(function (blob) {
    var path = uid + "/banniere-" + Date.now() + ".jpg";
    return sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" }).then(function (r) {
      if (r.error) throw r.error; var old = REG.banniere;
      return sb.from("reglages").upsert({ k: "banniere", v: path }).then(function (r2) { if (r2.error) throw r2.error; REG.banniere = path; applyBanner(); if (old && old.indexOf(uid + "/") === 0) sb.storage.from("photos").remove([old]); });
    });
  }).then(function () { lb.firstChild.textContent = "Choisir une photo"; toast("Bannière mise à jour"); }, function () { lb.firstChild.textContent = "Échec, réessayer"; }).then(function () { inp.value = ""; });
};
$("phReset").onclick = function () {
  if (!isAdmin || !confirm("Remettre l'image de bannière par défaut pour tout le monde ?")) return;
  var old = REG.banniere;
  sb.from("reglages").upsert({ k: "banniere", v: "" }).then(function (r) { if (r.error) { toast("Action impossible."); return; } REG.banniere = ""; applyBanner(); toast("Image par défaut remise"); if (old && old.indexOf(uid + "/") === 0) sb.storage.from("photos").remove([old]); });
};
/* carte « Nouveau » de l'accueil (réglée par l'admin, fermable par chacun) */
function nwGet() { try { var o = JSON.parse(REG.nouveau || "null"); return o && o.t ? o : null; } catch (e) { return null; } }
function renderNw() {
  var o = nwGet(), c = $("nwHome"); if (!c) return;
  c.hidden = !o || ls("nc-nouveau") === String(o.id);
  if (o) { $("nwT").textContent = o.t; $("nwS").textContent = o.s || ""; $("nwS").hidden = !o.s; $("nwGo").href = "#" + (o.go || "aide"); }
  if ($("nwInT") && document.activeElement !== $("nwInT") && document.activeElement !== $("nwInS")) { $("nwInT").value = o ? o.t : ""; $("nwInS").value = o ? o.s || "" : ""; if (o && o.go) $("nwInGo").value = o.go; }
  if ($("nwAdmSum")) $("nwAdmSum").textContent = o ? "En ligne : " + o.t : "Admin · aucune carte en ligne";
}
function nwClose() { var o = nwGet(); if (o) ls("nc-nouveau", String(o.id)); $("nwHome").hidden = true; }
$("nwX").onclick = nwClose; $("nwGo").onclick = function () { nwClose(); };
function nwPut(v, msg) { sb.from("reglages").upsert({ k: "nouveau", v: v }).then(function (r) { if (r.error) { toast("Action impossible."); return; } REG.nouveau = v; renderNw(); toast(msg); }); }
$("nwSave").onclick = function () {
  if (!isAdmin) return; var t = $("nwInT").value.trim(); if (!t) { toast("Indiquez un titre."); return; }
  nwPut(JSON.stringify({ id: String(Date.now()), t: t, s: $("nwInS").value.trim(), go: $("nwInGo").value }), "Carte publiée pour tous les membres");
};
$("nwOff").onclick = function () { if (!isAdmin || !confirm("Retirer la carte « Nouveau » pour tout le monde ?")) return; nwPut("", "Carte retirée"); };
/* installation */
var deferredInstall = null;
window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredInstall = e; $("installBox").hidden = false; });
$("installBtn").onclick = function () { if (!deferredInstall) return; deferredInstall.prompt(); deferredInstall.userChoice.then(function () { deferredInstall = null; $("installBox").hidden = true; }); };
window.addEventListener("appinstalled", function () { $("installBox").hidden = true; toast("Nauticonnect est installé !"); });
/* mise à jour automatique : dès qu'une nouvelle version est en ligne, l'appli se recharge toute seule (plus besoin de la fermer) */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  var swHad = !!navigator.serviceWorker.controller, swReloading = false, swPending = false;
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (r) {
    function chk() { if (!document.hidden) r.update().catch(function () {}); }
    document.addEventListener("visibilitychange", chk); window.addEventListener("online", chk);
    setInterval(chk, 5 * 60000);
  }).catch(function () {});
  function swBusy() { var a = document.activeElement; return !!(a && (a.tagName === "TEXTAREA" || a.tagName === "INPUT") && a.value); }
  function swGo() { if (swReloading) return; swReloading = true; location.reload(); }
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!swHad) { swHad = true; return; } /* première installation : rien à recharger */
    if (document.hidden || !swBusy()) return swGo();
    swPending = true; toast("Nouvelle version prête : elle s'installera dès que vous quittez la saisie");
  });
  document.addEventListener("visibilitychange", function () { if (swPending && document.hidden) swGo(); });
  document.addEventListener("focusout", function () { if (swPending) setTimeout(function () { if (!swBusy()) swGo(); }, 1500); });
}

/* retour dans l'appli après une pause (ex. laissée ouverte toute la nuit) : on remet TOUT à jour, météo comprise */
var ncHidAt = 0;
function ncBack() {
  if (document.hidden) { ncHidAt = ncHidAt || Date.now(); return; }
  var away = ncHidAt ? Date.now() - ncHidAt : 0; ncHidAt = 0;
  if (away < 5 * 60000) return;
  try { loadWind(true); lacAt = 0; if (cur() === "meteo") loadLac(); } catch (e) {}
  if (sb) Promise.resolve(loadAll()).catch(function () {}).then(function () { try { renderAll(); } catch (e) {} });
  else try { renderAll(); } catch (e) {}
}
document.addEventListener("visibilitychange", ncBack);
window.addEventListener("pageshow", function (e) { if (e.persisted) { ncHidAt = ncHidAt || 1; ncBack(); } });
/* ================= MENU LATÉRAL ================= */
function mnShow(on) {
  $("mnDr").hidden = !on; $("mnBg").hidden = !on; 
  if (on) { $("mnAdm").hidden = !realAdmin; var v = cur(); Array.prototype.forEach.call($("mnDr").querySelectorAll("a"), function (a) { a.classList.toggle("on", (a.getAttribute("href").slice(1) || "accueil") === v); }); }
}
/* bouton menu en haut à gauche de chaque page */
Array.prototype.forEach.call(document.querySelectorAll(".hd, .hero-top, .wa-top"), function (hd) {
  var b = document.createElement("button"); b.type = "button"; b.className = "mnb"; b.setAttribute("aria-label", "Menu");
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  b.onclick = function (e) { e.preventDefault(); mnShow(true); };
  hd.insertBefore(b, hd.firstChild);
});
$("mnX").onclick = $("mnBg").onclick = function () { mnShow(false); };
Array.prototype.forEach.call($("mnDr").querySelectorAll("a"), function (a) { a.addEventListener("click", function () { mnShow(false); }); });
window.addEventListener("hashchange", function () { mnShow(false); });

/* ================= CORNE DE BRUME ================= */
/* son créé directement par le téléphone (pas de fichier à télécharger) */
var hornCtx = null, sosSeen = null;
function hornOn() { return ls("nc-corne") !== "0"; }
function hornUnlock() { try { if (!hornCtx) hornCtx = new (window.AudioContext || window.webkitAudioContext)(); if (hornCtx.state === "suspended") hornCtx.resume(); } catch (e) {} }
document.addEventListener("pointerdown", hornUnlock, { passive: true });
function hornBlast(c, t0, dur) {
  var out = c.createGain(); out.gain.setValueAtTime(0.0001, t0);
  out.gain.exponentialRampToValueAtTime(0.9, t0 + 0.35); out.gain.setValueAtTime(0.9, t0 + dur - 0.5); out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 650; lp.Q.value = 4;
  lp.connect(out); out.connect(c.destination);
  [[110, "sawtooth", 0.5], [110.8, "sawtooth", 0.4], [55, "square", 0.25], [220, "triangle", 0.15]].forEach(function (x) {
    var o = c.createOscillator(), g = c.createGain(); o.type = x[1];
    o.frequency.setValueAtTime(x[0] * 0.92, t0); o.frequency.exponentialRampToValueAtTime(x[0], t0 + 0.3);
    g.gain.value = x[2]; o.connect(g); g.connect(lp); o.start(t0); o.stop(t0 + dur + 0.05);
  });
}
function horn() {
  hornUnlock(); var c = hornCtx; if (!c) return;
  var t = c.currentTime + 0.05; hornBlast(c, t, 2.2); hornBlast(c, t + 2.8, 2.2);
  try { navigator.vibrate && navigator.vibrate([600, 300, 600]); } catch (e) {}
}
function sosCheck(rows) {
  var ids = rows.map(function (a) { return a.id; });
  if (sosSeen) {
    var neuf = rows.filter(function (a) { return sosSeen.indexOf(a.id) < 0 && a.auteur !== uid && a.etat === "ouverte"; });
    if (neuf.length && hornOn() && !document.hidden) { horn(); toast("Bateau en panne : " + (neuf[0].zone || "sur le lac"), 5000); }
  }
  sosSeen = ids;
}
$("nfCorne").checked = hornOn();
$("nfCorne").onchange = function () { ls("nc-corne", this.checked ? "1" : "0"); };
$("nfCorneTest").onclick = horn;

/* ================= PANNE ================= */
var gp = null, pbv = "", PB = ["Panne moteur", "Batterie / électricité", "Panne de carburant", "Échouement", "Hélice / safran", "Autre"];
Z.map(function (z, i) { return [z, i]; }).sort(function (a, b) { return alpha(a[0][0], b[0][0]); }).forEach(function (x) { var o = el("option", 0, "Zone : " + x[0][0]); o.value = x[1]; $("pnZone").appendChild(o); });
(function () { var p = ls("nc-zone"); if (p !== "") $("pnZone").value = p; })();
PB.forEach(function (t) { var b = el("button", 0, t); b.onclick = function () { pbv = t; Array.prototype.forEach.call($("pnPbs").children, function (x) { x.className = ""; }); b.className = "on"; }; $("pnPbs").appendChild(b); });
function pnPos() { if (gp) return gp; var z = Z[+$("pnZone").value] || Z[0]; return { nom: z[0], lat: z[1], lon: z[2] }; }
function pnMsg(t) { $("pnMsg").textContent = t || ""; }
$("pnZone").onchange = function () { gp = null; ls("nc-zone", this.value); renderPanne(); };
$("pnGps").onclick = function () {
  pnMsg(); if (!navigator.geolocation) { pnMsg("GPS indisponible : choisissez une zone."); return; }
  $("pnGps").textContent = "Recherche de la position…";
  navigator.geolocation.getCurrentPosition(function (p) { gp = { nom: "Position GPS", lat: p.coords.latitude, lon: p.coords.longitude }; $("pnGps").textContent = "Position GPS utilisée"; renderPanne(); },
    function () { $("pnGps").textContent = "Utiliser ma position GPS"; pnMsg("Position GPS refusée ou indisponible : choisissez une zone ou touchez la carte."); }, { timeout: 10000, enableHighAccuracy: true });
};
$("pnSos").onclick = function () { pnMsg(); $("sgForm").hidden = true; var f = $("pnForm"); f.hidden = !f.hidden; if (!f.hidden) f.scrollIntoView({ behavior: "smooth" }); };
/* signaler un bateau vu en difficulté (pas le sien) */
var SGP = [["Il coule / plein d'eau", true], ["À la dérive", true], ["Mal amarré / amarre cassée", false], ["Abîmé (bâche, choc…)", false], ["Autre", false]], sgv = null, sgGp = null;
SGP.forEach(function (o) { var b = el("button", 0, o[0]); b.type = "button"; b.onclick = function () { sgv = o; Array.prototype.forEach.call($("sgPbs").children, function (x) { x.className = ""; }); b.className = "on"; }; $("sgPbs").appendChild(b); });
$("sgZone").innerHTML = $("pnZone").innerHTML; $("sgZone").value = $("pnZone").value;
function nearZ(la, lo) { var best = Z[0], d = 1e9; Z.forEach(function (z) { var k = km(la, lo, z[1], z[2]); if (k < d) { d = k; best = z; } }); return best; }
function sgPos() { if (sgGp) return sgGp; var z = Z[+$("sgZone").value] || Z[0]; return { nom: z[0], lat: z[1], lon: z[2] }; }
$("sgZone").onchange = function () { sgGp = null; $("sgGps").textContent = "Utiliser ma position GPS"; };
$("sgGps").onclick = function () {
  pnMsg(); if (!navigator.geolocation) { pnMsg("GPS indisponible : choisissez le port."); return; }
  $("sgGps").textContent = "Recherche de la position…";
  navigator.geolocation.getCurrentPosition(function (p) { var z = nearZ(p.coords.latitude, p.coords.longitude); sgGp = { nom: z[0], lat: p.coords.latitude, lon: p.coords.longitude }; $("sgGps").textContent = "Position GPS utilisée (près de " + z[0] + ")"; },
    function () { $("sgGps").textContent = "Utiliser ma position GPS"; pnMsg("Position GPS refusée ou indisponible : choisissez le port."); }, { timeout: 10000, enableHighAccuracy: true });
};
$("sgPh").onchange = function () { var f = this.files && this.files[0]; $("sgPhL").firstChild.textContent = f ? "Photo ajoutée ✓ " : "Ajouter une photo"; };
$("sgBtn").onclick = function () { pnMsg(); $("pnForm").hidden = true; var f = $("sgForm"); f.hidden = !f.hidden; if (!f.hidden) f.scrollIntoView({ behavior: "smooth" }); };
$("sgGo").onclick = function () {
  pnMsg();
  if (!sgv) { pnMsg("Étape 1 : choisissez ce que vous voyez."); return; }
  if (!guestOk(function () { $("sgGo").onclick(); }, $("pnMsg"))) return;
  var p = me(), pos = sgPos(), file = $("sgPh").files && $("sgPh").files[0], go = $("sgGo"); go.disabled = true; go.textContent = "Envoi…";
  var up = Promise.resolve("");
  if (file && real()) up = shrink(file, 1600).then(function (blob) { var path = uid + "/signal-" + Date.now() + ".jpg"; return sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" }).then(function (r) { return r.error ? "" : path; }); }).catch(function () { return ""; });
  else if (file) toast("La photo est réservée aux membres inscrits : signalement envoyé sans photo.");
  up.then(function (ph) {
    return sb.from("alertes").insert({ genre: "signal", urgent: sgv[1], par: p ? p.pseudo : "Plaisancier", bateau: $("sgBoat").value.trim().slice(0, 60), immat: $("sgImm").value.trim().toUpperCase().slice(0, 20) || null, zone: pos.nom, lat: pos.lat, lon: pos.lon, probleme: sgv[0], detail: $("sgDet").value.trim().slice(0, 140), photo: ph || null });
  }).then(function (r) {
    if (r.error) { pnMsg("Envoi impossible. Si des personnes sont en danger, appelez le 117."); return; }
    $("sgForm").hidden = true; ["sgBoat", "sgImm", "sgDet"].forEach(function (id) { $(id).value = ""; }); $("sgPh").value = ""; $("sgPhL").firstChild.textContent = "Ajouter une photo"; sgv = null; sgGp = null; $("sgGps").textContent = "Utiliser ma position GPS";
    Array.prototype.forEach.call($("sgPbs").children, function (x) { x.className = ""; });
    toast("Merci ! Signalement envoyé aux membres."); load("alertes");
  }).then(function () { go.disabled = false; go.textContent = "Envoyer le signalement"; });
};
/* adresses e-mail officielles trouvées (nov. 2026) ; ports absents : l'utilisateur choisit le destinataire */
var CAPMAIL = { "Hermance": "capitainerie@etat.ge.ch", "Corsier-Port": "capitainerie@etat.ge.ch", "Genève – Port-Noir / Eaux-Vives": "capitainerie@etat.ge.ch", "Genève – Pâquis": "capitainerie@etat.ge.ch", "Genthod": "capitainerie@etat.ge.ch", "Versoix": "capitainerie@etat.ge.ch",
  "Lausanne – Vidy": "economie@lausanne.ch", "Lausanne – Ouchy": "economie@lausanne.ch", "Clarens / Montreux": "travaux@montreux.ch", "Territet": "travaux@montreux.ch",
  "Évian (F)": "port-plaisance@ville-evian.fr", "Sciez (F)": "port-de-sciez@wanadoo.fr", "Yvoire (F)": "mairie@yvoire.fr" };
function capMail(a) {
  var when = new Date(a.maj).toLocaleString("fr-CH", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  var body = "Bonjour,\n\nUn bateau a été signalé en difficulté via l'appli Nauticonnect :\n\n- Problème : " + a.probleme + "\n" + (a.bateau ? "- Bateau : " + a.bateau + "\n" : "") + (a.immat ? "- Immatriculation : " + a.immat + "\n" : "") + "- Lieu : " + a.zone + " (https://maps.google.com/?q=" + a.lat + "," + a.lon + ")\n" + (a.detail ? "- Détails : " + a.detail + "\n" : "") + (a.photo ? "- Photo : " + photoUrl(a.photo) + "\n" : "") + "- Signalé le " + when + "\n\nMerci de faire vérifier.\n\nCordialement";
  return "mailto:" + (CAPMAIL[a.zone] || "") + "?subject=" + encodeURIComponent("Bateau en difficulté – " + a.zone) + "&body=" + encodeURIComponent(body);
}
$("pnGo").onclick = function () {
  pnMsg();
  if (!pbv) { pnMsg("Étape 2 : choisissez le problème."); return; }
  var tel = $("pnTel").value.trim(); if (tel && !/^[+0-9 ().\/-]{7,20}$/.test(tel)) { pnMsg("Numéro de téléphone invalide."); return; }
  if (!guestOk(function () { $("pnGo").onclick(); }, $("pnMsg"))) return;
  var p = me(), pos = pnPos(); $("pnGo").disabled = true;
  sb.from("alertes").insert({ par: p ? p.pseudo : "Plaisancier", bateau: p ? p.bateau || "" : "", zone: pos.nom, lat: pos.lat, lon: pos.lon, probleme: pbv, detail: $("pnDet").value.trim().slice(0, 140), tel: tel })
    .then(function (r) {
      if (r.error) { pnMsg("Envoi impossible. En cas de danger, appelez le 117."); return; }
      $("pnForm").hidden = true; $("pnDet").value = ""; pbv = ""; Array.prototype.forEach.call($("pnPbs").children, function (x) { x.className = ""; });
      toast("Alerte envoyée. Restez à bord, gilets mis."); load("alertes"); window.scrollTo({ top: 0, behavior: "smooth" });
    }).then(function () { $("pnGo").disabled = false; });
};
function activeAlerts() { var lim = Date.now() - 6 * 36e5; return A.filter(function (a) { return a.etat === "ouverte" && ts(a.maj) > lim; }); }
function renderPanne() {
  var p = me(), W = $("pnWho"); W.textContent = "";
  if (p) { W.appendChild(document.createTextNode("Alerte envoyée au nom de ")); W.appendChild(el("b", 0, nameOf(uid))); }
  else W.textContent = "Pas besoin de compte pour alerter. En cas de danger : 117.";
  var L = $("pnList"); L.textContent = ""; var pos = pnPos();
  {
    var r = activeAlerts().map(function (a) { return { a: a, d: km(pos.lat, pos.lon, a.lat, a.lon) }; }).sort(function (x, y) { return (x.a.auteur === uid ? 0 : 1) - (y.a.auteur === uid ? 0 : 1) || x.d - y.d; });
    if (!r.length) L.appendChild(el("p", "mu", "Aucune alerte active. Bonne navigation !"));
    r.forEach(function (o) {
      var a = o.a, m = a.auteur === uid, sg = a.genre === "signal", c = el("div", "card" + (m ? " mine" : "") + (sg ? " sgc" + (a.urgent ? " urg" : "") : ""));
      c.appendChild(el("b", 0, sg ? (m ? "Mon signalement · " : (a.urgent ? "Urgent · " : "") + "Bateau signalé · ") + a.probleme : (m ? "Mon alerte · " : "") + a.probleme));
      if (sg && (a.bateau || a.immat)) c.appendChild(el("div", "sg-boat", [a.bateau, a.immat].filter(Boolean).join(" · ")));
      if (sg && a.photo) { var im = el("img", "sg-ph"); im.src = photoUrl(a.photo); im.alt = "Photo du bateau signalé"; im.loading = "lazy"; im.onclick = function () { viewPhoto(photoUrl(a.photo)); }; c.appendChild(im); }
      if (!m) { var w = el("div"); w.style.margin = "6px 0"; w.appendChild(badge(a.auteur, a.par)); c.appendChild(w); }
      c.appendChild(el("div", "mu", a.zone + " · à " + o.d.toFixed(1) + " km · " + ago(a.maj)));
      if (a.detail) c.appendChild(el("div", 0, a.detail));
      if (a.faux && (isAdmin || m)) c.appendChild(el("div", "err", "Signalée comme fausse alerte par " + a.faux + " membre" + (a.faux > 1 ? "s" : "")));
      if (a.tel && !m) { var t = el("div"); t.appendChild(document.createTextNode("Tél. ")); var tl = el("a", 0, a.tel); tl.href = "tel:" + a.tel.replace(/[^0-9+]/g, ""); tl.style.cssText = "color:var(--ac);font-weight:700"; t.appendChild(tl); c.appendChild(t); }
      var ai = a.aides || [];
      if (ai.length) c.appendChild(el("div", "okm", (sg ? "S'en occupe : " : "Viennent aider : ") + ai.map(function (x) { return nameOf(x); }).join(", ")));
      else if (sg) c.appendChild(el("div", "mu", "Personne ne s'en occupe encore."));
      else if (m) c.appendChild(el("div", "mu", "En attente d’un plaisancier… Si personne ne répond, appelez le 117. L’alerte se désactive seule après 6 heures."));
      var row = el("div", "row"); row.style.marginTop = "8px";
      if (!m) {
        var b = el("button", "btn" + (ai.indexOf(uid) >= 0 ? " g" : ""), ai.indexOf(uid) >= 0 ? (sg ? "Je ne m'en occupe plus" : "Je ne peux plus venir") : (sg ? "Je m'en occupe" : "Je peux aider"));
        b.onclick = function () { if (!memberOk(null, "Pour proposer votre aide, créez votre compte gratuit : la personne en panne saura qui arrive.")) return; b.disabled = true; sb.rpc("basculer_aide", { alerte_id: a.id }).then(function () { load("alertes"); }); };
        row.appendChild(b);
        if (P[a.auteur]) { var w2 = el("button", "btn g", "Écrire"); w2.onclick = function () { openThread(a.auteur); }; row.appendChild(w2); }
        var fk = "nc-faux-" + a.id, b4 = el("button", "linkb", ls(fk) ? "Signalée comme fausse alerte" : "Signaler une fausse alerte"); b4.disabled = !!ls(fk);
        b4.onclick = function () {
          if (!real()) { goAuth(cur(), "Pour signaler une fausse alerte, créez votre compte gratuit."); return; }
          if (!confirm("Signaler une fausse alerte ? À 2 signalements de membres différents, elle est fermée.")) return;
          sb.from("signalements").insert({ quoi: "alerte", ref: String(a.id) }).then(function (r) { if (r.error) { toast("Signalement impossible."); return; } ls(fk, "1"); load("alertes"); toast("Merci, signalement envoyé."); });
        };
        c.appendChild(row); row = el("div"); row.style.marginTop = "6px"; row.appendChild(b4);
        if (isAdmin) { var b3 = el("button", "btn g", "Clôturer (admin)"); b3.onclick = function () { if (!confirm("Clôturer cette alerte ? Elle disparaîtra pour tout le monde.")) return; sb.from("alertes").update({ etat: "resolue" }).eq("id", a.id).then(function (r) { if (r.error) toast("Clôture impossible."); else { load("alertes"); toast("Alerte clôturée"); } }); }; c.appendChild(row); row = el("div", "row"); row.style.marginTop = "8px"; row.appendChild(b3); }
      } else {
        var b2 = el("button", "btn", sg ? "Réglé · retirer le signalement" : "Problème résolu · désactiver l'alerte"); b2.onclick = function () { b2.disabled = true; sb.from("alertes").update({ etat: "resolue" }).eq("id", a.id).then(function (r) { if (r.error) { b2.disabled = false; toast("Impossible de désactiver. Réessayez."); return; } load("alertes"); toast("Alerte désactivée. Bon retour au port !"); }); }; row.appendChild(b2);
      }
      c.appendChild(row);
      if (sg) { var cm = el("a", "btn g sg-cap", CAPMAIL[a.zone] ? "Prévenir la capitainerie par e-mail" : "Préparer un e-mail pour la capitainerie"); cm.href = capMail(a); c.appendChild(cm); }
      L.appendChild(c);
    });
  }
  drawPanneMap(); renderSc();
}
function drawPanneMap() {
  var s = $("pnMap"), mk = baseMap(s, false), sel = +$("pnZone").value;
  activeAlerts().forEach(function (a) { mk("circle", { cx: X(a.lon), cy: Y(a.lat), r: 11 }, "fill:var(--red);fill-opacity:.85"); });
  Z.forEach(function (z, i) { var x = X(z[2]), y = Y(z[1]), on = i === sel && !gp; mk("circle", { cx: x, cy: y, r: on ? 9 : 5 }, "fill:" + (on ? "var(--tx)" : "var(--mu)") + ";stroke:var(--bg);stroke-width:2"); var h = mk("circle", { cx: x, cy: y, r: 15 }, "fill:transparent;cursor:pointer"); h.onclick = function () { gp = null; $("pnZone").value = i; ls("nc-zone", i); renderPanne(); }; });
  var z = Z[sel] || Z[0], zx = X(z[2]);
  if (gp) mk("circle", { cx: X(gp.lon), cy: Y(gp.lat), r: 8 }, "fill:#2d7ff9;stroke:#fff;stroke-width:3");
  else { var t = mk("text", { x: zx, y: Y(z[1]) - 16, "text-anchor": zx > 520 ? "end" : zx < 120 ? "start" : "middle", "font-size": 20 }, "fill:var(--tx);font-weight:600"); t.textContent = z[0]; }
  var r = $("pnRoute"); r.href = "https://www.google.com/maps/dir/?api=1&destination=" + z[1] + "," + z[2]; r.textContent = "Itinéraire jusqu’à " + z[0];
}
/* Sections SISL : position du local + coordonnées publiées par les sections (vérifiées nov. 2026) */
var SISL = [
  { n: "Genève", la: 46.2105, lo: 6.1530, pays: "CH", tel: "022 731 11 82", lieu: "Bains des Pâquis" },
  { n: "Bellevue-Genthod", la: 46.2550, lo: 6.1555, pays: "CH", tel: "022 774 23 28", mail: "bellevue-genthod@sisl.ch", lieu: "Port Gitana", h24: true },
  { n: "Versoix", la: 46.2830, lo: 6.1680, pays: "CH", tel: "022 755 20 20", lieu: "Port du Bourg", h24: true },
  { n: "La Belotte-Bellerive", la: 46.2340, lo: 6.1960, pays: "CH", tel: "022 752 31 00", lieu: "Vésenaz" },
  { n: "Hermance", la: 46.3020, lo: 6.2430, pays: "CH", tel: "022 751 10 08", lieu: "Port d'Hermance" },
  { n: "Coppet", la: 46.3150, lo: 6.1940, pays: "CH" },
  { n: "Nyon", la: 46.3820, lo: 6.2420, pays: "CH", mail: "info@sauvetage-nyon.ch", web: "https://sauvetage-nyon.ch", lieu: "Quai Louis-Bonnard" },
  { n: "Rolle", la: 46.4580, lo: 6.3370, pays: "CH", mail: "rolle@sisl.ch", web: "https://www.sauvetage-rolle.ch" },
  { n: "St-Prex", la: 46.4790, lo: 6.4600, pays: "CH" },
  { n: "Morges", la: 46.5080, lo: 6.4970, pays: "CH", tel: "021 801 43 50", mail: "morges@sisl.ch", web: "https://www.sauvetage-morges.ch", lieu: "Place de la Navigation" },
  { n: "Ouchy", la: 46.5050, lo: 6.6280, pays: "CH", mail: "comite@sauvetage-ouchy.ch", web: "https://sauvetage-ouchy.ch", lieu: "Chemin des Pêcheurs" },
  { n: "Pully", la: 46.5070, lo: 6.6600, pays: "CH" },
  { n: "Lutry", la: 46.5010, lo: 6.6850, pays: "CH", tel: "021 791 44 77", web: "http://sauvetage-lutry.ch" },
  { n: "Villette", la: 46.4970, lo: 6.7090, pays: "CH", mail: "villette@sisl.ch", web: "https://villette.clubdesk.com/sauvetage-villette-sisl/bienvenue/" },
  { n: "Cully", la: 46.4880, lo: 6.7300, pays: "CH", mail: "cully@sisl.ch" },
  { n: "Rivaz", la: 46.4760, lo: 6.7790, pays: "CH" },
  { n: "St-Saphorin", la: 46.4730, lo: 6.7960, pays: "CH" },
  { n: "Vevey-Sentinelle", la: 46.4600, lo: 6.8400, pays: "CH", mail: "vevey-sentinelle@sisl.ch", web: "https://www.sauvetage-vevey-sentinelle.ch", lieu: "Quai Ansermet" },
  { n: "Vevey-Vétéran", la: 46.4620, lo: 6.8470, pays: "CH" },
  { n: "La Tour-de-Peilz", la: 46.4520, lo: 6.8580, pays: "CH" },
  { n: "Clarens", la: 46.4380, lo: 6.8930, pays: "CH" },
  { n: "Montreux", la: 46.4330, lo: 6.9100, pays: "CH", tel: "021 963 75 30", mail: "montreux032@gmail.com", web: "https://www.sauvetage-montreux.ch", lieu: "Quai de Vernex" },
  { n: "Territet", la: 46.4220, lo: 6.9220, pays: "CH" },
  { n: "Villeneuve", la: 46.3970, lo: 6.9270, pays: "CH", web: "https://www.sauvetage-villeneuve.ch" },
  { n: "Le Bouveret", la: 46.3860, lo: 6.8560, pays: "CH" },
  { n: "St-Gingolph", la: 46.3930, lo: 6.8050, pays: "CH", mail: "info@st-gingolph-sisl.com" },
  { n: "Bret-Locum", la: 46.3980, lo: 6.7800, pays: "FR" },
  { n: "Meillerie", la: 46.4070, lo: 6.7230, pays: "FR" },
  { n: "Lugrin-Tourronde", la: 46.4040, lo: 6.6550, pays: "FR" },
  { n: "Évian", la: 46.4020, lo: 6.5900, pays: "FR", tel: "+33 4 50 75 27 09", mail: "evian@sisl.ch", lieu: "Quai Paul-Léger" },
  { n: "Amphion-Publier", la: 46.3990, lo: 6.5280, pays: "FR" },
  { n: "Thonon", la: 46.3760, lo: 6.4800, pays: "FR", mail: "sauvetage.thonon@wanadoo.fr", lieu: "Port de Rives" },
  { n: "Sciez", la: 46.3420, lo: 6.3880, pays: "FR" },
  { n: "Yvoire", la: 46.3720, lo: 6.3260, pays: "FR", tel: "+33 4 50 72 84 86", mail: "secretariat.sauvetage.yvoire@gmail.com", lieu: "Quai Léopold-Thorens" }
];
SISL.forEach(function (x) { var o = el("option"); o.value = x.n; $("scDl").appendChild(o); });
function telHref(t) { var d = t.replace(/[^0-9+]/g, ""); if (d.charAt(0) === "0" && d.charAt(1) !== "0") d = "+41" + d.slice(1); return "tel:" + d; }
function scCard(x, pos, big) {
  var c = el("div", "card sccard" + (big ? " near" : "")), h = el("div", "schd");
  h.appendChild(el("b", 0, "Sauvetage " + x.n + (x.pays === "FR" ? " (France)" : "")));
  h.appendChild(el("span", "mu", km(pos.lat, pos.lon, x.la, x.lo).toFixed(1).replace(".", ",") + " km")); c.appendChild(h);
  if (x.lieu) c.appendChild(el("div", "mu", x.lieu + (x.h24 ? " · joignable 24 h/24" : "")));
  var mem = SC.filter(function (s) { return norm(s.nom) === norm(x.n); })[0], tel = x.tel || (mem && mem.tel);
  var A = el("div", "acts");
  if (tel) { var t = el("a", big ? "p" : 0, "Appeler " + tel); t.href = telHref(tel); A.appendChild(t); }
  if (x.mail) { var m = el("a", 0, "E-mail"); m.href = "mailto:" + x.mail; A.appendChild(m); }
  if (x.web) { var w = el("a", 0, "Site"); w.href = x.web; w.target = "_blank"; w.rel = "noopener"; A.appendChild(w); }
  var g = el("a", 0, "Y aller"); g.href = "https://www.google.com/maps/dir/?api=1&destination=" + x.la + "," + x.lo; g.target = "_blank"; g.rel = "noopener"; A.appendChild(g);
  c.appendChild(A);
  if (!x.tel && mem) c.appendChild(el("div", "mu", "Numéro ajouté par un membre, à vérifier."));
  if (!tel && !x.mail && !x.web) c.appendChild(el("div", "mu", "Pas de contact public : en cas de besoin, le 117 alerte cette section."));
  return c;
}
function renderSc() {
  var pos = pnPos(), S = SISL.slice().sort(function (a, b) { return km(pos.lat, pos.lon, a.la, a.lo) - km(pos.lat, pos.lon, b.la, b.lo); });
  $("scWhere").textContent = gp ? "Depuis votre position GPS." : "Depuis " + pos.nom + ". Utilisez le GPS ou choisissez une autre zone plus haut.";
  var N = $("scNear"); N.textContent = ""; S.slice(0, 3).forEach(function (x, i) { N.appendChild(scCard(x, pos, i === 0)); });
  var L = $("scAll"); L.textContent = ""; S.slice(3).forEach(function (x) { L.appendChild(scCard(x, pos, false)); });
  var M = $("scList"); M.textContent = "";
  SC.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom); }).forEach(function (s) { var d = el("div"); d.appendChild(document.createTextNode(s.nom + " : ")); var a = el("a", 0, s.tel); a.href = telHref(s.tel); a.style.color = "var(--ac)"; d.appendChild(a); M.appendChild(d); });
  if (!M.firstChild) M.appendChild(el("div", "mu", "Aucun numéro ajouté par les membres pour l’instant."));
}
$("scAllBtn").onclick = function () { var L = $("scAll"); L.hidden = !L.hidden; this.textContent = L.hidden ? "Voir les 34 sections" : "Masquer les autres sections"; };
$("scSave").onclick = function () {
  pnMsg(); if (!memberOk($("pnMsg"), "Pour ajouter un numéro de sauvetage, créez votre compte gratuit.")) return;
  var n = $("scName").value.trim(), t = $("scTel").value.trim();
  if (!n || !/^[+0-9 ().\/-]{7,20}$/.test(t)) { pnMsg("Section et numéro valide requis."); return; }
  /* seul l'admin enregistre un numéro ; un membre le propose, l'admin vérifie */
  if (!isAdmin) { sb.from("signalements").insert({ quoi: "sauvetage", ref: (n.slice(0, 40) + " : " + t) }).then(function (r) { if (r.error) pnMsg("Envoi impossible. Réessayez."); else { $("scTel").value = ""; pnMsg("Merci ! Le numéro sera vérifié avant d'être ajouté."); } }); return; }
  sb.from("sauvetages").upsert({ nom: n.slice(0, 40), tel: t, maj: nowIso() }).then(function (r) { if (r.error) pnMsg("Enregistrement refusé."); else { $("scTel").value = ""; load("sauvetages"); } });
};

/* ================= LE PONTON ================= */
var rgp = null, rman = null, sel = null, lastPush = 0, openWith = ls("nc-open") || null, FR = [], watchId = null;
var SHARE_MS = 2 * 36e5; /* pavillon, partage amis et position placée à la main : 2 h */
try { var mm = JSON.parse(ls("nc-man") || "null"); if (mm && typeof mm.lat === "number" && mm.t && Date.now() - mm.t < SHARE_MS) rman = mm; else ls("nc-man", ""); } catch (e) {}
/* le partage ne marche que sur le Léman et ses rives (contrôlé aussi par le serveur) */
function nearLeman(p) { return p && p.lat >= 46.17 && p.lat <= 46.57 && p.lon >= 6.09 && p.lon <= 6.98; }
var FAR_MSG = "Vous êtes trop loin du lac : le partage de position fonctionne seulement sur le Léman et ses rives.";
/* durée du partage avec les amis : 2 h, 4 h ou sans limite (-1) */
function frDur() { var v = +ls("nc-fr-dur"); if (!isPremium() && (v === -1 || v > SHARE_MS)) v = SHARE_MS; return v === -1 ? -1 : (v > 0 ? v : SHARE_MS); }
function frPour() { try { var a = JSON.parse(ls("nc-fr-pour") || "null"); return Array.isArray(a) ? a : null; } catch (e) { return null; } }
/* coupe le pavillon et/ou le partage amis (expiration, hors du lac) */
function shareOff(open, fr, msg) {
  if (open && $("rnOpen").checked) { $("rnOpen").checked = false; ls("nc-isopen", "0"); if (uid) sb.from("ouverts").delete().eq("id", uid).then(function () { load("ouverts"); }); }
  if (fr && $("rnFr").checked) { $("rnFr").checked = false; ls("nc-isfr", "0"); if (uid) sb.from("amis").delete().eq("auteur", uid).then(function () {}); }
  if (msg) rErr(msg); stat(); frPick();
}
function shareExpire() {
  var n = Date.now(), fd = frDur(), o = $("rnOpen").checked && n - (+ls("nc-open-t") || 0) > SHARE_MS, f = $("rnFr").checked && fd > 0 && n - (+ls("nc-fr-t") || 0) > fd;
  if (rman && rman.t && n - rman.t > SHARE_MS && !rgp) { rman = null; ls("nc-man", ""); }
  if (o || f) shareOff(o, f, (o && f ? "Pavillon amené et partage avec vos amis arrêté" : o ? "Pavillon amené" : "Partage avec vos amis arrêté") + " automatiquement" + (o ? " après 2 h" : "") + ". Réactivez-le si vous êtes encore sur l'eau.");
}
function rPos() { return rgp || rman; }
function rErr(t) { $("rnErr").textContent = t || ""; }
$("rnCode").value = ls("nc-code"); $("rnMsgTxt").value = ls("nc-msg");
$("rnOpen").checked = ls("nc-isopen") === "1"; $("rnFr").checked = ls("nc-isfr") === "1"; setTimeout(shareExpire, 4000);
function openOthers() { return openNow().filter(function (x) { return x.id !== uid; }); }
function stat() { var o = $("rnOpen").checked, f = $("rnFr").checked, b = $("rnStt"); b.className = "stt" + (o || f ? " on" : ""); b.textContent = o && f ? "Pavillon hissé · amis et membres" : o ? "Pavillon hissé · visible par les membres (position arrondie)" : f ? "Position partagée avec mes amis uniquement" : "Pavillon baissé : votre position n'est pas partagée"; }
function code() { return "amitie"; }
function rel(id) { for (var i = 0; i < FS.length; i++) { var f = FS[i]; if ((f.de === uid && f.a === id) || (f.a === uid && f.de === id)) return f.statut === "ok" ? "ami" : f.de === uid ? "envoye" : "recu"; } return ""; }
function friendIds() { return FS.filter(function (f) { return f.statut === "ok"; }).map(function (f) { return f.de === uid ? f.a : f.de; }); }
function pendingIn() { return FS.filter(function (f) { return f.statut === "attente" && f.a === uid; }).map(function (f) { return f.de; }); }
function push() {
  var p = rPos(); if (!p || !uid || !me()) return;
  shareExpire();
  if (!nearLeman(p)) { if ($("rnOpen").checked || $("rnFr").checked) shareOff(true, true, FAR_MSG); return; }
  if ($("rnOpen").checked) sb.from("ouverts").upsert({ id: uid, msg: $("rnMsgTxt").value.trim().slice(0, 60), lat: Math.round(p.lat * 100) / 100, lon: Math.round(p.lon * 100) / 100, maj: nowIso() }).then(function (r) { if (r.error) rErr("Partage refusé."); else load("ouverts"); });
  var c = code(); if ($("rnFr").checked) sb.from("amis").upsert({ code: c, auteur: uid, lat: p.lat, lon: p.lon, maj: nowIso(), pour: frPour() }, { onConflict: "code,auteur" }).then(function () { loadFriends(); });
}
function loadFriends() { if (!real()) { FR = []; return; } sb.rpc("positions_amis").then(function (r) { FR = (r.data || []).filter(function (x) { return x.auteur !== uid; }); if (cur() === "ponton") renderPonton(); }); }
setInterval(function () { if (!document.hidden) shareExpire(); if (cur() === "ponton" && !document.hidden) { loadFriends(); if (Date.now() - lastPush > 5 * 60000) { lastPush = Date.now(); push(); } } }, 30000);
$("rnOpen").onchange = function () {
  rErr(); if (!requireProfile()) { this.checked = false; return; }
  ls("nc-isopen", this.checked ? "1" : "0"); if (this.checked) ls("nc-open-t", String(Date.now()));
  if (this.checked) { if (!rPos()) rErr("Localisez-vous (GPS) ou touchez la carte."); push(); } else sb.from("ouverts").delete().eq("id", uid).then(function () { load("ouverts"); });
  stat();
};
$("rnFr").onchange = function () {
  rErr(); if (!requireProfile()) { this.checked = false; return; }
  var c = code(); ls("nc-code", c);
  ls("nc-isfr", this.checked ? "1" : "0"); if (this.checked) ls("nc-fr-t", String(Date.now()));
  if (this.checked) { if (!friendIds().length) rErr("Ajoutez d'abord des amis (recherche ci-dessus)."); if (!rPos()) rErr("Localisez-vous (GPS) ou touchez la carte."); push(); }
  else sb.from("amis").delete().eq("auteur", uid).then(function () { FR = []; renderPonton(); });
  stat(); frPick();
};
/* choisir les amis qui voient ma position (tous par défaut) */
function frPick() {
  var B = $("rnFrPick"); if (!B) return; B.textContent = "";
  var ids = friendIds().filter(function (id) { return P[id]; });
  B.hidden = !$("rnFr").checked || !ids.length; if (B.hidden) return;
  var sel0 = frPour(), on = function (id) { return !sel0 || sel0.indexOf(id) >= 0; };
  var dl = el("label", "l", "Durée du partage"), ds = el("select", "f"); ds.setAttribute("aria-label", "Durée du partage");
  [[SHARE_MS, "2 heures"], [2 * SHARE_MS, "4 heures"], [-1, "Jusqu'à ce que je l'arrête"]].forEach(function (x) { var op = el("option", 0, x[1]); op.value = String(x[0]); ds.appendChild(op); });
  ds.value = String(frDur()); ds.onchange = function () { ls("nc-fr-dur", this.value); ls("nc-fr-t", String(Date.now())); rErr(this.value === "-1" ? "Partage sans limite : pensez à le couper en rentrant au port." : ""); };
  B.appendChild(dl); B.appendChild(ds);
  B.appendChild(el("div", "mu", "Visible par :"));
  ids.sort(function (a, b) { return norm(P[a].pseudo).localeCompare(norm(P[b].pseudo)); }).forEach(function (id) {
    var l = el("label", "chk"), c = el("input"); c.type = "checkbox"; c.checked = on(id);
    c.onchange = function () {
      var cur1 = ids.filter(function (k) { return k === id ? c.checked : on(k); });
      sel0 = cur1.length === ids.length ? null : cur1; ls("nc-fr-pour", sel0 ? JSON.stringify(sel0) : "");
      if (!cur1.length) rErr("Aucun ami coché : personne ne voit votre position."); else rErr("");
      push();
    };
    l.appendChild(c); l.appendChild(document.createTextNode(" " + P[id].pseudo)); B.appendChild(l);
  });
};
/* ---- trouver des plaisanciers & amis ---- */
function befriend(id) {
  var r = rel(id);
  var q = r === "recu" ? sb.from("amities").update({ statut: "ok" }).eq("de", id).eq("a", uid)
    : r ? sb.from("amities").delete().or("and(de.eq." + uid + ",a.eq." + id + "),and(de.eq." + id + ",a.eq." + uid + ")")
    : sb.from("amities").insert({ a: id });
  q.then(function (x) { if (x.error) { toast("Action impossible. Réessayez."); return; } toast(r === "recu" ? "Vous êtes maintenant amis" : r ? "Retiré" : "Demande d'ami envoyée"); load("amities").then(loadFriends); });
}
function memberCard(id, extra) {
  var pr = P[id] || {}, c = el("div", "card mcard"), r = rel(id); c.appendChild(badge(id));
  var info = [pr.type, pr.port ? pr.port : ""].filter(Boolean).join(" · "); if (info) c.appendChild(el("div", "mu", info));
  var bw = badgeRow(id); if (bw) c.appendChild(bw);
  if (extra) c.appendChild(extra);
  var row = el("div", "row"); row.style.marginTop = "8px";
  var w = el("button", "btn sm", "Écrire"); w.onclick = function () { openThread(id); }; row.appendChild(w);
  if (r === "recu") { var ok = el("button", "btn sm", "Accepter"); ok.onclick = function () { befriend(id); }; row.appendChild(ok); var no = el("button", "btn g sm", "Refuser"); no.onclick = function () { sb.from("amities").delete().eq("de", id).eq("a", uid).then(function () { load("amities"); }); }; row.appendChild(no); }
  else { var f = el("button", "btn g sm", r === "ami" ? "✓ Ami · retirer" : r === "envoye" ? "Demande envoyée · annuler" : "Ajouter en ami"); f.onclick = function () { befriend(id); }; row.appendChild(f); }
  c.appendChild(row); return c;
}
var mbQ = "";
$("mbSearch").oninput = function () { mbQ = this.value; renderMembers(); };
var mbF = "tous", mbMore = false;
/* amis d'amis : visibles via la table amities quand elle est lisible */
function fof(f, id) { return FS.some(function (x) { return x.statut === "ok" && ((x.de === f && x.a === id) || (x.a === f && x.de === id)); }); }
function onWater(id) { return openNow().some(function (x) { return x.id === id; }); }
function memberRow(id) {
  var pr = P[id] || {}, r = rel(id), it = el("button", "wa-it");
  it.appendChild(avatar(id));
  var mid = el("span", "wa-im"); mid.appendChild(el("b", 0, pr.pseudo + (pr.bateau ? " · " + pr.bateau : "")));
  var sub = el("span", "wa-pv", [pr.type, pr.port].filter(Boolean).join(" · ") || "Membre Nauticonnect"); mid.appendChild(sub); it.appendChild(mid);
  var rt = el("span", "wa-ir");
  if (isBl(id)) { rt.appendChild(el("span", "wa-tag", "Bloqué")); it.appendChild(rt); it.onclick = function () { openThread(id); }; return it; }
  if (onWater(id)) rt.appendChild(el("span", "wa-tag on", "Sur l'eau"));
  var fb = el("span", "wa-add" + (r === "ami" || r === "envoye" ? " done" : ""), r === "ami" ? "Ami ✓" : r === "envoye" ? "Demande envoyée" : r === "recu" ? "Accepter" : "Ajouter en ami");
  if (!r || r === "recu") fb.onclick = function (e) { e.stopPropagation(); fb.textContent = "…"; befriend(id); };
  rt.appendChild(fb);
  it.appendChild(rt); it.onclick = function () { openThread(id); }; return it;
}
function renderMembers() {
  var L = $("mbList"); L.textContent = ""; var q = norm(mbQ.trim()), my = me() || {}, words = q.split(/\s+/).filter(Boolean);
  var ids = Object.keys(P).filter(function (id) { return id !== uid && P[id] && P[id].pseudo; });
  var hay = function (id) { var p = P[id]; return norm([p.pseudo, p.bateau, p.port, p.type, p.immat].join(" ")); };
  var res = ids;
  if (words.length) res = res.filter(function (id) { var h = hay(id); return words.every(function (w) { return h.indexOf(w) >= 0; }); });
  else if (mbF === "port") res = res.filter(function (id) { return my.port && P[id].port === my.port; });
  else if (mbF === "eau") res = res.filter(onWater);
  else if (mbF === "amis") res = res.filter(function (id) { return rel(id) === "ami"; });
  var score = function (id) { var p = P[id], sc = 0; if (words.length && norm(p.pseudo).indexOf(words[0]) === 0) sc += 8; if (onWater(id)) sc += 4; if (rel(id) === "ami") sc += 2; if (my.port && p.port === my.port) sc += 1; return sc; };
  res.sort(function (a, b) { return score(b) - score(a) || norm(P[a].pseudo).localeCompare(norm(P[b].pseudo)); });
  var C = $("mbChips"); C.hidden = !!words.length;
  Array.prototype.forEach.call(C.querySelectorAll("button"), function (b) { b.classList.toggle("on", b.dataset.f === mbF); });
  $("mbHead").textContent = words.length ? (res.length ? res.length + " résultat" + (res.length > 1 ? "s" : "") : "") : "Tous les membres (" + Object.keys(P).length + ")"; foldUI();
  $("mbHint").textContent = words.length && !res.length ? "Aucun plaisancier trouvé. Essayez un prénom, un bateau ou un port (ex. « bouveret », « voilier »)."
    : !words.length && !res.length ? (mbF === "port" ? (my.port ? "Personne d'autre à " + my.port + " pour l'instant." : "Indiquez votre port d'attache dans votre profil.") : mbF === "eau" ? "Personne n'a hissé le pavillon en ce moment." : "Pas encore d'autres membres.") : "";
  var max = mbMore || words.length ? 60 : 15;
  res.slice(0, max).forEach(function (id) { L.appendChild(memberRow(id)); });
  if (res.length > max) { var m = el("button", "linkb", "Voir les " + res.length + " membres"); m.onclick = function () { mbMore = true; renderMembers(); }; L.appendChild(m); }
  $("amHome").hidden = !!words.length;
  var S = $("mbSug"); S.textContent = "";
  var sug = words.length ? [] : ids.filter(function (id) { return !rel(id) && ((my.port && P[id].port === my.port) || onWater(id) || friendIds().some(function (f) { return fof(f, id); })); }).slice(0, 10);
  sug.forEach(function (id) { var pr = P[id], c = el("div", "sg"), a = avatar(id); c.appendChild(a); c.appendChild(el("b", 0, pr.pseudo)); c.appendChild(el("span", "mu", my.port && pr.port === my.port ? "Même port" : onWater(id) ? "Sur l'eau" : "Ami d'un ami"));
    var b = el("button", "btn sm", "Ajouter en ami"); b.onclick = function () { b.disabled = true; b.textContent = "Demande envoyée"; befriend(id); }; c.appendChild(b); c.onclick = function (e) { if (e.target !== b) openThread(id); }; S.appendChild(c); });
  $("mbSugH").hidden = !sug.length;
}
Array.prototype.forEach.call(document.querySelectorAll("#mbChips button"), function (b) { b.onclick = function () { mbF = b.dataset.f; mbMore = false; renderMembers(); }; });
$("rnMsgTxt").onchange = function () { ls("nc-msg", this.value.trim()); push(); };
$("rnGps").onclick = function () {
  rErr(); if (!navigator.geolocation) { rErr("GPS indisponible : touchez la carte pour vous placer."); return; }
  if (watchId != null) return;
  watchId = navigator.geolocation.watchPosition(function (p) { rgp = { lat: p.coords.latitude, lon: p.coords.longitude }; $("rnGps").textContent = "Position GPS active"; if (Date.now() - lastPush > 20000) { lastPush = Date.now(); push(); } renderPonton(); },
    function () { watchId = null; rErr("GPS refusé ou indisponible : touchez la carte pour vous placer."); }, { enableHighAccuracy: true });
};
$("rnMap").onclick = function (e) { if (rgp) return; rman = svgPoint(this, e); rman.t = Date.now(); ls("nc-man", JSON.stringify(rman)); push(); renderPonton(); };
function drawRnMap() {
  var s = $("rnMap"), mk = baseMap(s, true);
  function pt(x, fill, lab, onc) { var cx2 = X(x.lon), cy2 = Y(x.lat); mk("circle", { cx: cx2, cy: cy2, r: 9 }, "fill:" + fill + ";stroke:#fff;stroke-width:3");
    if (lab) { var t = mk("text", { x: cx2, y: cy2 - 14, "text-anchor": cx2 > 520 ? "end" : "middle", "font-size": 16 }, "fill:var(--tx)"); t.textContent = lab; }
    if (onc) { var h = mk("circle", { cx: cx2, cy: cy2, r: 16 }, "fill:transparent;cursor:pointer"); h.onclick = function (e) { e.stopPropagation(); onc(); }; } }
  openOthers().forEach(function (x) { pt(x, "var(--or)", sel === x.id ? nameOf(x.id) : null, function () { sel = x.id; renderPonton(); }); });
  FR.forEach(function (x) { pt(x, "var(--ok)", (P[x.auteur] && P[x.auteur].pseudo) || "Ami"); });
  var p = rPos(); if (p) pt(p, "#2d7ff9", null);
}
function personCard(id, x) {
  var p = rPos(), c = el("div", "card"), pr = P[id] || {}; c.appendChild(badge(id));
  var info = [pr.type, pr.port ? "port d'attache : " + pr.port : ""].filter(Boolean).join(" · "); if (info) c.appendChild(el("div", "mu", info));
  if (x && x.msg) c.appendChild(el("div", 0, "« " + x.msg + " »"));
  if (x) c.appendChild(el("div", "mu", (p ? km(p.lat, p.lon, x.lat, x.lon).toFixed(1) + " km · " : "") + "position arrondie · " + ago(x.maj)));
  var b = el("button", "btn sm", "Écrire"); b.onclick = function () { openThread(id); }; c.appendChild(b); return c;
}
var PRESETS = ["Salut !", "Un apéro au port ?", "On se retrouve au port ?", "Besoin d'aide ?"];
var NCOL = ["#d9534f", "#0b6fa4", "#1f8a5b", "#b4521c", "#7a3fb0", "#b8860b", "#c2185b", "#00838f"];
function ncol(id) { var h = 0; for (var i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return NCOL[h % NCOL.length]; }
function hhmm(v) { var d = new Date(ts(v)); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
function dayKey(v) { var d = new Date(ts(v)); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
function dayLabel(v) { var d = new Date(ts(v)), n = new Date(); if (dayKey(d) === dayKey(n)) return "Aujourd'hui"; n.setDate(n.getDate() - 1); if (dayKey(d) === dayKey(n)) return "Hier"; return d.toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long" }); }
function listTime(v) { var d = new Date(ts(v)), n = new Date(); if (dayKey(d) === dayKey(n)) return hhmm(v); n.setDate(n.getDate() - 1); if (dayKey(d) === dayKey(n)) return "Hier"; return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2); }
function avatar(id) { var a = el("span", "wa-av", initial(id)); a.style.backgroundColor = ncol(id); return zoomable(putPhoto(a, id), id); }
/* lu / non lu par discussion */
/* téléphone neuf, appli réinstallée ou données effacées : rien n'est mémorisé, on part de « tout lu » au lieu d'afficher tout l'historique en non lu */
if (!ls("nc-seen") && !ls("nc-seenmap") && !ls("nc-slseen")) { ls("nc-seen", String(Date.now())); ls("nc-slseen", String(Date.now())); }
function seenMap() { try { return JSON.parse(ls("nc-seenmap") || "{}"); } catch (e) { return {}; } }
function seenOf(id) { var m = seenMap(); return m[id] || +ls("nc-seen") || 0; }
function markThread(id) { var m = seenMap(); m[id] = Date.now(); ls("nc-seenmap", JSON.stringify(m)); }
function markRead() { if (openWith) markThread(openWith); }
function threads() { var T = {}, C = {}; M.forEach(function (m) { var o = m.de === uid ? m.a : m.a === uid ? m.de : null; if (!o || isBl(o)) return; if (C[o] == null) C[o] = +ls("nc-clr-" + o) || 0; if (ts(m.t) <= C[o]) return; (T[o] = T[o] || []).push(m); }); return T; }
function unreadOf(id, list) { var s = seenOf(id); return (list || []).filter(function (m) { return m.de === id && ts(m.t) > s; }).length; }
function unread() { if (!uid) return 0; var T = threads(), n = 0; Object.keys(T).forEach(function (k) { if (!(cur() === "ponton" && waTab === "prive" && k === openWith)) n += unreadOf(k, T[k]); }); return n; }
function slUnread() { var s = +ls("nc-slseen") || 0; return SL.filter(function (m) { return m.de !== uid && !isBl(m.de) && ts(m.t) > s; }).length; }
/* onglets */
var waTab = ls("nc-watab") || "salon"; openWith = null; ls("nc-open", ""); if (["salon", "prive", "amis", "eau"].indexOf(waTab) < 0) waTab = "salon";
Array.prototype.forEach.call(document.querySelectorAll(".wa-tabs button"), function (b) { b.onclick = function () { waTab = b.dataset.t; ls("nc-watab", waTab); openWith = null; ls("nc-open", ""); renderPonton(); if (waTab === "salon") slBottom(true); }; });
function openThread(id, txt) {
  if (!id || id === uid) return;
  openWith = id; ls("nc-open", id); waTab = "prive"; ls("nc-watab", "prive");
  if (cur() !== "ponton") location.hash = "ponton"; else renderPonton();
  setTimeout(function () { pvBottom(true); var i = $("pvIn"); if (txt) i.value = txt; if (me()) i.focus(); }, 150);
}
$("pvBack").onclick = function () { setReply("prive", null); openWith = null; ls("nc-open", ""); renderPonton(); };
/* rendu des bulles, commun au salon et au privé */
/* bandeaux jaunes en bas du salon : qui a hissé le pavillon, près de quel port */
function nearPort(lat, lon) { var best = null, bd = 1e9; Z.forEach(function (z) { var d = km(lat, lon, z[1], z[2]); if (d < bd) { bd = d; best = z[0]; } }); return best ? best.replace(/\s*\((F|CH)\)\s*$/, "") : "le lac"; }
function soBanners(box) {
  if (!SORTIES_ON) return; var lim = Date.now() - 2 * 864e5;
  soUp().filter(function (x) { return ts(x.t) > lim && x.auteur !== uid && P[x.auteur] && !isBl(x.auteur); }).slice(0, 2).forEach(function (x) {
    var b = el("button", "wa-pav wa-so"); b.type = "button"; b.appendChild(el("i", 0, ""));
    var t = el("span"); t.appendChild(el("b", 0, P[x.auteur].pseudo)); t.appendChild(document.createTextNode(" propose " + (x.places ? x.places + " place" + (x.places > 1 ? "s" : "") : "des places") + " à bord · " + dFr(x.jour) + " · départ " + x.depart));
    t.appendChild(el("em", 0, x.titre)); t.appendChild(el("small", 0, "Touchez pour demander une place")); b.appendChild(t);
    b.onclick = function () { location.hash = "sorties"; }; box.appendChild(b);
  });
}
function pavBanners(box) {
  soBanners(box); ckBanners(box);
  openOthers().filter(function (x) { return P[x.id] && !isBl(x.id); }).sort(function (a, b) { return ts(b.maj) - ts(a.maj); }).slice(0, 3).forEach(function (x) {
    var b = el("button", "wa-pav"); b.type = "button";
    b.appendChild(el("i", 0, "")); var t = el("span"); t.appendChild(el("b", 0, P[x.id].pseudo)); t.appendChild(document.createTextNode(" a hissé le pavillon près de " + nearPort(x.lat, x.lon)));
    if (x.msg) t.appendChild(el("em", 0, "« " + x.msg + " »")); t.appendChild(el("small", 0, ago(x.maj))); b.appendChild(t);
    b.onclick = function () { var tb = document.querySelector('.wa-tabs button[data-t="eau"]'); if (tb) tb.click(); window.scrollTo(0, 0); };
    box.appendChild(b);
  });
}
function drawBubbles(box, list, group) {
  var atBottom = box.dataset.n !== String(list.length) ? null : true;
  box.textContent = ""; var lastDay = "", lastDe = "", lastT = 0;
  if (group) box.appendChild(pinBlock());
  if (!list.length) { box.appendChild(el("div", "wa-empty", group ? "Le salon est calme. Lancez la conversation !" : "Dites bonjour !")); }
  list.forEach(function (m) {
    var dk = dayKey(m.t); if (dk !== lastDay) { box.appendChild(el("div", "wa-day", dayLabel(m.t))); lastDay = dk; lastDe = ""; }
    var mine = m.de === uid, cont = m.de === lastDe && ts(m.t) - lastT < 5 * 6e4;
    var row = el("div", "wa-row " + (mine ? "out" : "in") + (cont ? " cont" : "") + (isSel(m, group) ? " sel" : "")); row.id = (group ? "sl-" : "pm-") + m.id;
    if (group && !mine) { var av = avatar(m.de); if (cont) av.style.visibility = "hidden"; else if (P[m.de] && !photoOf(m.de)) { av.style.cursor = "pointer"; av.onclick = function () { openThread(m.de); }; } row.appendChild(av); }
    var b = el("div", "wa-b");
    if (group && !mine && !cont) { var nm = el("b", "wa-nm", (P[m.de] && P[m.de].pseudo) || "Plaisancier"); nm.style.color = ncol(m.de); var pr = P[m.de]; if (pr && subOf(pr)) nm.appendChild(el("span", 0, " · " + subOf(pr))); b.appendChild(nm); }
    if (m.reponse) { var q = list.filter(function (x) { return x.id === m.reponse; })[0]; b.appendChild(quoteBlock(q, box)); }
    if (group && m.photo) b.appendChild(photoBlock(m));
    if (m.txt) b.appendChild(mentionText(m));
    var rr = reactRow(m, group); if (rr) b.appendChild(rr);
    if (group && m.cites && m.cites.indexOf(uid) >= 0 && !mine) b.classList.add("cited");
    var meta = el("small", "wa-meta", hhmm(m.t)); if (mine && !group) meta.appendChild(el("span", "wa-tick" + (m.lu ? " lu" : ""), " ✓✓")); b.appendChild(meta);
    bindBubble(b, row, m, group, mine);
    row.appendChild(b); box.appendChild(row); lastDe = m.de; lastT = ts(m.t);
  });
  box.dataset.n = String(list.length);
}
function nearBottom() { return window.innerHeight + window.scrollY >= document.body.scrollHeight - 160; }
function slBottom(force) { if (force || nearBottom()) setTimeout(function () { window.scrollTo(0, document.body.scrollHeight); }, 30); }
var pvBottom = slBottom;
/* envoi */
var sending = false;
function sendMsg(to, txt) {
  txt = (txt || "").trim().slice(0, 200); if (!txt || sending || !uid) return; sending = true;
  sb.from("messages").insert({ a: to, txt: txt, reponse: replyTo.prive && replyTo.prive.de !== undefined ? replyTo.prive.id : null }).then(function (r) { if (r.error) toast("Message non envoyé."); else { setReply("prive", null); openWith = to; markThread(to); load("messages").then(function () { pvBottom(true); }); } }).then(function () { sending = false; });
}
$("pvBar").onsubmit = function (e) { e.preventDefault(); var i = $("pvIn"), v = i.value; if (!openWith || !v.trim()) return; i.value = ""; sendMsg(openWith, v); };
$("slBar").onsubmit = function (e) {
  e.preventDefault(); var i = $("slIn"), v = i.value.trim().slice(0, 300); if (!v || sending) return; sending = true;
  sb.from("salon").insert({ txt: v, cites: citesOf(v), tous: isTous(v), reponse: replyTo.salon ? replyTo.salon.id : null }).then(function (r) {
    sending = false;
    if (r.error) { toast(/rapide/.test(r.error.message || "") ? "Doucement, un message toutes les 3 secondes." : "Message non envoyé."); return; }
    i.value = ""; slTags = {}; setReply("salon", null); $("slSug").hidden = true; load("salon").then(function () { slBottom(true); });
  });
};
/* répondre à un message */
var replyTo = { salon: null, prive: null };
function snippet(m) { return m ? (m.txt ? m.txt.slice(0, 90) : m.photo ? "Photo" : "") : "Message supprimé"; }
function quoteBlock(q, box) {
  var d = el("div", "wa-q"); if (q) d.style.borderLeftColor = ncol(q.de);
  var n = el("b", 0, q ? (q.de === uid ? "Vous" : (P[q.de] && P[q.de].pseudo) || "Plaisancier") : ""); if (q) n.style.color = ncol(q.de); d.appendChild(n);
  d.appendChild(el("span", 0, snippet(q)));
  if (q) d.onclick = function (e) { e.stopPropagation(); var r = box.querySelector("#" + (box.id === "slMsgs" ? "sl-" : "pm-") + q.id); if (r) { r.scrollIntoView({ behavior: "smooth", block: "center" }); r.classList.add("flash"); setTimeout(function () { r.classList.remove("flash"); }, 1200); } };
  return d;
}
function setReply(kind, m) {
  replyTo[kind] = m; var R = $(kind === "salon" ? "slRe" : "pvRe"); R.textContent = "";
  if (!m) { R.hidden = true; return; }
  var q = quoteBlock(m, $(kind === "salon" ? "slMsgs" : "pvMsgs")); R.appendChild(q);
  var x = el("button", "wa-rex", "✕"); x.type = "button"; x.setAttribute("aria-label", "Annuler la réponse"); x.onclick = function () { setReply(kind, null); }; R.appendChild(x);
  R.hidden = false; var i = $(kind === "salon" ? "slIn" : "pvIn");
  i.focus();
}
function bubbleMenu(b, m, group, mine) {
  var old = document.querySelector(".wa-menu"); if (old) { var was = old.parentNode === b; old.remove(); if (was) return; }
  if (!me()) return;
  var M = el("div", "wa-menu"), add = function (t, f, cls) { var x = el("button", cls || 0, t); x.type = "button"; x.onclick = function (e) { e.stopPropagation(); M.remove(); f(); }; M.appendChild(x); };
  add("Répondre", function () { setReply(group ? "salon" : "prive", m); });
  var mr = myReact(m, group), eb = el("div", "wa-emo"); EMO.forEach(function (e) { var x = el("button", e === mr ? "on" : 0, e); x.type = "button"; x.setAttribute("aria-label", "Réagir " + e); x.onclick = function (ev) { ev.stopPropagation(); M.remove(); react(m, group, e); }; eb.appendChild(x); }); M.appendChild(eb);
  if (canSel(m, group)) add("Sélectionner", function () { selStart(m, group); });
  if (!group && mine) add("Supprimer", function () { delMsgs([m.id], false); }, "red");
  if (group && m.de !== uid && P[m.de]) add("Message privé", function () { openThread(m.de); });
  if (group && (mine || isAdmin)) add("Supprimer", function () { delMsgs([m.id], true); }, "red");
  if (group && !mine && real()) add("Signaler", function () { if (!confirm("Signaler ce message à l'admin ?")) return; sb.from("signalements").insert({ quoi: "salon", ref: String(m.id) }).then(function () { toast("Signalé, merci"); }); });
  if (!group && !mine && real()) add("Signaler", function () { if (!confirm("Signaler ce message à l'admin ?")) return; sb.from("signalements").insert({ quoi: "prive", ref: String(m.id) }).then(function () { toast("Signalé, merci"); }); });
  if (!mine && m.de && m.de !== uid && real()) add("Bloquer ce membre", function () { toggleBlock(m.de); }, "red");
  b.appendChild(M);
}

/* photos du salon façon Instagram */
var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3.2 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.7 0 6 3.7 4.5 7.2C19.5 16.4 12 21 12 21z"/></svg>';
/* réactions smileys : salon (table salon_likes) et privé (colonne reactions) */
var EMO = ["❤️", "👍", "😂", "😮", "⛵", "🙏"];
function likesOf(id) { return LK.filter(function (l) { return l.salon_id === id; }); }
function reactsOf(m, group) {
  if (group) return likesOf(m.id).map(function (l) { return { uid: l.uid, e: l.emoji || "❤️" }; });
  var R = m.reactions || {}, out = Object.keys(R).map(function (k) { return { uid: k, e: R[k] }; });
  (m.likes || []).forEach(function (k) { if (!R[k]) out.push({ uid: k, e: "❤️" }); });
  return out;
}
function myReact(m, group) { var r = reactsOf(m, group).filter(function (x) { return x.uid === uid; })[0]; return r ? r.e : ""; }
function react(m, group, e, force) {
  if (!me()) { toast("Créez votre profil pour réagir aux messages"); return; }
  var cur0 = myReact(m, group);
  if (force && cur0) return;
  if (group) {
    if (cur0 === e) { LK = LK.filter(function (l) { return !(l.salon_id === m.id && l.uid === uid); }); sb.from("salon_likes").delete().eq("salon_id", m.id).eq("uid", uid).then(function () {}); }
    else if (cur0) { LK.forEach(function (l) { if (l.salon_id === m.id && l.uid === uid) l.emoji = e; }); sb.from("salon_likes").update({ emoji: e }).eq("salon_id", m.id).eq("uid", uid).then(function (r) { if (r.error) { toast("Action impossible. Réessayez."); load("likes"); } }); }
    else { LK.push({ salon_id: m.id, uid: uid, emoji: e }); sb.from("salon_likes").insert({ salon_id: m.id, emoji: e }).then(function (r) { if (r.error) { toast("Action impossible. Réessayez."); load("likes"); } }); }
    renderPonton(); return;
  }
  var oldR = m.reactions, oldL = m.likes, R = Object.assign({}, m.reactions || {});
  (m.likes || []).forEach(function (k) { if (!R[k]) R[k] = "❤️"; });
  if (cur0 === e) delete R[uid]; else R[uid] = e;
  m.reactions = R; m.likes = (m.likes || []).filter(function (k) { return k !== uid; }).concat(R[uid] === "❤️" ? [uid] : []); renderPonton();
  sb.rpc("reagir_message", { mid: m.id, emo: e }).then(function (r) { if (r.error) { m.reactions = oldR; m.likes = oldL; renderPonton(); toast("Action impossible. Réessayez."); } else load("messages"); });
}
function toggleLike(m, force) { react(m, true, "❤️", force); }
function reactRow(m, group) {
  var L = reactsOf(m, group), photo = group && m.photo;
  if (!L.length && !photo) return null;
  var mine = myReact(m, group), r = el("div", "wa-like" + (photo ? "" : " sm"));
  if (photo) { var b = el("button", "wa-lk" + (mine === "❤️" ? " on" : "")); b.type = "button"; b.innerHTML = HEART; b.setAttribute("aria-label", mine === "❤️" ? "Je n'aime plus" : "J'aime"); b.onclick = function (e) { e.stopPropagation(); react(m, true, "❤️"); }; r.appendChild(b); }
  if (L.length) {
    var C = {}; L.forEach(function (x) { C[x.e] = (C[x.e] || 0) + 1; });
    var ch = el("button", "wa-rc"); ch.type = "button"; ch.setAttribute("aria-label", "Voir qui a réagi");
    EMO.forEach(function (e) { if (C[e]) { var s2 = el("span", e === mine ? "on" : 0, e + (C[e] > 1 ? " " + C[e] : "")); ch.appendChild(s2); } });
    ch.onclick = function (ev) { ev.stopPropagation(); whoReacted(L); }; r.appendChild(ch);
  }
  return r;
}
function whoReacted(L) {
  var md = modal("Réactions"), W = el("div", "wa-list");
  L.slice().sort(function (a, b) { return (b.uid === uid) - (a.uid === uid) || EMO.indexOf(a.e) - EMO.indexOf(b.e); }).forEach(function (x) {
    var it = el("div", "wa-it"); it.appendChild(avatar(x.uid)); var mid = el("span", "wa-im"); mid.appendChild(el("b", 0, x.uid === uid ? "Vous" : (P[x.uid] && P[x.uid].pseudo) || "Plaisancier")); it.appendChild(mid);
    var rt = el("span", "wa-ir"); rt.appendChild(el("span", "wa-re1", x.e)); it.appendChild(rt); W.appendChild(it);
  });
  md.bx.appendChild(W);
}
function photoBlock(m) {
  var w = el("div", "wa-ph"), im = el("img"); im.src = photoUrl(m.photo); im.alt = "Photo de " + ((P[m.de] && P[m.de].pseudo) || "un plaisancier"); im.loading = "lazy"; w.appendChild(im);
  var last = 0; w.onclick = function (e) { e.stopPropagation(); var n = Date.now();
    if (n - last < 320) { clearTimeout(w._t); var h = el("span", "wa-burst"); h.innerHTML = HEART; w.appendChild(h); setTimeout(function () { h.remove(); }, 700); toggleLike(m, true); }
    else w._t = setTimeout(function () { viewPhoto(im.src); }, 330);
    last = n; };
  return w;
}
function viewPhoto(src) {
  var o = el("div", "wa-view"), im = el("img"), x = el("button", "wa-vx", "✕"); x.type = "button"; x.setAttribute("aria-label", "Fermer la photo");
  im.src = src; o.appendChild(im); o.appendChild(x); document.body.appendChild(o);
  /* le bouton « retour » du téléphone ferme aussi la photo */
  var pushed = false; try { history.pushState({ ncView: 1 }, ""); pushed = true; } catch (e) {}
  function gone() { window.removeEventListener("popstate", gone); o.remove(); }
  window.addEventListener("popstate", gone);
  o.onclick = function () { if (pushed && history.state && history.state.ncView) history.back(); else gone(); };
}
$("slPhIn").onchange = function () {
  var f = this.files && this.files[0]; this.value = ""; if (!f || !me()) return;
  var i = $("slIn"), cap = i.value.trim().slice(0, 300), path = uid + "/salon-" + Date.now() + ".jpg"; toast("Envoi de la photo…");
  shrink(f, 1400).then(function (blob) { return sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" }); })
    .then(function (r) { if (r.error) throw r.error; return sb.from("salon").insert({ txt: cap, photo: path, cites: citesOf(cap), tous: isTous(cap), reponse: replyTo.salon ? replyTo.salon.id : null }); })
    .then(function (r) { if (r.error) throw r.error; i.value = ""; slTags = {}; load("salon").then(function () { slBottom(true); }); })
    .catch(function (e) { toast(/rapide/.test((e && e.message) || "") ? "Doucement, une publication toutes les 3 secondes." : "Envoi impossible. Réessayez."); });
};

/* @mentions dans le salon */
var slTags = {};
function tagUser(id) {
  if (!me()) return; var i = $("slIn"), ps = P[id].pseudo; slTags[ps] = id;
  var v = i.value.replace(/@([^\s@]*)$/, ""); i.value = (v && !/\s$/.test(v) ? v + " " : v) + "@" + ps + " "; $("slSug").hidden = true; i.focus();
}
function citesOf(v) { var out = []; if (replyTo.salon && replyTo.salon.de !== uid) out.push(replyTo.salon.de); Object.keys(slTags).forEach(function (ps) { if (v.indexOf("@" + ps) >= 0 && out.indexOf(slTags[ps]) < 0 && slTags[ps] !== uid) out.push(slTags[ps]); }); return out.slice(0, 5); }
/* @tous : l'admin prévient tous les membres (vérifié aussi côté serveur) */
function isTous(v) { return !!isAdmin && /(^|\s)@tous(?![\wÀ-ÿ])/i.test(v || ""); }
function mentionText(m) {
  var sp = el("span", "wa-tx"), names = m.tous ? ["tous"] : (m.cites || []).map(function (id) { return P[id] && P[id].pseudo; }).filter(Boolean);
  if (!names.length) { sp.textContent = m.txt; return sp; }
  names.sort(function (a, b) { return b.length - a.length; });
  var re = new RegExp("(" + names.map(function (n) { return "@" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", m.tous ? "gi" : "g");
  m.txt.split(re).forEach(function (part, k) { if (k % 2) { var t = el("b", "wa-at", part); sp.appendChild(t); } else if (part) sp.appendChild(document.createTextNode(part)); });
  return sp;
}
$("slIn").oninput = function () {
  var S = $("slSug"), mt = this.value.match(/@([^\s@]*)$/); S.textContent = "";
  if (!mt) { S.hidden = true; return; }
  var q = norm(mt[1]), ids = Object.keys(P).filter(function (id) { return id !== uid && P[id].pseudo && norm(P[id].pseudo).indexOf(q) === 0; }).slice(0, 6);
  if (!ids.length && q) ids = Object.keys(P).filter(function (id) { return id !== uid && P[id].pseudo && norm(P[id].pseudo).indexOf(q) >= 0; }).slice(0, 6);
  if (isAdmin && "tous".indexOf(q) === 0) { var bt = el("button", "wa-sg"); bt.type = "button"; var tt = el("span"); tt.appendChild(el("b", 0, "@tous")); tt.appendChild(el("small", 0, "Prévenir tous les membres")); bt.appendChild(tt); bt.onclick = function () { var i = $("slIn"), v = i.value.replace(/@([^\s@]*)$/, ""); i.value = (v && !/\s$/.test(v) ? v + " " : v) + "@tous "; S.hidden = true; i.focus(); }; S.appendChild(bt); }
  ids.forEach(function (id) { var b = el("button", "wa-sg"); b.type = "button"; b.appendChild(avatar(id)); var t = el("span"); t.appendChild(el("b", 0, P[id].pseudo)); if (subOf(P[id])) t.appendChild(el("small", 0, subOf(P[id]))); b.appendChild(t); b.onclick = function () { tagUser(id); }; S.appendChild(b); });
  S.hidden = !S.firstChild;
};

/* rejoindre : compte puis juste un pseudo */
function drawJoin() {
  var J = $("waJoin"); J.textContent = ""; J.classList.remove("lock");
  if (!real()) {
    J.classList.add("lock");
    J.appendChild(el("b", "lk-t", "Le Ponton est réservé aux membres"));
    var st = el("div", "lk-st"); J.appendChild(st);
    var nm = Object.keys(P).length;
    function lkStat(n, t) { var d = el("div"); d.appendChild(el("b", 0, String(n))); d.appendChild(el("span", 0, t)); st.appendChild(d); }
    if (nm) lkStat(nm, "membre" + (nm > 1 ? "s" : ""));
    if (PST) { if (PST.msg7) lkStat(PST.msg7, "message" + (PST.msg7 > 1 ? "s" : "") + " cette semaine"); } else setTimeout(loadPst, 0);
    if (openNow().length) lkStat(openNow().length, "sur l'eau");
    st.hidden = !st.firstChild;
    var ul = el("ul", "lk-ul");
    ["Discutez avec les plaisanciers du Léman", "Écrivez en privé et ajoutez des amis", "Voyez qui est sur l'eau près de vous", "Donnez-vous rendez-vous au port ou au large"].forEach(function (t) { ul.appendChild(el("li", 0, t)); });
    J.appendChild(ul);
    J.appendChild(el("div", "mu", "Un compte gratuit avec votre e-mail, puis juste un prénom. Une minute en tout."));
    var a = el("a", "btn", "Créer mon compte"); a.href = "#compte"; a.onclick = function () { try { sessionStorage.setItem("nc-ret", "ponton"); sessionStorage.setItem("nc-why", ""); } catch (e) {} }; J.appendChild(a);
    var l = el("a", "linkb", "J'ai déjà un compte"); l.href = "#compte"; l.onclick = a.onclick; J.appendChild(l);
    return;
  }
  J.appendChild(el("b", 0, "Comment vous appelle-t-on sur le Ponton ?"));
  J.appendChild(el("div", "mu", "Votre prénom ou un pseudo. Le reste de votre fiche (bateau, port) peut attendre."));
  var f = el("form", "wa-jf"), i = el("input", "f"); i.maxLength = 24; i.placeholder = "ex. Julien"; i.setAttribute("aria-label", "Prénom ou pseudo");
  var b = el("button", "btn", "Entrer"); f.appendChild(i); f.appendChild(b); J.appendChild(f);
  var m = el("div", "err"); J.appendChild(m);
  f.onsubmit = function (e) {
    e.preventDefault(); var ps = i.value.trim().slice(0, 24); if (ps.length < 2) { m.textContent = "Au moins 2 lettres."; return; }
    b.disabled = true; var d = { id: uid, pseudo: ps, maj: nowIso() };
    sb.from("profils").upsert(d).then(function (r) { b.disabled = false; if (r.error) { m.textContent = "Enregistrement impossible, réessayez."; return; } P[uid] = Object.assign({}, P[uid], d); toast("Bienvenue à bord, " + ps + " !"); renderAll(); slBottom(true); });
  };
}
function renderThreads() {
  var W = $("rnThreads"); W.textContent = ""; var T = threads();
  var nb0 = el("button", "btn sm wa-newmsg", "✏️ Nouveau message"); nb0.type = "button"; nb0.style.margin = "4px 0 10px"; nb0.onclick = newMsgPicker; W.appendChild(nb0);
  var keys = Object.keys(T).sort(function (a, b) { var ua = unreadOf(a, T[a]) ? 1 : 0, ub = unreadOf(b, T[b]) ? 1 : 0; return ub - ua || ts(T[b][T[b].length - 1].t) - ts(T[a][T[a].length - 1].t); });
  if (!keys.length) { W.appendChild(el("p", "mu wa-empty", "Pas encore de discussion privée. Touchez « Nouveau message » pour écrire à un membre.")); return; }
  keys.forEach(function (k) {
    var L = T[k], last = L[L.length - 1], n = unreadOf(k, L), it = el("button", "wa-it" + (n ? " unr" : ""));
    it.appendChild(avatar(k));
    var mid = el("span", "wa-im"), nb = el("b", 0, nameOf(k)); if (n) nb.appendChild(el("span", "wa-new", n > 1 ? n + " nouveaux" : "Nouveau")); mid.appendChild(nb); mid.appendChild(el("span", "wa-pv", (last.de === uid ? "Vous : " : "") + last.txt)); it.appendChild(mid);
    var rt = el("span", "wa-ir"); rt.appendChild(el("small", 0, listTime(last.t))); if (n) rt.appendChild(el("span", "wa-n", String(n))); it.appendChild(rt);
    it.onclick = function () { openThread(k); }; W.appendChild(it);
  });
}
/* choisir un membre pour lancer une discussion privée */
function newMsgPicker() {
  var md = modal("Nouveau message"), bx = md.bx;
  var q = el("input", "f"); q.type = "search"; q.placeholder = "Prénom, bateau ou port"; q.setAttribute("aria-label", "Chercher un membre"); q.style.cssText = "width:100%;margin:6px 0 10px"; bx.appendChild(q);
  var L = el("div", "wa-list"); L.style.cssText = "max-height:60vh;overflow-y:auto"; bx.appendChild(L);
  var ids = Object.keys(P).filter(function (id) { return id !== uid && P[id] && P[id].pseudo && !isBl(id); });
  ids.sort(function (a, b) { var fa = rel(a) === "ami" ? 1 : 0, fb = rel(b) === "ami" ? 1 : 0; return fb - fa || norm(P[a].pseudo).localeCompare(norm(P[b].pseudo)); });
  function draw() {
    L.textContent = ""; var w = norm(q.value.trim()).split(/\s+/).filter(Boolean);
    var res = ids.filter(function (id) { var p = P[id], h = norm([p.pseudo, p.bateau, p.type, p.port].join(" ")); return w.every(function (x) { return h.indexOf(x) >= 0; }); });
    if (!res.length) { L.appendChild(el("p", "mu", w.length ? "Aucun membre trouvé." : "Pas encore d'autres membres.")); return; }
    res.slice(0, 80).forEach(function (id) {
      var p = P[id], it = el("button", "wa-it"); it.type = "button"; it.appendChild(avatar(id));
      var mid = el("span", "wa-im"); mid.appendChild(el("b", 0, p.pseudo + (p.bateau ? " · " + p.bateau : ""))); mid.appendChild(el("span", "wa-pv", [rel(id) === "ami" ? "Ami" : "", p.port].filter(Boolean).join(" · ") || "Membre Nauticonnect")); it.appendChild(mid);
      it.onclick = function () { md.close(); openThread(id); }; L.appendChild(it);
    });
  }
  q.oninput = draw; draw(); setTimeout(function () { try { q.focus(); } catch (e) {} }, 50);
}
var marking = {};
function renderConv() {
  var k = openWith, L = threads()[k] || [];
  var W = $("pvWho"); W.textContent = ""; W.appendChild(avatar(k)); var t = el("span", "wa-ti"); t.appendChild(el("b", 0, (P[k] && P[k].pseudo) || "Plaisancier")); var pr = P[k] || {}; t.appendChild(el("span", 0, [pr.bateau || (NOBOAT(pr.type) ? subOf({ type: pr.type }) : ""), pr.port].filter(Boolean).join(" · ") || "Membre Nauticonnect")); W.appendChild(t);
  if (rel(k) === "ami") t.firstChild.appendChild(el("span", "wa-amitag", "Ami"));
  $("pvBar").hidden = isBl(k);
  if (isBl(k)) { $("pvMsgs").textContent = ""; $("pvMsgs").appendChild(el("div", "wa-empty", "Vous avez bloqué ce membre. Touchez ⋮ en haut à droite, puis « Débloquer ce membre » pour lui écrire à nouveau.")); $("pvPre").hidden = true; return; }
  drawBubbles($("pvMsgs"), L, false); markThread(k);
  if (L.some(function (m) { return m.de === k && !m.lu; }) && !document.hidden && !marking[k]) { marking[k] = 1; sb.rpc("marquer_lus", { autre: k }).then(function () { marking[k] = 0; L.forEach(function (m) { if (m.de === k) m.lu = m.lu || nowIso(); }); }); }
  var Pp = $("pvPre"); Pp.textContent = ""; Pp.hidden = L.length > 0; PRESETS.forEach(function (x) { var b = el("button", "wa-chip", x); b.onclick = function () { sendMsg(k, x); }; Pp.appendChild(b); });
}
/* ---- onglet Amis ---- */
function goTab(t) { selEnd(); waTab = t; ls("nc-watab", t); openWith = null; ls("nc-open", ""); renderPonton(); window.scrollTo(0, 0); }
function pendingOut() { return FS.filter(function (f) { return f.statut === "attente" && f.de === uid; }).map(function (f) { return f.a; }); }
function friendRow(id) {
  var pr = P[id] || {}, it = el("button", "wa-it"), T = threads()[id] || [], last = T[T.length - 1], p = rPos();
  it.appendChild(avatar(id));
  var mid = el("span", "wa-im"); mid.appendChild(el("b", 0, pr.pseudo + (pr.bateau ? " · " + pr.bateau : "")));
  var x = FR.filter(function (f) { return f.auteur === id; })[0];
  var info = x ? (p ? km(p.lat, p.lon, x.lat, x.lon).toFixed(1) + " km · " : "") + "position partagée " + ago(x.maj)
    : last ? (last.de === uid ? "Vous : " : "") + last.txt
    : [pr.type, pr.port].filter(Boolean).join(" · ") || "Membre Nauticonnect";
  mid.appendChild(el("span", x ? "wa-pv am-pos" : "wa-pv", info)); it.appendChild(mid);
  var rt = el("span", "wa-ir");
  if (onWater(id) || x) rt.appendChild(el("span", "wa-tag on", "Sur l'eau"));
  else if (last) rt.appendChild(el("small", 0, listTime(last.t)));
  var n = unreadOf(id, T); if (n) rt.appendChild(el("span", "wa-n", String(n)));
  it.appendChild(rt); it.onclick = function () { openThread(id); }; return it;
}
function renderAmis() {
  var ids = friendIds().filter(function (id) { return P[id]; });
  var live = function (id) { return onWater(id) || FR.some(function (f) { return f.auteur === id; }); };
  var lastT = function (id) { var T = threads()[id] || []; return T.length ? ts(T[T.length - 1].t) : 0; };
  ids.sort(function (a, b) { return lastT(b) - lastT(a) || norm(P[a].pseudo).localeCompare(norm(P[b].pseudo)); });
  var on = ids.filter(live), off = ids.filter(function (id) { return !live(id); });
  $("amSum").textContent = ids.length ? ids.length + (ids.length > 1 ? " amis" : " ami") + (on.length ? " · " + on.length + " sur l'eau" : "") : "";
  var R = $("amReq"); R.textContent = ""; pendingIn().forEach(function (id) { if (P[id]) R.appendChild(memberCard(id, el("div", "okm", "veut devenir votre ami"))); });
  $("amReqH").hidden = !R.firstChild;
  var O = $("amOn"); O.textContent = ""; on.forEach(function (id) { O.appendChild(friendRow(id)); }); $("amOnH").hidden = !on.length;
  var L = $("amList"); L.textContent = ""; off.forEach(function (id) { L.appendChild(friendRow(id)); });
  $("amAllH").textContent = (on.length ? "Mes autres amis" : "Mes amis") + (off.length ? " (" + off.length + ")" : ""); $("amAllH").hidden = !!on.length && !off.length; foldUI();
  if (!ids.length) L.appendChild(el("p", "mu", "Pas encore d'amis. Cherchez un plaisancier dans la barre en haut (prénom, bateau ou port), puis touchez « Ajouter en ami »."));
  var S = $("amSent"); S.textContent = "";
  pendingOut().forEach(function (id) { if (!P[id]) return; var r = el("div", "wa-it"); r.appendChild(avatar(id)); var m = el("span", "wa-im"); m.appendChild(el("b", 0, P[id].pseudo)); m.appendChild(el("span", "wa-pv", "En attente de réponse")); r.appendChild(m);
    var c = el("button", "btn g sm", "Annuler"); c.onclick = function () { c.disabled = true; befriend(id); }; r.appendChild(c); S.appendChild(r); });
  $("amSentH").hidden = !S.firstChild; $("amSentH").textContent = "Mes demandes en attente (" + S.children.length + ")"; foldUI();
}
var PST = null, pstBusy = false;
function loadPst() { if (!sb || pstBusy) return; pstBusy = true; sb.rpc("ponton_stats").then(function (r) { if (r.data) { PST = r.data; if (cur() === "ponton") renderPonton(); } }); }
function renderPonton() {
  var ok = !!me(), mem = real();
  /* chat réservé aux membres : les visiteurs ne voient que l'invitation */
  document.querySelector(".wa-tabs").hidden = !mem;
  if (!mem) { ["paneSalon", "panePrive", "paneAmis", "paneEau", "waNotif"].forEach(function (k) { $(k).hidden = true; }); $("waJoin").hidden = false; drawJoin(); return; }
  Array.prototype.forEach.call(document.querySelectorAll(".wa-tabs button"), function (b) { b.classList.toggle("on", b.dataset.t === waTab); });
  $("paneSalon").hidden = waTab !== "salon"; $("panePrive").hidden = waTab !== "prive"; $("paneAmis").hidden = waTab !== "amis" || !ok; $("paneEau").hidden = waTab !== "eau";
  var nm = Object.keys(P).length; $("waSub").textContent = nm ? nm + " membre" + (nm > 1 ? "s" : "") + " · " + openNow().length + " sur l'eau" : "Le chat des plaisanciers du Léman";
  $("waJoin").hidden = ok; if (!ok) drawJoin();
  $("waNotif").hidden = !(ok && pushOk && !(mySub && myAbo) && Notification.permission !== "denied");
  /* salon : membres uniquement */
  drawBubbles($("slMsgs"), SL.filter(function (m) { return !isBl(m.de); }), true); $("slBar").hidden = !ok;
  if (ok) pavBanners($("slMsgs"));
  if (waTab === "salon") { if (SL.length) ls("nc-slseen", String(ts(SL[SL.length - 1].t))); slBottom(false); }
  var su = slUnread(); $("unreadSl").hidden = !su || waTab === "salon"; $("unreadSl").textContent = su;
  /* privé */
  var conv = waTab === "prive" && ok && openWith && openWith !== uid;
  $("pvList").hidden = conv || !ok; $("pvConv").hidden = !conv;
  if (ok) { if (conv) { renderConv(); slBottom(false); } else renderThreads(); }
  var u = unread(); $("unreadRn").hidden = !u || (waTab === "prive" && !conv); $("unreadRn").textContent = u;
  var ua = ok ? pendingIn().filter(function (id) { return P[id]; }).length : 0; $("unreadAm").hidden = !ua; $("unreadAm").textContent = ua;
  if (waTab === "amis" && ok) { renderAmis(); renderMembers(); }
  /* sur l'eau */
  if (waTab === "eau") {
    if (!ok) { $("paneEau").hidden = true; return; }
    stat(); frPick(); drawRnMap();
    var D = $("rnDet"); D.textContent = ""; openOthers().forEach(function (x) { if (x.id === sel) D.appendChild(personCard(x.id, x)); });
    var Fr = $("rnFriends"); Fr.textContent = ""; var p = rPos();
    friendIds().filter(function (id) { return P[id]; }).forEach(function (id) {
      var x = FR.filter(function (f) { return f.auteur === id; })[0], ex = null;
      if (x) { ex = el("div"); ex.appendChild(el("div", "okm", (p ? km(p.lat, p.lon, x.lat, x.lon).toFixed(1) + " km · " : "") + "position partagée " + ago(x.maj)));
        var a = el("a", "btn g sm", "Itinéraire"); a.href = "https://www.google.com/maps/dir/?api=1&destination=" + x.lat + "," + x.lon; a.target = "_blank"; a.rel = "noopener"; ex.appendChild(a); }
      Fr.appendChild(memberCard(id, ex)); });
    if (!Fr.firstChild) Fr.appendChild(el("p", "mu", "Pas encore d'amis. Allez dans l'onglet Amis pour en trouver."));
    var Lo = $("rnOpenList"); Lo.textContent = ""; openOthers().sort(function (a, b) { return ts(b.maj) - ts(a.maj); }).forEach(function (x) { Lo.appendChild(personCard(x.id, x)); });
    if (!Lo.firstChild) Lo.appendChild(el("p", "mu", "Personne n'a hissé le pavillon pour l'instant."));
  }
}

/* ================= BOÎTE À IDÉES ================= */
var avType = "fix", avFilt = "tout", avBusy = false;
var AVT = { like: "J'aime", fix: "À améliorer", idea: "Idée" }, STL = { prevu: "Prévu", encours: "En cours", fait: "Fait ✓", non: "Pas retenu" };
var MODS = ["Général", "Le Ponton (chat)", "Panne / SOS", "Météo", "Webcams", "Ports", "Escales gourmandes", "À vendre · Troc", "Location", "Vitesse", "Nœuds", "Épaves"];
MODS.forEach(function (m) { $("avMod").appendChild(el("option", 0, m)); });
Object.keys(AVT).forEach(function (k) { var b = el("button", 0, AVT[k]); b.dataset.k = k; b.onclick = function () { avType = k; drawAvChips(); }; $("avType").appendChild(b); });
[["tout", "Tout"], ["like", "J'aime"], ["fix", "À améliorer"], ["idea", "Idées"]].forEach(function (f) { var b = el("button", 0, f[1]); b.dataset.k = f[0]; b.onclick = function () { avFilt = f[0]; renderAvis(); }; $("avFilt").appendChild(b); });
function drawAvChips() {
  Array.prototype.forEach.call($("avType").children, function (b) { b.classList.toggle("on", b.dataset.k === avType); });
  $("avTxt").placeholder = avType === "like" ? "Ex. : la carte des webcams est top, je la regarde avant chaque sortie." : avType === "idea" ? "Ex. : ajouter les horaires des bateaux CGN." : "Ex. : la carte est difficile à lire sur mon téléphone.";
}
drawAvChips();
$("avSend").onclick = function () {
  var m = $("avMsg"); m.className = "err"; m.textContent = ""; if (!memberOk(m, "Pour publier un avis, créez votre compte gratuit.")) return;
  var t = $("avTxt").value.trim(); if (t.length < 5) { m.textContent = "Écrivez au moins quelques mots."; return; } if (avBusy) return;
  avBusy = true; $("avSend").disabled = true;
  sb.from("avis").insert({ ty: avType, module: $("avMod").value, txt: t.slice(0, 300) }).then(function (r) {
    if (r.error) m.textContent = "Envoi impossible. Réessayez."; else { $("avTxt").value = ""; m.className = "okm"; m.textContent = "Merci ! Votre avis est publié."; load("avis"); }
  }).then(function () { avBusy = false; $("avSend").disabled = false; });
};
function renderAvis() {
  Array.prototype.forEach.call($("avFilt").children, function (b) { b.classList.toggle("on", b.dataset.k === avFilt); });
  var c = {}, mine = {}; VO.forEach(function (v) { c[v.avis_id] = (c[v.avis_id] || 0) + 1; if (v.auteur === uid) mine[v.avis_id] = 1; });
  var L = $("avList"); L.textContent = "";
  var items = AV.filter(function (x) { return avFilt === "tout" || x.ty === avFilt; }).sort(function (a, b) { return (c[b.id] || 0) - (c[a.id] || 0) || ts(b.t) - ts(a.t); });
  if (!items.length) { L.appendChild(el("p", "mu", AV.length ? "Rien dans cette catégorie pour l'instant." : "Aucun avis pour l'instant. Le premier avis est le plus utile !")); return; }
  items.forEach(function (x) {
    var d = el("div", "avi"), on = !!mine[x.id], vb = el("button", "vote" + (on ? " on" : ""), String(c[x.id] || 0)); vb.appendChild(el("small", 0, on ? "voté" : "+1")); vb.setAttribute("aria-label", "Voter pour cet avis");
    vb.onclick = function () { if (!memberOk(null, "Pour voter, créez votre compte gratuit.")) return; vb.disabled = true; (on ? sb.from("votes").delete().eq("avis_id", x.id).eq("auteur", uid) : sb.from("votes").insert({ avis_id: x.id })).then(function () { load("votes"); }); };
    d.appendChild(vb);
    var bd = el("div", "body"), h = el("div"); h.appendChild(el("span", "pl " + x.ty, AVT[x.ty])); if (x.statut) h.appendChild(el("span", "pl st", STL[x.statut])); h.appendChild(el("span", "mu", x.module)); bd.appendChild(h);
    bd.appendChild(el("div", "txt", x.txt)); var f = el("div", "mu"); f.appendChild(document.createTextNode(nameOf(x.auteur) + " · " + ago(x.t)));
    if (x.auteur === uid || isAdmin) { var del = el("button", "del", "Supprimer"); del.onclick = function () { sb.from("avis").delete().eq("id", x.id).then(function () { load("avis"); }); }; f.appendChild(del); }
    bd.appendChild(f);
    if (isAdmin) { var se = el("select"); [["", "Statut…"], ["prevu", "Prévu"], ["encours", "En cours"], ["fait", "Fait"], ["non", "Pas retenu"]].forEach(function (o) { var op = el("option", 0, o[1]); op.value = o[0]; se.appendChild(op); }); se.value = x.statut || ""; se.setAttribute("aria-label", "Statut"); se.onchange = function () { sb.from("avis").update({ statut: se.value }).eq("id", x.id).then(function () { load("avis"); }); }; bd.appendChild(se); }
    d.appendChild(bd); L.appendChild(d);
  });
}

/* ================= PHOTO DE PROFIL ================= */
function squareJpeg(file, size) {
  return (window.createImageBitmap ? createImageBitmap(file) : Promise.reject()).catch(function () {
    return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = URL.createObjectURL(file); });
  }).then(function (src) {
    var w = src.width || src.naturalWidth, h = src.height || src.naturalHeight, m = Math.min(w, h), c = document.createElement("canvas");
    c.width = c.height = size; c.getContext("2d").drawImage(src, (w - m) / 2, (h - m) / 2, m, m, 0, 0, size, size);
    return new Promise(function (r) { c.toBlob(r, "image/jpeg", .85); });
  });
}
function drawPfPhoto() {
  var p = me(), A = $("pfAv"); A.className = "pfav"; A.style.backgroundImage = ""; A.textContent = p ? initial(uid) : "?";
  A.onclick = null; A.style.cursor = ""; A.removeAttribute("role"); A.removeAttribute("aria-label");
  if (p) zoomable(putPhoto(A, uid), uid);
  $("pfPhRm").hidden = !(p && p.photo);
  $("pfPhSt").textContent = !p ? "Enregistrez d'abord votre profil, puis ajoutez une photo." : !p.photo ? "Une photo de vous ou de votre bateau, visible par les membres." : "Votre photo est visible par les membres.";
  $("pfPhLb").hidden = !p;
  drawPfQueue();
}
$("pfPhIn").onchange = function () {
  var f = this.files && this.files[0]; this.value = ""; if (!f || !me()) return;
  var old = me().photo, path = uid + "/profil-" + Date.now() + ".jpg"; $("pfPhSt").textContent = "Envoi de la photo…";
  squareJpeg(f, 400).then(function (blob) { return sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" }); })
    .then(function (r) { if (r.error) throw r.error; return sb.from("profils").update({ photo: path }).eq("id", uid); })
    .then(function (r) { if (r.error) throw r.error; P[uid].photo = path; P[uid].photo_ok = true; if (old) sb.storage.from("photos").remove([old]); toast("Photo de profil mise à jour !"); renderAll(); drawPfPhoto(); })
    .catch(function () { $("pfPhSt").textContent = "Envoi impossible. Réessayez avec une autre photo."; });
};
$("pfPhCam").onchange = $("pfPhIn").onchange;
$("pfPhRm").onclick = function () {
  var p = me(); if (!p || !p.photo) return; var old = p.photo;
  sb.from("profils").update({ photo: "" }).eq("id", uid).then(function (r) { if (r.error) { toast("Action impossible."); return; } P[uid].photo = ""; sb.storage.from("photos").remove([old]); renderAll(); drawPfPhoto(); });
};
function drawPfQueue() {
  var Q2 = $("pfQueue"); Q2.textContent = ""; var ids = isAdmin ? Object.keys(P).filter(function (k) { return k !== uid && P[k].photo; }) : [];
  $("pfQueueBox").hidden = !ids.length;
  ids.forEach(function (k) {
    var c = el("div", "pfq"), a = el("span", "pfav sm"); putPhoto(a, k); c.appendChild(a);
    var mid = el("div"); mid.appendChild(el("b", 0, P[k].pseudo));
    var no = el("button", "btn g sm", "Retirer cette photo"); no.style.marginTop = "6px";
    no.onclick = function () { if (!confirm("Retirer la photo de profil de " + P[k].pseudo + " ?")) return; no.disabled = true; var path = P[k].photo; sb.rpc("valider_photo_profil", { membre: k, ok: false }).then(function (r) { if (r.error) { toast("Erreur"); no.disabled = false; return; } sb.storage.from("photos").remove([path]); P[k].photo = ""; toast("Photo retirée"); renderAll(); drawPfPhoto(); }); };
    mid.appendChild(no); c.appendChild(mid); Q2.appendChild(c);
  });
}

/* ================= PHOTOS ================= */
function shrink(file, max) {
  return (window.createImageBitmap ? createImageBitmap(file) : Promise.reject()).catch(function () {
    return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = URL.createObjectURL(file); });
  }).then(function (src) {
    var w = src.width || src.naturalWidth, h = src.height || src.naturalHeight, s = Math.min(1, max / Math.max(w, h)), c = document.createElement("canvas");
    c.width = Math.round(w * s); c.height = Math.round(h * s); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return new Promise(function (r) { c.toBlob(r, "image/jpeg", .82); });
  });
}
function pub(p) { return !p.statut || p.statut === "publie"; }
function photosOf(k) { return PH.filter(function (p) { return p.k === k && pub(p); }).sort(function (a, b) { return ts(b.t) - ts(a.t); }); }
function modal(title) {
  var ov = el("div", "ph-ov"), bx = el("div", "ph-box"); ov.appendChild(bx);
  var hd = el("div", "ph-hd"); hd.appendChild(el("b", 0, title)); var x = el("button", "ph-x", "✕"); x.setAttribute("aria-label", "Fermer"); hd.appendChild(x); bx.appendChild(hd);
  function close() { ov.remove(); document.removeEventListener("keydown", esc); } function esc(e) { if (e.key === "Escape") close(); }
  x.onclick = close; ov.onclick = function (e) { if (e.target === ov) close(); }; document.addEventListener("keydown", esc); document.body.appendChild(ov);
  return { bx: bx, close: close };
}
function pickPhoto(k, label) {
  if (!sb) return;
  if (!real()) { goAuth(cur(), "Pour partager des photos, créez votre compte gratuit."); return; }
  var md = modal("Ajouter une photo"), bx = md.bx;
  bx.appendChild(el("div", "mu", label));
  var fi = el("input", "f"); fi.type = "file"; fi.accept = "image/jpeg,image/png,image/webp"; fi.style.marginTop = "8px"; bx.appendChild(fi);
  var im = el("img", "ph-prev"); im.alt = ""; im.hidden = true; bx.appendChild(im);
  var cap = el("input", "f"); cap.maxLength = 120; cap.placeholder = "Légende (ex. ponton visiteurs plein, lac calme…)"; cap.style.marginTop = "8px"; bx.appendChild(cap);
  var go = el("button", "btn", "Publier la photo"); go.disabled = true; bx.appendChild(go);
  var msg = el("div", "err"); bx.appendChild(msg);
  var rl = el("div", "card wxal"); rl.style.margin = "10px 0 0"; rl.appendChild(el("b", 0, "Règles des photos")); rl.appendChild(el("div", "mu", "Photos du lac, des ports et de la météo uniquement. Aucune personne reconnaissable sans son accord. " + "Votre photo est visible tout de suite. Toute photo peut être signalée et retirée par l'administrateur. Les abus entraînent la suppression du compte.")); bx.appendChild(rl);
  fi.onchange = function () { var f = fi.files && fi.files[0]; go.disabled = !f; if (f) { im.src = URL.createObjectURL(f); im.hidden = false; } };
  go.onclick = function () {
    var f = fi.files && fi.files[0]; if (!f) return; go.disabled = true; msg.className = "mu"; msg.textContent = "Envoi en cours…";
    var path = uid + "/" + Date.now() + ".jpg";
    shrink(f, 1600).then(function (blob) { return sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" }); })
      .then(function (r) { if (r.error) throw r.error; return sb.from("photos").insert({ k: k, chemin: path, c: cap.value.trim().slice(0, 120) }); })
      .then(function (r) { if (r.error) throw r.error; md.close(); toast("Photo publiée, merci !"); load("photos"); })
      .catch(function () { msg.className = "err"; msg.textContent = "L'envoi a échoué. Vérifiez la connexion et réessayez (photo JPEG ou PNG)."; go.disabled = false; });
  };
}
function photoReport(p, done) {
  if (!confirm("Signaler cette photo ? Elle sera masquée tout de suite, puis vérifiée.")) return;
  if (!guestOk(function () { photoReport(p, done); })) return;
  sb.from("signalements").insert({ quoi: "photo", ref: String(p.id) }).then(function (r) {
    if (r.error) { toast("Signalement impossible. Réessayez."); return; }
    PH = PH.filter(function (x) { return x.id !== p.id; }); toast("Photo signalée et masquée. Merci !"); renderAll(); if (done) done();
  });
}
function photoDel(p) { return sb.from("photos").delete().eq("id", p.id).then(function () { sb.storage.from("photos").remove([p.chemin]); PH = PH.filter(function (x) { return x.id !== p.id; }); renderAll(); }); }
function renderPhotoMod() {
  var B = $("phMod"); B.textContent = ""; var q = PH.filter(function (p) { return !pub(p); });
  var mine = q.filter(function (p) { return p.auteur === uid; });
  if (!isAdmin) { B.hidden = !mine.length; if (mine.length) B.appendChild(el("div", "note", "Vous avez " + mine.length + " photo" + (mine.length > 1 ? "s" : "") + " en attente de vérification.")); return; }
  B.hidden = false; B.appendChild(el("h2", 0, "Photos à vérifier (" + q.length + ")"));
  if (!q.length) { B.appendChild(el("p", "mu", "Rien à vérifier.")); return; }
  q.forEach(function (p) {
    var it = el("div", "card ph-item"), img = el("img"); img.loading = "lazy"; img.alt = p.c || "Photo"; img.src = photoUrl(p.chemin); it.appendChild(img);
    it.appendChild(el("div", 0, (p.c ? p.c + " · " : "") + nameOf(p.auteur) + " · " + ago(p.t)));
    var r = el("div", "row"); r.style.marginTop = "8px";
    var ok = el("button", "btn sm", "✓ Publier"); ok.onclick = function () { ok.disabled = true; sb.from("photos").update({ statut: "publie" }).eq("id", p.id).then(function (x) { if (x.error) { toast("Erreur"); ok.disabled = false; return; } p.statut = "publie"; toast("Photo publiée"); renderAll(); }); };
    var no = el("button", "btn g sm", "✕ Supprimer"); no.onclick = function () { if (confirm("Supprimer définitivement cette photo ?")) photoDel(p).then(function () { toast("Photo supprimée"); }); };
    r.appendChild(ok); r.appendChild(no); it.appendChild(r); B.appendChild(it);
  });
}
function gallery(title, k, label) {
  var md = modal(title), bx = md.bx;
  function draw() {
    while (bx.children.length > 1) bx.lastChild.remove();
    var add = el("button", "btn", "Ajouter une photo"); add.onclick = function () { md.close(); pickPhoto(k, label || title); }; bx.appendChild(add);
    var ps = photosOf(k); if (!ps.length) bx.appendChild(el("div", "mu", "Pas encore de photo. Soyez le premier à documenter !"));
    var wrap = el("div"); wrap.style.marginTop = "12px"; bx.appendChild(wrap);
    ps.slice(0, 20).forEach(function (p) {
      var it = el("div", "ph-item"), img = el("img"); img.loading = "lazy"; img.alt = p.c || "Photo"; img.src = photoUrl(p.chemin); it.appendChild(img);
      if (p.c) it.appendChild(el("div", 0, p.c));
      var m = el("div", "ph-meta"); m.appendChild(el("span", 0, nameOf(p.auteur) + " · " + ago(p.t)));
      if (p.auteur !== uid && !isAdmin) { var sg = el("button", "del", "Signaler"); sg.onclick = function () { photoReport(p, function () { draw(); }); }; m.appendChild(sg); }
      if (p.auteur === uid || isAdmin) { var d = el("button", "del", "Supprimer"); d.onclick = function () { sb.from("photos").delete().eq("id", p.id).then(function () { sb.storage.from("photos").remove([p.chemin]); PH = PH.filter(function (x) { return x.id !== p.id; }); draw(); renderAll(); }); }; m.appendChild(d); }
      it.appendChild(m); wrap.appendChild(it);
    });
  }
  draw();
}
function thumb(k, title, label) {
  var w = el("div", "ph-thumb"), ps = photosOf(k);
  if (ps.length) { var i = el("img"); i.alt = ""; i.src = photoUrl(ps[0].chemin); w.appendChild(i); }
  w.appendChild(el("span", 0, ps.length ? ps.length + " photo" + (ps.length > 1 ? "s" : "") + " · dernière " + ago(ps[0].t) : "Ajouter la première photo"));
  w.onclick = function (e) { e.stopPropagation(); ps.length ? gallery(title, k, label) : pickPhoto(k, label || title); };
  return w;
}

/* ================= PORTS ================= */
var PORTS = [["gen","Genève – Port Noir","Genève","Petit-Lac"],["her","Hermance","Genève","Petit-Lac"],["ver","Versoix – Port Choiseul","Genève","Petit-Lac"],["cop","Coppet","Vaud","Petit-Lac"],["nyo","Nyon","Vaud","Petit-Lac"],
["rol","Rolle","Vaud","Côte vaudoise"],["spx","Saint-Prex","Vaud","Côte vaudoise"],["mor","Morges","Vaud","Côte vaudoise"],["ssu","Saint-Sulpice","Vaud","Côte vaudoise"],["vid","Lausanne – Vidy","Vaud","Côte vaudoise"],["ouc","Lausanne – Ouchy","Vaud","Côte vaudoise"],["pul","Pully","Vaud","Côte vaudoise"],["lut","Lutry","Vaud","Côte vaudoise"],["cul","Cully","Vaud","Côte vaudoise"],
["vev","Vevey","Vaud","Haut-Lac"],["ltp","La Tour-de-Peilz","Vaud","Haut-Lac"],["cla","Montreux – Clarens","Vaud","Haut-Lac"],["vil","Villeneuve","Vaud","Haut-Lac"],["nov","Noville – Chantier naval du Vieux-Rhône","Vaud","Haut-Lac"],["bou","Le Bouveret","Valais","Haut-Lac"],["sgi","Saint-Gingolph","Valais","Haut-Lac"],
["evi","Évian-les-Bains","Haute-Savoie","Rive française"],["tho","Thonon – Port de Rives","Haute-Savoie","Rive française"],["yvo","Yvoire","Haute-Savoie","Rive française"],
["gpa","Genève – Pâquis","Genève","Petit-Lac"],["ven","Bellevue – Port du Vengeron","Genève","Petit-Lac"],["gth","Genthod","Genève","Petit-Lac"],["mie","Mies","Vaud","Petit-Lac"],["cel","Céligny","Genève","Petit-Lac"],["pra","Prangins – Promenthoux","Vaud","Petit-Lac"],["ani","Anières","Genève","Petit-Lac"],["cbe","Collonge-Bellerive","Genève","Petit-Lac"],["gla","Gland – La Dullive","Vaud","Côte vaudoise"],["aub","Buchillon – Port de l'Aubonne","Vaud","Côte vaudoise"],["pre","Préverenges","Vaud","Côte vaudoise"],["pau","Paudex","Vaud","Côte vaudoise"],["chn","Chens – Port de Tougues","Haute-Savoie","Rive française"],["mes","Messery","Haute-Savoie","Rive française"],["ner","Nernier","Haute-Savoie","Rive française"],["exc","Excenevex","Haute-Savoie","Rive française"],["sci","Sciez – Port de Sciez","Haute-Savoie","Rive française"],["cou","Sciez – Château de Coudrée","Haute-Savoie","Rive française"],["sec","Margencel – Port de Séchex","Haute-Savoie","Rive française"],["amp","Publier – Amphion","Haute-Savoie","Rive française"],["lug","Lugrin – Tourronde","Haute-Savoie","Rive française"],["mei","Meillerie","Haute-Savoie","Rive française"]].map(function (a) { return { id: a[0], n: a[1], r: a[2], z: a[3] }; });
/* prix du carburant signalés par les membres (table carbu) */
var CB = [], cbForm = null, CBOLD = 30 * 864e5;
function cbLast(port, type) { for (var i = 0; i < CB.length; i++) if (CB[i].port === port && CB[i].type === type) return CB[i]; return null; } /* CB est trié du plus récent au plus ancien */
function cbFmt(r) { return (+r.prix).toFixed(2).replace(".", ",") + " " + r.devise; }
function cbMin(port) { var e = cbLast(port, "essence"), d = cbLast(port, "diesel"), x = [e, d].filter(function (r) { return r && Date.now() - ts(r.t) < CBOLD; }); return x.length ? x.sort(function (a, b) { return a.prix - b.prix; })[0] : null; }
function cbBlock(p) {
  var w = el("div", "cbx");
  ["essence", "diesel"].forEach(function (ty) {
    var r = cbLast(p.id, ty); if (!r) return;
    var old = Date.now() - ts(r.t) > CBOLD, ln = el("div", "cbl" + (old ? " old" : ""));
    ln.appendChild(el("b", 0, (ty === "essence" ? "Essence" : "Diesel") + " : " + cbFmt(r) + "/l"));
    ln.appendChild(el("span", 0, " · " + ((P[r.auteur] && P[r.auteur].pseudo) || "un membre") + " · " + ago(r.t) + (old ? " · peut-être plus à jour" : "")));
    if (uid && (r.auteur === uid || isAdmin)) { var x = el("button", "cbdel", "Retirer"); x.type = "button"; x.onclick = function (e) { e.stopPropagation(); sb.from("carbu").delete().eq("id", r.id).then(function (q) { if (q.error) toast("Action impossible."); else load("carbu"); }); }; ln.appendChild(x); }
    w.appendChild(ln);
  });
  if (!w.firstChild) w.appendChild(el("div", "mu", "Pas encore de prix signalé. Vous avez fait le plein ici ? Partagez le prix !"));
  if (cbForm !== p.id) {
    var b = el("button", "btn g sm cbgo", "J'ai fait le plein : signaler le prix"); b.type = "button";
    b.onclick = function (e) { e.stopPropagation(); if (!memberOk(null, "Pour signaler un prix, créez votre compte gratuit.")) return; cbForm = p.id; renderPorts(); };
    w.appendChild(b); return w;
  }
  var f = el("form", "cbf"), ty = el("select", "f"), pr = el("input", "f"), dv = el("select", "f"), ok = el("button", "btn sm", "Envoyer"), cx = el("button", "btn g sm", "Annuler");
  ["essence", "diesel"].forEach(function (t) { var o = el("option", 0, t === "essence" ? "Essence" : "Diesel"); o.value = t; ty.appendChild(o); });
  ["CHF", "EUR"].forEach(function (t) { var o = el("option", 0, t); o.value = t; dv.appendChild(o); }); dv.value = p.z === "Rive française" ? "EUR" : "CHF";
  pr.type = "number"; pr.inputMode = "decimal"; pr.step = "0.01"; pr.min = "0.5"; pr.max = "5"; pr.placeholder = "Prix au litre, ex. 2.45";
  ty.setAttribute("aria-label", "Carburant"); pr.setAttribute("aria-label", "Prix au litre"); dv.setAttribute("aria-label", "Monnaie");
  cx.type = "button"; cx.onclick = function (e) { e.stopPropagation(); cbForm = null; renderPorts(); };
  var m = el("div", "err");
  f.onclick = function (e) { e.stopPropagation(); };
  f.onsubmit = function (e) {
    e.preventDefault(); var v = parseFloat(String(pr.value).replace(",", "."));
    if (!(v >= 0.5 && v <= 5)) { m.textContent = "Indiquez le prix au litre, entre 0,50 et 5,00."; return; }
    ok.disabled = true;
    sb.from("carbu").insert({ port: p.id, type: ty.value, prix: Math.round(v * 100) / 100, devise: dv.value }).then(function (r) {
      ok.disabled = false; if (r.error) { m.textContent = "Envoi impossible, réessayez dans quelques secondes."; return; }
      cbForm = null; toast("Merci ! Prix partagé avec les plaisanciers."); load("carbu");
    });
  };
  var row = el("div", "row"); row.appendChild(ty); row.appendChild(pr); row.appendChild(dv); f.appendChild(row);
  var row2 = el("div", "row"); row2.appendChild(cx); row2.appendChild(ok); f.appendChild(row2); f.appendChild(m);
  w.appendChild(f); setTimeout(function () { try { pr.focus(); } catch (x) {} }, 50);
  return w;
}
/* ports avec station de carburant pour bateaux (sources : bateau-geneve.ch, ports-du-leman.ch, sites des ports) */
var FUEL = { gen: "Essence et diesel (La Nautique, à côté de Port-Noir)", ver: "Essence", nyo: "Essence et diesel (prépaiement)", rol: "Essence",
  mor: "Essence et diesel (port de la Baie de l'Église)", ssu: "Essence (port des Pierrettes)", ouc: "Essence et diesel", cul: "Essence (port de Moratel)",
  vev: "Essence (port de la Pichette Est, Corseaux)", bou: "Essence et diesel", evi: "Sans plomb 98 et gasoil, 24 h/24 par carte", tho: "Essence et diesel" };
/* recherche des ports : autres noms, quartiers, communes voisines + position pour « Près de moi » */
var PALIAS = { gen: "port-noir eaux-vives cologny geneve", her: "hermance", ver: "choiseul versoix", cop: "coppet", nyo: "nyon", rol: "rolle",
  spx: "saint-prex", mor: "baie de l'eglise morges", ssu: "pierrettes saint-sulpice", vid: "vidy lausanne", ouc: "ouchy lausanne", pul: "pully", lut: "lutry",
  cul: "moratel cully lavaux", vev: "corseaux pichette vevey lavaux", ltp: "tour-de-peilz", cla: "clarens montreux", vil: "villeneuve",
  nov: "noville vieux-rhone chantier naval", bou: "port-valais bouveret valais", sgi: "saint-gingolph", evi: "evian", tho: "thonon rives", yvo: "yvoire",
  gpa: "paquis bains geneve", ven: "vengeron pregny chambesy bellevue", gth: "genthod", mie: "mies tannay", cel: "celigny", pra: "promenthoux promenthouse prangins", ani: "anieres", cbe: "bellerive collonge vesenaz", gla: "dullive gland", aub: "aubonne buchillon allaman", pre: "preverenges", pau: "paudex", chn: "tougues chens", mes: "messery", ner: "nernier", exc: "excenevex", sci: "sciez", cou: "coudree sciez", sec: "sechex margencel anthy", amp: "amphion publier", lug: "tourronde lugrin", mei: "meillerie" };
var PGPS = { gen: [46.211, 6.163], her: [46.301, 6.243], ver: [46.283, 6.167], cop: [46.316, 6.193], nyo: [46.381, 6.241], rol: [46.459, 6.339], spx: [46.479, 6.457],
  mor: [46.507, 6.497], ssu: [46.512, 6.560], vid: [46.517, 6.596], ouc: [46.506, 6.627], pul: [46.508, 6.661], lut: [46.503, 6.686], cul: [46.488, 6.731],
  vev: [46.459, 6.842], ltp: [46.452, 6.858], cla: [46.429, 6.910], vil: [46.398, 6.925], nov: [46.393, 6.893], bou: [46.389, 6.857], sgi: [46.398, 6.806],
  evi: [46.402, 6.590], tho: [46.377, 6.484], yvo: [46.371, 6.327],
  gpa: [46.212, 6.152], ven: [46.249, 6.152], gth: [46.262, 6.159], mie: [46.300, 6.174], cel: [46.351, 6.214], pra: [46.394, 6.262], ani: [46.281, 6.229], cbe: [46.252, 6.199], gla: [46.411, 6.283], aub: [46.460, 6.402], pre: [46.511, 6.529], pau: [46.504, 6.671], chn: [46.324, 6.258], mes: [46.354, 6.292], ner: [46.364, 6.304], exc: [46.350, 6.358], sci: [46.342, 6.385], cou: [46.358, 6.383], sec: [46.367, 6.427], amp: [46.399, 6.534], lug: [46.405, 6.655], mei: [46.408, 6.723] };
function pnorm(t) { return norm(t).replace(/['’-]/g, " ").replace(/\bst\b/g, "saint").replace(/\s+/g, " ").trim(); }
function portHay(p) { return pnorm([p.n, p.r, p.z, PALIAS[p.id] || "", FUEL[p.id] ? "carburant essence diesel station" : ""].join(" ")); }
var poGps = null, poGpsBusy = false;
function poNear() {
  if (poGps) { renderPorts(); return; }
  if (!navigator.geolocation) { toast("Position indisponible sur ce téléphone."); return; }
  if (poGpsBusy) return; poGpsBusy = true; toast("Recherche de votre position…");
  navigator.geolocation.getCurrentPosition(function (x) { poGpsBusy = false; poGps = [x.coords.latitude, x.coords.longitude]; renderPorts(); },
    function () { poGpsBusy = false; poZone = "Tous"; ls("nc-pzone", "Tous"); renderPorts(); toast("Activez la localisation pour voir les ports les plus proches."); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
}
var PZ = ["Tous", "Près de moi", "Favoris", "Carburant", "Petit-Lac", "Côte vaudoise", "Haut-Lac", "Rive française"], poZone = ls("nc-pzone") || "Tous", poQ = "", favs = {};
try { JSON.parse(ls("nc-favs") || "[]").forEach(function (f) { favs[f] = 1; }); } catch (e) {}
var PZL = { "Côte vaudoise": "Côte vaudoise", "Rive française": "Rive française" }, poOpen = null;
$("poChips").className = "pogrid";
PZ.forEach(function (z) { var b = el("button", 0, PZL[z] || z); b.dataset.z = z; b.onclick = function () { poZone = z; ls("nc-pzone", z); if (z === "Près de moi") poNear(); else renderPorts(); }; $("poChips").appendChild(b); });
if (poZone === "Près de moi") poZone = "Tous";
$("poQ").oninput = function () { poQ = pnorm(this.value); renderPorts(); };
var LBL = { libre: "Places libres", peu: "Peu de places", complet: "Complet" };
function portStatus(id) { var best = null, n = 0, lim = Date.now() - 12 * 36e5; PL.forEach(function (r) { if (r.port !== id || ts(r.t) < lim) return; n++; if (!best || ts(r.t) > ts(best.t)) best = r; }); return best ? { s: best.s, t: best.t, n: n } : null; }
function renderPorts() {
  Array.prototype.forEach.call($("poChips").children, function (b) { b.classList.toggle("on", b.dataset.z === poZone); });
  var L = $("poList"); L.textContent = ""; var last = null, shown = 0;
  var words = poQ ? poQ.split(" ") : [], near = !words.length && poZone === "Près de moi" && poGps;
  var dist = function (p) { var g = PGPS[p.id]; return poGps && g ? km(poGps[0], poGps[1], g[0], g[1]) : 999; };
  var flat = words.length || poZone !== "Tous";
  var res = PORTS.filter(function (p) {
    if (words.length) { var h = portHay(p); return words.every(function (w) { return h.indexOf(w) >= 0; }); } /* la recherche cherche dans tous les ports */
    return poZone === "Tous" || poZone === "Près de moi" || (poZone === "Favoris" ? favs[p.id] : poZone === "Carburant" ? FUEL[p.id] : p.z === poZone);
  }).sort(function (a, b) { if (!words.length && poZone === "Carburant") { var ma = cbMin(a.id), mb = cbMin(b.id); if (ma || mb) return (ma ? ma.prix : 99) - (mb ? mb.prix : 99); } return near ? dist(a) - dist(b) : (flat ? 0 : PZ.indexOf(a.z) - PZ.indexOf(b.z)) || alpha(a.n, b.n); });
  if (near) res = res.slice(0, 8);
  if (words.length) L.appendChild(el("div", "mu", res.length ? res.length + " port" + (res.length > 1 ? "s" : "") + " trouvé" + (res.length > 1 ? "s" : "") : ""));
  if (near) L.appendChild(el("div", "mu", "Les 8 ports les plus proches de vous"));
  res.forEach(function (p) {
    if (!flat && p.z !== last) { L.appendChild(el("h3", "sub", p.z)); last = p.z; }
    shown++; var s = portStatus(p.id), open = poOpen === p.id, c = el("div", "port pl" + (open ? " open" : ""));
    var top = el("div", "ptop"), d = el("div", "sdot" + (s ? " " + s.s : "")), nm = el("div", "nm"); nm.appendChild(el("b", 0, p.n));
    var sub = [p.r]; if (poGps && (near || words.length || poZone === "Près de moi") && PGPS[p.id]) sub.push(dist(p).toFixed(1).replace(".", ",") + " km");
    if (s) sub.push(LBL[s.s] + " " + ago(s.t)); nm.appendChild(el("span", 0, sub.join(" · ")));
    if (FUEL[p.id] && !open) { var cm = cbMin(p.id); nm.appendChild(el("span", "pfuel", cm ? "Carburant · " + (cm.type === "essence" ? "essence " : "diesel ") + cbFmt(cm) : "Carburant")); }
    var fv = el("button", "fav" + (favs[p.id] ? " on" : ""), "★"); fv.setAttribute("aria-label", "Favori"); fv.onclick = function (e) { e.stopPropagation(); if (favs[p.id]) delete favs[p.id]; else favs[p.id] = 1; ls("nc-favs", JSON.stringify(Object.keys(favs))); renderPorts(); };
    var ch = el("span", "pchev", open ? "−" : "+");
    top.appendChild(d); top.appendChild(nm); top.appendChild(fv); top.appendChild(ch); c.appendChild(top);
    top.onclick = function () { poOpen = open ? null : p.id; renderPorts(); if (!open) setTimeout(function () { var x = $("po-" + p.id); if (x) x.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 30); };
    c.id = "po-" + p.id; L.appendChild(c);
    if (!open) return;
    if (FUEL[p.id]) { c.appendChild(el("div", "fuel", "Carburant : " + FUEL[p.id])); c.appendChild(cbBlock(p)); }
    c.appendChild(el("div", "st " + (s ? s.s : "none"), s ? LBL[s.s] + " · " + ago(s.t) + (s.n > 1 ? " · " + s.n + " signalements" : "") : "Pas de signalement récent"));
    c.appendChild(thumb("port-" + p.id, p.n, "Port : " + p.n + " (ponton visiteurs, capitainerie, état du port…)"));
    var a = el("div", "act"), mine = PL.filter(function (r) { return r.port === p.id && r.auteur === uid && ts(r.t) > Date.now() - 12 * 36e5; })[0];
    ["libre", "peu", "complet"].forEach(function (k) { var b = el("button", k + (mine && mine.s === k ? " mine" : ""), k === "libre" ? "Libre" : k === "peu" ? "Peu" : "Complet");
      b.onclick = function () { if (!memberOk(null, "Pour indiquer les places libres au port, créez votre compte gratuit.")) return; b.disabled = true; (mine && mine.s === k ? sb.from("places").delete().eq("port", p.id).eq("auteur", uid) : sb.from("places").upsert({ port: p.id, auteur: uid, s: k, t: nowIso() }, { onConflict: "port,auteur" })).then(function () { load("places"); toast("Merci pour le signalement !"); }); };
      a.appendChild(b); });
    var m = el("a", 0, "Carte"); m.href = mapsSearch(p.id === "nov" ? "Chantier Naval du Vieux-Rhône, Noville" : "port " + p.n.replace(" – ", " ")); m.target = "_blank"; m.rel = "noopener"; a.appendChild(m);
    var wc = el("a", 0, "Webcam"); wc.href = "#webcams"; wc.onclick = function () { wcPort = p.id; }; a.appendChild(wc);
    c.appendChild(a);
  });
  if (poZone === "Carburant" && shown) L.insertBefore(el("div", "note", "Ports avec une station de carburant pour bateaux, du moins cher au plus cher selon les prix signalés par les membres. Les prix changent : la date du dernier signalement est indiquée. Horaires et paiement variables, appelez la capitainerie avant de compter dessus, surtout hors saison."), L.firstChild);
  if (!shown) {
    var nt = el("div", "note", words.length ? "Aucun port trouvé pour « " + $("poQ").value.trim() + " ». Essayez le nom de la commune (ex. « Montreux », « Lausanne », « Évian »). Il manque un port ? Écrivez-nous à " + CFG.contact + "." : poZone === "Favoris" ? "Touchez ★ sur un port pour l'ajouter à vos favoris." : poZone === "Près de moi" ? "Recherche de votre position…" : "Aucun port ne correspond.");
    L.appendChild(nt);
    if (words.length) { var cl = el("button", "btn g sm", "Effacer la recherche"); cl.onclick = function () { $("poQ").value = ""; poQ = ""; renderPorts(); }; L.appendChild(cl); }
  }
}

/* ================= MÉTÉO ================= */
var MZ = ["Genève – Petit-Lac", "Nyon – Coppet", "Rolle – Morges", "Lausanne – Lutry", "Lavaux – Vevey", "Montreux – Villeneuve", "Le Bouveret – Saint-Gingolph", "Évian – Thonon", "Yvoire – Sciez", "Large du Grand-Lac"];
MZ.map(function (z, i) { return [z, i]; }).sort(function (a, b) { return alpha(a[0], b[0]); }).forEach(function (x) { var o = el("option", 0, x[0]); o.value = "z" + x[1]; $("mZone").appendChild(o); });
(function () { var z = ls("nc-mzone"); if (z) $("mZone").value = z; })();
$("mZone").onchange = function () { ls("nc-mzone", this.value); };
$("mAdd").onclick = function () { pickPhoto("meteo-" + $("mZone").value, "Zone : " + $("mZone").options[$("mZone").selectedIndex].text); };
function renderMeteoFeed() {
  var F = $("mFeed"); F.textContent = ""; var lim = Date.now() - 48 * 36e5;
  var ps = PH.filter(function (p) { return p.k.indexOf("meteo-") === 0 && pub(p) && ts(p.t) > lim; }).slice(0, 15);
  if (!ps.length) { F.appendChild(el("p", "mu", "Pas encore de photo récente. Partagez la première !")); return; }
  ps.forEach(function (p) {
    var zi = +p.k.slice(8), zn = MZ[zi] || "Léman", c = el("div", "feed"), im = el("img"); im.loading = "lazy"; im.alt = p.c || "État du lac"; im.src = photoUrl(p.chemin); c.appendChild(im);
    var d = el("div"); d.appendChild(el("b", 0, zn)); if (p.c) d.appendChild(el("div", 0, p.c)); d.appendChild(el("span", "mu", nameOf(p.auteur) + " · " + ago(p.t))); c.appendChild(d);
    c.onclick = function () { gallery(zn, p.k, "Zone : " + zn); }; F.appendChild(c);
  });
}
var WINDS = [
  { n: "Bise", d: "NE", dirs: ["N", "NE", "E"], t: "Vent froid et sec du nord-est, souvent par beau temps. Il souffle sur tout le lac, fort surtout vers Genève, et lève des vagues courtes et creuses. Il peut durer plusieurs jours.", w: "Fort et durable" },
  { n: "Vent", d: "SO", dirs: ["SO", "O", "S"], t: "Le « vent » du sud-ouest arrive souvent avec le mauvais temps et la pluie. Il souffle fort sur le Grand-Lac, avec des vagues longues.", w: "Souvent annonciateur de pluie" },
  { n: "Joran", d: "NO", dirs: ["NO", "N", "O"], t: "Descend du Jura vers le lac, souvent brutalement, en fin de journée ou derrière un orage. Il peut passer du calme au coup de vent en quelques minutes.", w: "Soudain et dangereux" },
  { n: "Vaudaire", d: "SE", dirs: ["SE", "S", "E"], t: "Foehn qui sort de la vallée du Rhône et balaie le Haut-Lac (Villeneuve, Montreux, Le Bouveret). Chaud et très rafaleux.", w: "Rafales violentes" },
  { n: "Séchard", d: "E", dirs: ["E", "NE"], t: "Petit vent d'est de beau temps, plutôt sur le Haut-Lac. Agréable pour naviguer.", w: "" },
  { n: "Brises thermiques", d: "variable", dirs: [], t: "Par beau temps calme, des brises locales se lèvent l'après-midi (du lac vers la terre) et le soir (de la terre vers le lac). Elles restent faibles.", w: "" }];
WINDS.forEach(function (w, i) { var c = el("div", "card wind"); c.id = "w" + i; c.appendChild(el("span", "dir", w.d)); c.appendChild(el("b", 0, w.n)); c.appendChild(el("div", "mu", w.t)); if (w.w) c.appendChild(el("span", "wwarn", w.w)); $("mWinds").appendChild(c); });
["N", "NE", "E", "SE", "S", "SO", "O", "NO"].forEach(function (d) {
  var b = el("button", 0, d); b.onclick = function () {
    Array.prototype.forEach.call($("mRose").children, function (x) { x.classList.toggle("on", x === b); });
    var m = []; WINDS.forEach(function (w, i) { var hit = w.dirs.indexOf(d) >= 0; $("w" + i).classList.toggle("hl", hit); if (hit) m.push([w, i]); });
    $("mRes").textContent = m.length ? "Probablement : " + m.map(function (x) { return x[0].n; }).join(" ou ") + "." : "Pas de vent régional typique : sans doute une brise locale.";
    if (m[0]) $("w" + m[0][1]).scrollIntoView({ behavior: "smooth", block: "center" });
  }; $("mRose").appendChild(b);
});
var BF = [[0,0,.5,"Calme, lac miroir"],[1,1,3,"Rides"],[2,4,6,"Vaguelettes"],[3,7,10,"Petits moutons épars"],[4,11,16,"Moutons nombreux"],[5,17,21,"Vagues marquées : prudence"],[6,22,27,"Vent fort : petites embarcations à l'abri"],[7,28,33,"Grand frais : rester au port"],[8,34,40,"Coup de vent"],[9,41,47,"Fort coup de vent"]];
BF.forEach(function (r) { var tr = el("tr"); tr.appendChild(el("td", 0, r[0])); tr.appendChild(el("td", 0, r[0] === 0 ? "< 1" : r[1] + "–" + r[2])); tr.appendChild(el("td", 0, r[3])); $("mBf").tBodies[0].appendChild(tr); });
function conv() {
  var x = parseFloat($("mV").value), u = $("mU").value; if (isNaN(x) || x < 0) { $("mCv").textContent = ""; return; }
  var kn = u === "kn" ? x : u === "kmh" ? x / 1.852 : x * 1.94384, b = -1; for (var i = 0; i < BF.length; i++) if (kn < BF[i][2] + .5) { b = i; break; } if (b < 0) b = kn < 56 ? 10 : kn < 64 ? 11 : 12;
  $("mCv").textContent = kn.toFixed(1) + " nœuds · " + (kn * 1.852).toFixed(0) + " km/h · " + (kn / 1.94384).toFixed(1) + " m/s · force " + b;
  Array.prototype.forEach.call($("mBf").tBodies[0].rows, function (t, i) { t.classList.toggle("sel", i === b); });
}
$("mV").oninput = conv; $("mU").onchange = conv; conv();

/* ================= BALISES VENT & ALERTES ================= */
var BAL = [
  { id: "gen", n: "Genève – rade", la: 46.212, lo: 6.165, z: "petit" },
  { id: "ver", n: "Versoix – Coppet", la: 46.300, lo: 6.185, z: "petit" },
  { id: "nyo", n: "Nyon", la: 46.380, lo: 6.245, z: "nord" },
  { id: "yvo", n: "Yvoire", la: 46.375, lo: 6.330, z: "sud" },
  { id: "rol", n: "Rolle", la: 46.455, lo: 6.345, z: "nord" },
  { id: "mor", n: "Morges", la: 46.500, lo: 6.500, z: "nord" },
  { id: "tho", n: "Thonon", la: 46.382, lo: 6.478, z: "sud" },
  { id: "lrg", n: "Grand-Lac (large)", la: 46.445, lo: 6.600, z: "large" },
  { id: "ouc", n: "Lausanne – Ouchy", la: 46.502, lo: 6.630, z: "nord" },
  { id: "evi", n: "Évian", la: 46.405, lo: 6.590, z: "sud" },
  { id: "cul", n: "Lutry – Cully", la: 46.488, lo: 6.715, z: "nord" },
  { id: "vev", n: "Vevey", la: 46.455, lo: 6.842, z: "haut" },
  { id: "sgi", n: "Saint-Gingolph", la: 46.398, lo: 6.785, z: "haut" },
  { id: "mon", n: "Montreux", la: 46.438, lo: 6.895, z: "haut" },
  { id: "bou", n: "Le Bouveret", la: 46.388, lo: 6.858, z: "haut" },
  { id: "vil", n: "Villeneuve", la: 46.398, lo: 6.918, z: "haut", hide: 1 }];
var WX = null, wxLoading = false, wxH = 0, wxSel = null;
function dirTxt(d) { return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(((d % 360) + 360) % 360 / 45) % 8]; }
function inDir(d, a, b) { return a <= b ? d >= a && d <= b : d >= a || d <= b; }
function knCol(k) { return k < 8 ? "var(--ok)" : k < 15 ? "var(--ac)" : k < 22 ? "var(--or)" : "var(--red)"; }
function hourTxt(t) { return new Date(t).getHours() + "h00"; }
function loadWind(force) {
  if (wxLoading) return; if (!force && WX && Date.now() - WX.at < 10 * 6e4) return;
  if (!WX) { try { var c = JSON.parse(ls("nc-wx") || "null"); if (c && Date.now() - c.at < 60 * 6e4) { WX = c; wxRender(); } } catch (e) {} }
  wxLoading = true;
  var u = "https://api.open-meteo.com/v1/forecast?latitude=" + BAL.map(function (b) { return b.la; }).join(",") + "&longitude=" + BAL.map(function (b) { return b.lo; }).join(",") +
    "&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&forecast_hours=13&wind_speed_unit=kn&timezone=Europe%2FZurich";
  fetch(u).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
    if (!Array.isArray(j)) j = [j];
    var st = j.map(function (d, i) {
      var h = d.hourly || {}, H = [];
      (h.time || []).forEach(function (t, k) { H.push({ t: t, s: h.wind_speed_10m[k], d: h.wind_direction_10m[k], g: h.wind_gusts_10m[k] }); });
      var c = d.current || {};
      return { now: { t: c.time, s: c.wind_speed_10m, d: c.wind_direction_10m, g: c.wind_gusts_10m }, H: H };
    });
    WX = { at: Date.now(), st: st }; ls("nc-wx", JSON.stringify(WX));
  }).catch(function () { if (!WX) WX = { err: 1, at: Date.now() - 9 * 6e4 }; }).then(function () { wxLoading = false; wxRender(); });
}
/* valeur d'une balise à l'échéance h (0 = maintenant, sinon +h heures) */
function wxAt(i, h) { var s = WX.st[i]; if (!h) return s.now; var nowT = new Date(s.now.t || Date.now()).getTime(); for (var k = 0; k < s.H.length; k++) if (new Date(s.H[k].t).getTime() >= nowT + h * 36e5 - 18e5) return s.H[k]; return s.now; }
function wxAlertsCalc() {
  var A = []; if (!WX || !WX.st) return A;
  function scan(test) { /* première échéance (0..12 h) où la règle se déclenche */
    for (var h = 0; h <= 12; h++) { var hit = []; BAL.forEach(function (b, i) { var v = wxAt(i, h); if (v && v.s != null && test(b, v)) hit.push([b, v]); }); if (hit.length) return { h: h, hit: hit, t: wxAt(0, h).t }; } return null;
  }
  function maxG(r) { return Math.round(Math.max.apply(null, r.hit.map(function (x) { return x[1].g; }))); }
  function when(r) { return r.h === 0 ? "en ce moment" : "vers " + hourTxt(r.t); }
  function where(r) { var n = r.hit.map(function (x) { return x[0].n; }); return n.slice(0, 3).join(", ") + (n.length > 3 ? "…" : ""); }
  var v = scan(function (b, x) { return b.z === "haut" && inDir(x.d, 100, 210) && (x.g >= 18 || x.s >= 12); });
  if (v) { var g = maxG(v); A.push({ k: "vaudaire", lv: g >= 30 ? 2 : 1, t: "Alerte vaudaire " + when(v), d: "Foehn du sud-est sur le Haut-Lac (" + where(v) + "), rafales jusqu'à " + g + " nœuds. Vent chaud qui arrive brutalement par rafales : attention aux amarres et au retour au port." }); }
  var bi = scan(function (b, x) { return inDir(x.d, 20, 95) && x.s >= 12; });
  if (bi && bi.hit.length >= 3) { var g2 = maxG(bi); A.push({ k: "bise", lv: g2 >= 30 ? 2 : 1, t: "Bise " + when(bi), d: "Vent du nord-est (" + where(bi) + "), rafales jusqu'à " + g2 + " nœuds. Vagues courtes et creuses, surtout vers Genève." }); }
  var jo = scan(function (b, x) { return (b.z === "nord" || b.z === "petit" || b.z === "large") && inDir(x.d, 280, 350) && x.g >= 20; });
  if (jo) { var g3 = maxG(jo); A.push({ k: "joran", lv: g3 >= 30 ? 2 : 1, t: "Joran possible " + when(jo), d: "Vent du nord-ouest qui descend du Jura (" + where(jo) + "), rafales jusqu'à " + g3 + " nœuds. Il peut se lever en quelques minutes." }); }
  var so = scan(function (b, x) { return inDir(x.d, 200, 265) && x.s >= 15; });
  if (so && so.hit.length >= 2) { var g4 = maxG(so); A.push({ k: "vent", lv: g4 >= 30 ? 2 : 1, t: "Vent du sud-ouest " + when(so), d: "Le « vent » souffle fort sur le Grand-Lac (" + where(so) + "), rafales jusqu'à " + g4 + " nœuds, souvent avec la pluie." }); }
  var cov = {}; [v, bi, jo, so].forEach(function (r) { if (r) r.hit.forEach(function (x) { cov[x[0].id] = 1; }); });
  var cv = scan(function (b, x) { return x.g >= 25 && !cov[b.id]; });
  if (cv) { var g5 = maxG(cv); A.push({ k: "fort", lv: g5 >= 34 ? 2 : 1, t: (g5 >= 34 ? "Tempête " : "Coup de vent ") + when(cv), d: "Rafales jusqu'à " + g5 + " nœuds (" + where(cv) + "). Petites embarcations : restez au port ou près de la rive." }); }
  return A.sort(function (a, b) { return b.lv - a.lv; });
}
function arrow(g, d, k, sz) { /* flèche dans le sens où va le vent */
  var a = svgEl("g", { transform: "rotate(" + ((d + 180) % 360) + ")" }, g);
  svgEl("path", { d: "M0,-" + sz + " L" + (sz * .55) + "," + (sz * .5) + " L0," + (sz * .2) + " L-" + (sz * .55) + "," + (sz * .5) + "Z", style: "fill:" + knCol(k) + ";stroke:var(--card);stroke-width:1" }, a);
}
function wxRender() {
  var AL = $("wxAlerts"), hb = $("homeWind");
  if (!WX || WX.err || !WX.st) {
    if (AL) { AL.textContent = ""; AL.appendChild(el("p", "mu", WX && WX.err ? "Données de vent indisponibles (pas de connexion ?). Consultez MétéoSuisse ci-dessous." : "Chargement des données de vent…")); }
    hb.hidden = true; return;
  }
  var A = wxAlertsCalc();
  /* bandeau accueil */
  hb.textContent = "";
  if (A.length) { hb.hidden = false; hb.className = "card windbar" + (A[0].lv === 2 ? " red" : ""); var hi = el("span", "ic"); hi.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h8"/></svg>'; hb.appendChild(hi); var d = el("div"); d.appendChild(el("b", 0, A[0].t)); d.appendChild(el("span", "mu", A.length > 1 ? "+ " + (A.length - 1) + " autre" + (A.length > 2 ? "s" : "") + " alerte" + (A.length > 2 ? "s" : "") + " · voir les balises ›" : "Voir les balises vent ›")); hb.appendChild(d); }
  else hb.hidden = true;
  if (!AL) return;
  AL.textContent = "";
  if (!A.length) { var c0 = el("div", "card wxal ok"); c0.appendChild(el("b", 0, "Pas d'alerte vent")); c0.appendChild(el("div", "mu", "Aucun vent fort prévu sur le lac dans les 12 prochaines heures.")); AL.appendChild(c0); }
  A.forEach(function (a) { var c = el("div", "card wxal" + (a.lv === 2 ? " red" : "")); c.appendChild(el("b", 0, a.t)); c.appendChild(el("div", "mu", a.d)); AL.appendChild(c); });
  /* échéances */
  var W = $("wxWhen"); W.textContent = "";
  [0, 3, 6, 9, 12].forEach(function (h) { var b = el("button", h === wxH ? "on" : "", h ? "+" + h + " h · " + hourTxt(wxAt(0, h).t) : "Maintenant"); b.onclick = function () { wxH = h; wxRender(); }; W.appendChild(b); });
  /* carte */
  var g = detailedLake($("wxMap"));
  BAL.forEach(function (b, i) {
    var v = wxAt(i, wxH); if (!v || v.s == null || b.hide) return;
    var n = svgEl("g", { class: "bal" + (b.id === wxSel ? " on" : ""), tabindex: 0, role: "button", "aria-label": b.n + " : " + Math.round(v.s) + " nœuds du " + dirTxt(v.d), transform: "translate(" + X2(b.lo).toFixed(1) + "," + Y2(b.la).toFixed(1) + ")" }, g);
    svgEl("circle", { class: "b", r: 13, style: "fill:var(--card);fill-opacity:.85" }, n);
    arrow(n, v.d, v.s, 9);
    var t = svgEl("text", { "text-anchor": "middle", y: 24 }, n); t.textContent = Math.round(v.s) + (v.g >= v.s + 5 ? "/" + Math.round(v.g) : "");
    n.onclick = function () { wxSel = b.id; wxRender(); var r = $("bl-" + b.id); if (r) r.scrollIntoView({ behavior: "smooth", block: "center" }); };
  });
  /* liste */
  var L = $("wxList"); L.textContent = "";
  BAL.forEach(function (b, i) {
    var v = wxAt(i, wxH); if (!v || v.s == null) return;
    var c = el("div", "card wxrow" + (b.id === wxSel ? " on" : "")); c.id = "bl-" + b.id;
    var s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "-14 -14 28 28"); s.setAttribute("width", 34); s.setAttribute("height", 34); arrow(s, v.d, v.s, 12); c.appendChild(s);
    var d = el("div"); d.appendChild(el("b", 0, b.n)); d.appendChild(el("span", "mu", "Du " + dirTxt(v.d) + " (" + Math.round(v.d) + "°)")); c.appendChild(d);
    var k = el("div", "kn", Math.round(v.s) + " nd"); k.style.color = knCol(v.s); k.appendChild(el("small", 0, "rafales " + Math.round(v.g) + " nd")); c.appendChild(k);
    L.appendChild(c);
  });
  var mn = Math.round((Date.now() - WX.at) / 6e4);
  $("wxSrc").textContent = "Valeurs du modèle météo (Open-Meteo, modèle MétéoSuisse), mises à jour il y a " + (mn < 1 ? "moins d'une minute" : mn + " min") + ". Les rafales locales peuvent être plus fortes : fiez-vous toujours aux feux d'avis de tempête.";
}
loadWind(); setInterval(function () { if (!document.hidden) loadWind(); }, 15 * 6e4);

/* ================= WEBCAMS ================= */
var CAMS = [
  { id: "cologny", n: "Genève – Cologny", d: "Vue sur la rade et le jet d'eau.", la: 46.218, lo: 6.180, u: "https://windy.com/webcams/1697037687", s: "Windy", k: "Vue directe" },
  { id: "geneve", n: "Genève – rade", d: "Panoramas 360° de la Société Nautique et de la plage du Vengeron.", la: 46.205, lo: 6.152, dx: -14, u: "https://www.windfinder.com/webcams/geneve", s: "Windfinder", k: "Page de webcams" },
  { id: "versoix", n: "Versoix", d: "Webcams autour de Versoix et du Petit-Lac.", la: 46.283, lo: 6.168, u: "https://en.windfinder.com/webcams/versoix_lac_leman", s: "Windfinder", k: "Page de webcams" },
  { id: "coppet", n: "Coppet & Nyon", d: "Panoramas 360° de Coppet et de Nyon.", la: 46.330, lo: 6.205, u: "https://en.windfinder.com/webcams/celigny_lac_leman", s: "Windfinder", k: "Page de webcams" },
  { id: "stcergue", n: "Saint-Cergue (hauteur)", d: "Vue en hauteur sur le lac, au-dessus de Nyon.", la: 46.446, lo: 6.158, u: "https://www.windy.com/webcams/1357314208", s: "Windy", k: "Vue directe" },
  { id: "stprex", n: "Saint-Prex", d: "Vue sud-est sur le lac et les Alpes françaises.", la: 46.478, lo: 6.455, u: "https://windy.com/webcams/1551967599", s: "Windy", k: "Vue directe" },
  { id: "lausanne", n: "Lausanne", d: "Vue sur la ville, la cathédrale et le lac.", la: 46.522, lo: 6.632, u: "https://www.snow-online.com/webcam/lausanne--lac-leman.htm", s: "Snow-Online", k: "Vue directe" },
  { id: "lutry", n: "Lutry", d: "Vue sur le lac depuis Lutry.", la: 46.502, lo: 6.685, u: "https://windy.com/webcams/1697035085", s: "Windy", k: "Vue directe" },
  { id: "cully", n: "Bourg-en-Lavaux (Cully)", d: "Vue plein sud sur le lac depuis Lavaux.", la: 46.488, lo: 6.732, u: "https://windy.com/webcams/1252954428", s: "Windy", k: "Vue directe" },
  { id: "vevey", n: "Vevey & La Tour-de-Peilz", d: "Panoramas 360° de Vevey, Chexbres et La Tour-de-Peilz.", la: 46.461, lo: 6.842, u: "https://www.windfinder.com/webcams/vevey", s: "Windfinder", k: "Page de webcams" },
  { id: "montreux", n: "Montreux", d: "Panoramas 360° de Montreux et des Rochers-de-Naye.", la: 46.432, lo: 6.910, u: "https://www.windfinder.com/webcams/montreux", s: "Windfinder", k: "Page de webcams" },
  { id: "bouveret", n: "Le Bouveret – Port-Valais", d: "Vidéo en direct du port de Port-Valais, au Bouveret.", la: 46.386, lo: 6.854, u: "https://www.youtube.com/live/Du8kmgjsOew", s: "YouTube · Port-Valais", k: "Vidéo en direct" },
  { id: "thonon", n: "Thonon – Port de Rives", d: "Vue sur le port de Rives. Webcams d'Évian à proximité sur la même page.", la: 46.377, lo: 6.478, u: "https://www.windy.com/webcams/1759008664", s: "Windy", k: "Vue directe" },
  { id: "sciez", n: "Sciez & Excenevex", d: "Webcams autour de Sciez, dont la plage d'Excenevex.", la: 46.347, lo: 6.358, u: "https://www.windfinder.com/webcams/sciez", s: "Windfinder", k: "Page de webcams" }];
var PORTXY = { gen: [46.212, 6.165], her: [46.302, 6.243], ver: [46.283, 6.168], cop: [46.315, 6.192], nyo: [46.382, 6.240], rol: [46.458, 6.337], spx: [46.478, 6.455], mor: [46.505, 6.497], ssu: [46.508, 6.560], vid: [46.517, 6.597], ouc: [46.505, 6.627], pul: [46.507, 6.660], lut: [46.502, 6.685], cul: [46.488, 6.730], vev: [46.461, 6.842], ltp: [46.453, 6.858], cla: [46.440, 6.893], vil: [46.400, 6.925], nov: [46.390, 6.890], bou: [46.383, 6.857], sgi: [46.390, 6.803], evi: [46.402, 6.590], tho: [46.377, 6.478], yvo: [46.372, 6.327] };
Object.keys(PGPS).forEach(function (k) { if (!PORTXY[k]) PORTXY[k] = PGPS[k]; });
var wcCur = null, wcPort = null;
function renderWebcams() {
  var g = detailedLake($("wcMap"));
  CAMS.forEach(function (c, i) {
    var n = svgEl("g", { class: "cam" + (c.id === wcCur ? " on" : ""), tabindex: 0, role: "button", "aria-label": c.n, transform: "translate(" + (X2(c.lo) + (c.dx || 0)).toFixed(1) + "," + Y2(c.la).toFixed(1) + ")" }, g);
    svgEl("circle", { r: 20, style: "fill:transparent" }, n); svgEl("circle", { class: "b", r: 11 }, n); var t = svgEl("text", { class: "num", "text-anchor": "middle", y: 4 }, n); t.textContent = i + 1;
    n.onclick = function () { wcPick(c.id, true); }; n.onkeydown = function (e) { if (e.key === "Enter") wcPick(c.id, true); };
  });
  var L = $("wcList"); L.textContent = "";
  CAMS.forEach(function (c, i) { var b = el("button", "item" + (c.id === wcCur ? " on" : "")), d = el("div"); b.appendChild(el("i", 0, i + 1)); d.appendChild(el("b", 0, c.n)); d.appendChild(el("span", "mu", c.k + " · " + c.s)); b.appendChild(d); b.onclick = function () { wcPick(c.id); window.scrollTo({ top: 0, behavior: "smooth" }); }; L.appendChild(b); });
  var c = CAMS.filter(function (x) { return x.id === wcCur; })[0] || CAMS[0], S = $("wcSel"); S.textContent = "";
  S.appendChild(el("b", 0, c.n)); S.lastChild.style.cssText = "font-size:18px;display:block"; S.appendChild(el("div", "mu", c.d)); S.appendChild(el("span", "pill", c.k + " · " + c.s));
  var a = el("a", "btn", "Voir la webcam"); a.href = c.u; a.target = "_blank"; a.rel = "noopener"; a.style.marginTop = "12px"; S.appendChild(a);
}
function wcPick(id, scroll) { wcCur = id; renderWebcams(); if (scroll) $("wcSel").scrollIntoView({ behavior: "smooth", block: "nearest" }); }
function wcFromHash() {
  var note = $("wcNote"), p = wcPort ? PORTXY[wcPort] : null; wcPort = null;
  if (!p) { note.hidden = true; if (!wcCur) wcCur = CAMS[0].id; return; }
  var best = null, bd = 1e9; CAMS.forEach(function (c) { var d = km(p[0], p[1], c.la, c.lo); if (d < bd) { bd = d; best = c; } });
  var pn = PORTS.filter(function (x) { return PORTXY[x.id] === p; })[0]; pn = pn ? pn.n : "ce port";
  note.hidden = false; note.textContent = (bd <= 12 ? "Webcam la plus proche de " : "Pas de webcam répertoriée près de ") + pn + (bd <= 12 ? " : " : ". La plus proche : ") + best.n + " (environ " + Math.max(1, Math.round(bd)) + " km).";
  wcCur = best.id;
}

/* ================= ESCALES ================= */
var RESTOS = [
  { id: "plage-ev", n: "Restaurant de la Plage & Buvette", l: "Genève – Eaux-Vives", r: "CH", a: "", la: 46.211, lo: 6.168, d: "Sur pilotis au bout de la plage des Eaux-Vives, avec vue sur le jet d'eau, la rade et le nouveau port." },
  { id: "belotte", n: "La Belotte", l: "Vésenaz (Genève)", r: "CH", a: "", la: 46.238, lo: 6.196, d: "Filets de perche du Léman à la minute selon arrivage, raclette au poêlon quand il fait frais." },
  { id: "gitana", n: "Auberge Port-Gitana", l: "Bellevue (Genève)", r: "CH", a: "", la: 46.255, lo: 6.157, d: "Hôtel-restaurant au calme sur la rive, avec accès direct à la plage." },
  { id: "petitlac", n: "Le Petit-Lac", l: "Corsier-Port (Genève)", r: "CH", a: "port", la: 46.268, lo: 6.226, d: "Sur le port de Corsier, pour l'un des plus beaux couchers de soleil de la région." },
  { id: "pavillon", n: "Le Pavillon", l: "Versoix", r: "CH", a: "ponton", la: 46.283, lo: 6.170, d: "Ambiance Riviera, avec un ponton qui accueille jusqu'à 6 bateaux." },
  { id: "3jetees", n: "Plage des Trois-Jetées", l: "Nyon", r: "CH", a: "ponton", la: 46.384, lo: 6.243, d: "Service à l'emporter pensé pour les navigateurs : on s'amarre, on commande, on repart." },
  { id: "barge", n: "La Barge du Léman", l: "Le Bouveret", r: "CH", a: "port", la: 46.387, lo: 6.857, d: "Dans le port du Bouveret, au bord de l'eau : grillades et boissons en terrasse." },
  { id: "sechex", n: "Le Léman", l: "Port de Séchex, Margencel", r: "FR", a: "ponton", la: 46.381, lo: 6.425, d: "Pêche du jour au gré des filets. Ponton privé pour les bateaux, débarcadère CGN à 300 m." },
  { id: "pecheurs", n: "Restaurant-Plage Les Pêcheurs", l: "Sciez", r: "FR", a: "ponton", la: 46.352, lo: 6.395, d: "Une institution depuis 1964, les pieds dans l'eau sous les platanes. Deux pontons privés ; réservation conseillée." },
  { id: "chaletport", n: "Le Chalet du Port", l: "Sciez", r: "FR", a: "port", la: 46.346, lo: 6.380, d: "Sur le port de Sciez : féra, perche et terrasse avec vue sur le lac. Aire de jeux pour les enfants." }];
var ACC = { ponton: ["Ponton du restaurant", "pt"], port: ["Au port", "pt"], non: ["Pas d'accès bateau", ""] };
var RF = [["tous", "Tous"], ["offres", "Offres membres"], ["bateau", "Accès en bateau"], ["CH", "Rive suisse"], ["FR", "Rive française"], ["user", "Ajouts des membres"]], reFilt = "tous", reCur = null;
RF.forEach(function (f) { var b = el("button", 0, f[1]); b.dataset.k = f[0]; b.onclick = function () { reFilt = f[0]; renderRestos(); }; $("reChips").appendChild(b); });
var PLACES = [["geneve",46.21,6.16,"CH"],["versoix",46.283,6.17,"CH"],["coppet",46.316,6.192,"CH"],["nyon",46.382,6.24,"CH"],["rolle",46.458,6.337,"CH"],["prex",46.48,6.455,"CH"],["morges",46.506,6.497,"CH"],["lausanne",46.507,6.627,"CH"],["ouchy",46.505,6.627,"CH"],["pully",46.507,6.66,"CH"],["lutry",46.502,6.685,"CH"],["cully",46.488,6.73,"CH"],["vevey",46.461,6.842,"CH"],["peilz",46.453,6.858,"CH"],["montreux",46.432,6.91,"CH"],["clarens",46.44,6.893,"CH"],["villeneuve",46.4,6.925,"CH"],["bouveret",46.386,6.856,"CH"],["gingolph",46.392,6.805,"CH"],["evian",46.402,6.59,"FR"],["thonon",46.376,6.48,"FR"],["yvoire",46.372,6.327,"FR"],["sciez",46.35,6.39,"FR"],["excenevex",46.347,6.358,"FR"],["hermance",46.302,6.243,"CH"],["meillerie",46.408,6.722,"FR"]];
function placeOf(l) { var s = norm(l); for (var i = 0; i < PLACES.length; i++) if (s.indexOf(PLACES[i][0]) >= 0) return PLACES[i]; return null; }
function today() { return new Date().toISOString().slice(0, 10); }
function paActive(x) { return x.jusqu >= today(); }
function allRestos() {
  var on = PA.filter(function (x) { return paActive(x) || isAdmin; });
  var taken = {}; on.forEach(function (x) { if (paActive(x)) taken[norm(x.nom)] = 1; });
  var pa = on.map(function (x) { var p = placeOf(x.lieu), j = (x.id % 7) - 3; return { id: "p" + x.id, pa: x, n: x.nom, l: x.lieu, a: x.acces, d: x.descr, r: p ? p[3] : "", la: p ? p[1] + j * .0012 : null, lo: p ? p[2] - j * .0018 : null }; });
  return pa.concat(RESTOS.concat(RU.map(function (x) { var p = placeOf(x.lieu), j = (x.id % 7) - 3; return { id: "u" + x.id, dbid: x.id, u: x.auteur, n: x.nom, l: x.lieu, a: x.acces, d: x.descr, r: p ? p[3] : "", la: p ? p[1] + j * .0015 : null, lo: p ? p[2] + j * .002 : null }; })).filter(function (x) { return !taken[norm(x.n)]; }));
}
function renderRestos() {
  Array.prototype.forEach.call($("reChips").children, function (b) { b.classList.toggle("on", b.dataset.k === reFilt); });
  var S = allRestos().filter(function (x) { return reFilt === "tous" || (reFilt === "offres" ? hasOffer(x) : reFilt === "bateau" ? (x.a === "ponton" || x.a === "port") : reFilt === "user" ? !!x.u : x.r === reFilt); });
  S.sort(function (a, b) { return (b.pa && paActive(b.pa) ? 1 : 0) - (a.pa && paActive(a.pa) ? 1 : 0) || alpha(a.n, b.n); }); /* partenaires d'abord, puis A → Z */
  var g = detailedLake($("reMap"));
  S.forEach(function (x) { if (x.la == null) return; var n = svgEl("g", { class: "pin" + (x.u ? " user" : "") + (x.pa ? " star" : "") + (x.id === reCur ? " on" : ""), transform: "translate(" + X2(x.lo).toFixed(1) + "," + Y2(x.la).toFixed(1) + ")" }, g);
    svgEl("circle", { r: 18, style: "fill:transparent" }, n); svgEl("circle", { class: "pb", r: x.id === reCur ? 10 : 8 }, n);
    n.onclick = function () { reCur = x.id; renderRestos(); var c = $("r-" + x.id); if (c) c.scrollIntoView({ behavior: "smooth", block: "center" }); }; });
  var L = $("reList"); L.textContent = "";
  if (!S.length) L.appendChild(el("p", "mu", reFilt === "offres" ? "Pas encore d'offre membres. Les restos partenaires arrivent bientôt !" : reFilt === "user" ? "Aucune adresse ajoutée pour l'instant. Soyez le premier !" : "Aucune adresse."));
  S.forEach(function (x) {
    var c = el("div", "card rcard" + (x.pa ? " partner" : "") + (x.id === reCur ? " on" : "")); c.id = "r-" + x.id;
    if (x.pa) c.appendChild(el("div", "pbadge", paActive(x.pa) ? "Partenaire Nauticonnect" : "Partenariat expiré (visible par l'admin seulement)"));
    c.appendChild(el("h3", 0, x.n)); c.appendChild(el("div", "where", x.l + (x.r ? " · " + (x.r === "CH" ? "Suisse" : "France") : "")));
    var T = el("div", "tags"), ac = ACC[x.a]; if (ac) T.appendChild(el("span", "tag " + ac[1], ac[0])); if (x.u) T.appendChild(el("span", "tag us", "Ajouté par " + ((P[x.u] && P[x.u].pseudo) || "un membre"))); c.appendChild(T);
    if (hasOffer(x)) {
      var of = el("div", "poffre"); of.appendChild(el("span", "pof-l", "Offre membres")); of.appendChild(el("div", "pof-t", x.pa.offre));
      var ob = el("button", "btn sm", real() ? "Montrer ma carte membre" : "Créer mon compte pour en profiter");
      ob.onclick = function () { if (requireProfile(null, "Pour profiter de l'offre membres chez " + x.n + ", créez votre compte gratuit. C'est l'affaire d'une minute.")) offerCard(x); };
      of.appendChild(ob); c.appendChild(of);
    } else if (x.pa && x.pa.offre) c.appendChild(el("div", "poffre", x.pa.offre));
    if (x.d) c.appendChild(el("div", 0, x.d));
    c.appendChild(thumb("resto-" + x.id, x.n, "Escale : " + x.n + " (plats, terrasse, ponton…)"));
    var A2 = el("div", "acts"), go = el("a", "p", "Y aller"); go.href = mapsSearch(x.n + " " + x.l); go.target = "_blank"; go.rel = "noopener"; A2.appendChild(go);
    if (x.pa && x.pa.tel) { var tl = el("a", 0, "Appeler"); tl.href = "tel:" + x.pa.tel.replace(/[^0-9+]/g, ""); A2.appendChild(tl); }
    if (x.pa && /^https?:\/\//.test(x.pa.site)) { var st = el("a", 0, "Site"); st.href = x.pa.site; st.target = "_blank"; st.rel = "noopener"; A2.appendChild(st); }
    var sh = el("button", 0, "Partager"); sh.onclick = function () { shareIt(x.n + " (" + x.l + ") : une escale à découvrir sur le Léman, repérée sur Nauticonnect.", "restos", "Partager cette escale"); }; A2.appendChild(sh);
    if (x.pa && isAdmin) { var ed = el("button", 0, "Modifier"); ed.onclick = function () { paFill(x.pa); }; A2.appendChild(ed); }
    if (x.u && (x.u === uid || isAdmin)) { var rm = el("button", 0, "Retirer"); rm.onclick = function () { sb.from("restos").delete().eq("id", x.dbid).then(function () { load("restos"); }); }; A2.appendChild(rm); }
    if (x.pa && isAdmin) c.appendChild(el("div", "mu", "Partenaire jusqu'au " + x.pa.jusqu.split("-").reverse().join(".")));
    c.appendChild(A2); c.onclick = function (e) { if (e.target.closest("a,button,.ph-thumb")) return; reCur = x.id; renderRestos(); }; L.appendChild(c);
  });
  $("paAdmin").hidden = !isAdmin;
}
/* ---- restos partenaires : gestion par l'admin ---- */
var paEdit = null;
function paMsg(t, ok) { $("paMsg").className = ok ? "okm" : "err"; $("paMsg").textContent = t || ""; }
function paFill(x) {
  paEdit = x ? x.id : null;
  $("paN").value = x ? x.nom : ""; $("paL").value = x ? x.lieu : ""; $("paA").value = x ? x.acces : "port";
  $("paO").value = x ? x.offre : ""; $("paD").value = x ? x.descr : ""; $("paT").value = x ? x.tel : ""; $("paS").value = x ? x.site : "";
  var d = new Date(); d.setFullYear(d.getFullYear() + 1); $("paJ").value = x ? x.jusqu : d.toISOString().slice(0, 10);
  $("paSave").textContent = x ? "Enregistrer les modifications" : "Ajouter le partenaire"; $("paDel").hidden = !x; $("paNew").hidden = !x; paMsg();
  if (x) $("paAdmin").scrollIntoView({ behavior: "smooth" });
}
$("paNew").onclick = function () { paFill(null); };
$("paSave").onclick = function () {
  if (!isAdmin) return;
  var n = $("paN").value.trim(), l = $("paL").value.trim(), t = $("paT").value.trim(), si = $("paS").value.trim();
  if (n.length < 2 || l.length < 2) { paMsg("Nom et lieu obligatoires."); return; }
  if (t && !/^[+0-9 ().\/-]{7,20}$/.test(t)) { paMsg("Numéro de téléphone invalide."); return; }
  if (si && !/^https?:\/\//.test(si)) si = "https://" + si;
  if (!$("paJ").value) { paMsg("Choisissez une date de fin."); return; }
  var d = { nom: n, lieu: l, acces: $("paA").value, offre: $("paO").value.trim(), descr: $("paD").value.trim(), tel: t, site: si, jusqu: $("paJ").value };
  $("paSave").disabled = true;
  (paEdit ? sb.from("partenaires").update(d).eq("id", paEdit) : sb.from("partenaires").insert(d)).then(function (r) {
    if (r.error) { paMsg("Enregistrement impossible : " + r.error.message); return; }
    var ok = paEdit ? "Partenaire mis à jour." : "Partenaire ajouté ! Il apparaît en tête de liste."; paFill(null); paMsg(ok, true); load("partenaires");
  }).then(function () { $("paSave").disabled = false; });
};
$("paDel").onclick = function () {
  if (!paEdit || !isAdmin) return;
  if ($("paDel").dataset.ok !== "1") { $("paDel").dataset.ok = "1"; $("paDel").textContent = "Confirmer la suppression"; return; }
  $("paDel").dataset.ok = ""; $("paDel").textContent = "Supprimer ce partenaire";
  sb.from("partenaires").delete().eq("id", paEdit).then(function () { paFill(null); paMsg("Partenaire supprimé.", true); load("partenaires"); });
};
paFill(null);
$("reAdd").onclick = function () {
  var m = $("reMsg"); m.className = "err"; m.textContent = ""; if (!memberOk(m, "Pour ajouter un restaurant, créez votre compte gratuit.")) return;
  var n = $("reN").value.trim(), l = $("reL").value.trim(); if (n.length < 2 || l.length < 2) { m.textContent = "Indiquez au moins le nom et le lieu."; return; }
  $("reAdd").disabled = true;
  sb.from("restos").insert({ nom: n, lieu: l, acces: $("reA").value, descr: $("reD").value.trim().slice(0, 140) }).then(function (r) {
    if (r.error) m.textContent = "Ajout impossible. Réessayez."; else { m.className = "okm"; m.textContent = "Merci ! L'adresse est visible par tous."; $("reN").value = $("reL").value = $("reD").value = ""; reFilt = "user"; load("restos"); }
  }).then(function () { $("reAdd").disabled = false; });
};

/* ================= ÉPAVES ================= */
var epEd = null, epPend = null, epSel = null;
function epCol(p) { return p <= 30 ? "#2e9e5b" : p <= 60 ? "#e08a00" : "#c0392b"; }
function renderEpaves() {
  var mk = baseMap($("epMap"), true);
  EP.forEach(function (w) { var x = X(w.lon), y = Y(w.lat); mk("circle", { cx: x, cy: y, r: epSel === w.id ? 12 : 9 }, "fill:" + epCol(+w.pm || 0) + ";stroke:#fff;stroke-width:3"); var h = mk("circle", { cx: x, cy: y, r: 16 }, "fill:transparent;cursor:pointer"); h.onclick = function (e) { e.stopPropagation(); epSel = w.id; renderEpaves(); }; });
  if (epPend) mk("circle", { cx: X(epPend.lon), cy: Y(epPend.lat), r: 11 }, "fill:none;stroke:#2d7ff9;stroke-width:4");
  var D = $("epDet"), L = $("epList"); D.textContent = ""; L.textContent = "";
  function card(w) { var c = el("div", "card"); c.appendChild(el("b", 0, w.nom + (w.annee ? " · " + w.annee : ""))); c.appendChild(el("div", "mu", "Profondeur max : " + (w.pm ? w.pm + " m" : "inconnue") + " · " + (w.approx ? "position approximative" : "position précise"))); if (w.note) c.appendChild(el("div", 0, w.note));
    if (uid && (w.auteur === uid || isAdmin)) { var b = el("button", "btn g sm", "Modifier"); b.onclick = function () { epOpen(w); }; c.appendChild(b); } return c; }
  EP.filter(function (w) { return w.id === epSel; }).forEach(function (w) { D.appendChild(card(w)); });
  EP.slice().sort(function (a, b) { return (+a.pm || 0) - (+b.pm || 0); }).forEach(function (w) { L.appendChild(card(w)); });
  if (!EP.length) L.appendChild(el("p", "mu", "Aucune épave pour l’instant."));
}
$("epMap").onclick = function (e) { if ($("epForm").hidden) return; epPend = svgPoint(this, e); $("epPs").textContent = "Position choisie : " + epPend.lat.toFixed(4) + ", " + epPend.lon.toFixed(4); renderEpaves(); };
function epOpen(w) { epEd = w ? w.id : null; $("epN").value = w ? w.nom : ""; $("epA").value = w ? w.annee || "" : ""; $("epP").value = w ? w.pm || "" : ""; $("epT").value = w ? w.note || "" : ""; $("epAp").checked = w ? !!w.approx : true; epPend = w ? { lat: w.lat, lon: w.lon } : null; $("epPs").textContent = w ? "Touchez la carte pour déplacer l’épave." : "Touchez la carte pour placer l’épave."; $("epForm").hidden = false; renderEpaves(); $("epMap").scrollIntoView({ behavior: "smooth" }); }
$("epAdd").onclick = function () { if (!memberOk($("epMsg"), "Pour ajouter une épave, créez votre compte gratuit.")) return; epOpen(null); };
$("epCx").onclick = function () { $("epForm").hidden = true; epPend = null; renderEpaves(); };
$("epSv").onclick = function () {
  var m = $("epMsg"); m.textContent = ""; var n = $("epN").value.trim(); if (!n) { m.textContent = "Nom requis."; return; } if (!epPend) { m.textContent = "Touchez la carte pour placer l’épave."; return; }
  var o = { nom: n, annee: $("epA").value.trim(), pm: parseInt($("epP").value, 10) || 0, note: $("epT").value.trim(), lat: epPend.lat, lon: epPend.lon, approx: $("epAp").checked, maj: nowIso() };
  (epEd ? sb.from("epaves").update(o).eq("id", epEd) : sb.from("epaves").insert(o)).then(function (r) { if (r.error) m.textContent = "Enregistrement refusé."; else { $("epForm").hidden = true; epPend = null; epEd = null; load("epaves"); } });
};

/* ================= VITESSE ================= */
var gRun = false, gWid = null, glp = null, gls = null, gDist = 0, gMax = 0, gEl = 0, gSt = 0, gTk = null, gWl = null;
function hav(a, b, c, d) { return km(a, b, c, d) * 1000; }
function gMsg(t) { $("gMsg").textContent = t || ""; }
function gTimer() { var s = Math.floor((gEl + (gRun ? Date.now() - gSt : 0)) / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), c = s % 60, p = function (n) { return (n < 10 ? "0" : "") + n; }; $("gTm").textContent = (h ? h + ":" : "") + p(m) + ":" + p(c); var hrs = (gEl + (gRun ? Date.now() - gSt : 0)) / 3.6e6; $("gAv").textContent = hrs > 0 ? (gDist / 1852 / hrs).toFixed(1) : "0.0"; }
function gOk(p) {
  var c = p.coords, t = p.timestamp; $("gAc").textContent = "±" + Math.round(c.accuracy) + " m";
  if (c.accuracy > 50) { gMsg("Signal GPS faible, attendez…"); return; } gMsg();
  var s = c.speed; if (s == null && glp) { var dt = (t - glp.t) / 1000; if (dt > 0) s = hav(glp.la, glp.lo, c.latitude, c.longitude) / dt; }
  var v = (s || 0) * 1.943844; if (v < .3) v = 0;
  $("gV").textContent = v.toFixed(1); $("gK").textContent = (v * 1.852).toFixed(1) + " km/h"; if (v > gMax) { gMax = v; $("gMx").textContent = gMax.toFixed(1); }
  if (c.heading != null && !isNaN(c.heading) && v > .5) $("gHd").textContent = Math.round(c.heading) + "° " + ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(c.heading / 45) % 8];
  if (!gls) gls = { la: c.latitude, lo: c.longitude }; else { var d = hav(gls.la, gls.lo, c.latitude, c.longitude); if (d > Math.max(5, c.accuracy / 2)) { gDist += d; gls = { la: c.latitude, lo: c.longitude }; $("gDs").textContent = (gDist / 1852).toFixed(2); } }
  glp = { la: c.latitude, lo: c.longitude, t: t };
}
function gStop() { gRun = false; gEl += Date.now() - gSt; if (gWid != null) navigator.geolocation.clearWatch(gWid); gWid = null; clearInterval(gTk); try { if (gWl) gWl.release(); } catch (e) {} gWl = null; $("gGo").textContent = "▶ Reprendre"; $("gGo").classList.remove("r"); $("gV").textContent = "0.0"; $("gK").textContent = "0.0 km/h"; }
$("gGo").onclick = function () {
  gMsg(); if (gRun) { gStop(); return; } if (!navigator.geolocation) { gMsg("GPS indisponible sur cet appareil."); return; }
  gRun = true; gSt = Date.now(); glp = null; gls = null; $("gGo").textContent = "Arrêter"; $("gGo").classList.add("r");
  gWid = navigator.geolocation.watchPosition(gOk, function (e) { gMsg(e.code === 1 ? "GPS refusé : autorisez la position pour Nauticonnect." : "Position indisponible, réessayez en extérieur."); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  gTk = setInterval(gTimer, 1000); try { navigator.wakeLock.request("screen").then(function (w) { gWl = w; }).catch(function () {}); } catch (e) {}
};
$("gRs").onclick = function () { if (gRun) gStop(); gDist = 0; gMax = 0; gEl = 0; glp = null; gls = null; ["gMx", "gAv", "gV"].forEach(function (i) { $(i).textContent = "0.0"; }); $("gDs").textContent = "0.00"; $("gK").textContent = "0.0 km/h"; $("gTm").textContent = "00:00"; $("gHd").textContent = "—"; $("gAc").textContent = "—"; $("gGo").textContent = "▶ Démarrer"; gMsg(); };

/* ================= NŒUDS ================= */
var KN = [
{n:"Nœud de huit",en:"Figure-eight knot",c:"Arrêt",d:1,u:"Bloquer le bout d’une écoute pour qu’elle ne s’échappe pas d’une poulie. Il se défait facilement, même après avoir été tendu.",s:["Faites une boucle en croisant le bout par-dessus le courant (la partie longue du cordage).","Passez le bout derrière le courant.","Ramenez-le devant et glissez-le dans la boucle, de l’avant vers l’arrière.","Serrez en tirant sur le bout et sur le courant : le nœud a la forme d’un 8."],t:"Laissez dépasser quelques centimètres de bout après avoir serré."},
{n:"Nœud plat",en:"Reef knot",c:"Jonction",d:1,u:"Relier deux bouts de même diamètre pour un usage léger : prendre un ris, fermer un sac ou une voile roulée.",s:["Prenez un bout dans chaque main.","Croisez le bout de droite sur celui de gauche et faites un demi-nœud (un tour de l’un autour de l’autre).","Croisez maintenant le bout qui est devenu à gauche sur celui de droite et refaites un demi-nœud.","Serrez en tirant sur les quatre brins. Les deux boucles doivent être symétriques."],t:"Mémo : « droite sur gauche, puis gauche sur droite ».",w:"Ne l’utilisez jamais pour relier deux cordages qui portent une charge importante : il peut se défaire. Si les boucles ne sont pas symétriques, c’est un nœud de vache qui glisse."},
{n:"Nœud de chaise",en:"Bowline",c:"Boucle",d:2,u:"Faire une boucle fixe au bout d’un cordage, qui ne se resserre pas : œil sur un anneau, écoute de foc, boucle de sécurité à passer autour d’un taquet. Il tient sous charge et se défait quand on le détend.",s:["Faites une petite boucle dans le courant, à la distance voulue du bout, en passant le bout par-dessus. Cette boucle est le « terrier du lapin ».","Le « lapin » (le bout) sort du terrier par le dessous.","Il fait le tour de l’« arbre » (le courant), par derrière.","Il redescend dans son terrier, par le dessus de la boucle.","Serrez en tirant sur le courant tout en tenant les deux brins de la boucle."],t:"Laissez au moins 10 cm de bout libre, ou davantage sur un cordage glissant. Un nœud de chaise tient mal sur du cordage très lisse.",w:"Sous charge très variable ou si le bout peut se mettre à flotter, assurez-le par une demi-clé de plus."},
{n:"Nœud de cabestan",en:"Clove hitch",c:"Amarrage",d:1,u:"Fixer rapidement un bout sur un poteau, une filière ou un anneau, par exemple pour suspendre un pare-battage. Facile à faire et à régler.",s:["Faites un tour autour du support avec le bout.","Croisez le bout par-dessus le courant et faites un second tour dans le même sens.","Glissez le bout sous ce second tour, entre le support et la croisée.","Serrez en tirant sur les deux brins."],t:"Il se règle en faisant glisser le nœud sur son support.",w:"Il peut se desserrer si la traction n’est pas constante : ajoutez une demi-clé pour un amarrage durable."},
{n:"Deux demi-clés",en:"Two half hitches",c:"Amarrage",d:1,u:"Amarrer un bateau à un anneau de quai ou à un poteau. Simple, solide et facile à défaire.",s:["Passez le bout dans l’anneau (ou autour du poteau).","Faites un tour autour du courant et glissez le bout dans la boucle formée : c’est la première demi-clé.","Recommencez dans le même sens pour faire la seconde demi-clé.","Serrez en glissant les demi-clés contre le support."],t:"Les deux demi-clés doivent être faites dans le même sens, sinon le nœud peut glisser."},
{n:"Tour mort et deux demi-clés",en:"Round turn and two half hitches",c:"Amarrage",d:2,u:"Amarrer sous forte traction : bateau au mouillage, remorquage, grosse houle. Le tour mort absorbe la traction pendant que l’on fait les demi-clés.",s:["Faites un tour complet (le « tour mort ») autour du support, voire deux si le bout glisse.","Tenez le courant fermement avec le tour mort pour garder la tension.","Faites deux demi-clés dans le même sens autour du courant.","Serrez le tout contre le support."],t:"Pratique pour un nœud qu’on doit pouvoir défaire même après une forte charge."},
{n:"Nœud de taquet",en:"Cleat hitch",c:"Amarrage",d:2,u:"Fixer une amarre ou une écoute sur un taquet. À maîtriser en priorité pour l’amarrage au port.",s:["Faites un tour complet autour de la base du taquet, sous les deux cornes.","Passez le bout par-dessus le taquet en diagonale, puis sous la corne opposée.","Revenez en diagonale par-dessus le taquet et faites un second huit.","Terminez par une demi-clé de blocage : passez une boucle autour d’une corne, le bout ressortant parallèle au courant."],t:"Deux huit suffisent. Plus de trois huit n’apportent rien et le nœud devient difficile à défaire.",w:"Si la demi-clé de blocage est faite à l’envers, elle ne bloque pas et le nœud peut glisser."},
{n:"Double nœud de pêcheur",en:"Double fisherman's knot",c:"Jonction",d:2,u:"Relier deux bouts fins de même diamètre (lignes, cordelettes). Très sûr et il ne glisse pas.",s:["Placez les deux bouts côte à côte, en sens opposés.","Avec le bout A, faites un double tour autour du courant de B, puis passez-le dans la boucle : c’est un nœud simple double.","Avec le bout B, faites la même chose autour du courant de A.","Tirez sur les deux courants pour que les deux nœuds se rejoignent et se serrent."],t:"Humidifiez la corde avant de serrer, cela aide sur les matériaux lisses."},
{n:"Nœud d’écoute",en:"Sheet bend",c:"Jonction",d:2,u:"Relier deux cordages de diamètres différents, par exemple une écoute à une amarre. Il est plus sûr que le nœud plat.",s:["Faites une boucle en U au bout du cordage le plus gros.","Passez le bout du cordage fin par l’arrière dans cette boucle.","Contournez ensuite les deux brins de la boucle.","Glissez le bout du cordage fin sous lui-même, puis serrez en tirant sur les courants."],t:"Si les diamètres sont très différents, faites un second tour autour de la boucle (nœud d’écoute double)."},
{n:"Nœud d’ancre",en:"Anchor bend",c:"Amarrage",d:3,u:"Fixer une ligne de mouillage à l’organeau (anneau) de l’ancre. Il résiste aux à-coups, aux secousses et au frottement.",s:["Passez deux fois le bout dans l’organeau pour faire un double tour.","Faites passer le bout autour du courant, puis sous les deux tours pour faire une première demi-clé.","Faites une seconde demi-clé autour du courant.","Serrez, puis assurez le bout avec un brin de fil si le mouillage doit rester longtemps en place."],t:"Vérifiez ce nœud avant chaque mouillage."},
{n:"Nœud de bois",en:"Timber hitch",c:"Divers",d:2,u:"Tirer, hisser ou remorquer un objet de forme cylindrique : tronc, espar, bidon. Il se serre sous la traction et se défait facilement.",s:["Passez le bout autour de l’objet.","Faites passer le bout autour de son propre courant.","Faites au moins trois tours en torsade du bout autour de lui-même, vers l’objet.","Tirez sur le courant : le nœud se serre sur l’objet."],t:"Plus l’objet est lisse, plus il faut faire de torsades."},
{n:"Nœud de jambe de chien",en:"Sheepshank",c:"Divers",d:3,u:"Raccourcir temporairement un cordage sans le couper, ou isoler une partie usée. Il ne tient que sous tension.",s:["Repliez le cordage en forme de Z pour obtenir la longueur à raccourcir (trois brins parallèles).","À chaque extrémité, faites une demi-clé autour du pli voisin.","Serrez les deux demi-clés.","Tendez le cordage : le nœud tient."],t:"Un cordage tendu en permanence peut s’abîmer au niveau des plis.",w:"Il se défait dès que la tension disparaît : ne l’utilisez pas pour une charge qui fluctue."}];
var KNIMG = ["huit", "plat", "chaise", "cabestan", "demicles", "tourmort", "taquet", "pecheur", "ecoute", "ancre", "bois", "jambe"];
function knProg() { var n = KN.filter(function (k, i) { return ls("kn" + i) === "1"; }).length; $("knPg").textContent = "Appris : " + n + " sur " + KN.length; $("knPb").style.width = (n * 100 / KN.length) + "%"; }
function renderNoeuds() {
  var L = $("knList"), q = norm($("knQ").value), fc = $("knC").value; L.textContent = "";
  KN.forEach(function (k, i) {
    if (fc && k.c !== fc) return; if (norm(k.n + " " + k.en + " " + k.u + " " + k.c).indexOf(q) < 0) return;
    var d = el("details", "kn"), s = el("summary"), l = el("div"); if (KNIMG[i]) { var th = el("img", "knth"); th.src = "noeuds/" + KNIMG[i] + ".svg?v=1"; th.alt = ""; th.loading = "lazy"; s.appendChild(th); } l.appendChild(el("b", 0, k.n)); l.appendChild(el("span", "mu", k.en + " · " + k.c + " · " + ["Facile", "Moyen", "Avancé"][k.d - 1])); s.appendChild(l);
    var ok = el("span", "okm", ls("kn" + i) === "1" ? "✓" : ""); ok.style.fontSize = "20px"; s.appendChild(ok); d.appendChild(s);
    var n = el("div", "kin");
    if (KNIMG[i]) { var fg = el("figure", "knimg"), im = el("img"); im.src = "noeuds/" + KNIMG[i] + ".svg?v=1"; im.alt = "Dessin du " + k.n.toLowerCase(); im.loading = "lazy"; fg.appendChild(im); fg.appendChild(el("figcaption", 0, "Le rond marque le bout (l'extrémité libre). Là où la corde est coupée, elle passe dessous.")); n.appendChild(fg); }
    n.appendChild(el("div", 0, k.u)); var o = el("ol"); k.s.forEach(function (t) { o.appendChild(el("li", 0, t)); }); n.appendChild(o);
    if (k.t) n.appendChild(el("div", "tip", "Astuce : " + k.t)); if (k.w) n.appendChild(el("div", "wr", "À éviter : " + k.w));
    var lb = el("label", "sw"), cb = el("input"); cb.type = "checkbox"; cb.checked = ls("kn" + i) === "1"; cb.onchange = function () { ls("kn" + i, cb.checked ? "1" : "0"); ok.textContent = cb.checked ? "✓" : ""; knProg(); }; lb.appendChild(cb); lb.appendChild(el("b", 0, "Je sais le faire")); n.appendChild(lb);
    d.appendChild(n); L.appendChild(d);
  });
  if (!L.firstChild) L.appendChild(el("p", "mu", "Aucun nœud trouvé.")); knProg();
}
$("knQ").oninput = renderNoeuds; $("knC").onchange = renderNoeuds;

/* ================= ANNONCES ================= */
var CATS = ["Moteurs et hélices", "Voiles et gréement", "Électronique et GPS", "Sécurité", "Ancres et mouillage", "Remorques", "Annexes et pneumatiques", "Bateaux", "Plongée et loisirs", "Autre"];
var COL = { Vente: "#1f8a4c", Troc: "#0b6fa4", Don: "#c26a00", Recherche: "#7a3fb0" }, anEd = null;
function anTyL(t) { return t === "Recherche" ? "Je recherche" : t; }
/* formulaire : libellés adaptés quand on cherche un objet */
function anTyUI() { var r = $("anTy").value === "Recherche"; $("anPrL").textContent = r ? "Budget max (CHF, facultatif)" : "Prix (CHF)"; $("anTi").placeholder = r ? "Ex. Pare-battage d'occasion" : "Ex. Moteur hors-bord 15 CV, révisé"; $("anEt").parentNode.hidden = r; }
$("anTy").onchange = anTyUI;
var fo = el("option", 0, "Toutes les catégories"); fo.value = ""; $("anFc").appendChild(fo);
CATS.forEach(function (c) { $("anFc").appendChild(el("option", 0, c)); $("anCt").appendChild(el("option", 0, c)); });
function anMsg(t) { $("anMsg").textContent = t || ""; }
function renderAnnonces() {
  var L = $("anList"); L.textContent = ""; var q = norm($("anQ").value), ft = $("anFt").value, fc = $("anFc").value;
  AN.filter(function (a) { return (!ft || a.type === ft) && (!fc || a.cat === fc) && norm([a.titre, a.descr, a.lieu, a.cat].join(" ")).indexOf(q) > -1; }).forEach(function (a) {
    var c = el("div", "card"), h = el("div"), b = el("span", "bdg", anTyL(a.type)), R = a.type === "Recherche"; b.style.background = COL[a.type] || "#555"; h.appendChild(b); h.appendChild(el("b", 0, a.titre)); c.appendChild(h);
    c.appendChild(el("div", "price", R ? (+a.prix ? "Budget : " + a.prix + " CHF" : "Budget à discuter") : a.type === "Vente" ? (+a.prix ? a.prix + " CHF" : "Prix à discuter") : a.type === "Don" ? "Gratuit" : "Troc"));
    c.appendChild(el("div", "mu", [a.cat, R ? "" : a.etat, a.lieu].filter(Boolean).join(" · "))); if (a.descr) c.appendChild(el("div", 0, a.descr));
    var by = el("div", "mu"); by.style.marginTop = "6px"; by.appendChild(document.createTextNode("Par ")); by.appendChild(badge(a.auteur)); by.appendChild(document.createTextNode(" · " + ago(a.maj))); c.appendChild(by);
    if (a.auteur === uid || isAdmin) {
      var e = el("button", "btn g sm", "Modifier"); e.onclick = function () { anOpen(a); }; c.appendChild(e);
      var d = el("button", "btn g sm", R ? "Retirer (trouvé)" : "Retirer (vendu / donné)"); d.onclick = function () { sb.from("annonces").delete().eq("id", a.id).then(function () { load("annonces"); }); }; c.appendChild(d);
    } else {
      var k = el("button", "btn sm", R ? "J'en ai un, je le contacte" : "Contacter"); k.onclick = function () { openThread(a.auteur, R ? "Bonjour, j'ai peut-être ce que vous recherchez (« " + a.titre + " »). " : "Bonjour, votre annonce « " + a.titre + " » m'intéresse. "); }; c.appendChild(k);
      var r = el("button", "btn g sm", "Signaler"); r.onclick = function () { if (!guestOk(function () { r.onclick(); })) return; sb.from("signalements").insert({ quoi: "annonce", ref: String(a.id) }).then(function () { r.textContent = "Signalée"; r.disabled = true; }); }; c.appendChild(r);
    }
    L.appendChild(c);
  });
  if (!L.firstChild) L.appendChild(el("p", "mu", "Aucune annonce pour l’instant. Publiez la première !"));
}
function anOpen(a) { anEd = a ? a.id : null; $("anTi").value = a ? a.titre : ""; $("anTy").value = a ? a.type : "Vente"; $("anPr").value = a ? a.prix || "" : ""; $("anCt").value = a ? a.cat : CATS[0]; $("anEt").value = a ? a.etat : "Bon"; $("anLo").value = a ? a.lieu || "" : ""; $("anDs").value = a ? a.descr || "" : ""; $("anForm").hidden = false; anTyUI(); $("anForm").scrollIntoView({ behavior: "smooth" }); }
$("anAdd").onclick = function () { anMsg(); if (!memberOk($("anMsg"), "Pour publier une annonce, créez votre compte gratuit.")) return; anOpen(null); };
$("anAddR").onclick = function () { anMsg(); if (!memberOk($("anMsg"), "Pour publier une recherche, créez votre compte gratuit.")) return; anOpen(null); $("anTy").value = "Recherche"; anTyUI(); $("anTi").focus(); };
$("anCx").onclick = function () { $("anForm").hidden = true; anEd = null; };
$("anSv").onclick = function () {
  anMsg(); var t = $("anTi").value.trim(); if (t.length < 2) { anMsg("Titre requis."); return; }
  var o = { titre: t, type: $("anTy").value, prix: ($("anTy").value === "Vente" || $("anTy").value === "Recherche") ? +$("anPr").value || 0 : 0, cat: $("anCt").value, etat: $("anEt").value, lieu: $("anLo").value.trim(), descr: $("anDs").value.trim(), maj: nowIso() };
  (anEd ? sb.from("annonces").update(o).eq("id", anEd) : sb.from("annonces").insert(o)).then(function (r) { if (r.error) anMsg("Publication impossible. Réessayez."); else { $("anForm").hidden = true; anEd = null; load("annonces"); toast("Annonce publiée"); } });
};
["anQ", "anFt", "anFc"].forEach(function (i) { $(i).oninput = renderAnnonces; $(i).onchange = renderAnnonces; });

/* ================= LOCATION ENTRE MEMBRES ================= */
var LTYPES = ["Bateau à moteur", "Voilier", "Pneumatique / semi-rigide", "Wakeboard / ski", "Bateau sans permis", "Paddle / kayak", "Autre"];
LTYPES.forEach(function (t) { $("loFt").appendChild(el("option", 0, t)); $("loTy").appendChild(el("option", 0, t)); });
var loEd = null;
function loMsg(t) { $("loMsg").textContent = t || ""; }
function chf(n) { return (+n || 0).toLocaleString("fr-CH") + " CHF"; }
function loCard(x, mod) {
  var c = el("div", "card loc" + (!x.actif || x.signale ? " off" : ""));
  c.appendChild(el("b", 0, x.nom)); c.lastChild.style.cssText = "font-size:18px;display:block";
  c.appendChild(el("div", "mu", x.type + (x.port ? " · " + x.port : "") + " · " + x.places + " pers. max."));
  var tg = el("div", "tags"); tg.appendChild(el("span", "pill", x.permis ? "Permis requis" : "Sans permis")); if (x.skipper) tg.appendChild(el("span", "pill", "Skipper possible")); if (+x.caution) tg.appendChild(el("span", "pill", "Caution " + chf(x.caution)));
  if (x.signale) tg.appendChild(el("span", "pill", "Signalée, en vérification")); else if (!x.actif) tg.appendChild(el("span", "pill", "En pause")); c.appendChild(tg);
  var pr = [+x.prix_demi ? "½ journée " + chf(x.prix_demi) : "", +x.prix_jour ? "journée " + chf(x.prix_jour) : ""].filter(Boolean).join(" · ");
  c.appendChild(el("div", "price", pr || "Prix à discuter"));
  if (x.descr) c.appendChild(el("div", 0, x.descr));
  c.appendChild(thumb("loc-" + x.id, x.nom, "Photos du bateau " + x.nom));
  var by = el("div", "mu"); by.style.marginTop = "6px"; by.appendChild(document.createTextNode("Proposé par ")); by.appendChild(badge(x.auteur)); by.appendChild(document.createTextNode(" · " + ago(x.maj))); c.appendChild(by);
  var A = el("div", "lacts");
  if (mod) {
    var ok = el("button", "btn sm", "✓ Rétablir"); ok.onclick = function () { sb.from("locations").update({ signale: false }).eq("id", x.id).then(function () { load("locations"); toast("Annonce rétablie"); }); }; A.appendChild(ok);
  }
  if (x.auteur === uid || isAdmin) {
    if (x.auteur === uid) { var e = el("button", "btn g sm", "Modifier"); e.onclick = function () { loOpen(x); }; A.appendChild(e);
      var pa = el("button", "btn g sm", x.actif ? "Mettre en pause" : "Réactiver"); pa.onclick = function () { sb.from("locations").update({ actif: !x.actif }).eq("id", x.id).then(function () { load("locations"); }); }; A.appendChild(pa); }
    var d = el("button", "btn g sm", "Supprimer"); d.onclick = function () { if (confirm("Supprimer cette annonce de location ?")) sb.from("locations").delete().eq("id", x.id).then(function () { load("locations"); toast("Annonce supprimée"); }); }; A.appendChild(d);
  } else {
    var k = el("button", "btn sm", "Demander une location"); k.onclick = function () { loAsk(x); }; A.appendChild(k);
    var r = el("button", "btn g sm", "Signaler"); r.onclick = function () { if (!confirm("Signaler cette annonce ? Elle sera masquée et vérifiée.")) return; if (!guestOk(function () { r.onclick(); })) return; sb.from("signalements").insert({ quoi: "location", ref: String(x.id) }).then(function () { LO = LO.filter(function (y) { return y.id !== x.id; }); renderLoc(); toast("Annonce signalée. Merci !"); }); }; A.appendChild(r);
  }
  c.appendChild(A); return c;
}
function renderLoc() {
  var q = norm($("loQ").value), ft = $("loFt").value, fp = $("loFp").value, L = $("loList"), M2 = $("loMod"); L.textContent = ""; M2.textContent = "";
  var rep = LO.filter(function (x) { return x.signale; });
  if (isAdmin && rep.length) { M2.appendChild(el("h2", 0, "Annonces signalées (" + rep.length + ")")); rep.forEach(function (x) { M2.appendChild(loCard(x, true)); }); }
  var mine = LO.filter(function (x) { return x.auteur === uid; });
  if (mine.length) { L.appendChild(el("h2", 0, "Mes bateaux en location")); mine.forEach(function (x) { L.appendChild(loCard(x)); }); L.appendChild(el("h2", 0, "Bateaux à louer")); }
  var n = 0;
  LO.filter(function (x) { return x.actif && !x.signale && x.auteur !== uid && (!ft || x.type === ft) && (!fp || (fp === "non" ? !x.permis : x.skipper)) && norm([x.nom, x.type, x.port, x.descr].join(" ")).indexOf(q) > -1; })
    .forEach(function (x) { L.appendChild(loCard(x)); n++; });
  if (!n) L.appendChild(el("p", "mu", LO.length ? "Aucun bateau ne correspond à votre recherche." : "Pas encore de bateau à louer. Proposez le vôtre !"));
}
function loOpen(x) {
  loEd = x ? x.id : null; $("loNo").value = x ? x.nom : ""; $("loTy").value = x ? x.type : LTYPES[0]; $("loPo").value = x ? x.port : ((me() && me().port) || "");
  $("loPl").value = x ? x.places : 6; $("loCa").value = x && +x.caution ? x.caution : ""; $("loPd").value = x && +x.prix_demi ? x.prix_demi : ""; $("loPj").value = x && +x.prix_jour ? x.prix_jour : "";
  $("loPe").checked = x ? x.permis : true; $("loSk").checked = x ? x.skipper : false; $("loDs").value = x ? x.descr : "";
  $("loSv").textContent = x ? "Enregistrer" : "Publier"; $("loForm").hidden = false; $("loForm").scrollIntoView({ behavior: "smooth" });
}
$("loAdd").onclick = function () { loMsg(); if (!requireProfile($("loMsg"), "Pour proposer votre bateau en location, créez votre compte gratuit.")) return; loOpen(null); };
$("loCx").onclick = function () { $("loForm").hidden = true; loEd = null; };
$("loTy").onchange = function () { if (this.value === "Bateau sans permis" || this.value === "Paddle / kayak") $("loPe").checked = false; };
$("loSv").onclick = function () {
  loMsg(); var nm = $("loNo").value.trim(); if (nm.length < 2) { loMsg("Indiquez le nom ou le modèle du bateau."); return; }
  if (!$("loPo").value.trim()) { loMsg("Indiquez le port."); return; }
  var o = { nom: nm, type: $("loTy").value, port: $("loPo").value.trim(), places: Math.min(30, Math.max(1, +$("loPl").value || 1)), caution: Math.max(0, +$("loCa").value || 0),
    prix_demi: Math.max(0, +$("loPd").value || 0), prix_jour: Math.max(0, +$("loPj").value || 0), permis: $("loPe").checked, skipper: $("loSk").checked, descr: $("loDs").value.trim() };
  $("loSv").disabled = true;
  (loEd ? sb.from("locations").update(o).eq("id", loEd) : sb.from("locations").insert(o)).then(function (r) {
    if (r.error) { loMsg("Publication impossible. Réessayez."); return; }
    $("loForm").hidden = true; toast(loEd ? "Annonce mise à jour" : "Bateau publié ! Ajoutez des photos pour donner envie."); loEd = null; load("locations");
  }).then(function () { $("loSv").disabled = false; });
};
function loAsk(x) {
  if (!requireProfile()) return;
  var md = modal("Demander « " + x.nom + " »"), bx = md.bx;
  var d = el("input", "f"); d.type = "date"; d.min = new Date().toISOString().slice(0, 10); d.value = d.min;
  var du = el("select", "f"); ["½ journée (matin)", "½ journée (après-midi)", "Journée", "Plusieurs jours"].forEach(function (t) { du.appendChild(el("option", 0, t)); });
  var pe = el("input", "f"); pe.type = "number"; pe.min = 1; pe.max = x.places; pe.value = Math.min(2, x.places);
  var sk = el("label", "chk"), skc = el("input"); skc.type = "checkbox"; sk.appendChild(skc); sk.appendChild(document.createTextNode(" Avec le propriétaire comme skipper")); 
  [["Date", d], ["Durée", du], ["Nombre de personnes (max. " + x.places + ")", pe]].forEach(function (f) { var l = el("label", "l", f[0]); bx.appendChild(l); bx.appendChild(f[1]); });
  if (x.skipper) bx.appendChild(sk);
  if (x.permis) bx.appendChild(el("div", "note", "Ce bateau demande un permis : le propriétaire voudra le voir le jour de la location."));
  var go = el("button", "btn", "Préparer le message"); bx.appendChild(go);
  go.onclick = function () {
    var dt = d.value ? new Date(d.value + "T12:00").toLocaleDateString("fr-CH", { weekday: "short", day: "numeric", month: "short" }) : "?";
    var t = "Location « " + x.nom.slice(0, 30) + " » : " + dt + ", " + du.value + ", " + (+pe.value || 1) + " pers." + (skc.checked ? ", avec skipper" : "") + ". Dispo ? ";
    md.close(); openThread(x.auteur, t.slice(0, 190));
  };
}
["loQ", "loFt", "loFp"].forEach(function (i) { $(i).oninput = renderLoc; $(i).onchange = renderLoc; });

/* ================= NOTIFICATIONS PUSH ================= */
var pushOk = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!CFG.vapid;
var mySub = null, myAbo = null;
function b64u(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var r = atob(s), a = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; }
function swReg() { return navigator.serviceWorker.getRegistration().then(function (r) { return r || navigator.serviceWorker.register("sw.js"); }).then(function () { return navigator.serviceWorker.ready; }); }
var pushKnown = false;
function pushRefresh() {
  if (!pushOk || !real()) { mySub = null; myAbo = null; pushKnown = true; notifUI(); return Promise.resolve(); }
  var r; return swReg().then(function (x) { r = x; return r.pushManager.getSubscription(); }).then(function (s) {
    if (!s && Notification.permission === "granted" && !ls("nc-push-off")) return r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(CFG.vapid) }).then(function (n) { return pushSave(n); }); /* déjà autorisé : on réabonne sans rien demander */
    mySub = s; if (!s) { myAbo = null; pushKnown = true; notifUI(); return; }
    return sb.from("push_abos").select("*").eq("endpoint", s.endpoint).maybeSingle().then(function (r) {
      myAbo = r.data || null; pushKnown = true;
      if (!myAbo && Notification.permission === "granted" && !ls("nc-push-off")) return pushSave(s); /* réabonner ce compte sur cet appareil */
      if (myAbo && (myAbo.lang || "fr") !== (window.NC_LANG === "de" ? "de" : "fr")) return pushSave(s, {}); /* langue des notifications = langue de l'appli */
      notifUI();
    });
  }).catch(function () { pushKnown = true; notifUI(); });
}
function pushSave(s, prefs) {
  var j = s.toJSON(), o = { endpoint: s.endpoint, uid: uid, p256dh: j.keys.p256dh, auth: j.keys.auth, maj: nowIso(), lang: window.NC_LANG === "de" ? "de" : "fr" };
  if (prefs) for (var k in prefs) o[k] = prefs[k];
  return sb.from("push_abos").upsert(o, { onConflict: "endpoint" }).select().maybeSingle().then(function (r) { if (r.error) throw r.error; myAbo = r.data; mySub = s; pushKnown = true; notifUI(); });
}
/* navigateur Samsung ou Chrome : le chemin des réglages n'est pas le même */
/* appli Play Store (TWA) : Android ouvre la page avec un referrer android-app://, on s'en souvient */
try { if (/^android-app:\/\//.test(document.referrer)) ls("nc-twa", "1"); } catch (e) {}
function isTwa() { return ls("nc-twa") === "1"; }
function notifHelp() {
  if (isTwa()) return "Autorisez-les dans les réglages du téléphone : Applications › Nauticonnect Léman › Notifications › Activer. Revenez ensuite ici et appuyez sur « Réparer les notifications ».";
  return /SamsungBrowser/.test(navigator.userAgent)
    ? "Autorisez-les dans Samsung Internet : menu ☰ › Paramètres › Sites et téléchargements › Notifications, puis autorisez Nauticonnect (et vérifiez Réglages du téléphone › Applications › Samsung Internet › Notifications)."
    : "Autorisez-les dans les réglages du téléphone : Applications › Chrome › Notifications, puis dans Chrome : ⋮ › Paramètres › Paramètres des sites › Notifications.";
}
/* une étape qui ne répond pas (fenêtre d'autorisation bloquée, etc.) ne doit pas laisser le bouton muet */
function withTimeout(p, ms, what) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error("délai dépassé : " + what)); }, ms); })]); }
function pushLog(log) { try { if (sb && real()) sb.from("push_diag").insert({ info: { log: log, ua: navigator.userAgent, standalone: matchMedia("(display-mode: standalone)").matches, auto: true } }).then(function () {}); } catch (e) {} }
function pushEnable(prefs) {
  if (!pushOk) { toast("Votre navigateur ne gère pas les notifications. Installez l'appli sur l'écran d'accueil."); pushLog(["navigateur non compatible"]); return; }
  if (!requireProfile(null, "Pour recevoir l'alerte vaudaire et les appels à l'aide sur votre téléphone, créez votre compte gratuit.")) return; ls("nc-push-off", "");
  var log = ["autorisation avant : " + Notification.permission];
  toast("Activation des notifications…");
  withTimeout(Notification.requestPermission(), 20000, "fenêtre d'autorisation").then(function (p) {
    log.push("autorisation après : " + p);
    if (p !== "granted") { pushLog(log); toast("Notifications bloquées. " + notifHelp(), 9000); notifUI(); return; }
    return withTimeout(swReg(), 15000, "service worker").then(function (r) { log.push("service worker : ok"); return r.pushManager.getSubscription().then(function (s) { return s || withTimeout(r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(CFG.vapid) }), 20000, "abonnement"); }); })
      .then(function (s) { log.push("abonnement : ok"); return pushSave(s, prefs && prefs.vent ? prefs : null); }).then(function () { log.push("enregistré : ok"); pushLog(log); toast(prefs && prefs.vent ? "Alerte vaudaire activée sur ce téléphone !" : "Notifications activées !"); renderVd(); });
  }).catch(function (e) {
    log.push("ERREUR : " + ((e && (e.name + " " + e.message)) || e)); pushLog(log);
    toast(/délai/.test(String(e && e.message)) ? "Le téléphone ne répond pas. Fermez complètement l'appli, rouvrez-la et réessayez. Si ça bloque encore : " + notifHelp() : "Activation impossible. Réessayez.", 9000);
  });
}
function pushDisable() {
  var s = mySub; if (!s) return Promise.resolve();
  return sb.from("push_abos").delete().eq("endpoint", s.endpoint).then(function () { return s.unsubscribe(); }).then(function () { mySub = null; myAbo = null; notifUI(); });
}
function notifUI() {
  var on = !!(mySub && myAbo), den = pushOk && Notification.permission === "denied";
  $("nfState").textContent = !pushOk ? "Pas disponible sur ce navigateur. Installez l'appli sur l'écran d'accueil (Chrome)." : den ? "Bloquées sur ce téléphone. " + notifHelp() : on ? "Activées sur ce téléphone." : "Désactivées.";
  if ($("nfSum")) $("nfSum").textContent = on ? "Activées" : den ? "Bloquées" : "Désactivées";
  $("nfOn").hidden = on || !pushOk || den; $("nfPrefs").hidden = !on;
  if (on) { $("nfMsg").checked = myAbo.msg; $("nfSos").checked = myAbo.sos; $("nfVent").checked = myAbo.vent; $("nfAstuce").checked = myAbo.astuce !== false; }
  var ask = $("notifAsk"); ask.hidden = !(pushOk && me() && !on && !den && !ls("nc-notif-later"));
  if ($("waNotif")) $("waNotif").hidden = !(pushOk && me() && !on && !den);
  renderVd();
}
["nfMsg", "nfSos", "nfVent", "nfAstuce"].forEach(function (id) { $(id).onchange = function () { if (!mySub) return; pushSave(mySub, { msg: $("nfMsg").checked, sos: $("nfSos").checked, vent: $("nfVent").checked, astuce: $("nfAstuce").checked }).then(function () { toast("Préférences enregistrées"); }); }; });
$("nfOn").onclick = function () { pushEnable(); }; $("notifAskGo").onclick = function () { pushEnable(); }; $("waNotifGo").onclick = function () { pushEnable(); };
$("notifAskNo").onclick = function () { ls("nc-notif-later", "1"); $("notifAsk").hidden = true; };
$("nfOff").onclick = function () { ls("nc-push-off", "1"); pushDisable().then(function () { toast("Notifications désactivées"); }); };
/* diagnostic : chaque étape est affichée et envoyée à l'admin */
$("nfFix").onclick = function () {
  var D = $("nfDiag"), log = [], step = function (t) { log.push(t); D.textContent = log.join("\n"); };
  var send = function () { if (sb && real()) sb.from("push_diag").insert({ info: { log: log, ua: navigator.userAgent, standalone: matchMedia("(display-mode: standalone)").matches } }).then(function () {}); };
  ls("nc-push-off", ""); D.textContent = "";
  step("Navigateur compatible : " + (pushOk ? "oui" : "non")); if (!pushOk) { send(); return; }
  step("Autorisation : " + Notification.permission);
  if (!requireProfile()) { step("Pas connecté"); return; }
  Notification.requestPermission().then(function (p) {
    step("Autorisation après demande : " + p); if (p !== "granted") throw new Error("autorisation refusée");
    return swReg();
  }).then(function (r) {
    step("Service worker : " + (r.active ? "actif (" + (r.active.scriptURL.split("/").pop()) + ")" : "inactif"));
    return r.showNotification("Nauticonnect · test direct", { body: "Si vous voyez ceci, le téléphone peut afficher les notifications.", icon: "icon-192.png", tag: "local" })
      .then(function () { step("Notification directe : affichée par l'appli"); }, function (e) { step("Notification directe : ERREUR " + (e && e.message)); })
      .then(function () { return r; });
  }).then(function (r) {
    return r.pushManager.getSubscription().then(function (s) { step("Ancien abonnement : " + (s ? "oui, supprimé" : "aucun")); return s ? s.unsubscribe().then(function () { return r; }) : r; });
  }).then(function (r) {
    return r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(CFG.vapid) });
  }).then(function (s) {
    step("Nouvel abonnement : " + s.endpoint.split("/")[2]);
    return pushSave(s);
  }).then(function () {
    step("Enregistré dans la base : oui");
    return sb.rpc("push_test");
  }).then(function (r) {
    step(r && r.error ? "Test : erreur " + r.error.message : "Test envoyé. Une notification doit arriver dans quelques secondes.");
    send(); toast("Diagnostic terminé");
  }).catch(function (e) { step("ERREUR : " + (e && (e.name + " " + e.message) || e)); send(); });
};
$("nfTest").onclick = function () { sb.rpc("push_test").then(function (r) { toast(r.error ? "Test impossible." : "Notification de test envoyée…"); }); };

/* ================= INVITER UN AMI ================= */
var INV_TXT = "Rejoins-moi sur Nauticonnect, l'appli des plaisanciers du Léman : chat, entraide en cas de panne, vent et météo du lac";
/* inviter : QR code à faire scanner (Android et iPhone), ou envoi du lien */
function invite() {
  var url = location.origin + location.pathname + "?src=qr", md = modal("Inviter un ami"), bx = md.bx;
  bx.appendChild(el("p", "mu", "Faites scanner ce code avec l'appareil photo du téléphone. Ça marche sur Android et sur iPhone."));
  var q = el("img", "qrimg"); q.alt = "QR code vers Nauticonnect"; q.src = "https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=12&data=" + encodeURIComponent(url); bx.appendChild(q);
  bx.appendChild(el("p", "mu", "Sur iPhone : le lien s'ouvre dans Safari. Touchez ensuite Partager, puis « Sur l'écran d'accueil » pour avoir l'appli."));
  var b = el("button", "btn", "Envoyer le lien par message"); b.onclick = function () { md.close(); shareIt(INV_TXT, "", "Inviter un ami"); }; bx.appendChild(b);
}
/* iPhone : petit guide pour ajouter l'appli à l'écran d'accueil (affiché tant que ce n'est pas fait) */
(function () {
  var ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var inst = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
  if (!ios || inst || ls("nc-ios-ok")) return;
  var h = $("hero"); if (!h) return;
  var c = el("div", "card iosg"); c.appendChild(el("b", 0, "Installer Nauticonnect sur votre iPhone"));
  var o = el("ol"); ["Touchez le bouton Partager de Safari (le carré avec la flèche vers le haut).", "Choisissez « Sur l'écran d'accueil ».", "Touchez « Ajouter » : l'icône du voilier apparaît avec vos applis."].forEach(function (t) { o.appendChild(el("li", 0, t)); }); c.appendChild(o);
  var ok = el("button", "btn g sm", "C'est fait"); ok.onclick = function () { ls("nc-ios-ok", "1"); c.remove(); }; c.appendChild(ok);
  h.parentNode.insertBefore(c, h.nextSibling);
})();
function shareIt(txt, hash, title) {
  var url = location.origin + location.pathname + "?src=" + (hash ? "partage" : "invitation") + (hash ? "#" + hash : "");
  if (navigator.share) { navigator.share({ title: "Nauticonnect", text: txt, url: url }).catch(function () {}); return; }
  var md = modal(title || "Partager"), bx = md.bx;
  var wa = el("a", "btn", "Partager sur WhatsApp"); wa.href = "https://wa.me/?text=" + encodeURIComponent(txt + " " + url); wa.target = "_blank"; wa.rel = "noopener"; bx.appendChild(wa);
  var sm = el("a", "btn g", "Envoyer par SMS"); sm.href = "sms:?&body=" + encodeURIComponent(txt + " " + url); sm.style.marginTop = "8px"; bx.appendChild(sm);
  var cp = el("button", "btn g", "Copier le lien"); cp.style.marginTop = "8px"; cp.onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast("Lien copié"); }, function () { prompt("Copiez le lien :", url); }); }; bx.appendChild(cp);
}
Array.prototype.forEach.call(document.querySelectorAll("[data-invite]"), function (b) { b.onclick = invite; });

/* ================= LE LAC : TEMPÉRATURE & NIVEAU ================= */
var LAC = null, lacAt = 0;
function loadLac() {
  if (Date.now() - lacAt < 20 * 6e4) return; lacAt = Date.now();
  fetch(CFG.url + "/functions/v1/lac").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) { LAC = j; renderLac(); }).catch(function () { LAC = { err: 1 }; renderLac(); });
}
function renderLac() {
  var B = $("lacBox"); if (!B) return; B.textContent = "";
  if (!LAC) { B.appendChild(el("p", "mu", "Chargement…")); return; }
  if (LAC.err || (!LAC.temp.length && !LAC.niveau)) { B.appendChild(el("p", "mu", "Données du lac indisponibles pour le moment.")); return; }
  if (LAC.temp.length) {
    var g = el("div", "lacg");
    LAC.temp.forEach(function (t) { var c = el("div", "lact"); c.appendChild(el("b", 0, String(t.t).replace(".", ",") + " °C")); c.appendChild(el("span", 0, t.n)); g.appendChild(c); });
    B.appendChild(g);
  }
  if (LAC.niveau) {
    var n = LAC.niveau, d = Math.round((n.m - n.moy) * 100), c = el("div", "card lacn");
    c.appendChild(el("b", 0, "Niveau du lac : " + n.m.toFixed(2).replace(".", ",") + " m"));
    c.appendChild(el("div", "mu", (d === 0 ? "Pile dans la moyenne" : Math.abs(d) + " cm " + (d > 0 ? "au-dessus" : "au-dessous") + " de la moyenne") + " · mesuré à Saint-Prex " + ago(n.at)));
    B.appendChild(c);
  }
  B.appendChild(el("p", "note", "Eau en surface : modèle Alplakes (Eawag), mis à jour toutes les 3 h. Niveau : mesure de l'OFEV."));
}

/* ================= RENDU GLOBAL & DÉMARRAGE ================= */
/* ================= FIL « SUR LE LAC » ================= */
function feedItems() {
  var I = [], wk = Date.now() - 7 * 864e5, today = new Date().toISOString().slice(0, 10);
  openNow().forEach(function (x) { I.push({ t: ts(x.maj), who: x.id, txt: ((P[x.id] && P[x.id].pseudo) || "Un plaisancier") + " a hissé le pavillon" + (x.msg ? " : « " + x.msg + " »" : ""), go: "ponton", k: "on" }); });
  PH.filter(function (x) { return pub(x) && ts(x.t) > wk; }).slice(0, 4).forEach(function (x) { I.push({ t: ts(x.t), who: x.auteur, txt: ((P[x.auteur] && P[x.auteur].pseudo) || "Un membre") + " a partagé une photo du lac" + (x.c ? " : " + x.c : ""), go: "meteo", img: photoUrl(x.chemin), k: "ph" }); });
  RU.filter(function (x) { return ts(x.t) > wk; }).forEach(function (x) { I.push({ t: ts(x.t), who: x.auteur, txt: "Nouvelle escale : " + x.nom + (x.lieu ? " (" + x.lieu + ")" : ""), go: "restos", k: "re" }); });
  EV.filter(function (e) { return e.statut === "publie" && e.fin >= today && e.debut <= new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10); }).forEach(function (e) { I.push({ t: Date.now() - 1, txt: e.titre + " · " + evDates(e) + " · " + e.lieu, go: "evenements", k: "ev" }); });
  AN.filter(function (x) { return ts(x.maj) > wk; }).slice(0, 3).forEach(function (x) { I.push({ t: ts(x.maj), who: x.auteur, txt: (x.type === "Recherche" ? "Recherché : " : "Petite annonce : ") + x.titre + (x.prix ? " · " + (x.type === "Recherche" ? "budget " : "") + x.prix + " CHF" : ""), go: "annonces", k: "an" }); });
  LO.filter(function (x) { return x.actif !== false && ts(x.maj) > wk; }).slice(0, 3).forEach(function (x) { I.push({ t: ts(x.maj), who: x.auteur, txt: "Bateau à louer : " + x.nom + (x.port ? " à " + x.port : ""), go: "location", k: "lo" }); });
  EP.filter(function (x) { return ts(x.maj) > wk; }).slice(0, 2).forEach(function (x) { I.push({ t: ts(x.maj), who: x.auteur, txt: "Épave ajoutée sur la carte : " + x.nom, go: "epaves", k: "ep" }); });
  SO.filter(function (x) { return ts(x.t) > wk && x.jour >= today; }).forEach(function (x) { I.push({ t: ts(x.t), who: x.auteur, txt: ((P[x.auteur] && P[x.auteur].pseudo) || "Un membre") + " propose des places à bord : " + x.titre + " · " + dFr(x.jour), go: "sorties", k: "so" }); });
  var n = SL.filter(function (m) { return Date.now() - ts(m.t) < 864e5; }).length;
  if (n) I.push({ t: Math.max.apply(null, SL.map(function (m) { return ts(m.t); })), txt: n + " message" + (n > 1 ? "s" : "") + " sur le Ponton ces dernières 24 h", go: "ponton", k: "sl" });
  return I.sort(function (a, b) { return b.t - a.t; }).slice(0, 6);
}
function renderFeed() {
  var F = $("feed"); if (!F) return; F.textContent = "";
  var I = sb ? feedItems() : [];
  $("feedBox").hidden = true; /* « Sur le lac en ce moment » retiré de l'accueil (future vitrine des commerçants) */
  I.forEach(function (x) {
    var a = el("a", "fd-it fd-" + x.k); a.href = "#" + x.go;
    if (x.img) { var im = el("span", "fd-img"); im.style.backgroundImage = "url(\"" + x.img + "\")"; a.appendChild(im); }
    else if (x.who && P[x.who]) a.appendChild(putPhoto(el("span", "av", initial(x.who)), x.who));
    else a.appendChild(el("span", "fd-dot"));
    var b = el("span", "fd-tx"); b.appendChild(el("span", 0, x.txt)); if (x.k !== "ev") b.appendChild(el("small", 0, ago(new Date(x.t).toISOString()))); a.appendChild(b);
    F.appendChild(a);
  });
}
function renderAll() {
  var al = $("admLink"); if (al) al.hidden = !realAdmin;
  renderHome(); renderFeed(); renderHomeSorties(); renderVd();
  var v = cur();
  if (v === "panne") renderPanne(); else if (v === "ponton") renderPonton();
  else if (v === "avis") renderAvis(); else if (v === "ports") renderPorts(); else if (v === "meteo") { renderMeteoFeed(); renderPhotoMod(); loadWind(); wxRender(); loadLac(); renderLac(); fcLoad(); renderVpMeteo(); }
  else if (v === "profil") { notifUI(); renderMyBadges(); }
  else if (v === "admin") { $("dashBox").hidden = !isAdmin; $("modBox").hidden = !isAdmin; $("mbBox").hidden = !isAdmin; drawPfQueue(); renderEvAdmin(); }
  else if (v === "sorties") renderSorties(); else if (v === "carnet") renderCarnet(); else if (v === "aide") renderAide();
  else if (v === "webcams") renderWebcams(); else if (v === "restos") renderRestos(); else if (v === "epaves") renderEpaves();
  else if (v === "noeuds") renderNoeuds(); else if (v === "annonces") renderAnnonces(); else if (v === "location") renderLoc(); else if (v === "evenements") renderEvents();
}
if (!configured || !sb) {
  var warn = el("div", "card warn"); warn.style.margin = "16px";
  warn.innerHTML = "<b>Appli pas encore configurée.</b> Ouvrez le fichier <b>config.js</b> et collez-y l'adresse et la clé de votre projet Supabase (étape 4 du guide).";
  if (configured && !window.supabase) warn.innerHTML = "<b>Connexion impossible.</b> Vérifiez votre connexion internet puis rechargez la page.";
  document.body.insertBefore(warn, document.body.firstChild);
}
/* la connexion passe AVANT l'affichage : une erreur d'affichage ne doit jamais empêcher de se connecter */
if (sb) {
  sb.auth.onAuthStateChange(function (ev, s) { if (ev === "INITIAL_SESSION") return; if (ev === "TOKEN_REFRESHED") { session = s; return; } try { onSession(s, ev); } catch (e) { showErr(e); } });
  sb.auth.getSession().then(function (r) { try { onSession(r.data.session, "INITIAL"); } catch (e) { showErr(e); } if (!r.data.session) { subscribeAll(); loadAll(); } });
}
try { route(); } catch (e) { showErr(e); }

/* ================= ÉVÉNEMENTS (publication gratuite, vérifiée par l'admin ; paiement retiré pour la règle de facturation Google Play) ================= */
var MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."], JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
function dFr(d) { var x = new Date(d + "T12:00:00"); return JOURS[x.getDay()] + " " + x.getDate() + " " + MOIS[x.getMonth()]; }
function evDates(e) { return e.debut === e.fin ? dFr(e.debut) : "du " + dFr(e.debut) + " au " + dFr(e.fin); }
function evPrice() { return REG.ev_prix || "30"; }
var STE = { attente: "En attente de validation", publie: "Publié", refuse: "Refusé" };
function evCard(e, adm) {
  var c = el("div", "card evcard"), x = new Date(e.debut + "T12:00:00");
  var dt = el("div", "evdate"); dt.appendChild(el("b", 0, String(x.getDate()))); dt.appendChild(el("span", 0, MOIS[x.getMonth()])); c.appendChild(dt);
  var b = el("div", "evbody"); b.appendChild(el("h3", 0, e.titre));
  b.appendChild(el("div", "mu", evDates(e) + (e.heure ? " · " + e.heure : "") + " · " + e.lieu));
  if (e.descr) b.appendChild(el("div", 0, e.descr));
  if (e.statut !== "publie" || adm) b.appendChild(el("div", e.statut === "publie" ? "okm" : "err", STE[e.statut]));
  var A = el("div", "lacts");
  if (/^https?:\/\//.test(e.site)) { var a = el("a", "p", "Infos"); a.href = e.site; a.target = "_blank"; a.rel = "noopener"; A.appendChild(a); }
  var go = el("a", 0, "Y aller"); go.href = mapsSearch(e.lieu); go.target = "_blank"; go.rel = "noopener"; A.appendChild(go);
  if (e.statut === "publie") { var sh = el("button", 0, "Partager"); sh.onclick = function () { shareIt(e.titre + ", " + evDates(e) + (e.heure ? " · " + e.heure : "") + " · " + e.lieu + ". On y va en bateau ?", "evenements", "Partager l'événement"); }; A.appendChild(sh); }
  if (e.contact) { var ct = el("a", 0, "Contact"); ct.href = /@/.test(e.contact) ? "mailto:" + e.contact : "tel:" + e.contact.replace(/[^0-9+]/g, ""); A.appendChild(ct); }
  b.appendChild(A);
  if (adm && isAdmin) {
    var R = el("div", "row"); R.style.marginTop = "8px";
    if (e.statut !== "publie") { var ok = el("button", "btn sm", "Publier"); ok.onclick = function () { evSet(e.id, "publie"); }; R.appendChild(ok); }
    if (e.statut !== "refuse") { var no = el("button", "btn g sm", "Refuser"); no.onclick = function () { evSet(e.id, "refuse"); }; R.appendChild(no); }
    var del = el("button", "btn g sm", "Supprimer"); del.onclick = function () { if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmer"; return; } sb.from("evenements").delete().eq("id", e.id).then(function () { load("evenements"); }); }; R.appendChild(del);
    if (e.contact) R.appendChild(el("div", "mu", "Contact : " + e.contact));
    b.appendChild(R);
  } else if (e.auteur === uid && e.statut === "attente") {
    var cx = el("button", "btn g sm", "Annuler ma demande"); cx.onclick = function () { sb.from("evenements").delete().eq("id", e.id).then(function () { load("evenements"); }); }; b.appendChild(cx);
  }
  c.appendChild(b); return c;
}
function evSet(id, st) { sb.from("evenements").update({ statut: st }).eq("id", id).then(function (r) { if (r.error) toast("Action impossible."); else { toast(st === "publie" ? "Événement publié" : "Événement refusé"); load("evenements"); } }); }
function payBox() { var w = $("evPay"); if (w) { w.textContent = ""; w.style.display = "none"; } }
function renderEvents() {
  var d = today(), L = $("evList"); L.textContent = "";
  var pub = EV.filter(function (e) { return e.statut === "publie" && e.fin >= d; });
  pub.forEach(function (e) { L.appendChild(evCard(e)); });
  if (!pub.length) L.appendChild(el("p", "mu", "Aucun événement à venir pour l'instant."));
  var M = $("evMine"); M.textContent = "";
  EV.filter(function (e) { return uid && e.auteur === uid && e.statut !== "publie"; }).forEach(function (e) { M.appendChild(evCard(e)); });
  $("evMineH").hidden = !M.firstChild; payBox();
  renderEvAdmin();
}
/* validation des événements : dans l'Espace modérateur (la page Événements reste la même pour tous) */
function renderEvAdmin() {
  var box = $("evAdmin"); if (!box) return;
  box.hidden = !isAdmin;
  var n = EV.filter(function (e) { return e.statut === "attente"; }).length, sm = $("evAdmSum");
  if (sm) sm.textContent = n ? "Admin · " + n + " demande" + (n > 1 ? "s" : "") + " en attente" : "Admin · aucune demande en attente";
  if (isAdmin) {
    var Q2 = $("evQueue"); Q2.textContent = "";
    EV.filter(function (e) { return e.statut === "attente"; }).forEach(function (e) { Q2.appendChild(evCard(e, true)); });
    if (!Q2.firstChild) Q2.appendChild(el("p", "mu", "Aucune demande en attente."));
    var O2 = $("evAll"); O2.textContent = "";
    EV.filter(function (e) { return e.statut !== "attente"; }).forEach(function (e) { O2.appendChild(evCard(e, true)); });
  }
}
function evMsg(t, ok) { $("evMsg").className = ok ? "okm" : "err"; $("evMsg").textContent = t || ""; }
$("evAdd").onclick = function () { $("evForm").hidden = !$("evForm").hidden; evMsg(); if (!$("evForm").hidden) $("evForm").scrollIntoView({ behavior: "smooth" }); };
$("evCx").onclick = function () { $("evForm").hidden = true; };
$("evSv").onclick = function () {
  evMsg(); if (!memberOk($("evMsg"), "Pour publier un événement, créez votre compte gratuit.")) return;
  var d = { titre: $("evTi").value.trim(), lieu: $("evLi").value.trim(), debut: $("evD1").value, fin: $("evD2").value || $("evD1").value, heure: $("evHe").value.trim(), descr: $("evDs").value.trim(), site: $("evSi").value.trim(), contact: $("evCt").value.trim() };
  if (d.titre.length < 3 || d.lieu.length < 2) { evMsg("Indiquez le nom de l'événement et le lieu."); return; }
  if (!d.debut) { evMsg("Choisissez la date."); return; }
  if (d.debut < today()) { evMsg("La date est déjà passée."); return; }
  if (d.fin < d.debut) { evMsg("La date de fin est avant la date de début."); return; }
  if (!/@/.test(d.contact) && !/^[+0-9 ().\/-]{7,20}$/.test(d.contact)) { evMsg("Indiquez un e-mail ou un téléphone de contact."); return; }
  if (d.site && !/^https?:\/\//.test(d.site)) d.site = "https://" + d.site;
  if (isAdmin) d.statut = "publie";
  $("evSv").disabled = true;
  sb.from("evenements").insert(d).then(function (r) {
    if (r.error) { evMsg("Envoi impossible : " + r.error.message); return; }
    ["evTi", "evLi", "evD1", "evD2", "evHe", "evDs", "evSi", "evCt"].forEach(function (k) { $(k).value = ""; });
    $("evForm").hidden = true; load("evenements");
    toast(isAdmin ? "Événement publié" : "Merci ! Votre événement sera publié après vérification.");
    setTimeout(function () { var h = $("evMineH"); if (h && !h.hidden) h.scrollIntoView({ behavior: "smooth" }); }, 600);
  }).then(function () { $("evSv").disabled = false; });
};
$("evSetSv").onclick = function () {
  if (!isAdmin) return;
  var pr = $("evSetP").value.trim(), lk = $("evSetL").value.trim();
  if (!/^\d{1,4}$/.test(pr)) { toast("Prix invalide"); return; }
  sb.from("reglages").upsert([{ k: "ev_prix", v: pr }, { k: "ev_paiement", v: lk }]).then(function (r) { toast(r.error ? "Enregistrement impossible" : "Réglages enregistrés"); load("reglages"); });
};

/* ================= LANGUE ================= */
(function () { var de = window.NC_LANG === "de"; ["langBtn", "nceLang"].forEach(function (id) { var b = $(id); if (!b) return; b.textContent = de ? "FR" : "DE"; b.setAttribute("aria-label", de ? "Version française" : "Deutsche Version"); b.onclick = function () { if (window.ncSetLang) ncSetLang(de ? "fr" : "de"); }; }); })();

if ($("joinLater")) $("joinLater").onclick = function () { ls("nc-join-later", String(Date.now())); $("joinBar").hidden = true; };
if ($("joinGo")) $("joinGo").onclick = function () { try { sessionStorage.setItem("nc-ret", "accueil"); sessionStorage.setItem("nc-why", ""); } catch (e) {} };

/* ================= OFFRES MEMBRES ================= */
function hasOffer(x) { return !!(x.pa && x.pa.offre && paActive(x.pa)); }
function offerCard(x) {
  var p = me(); if (!p) return;
  var md = modal("Carte membre"), bx = md.bx, c = el("div", "mcarte");
  var top = el("div", "mc-top"); top.appendChild(el("span", "mc-brand", "Nauticonnect")); top.appendChild(el("span", "mc-live", "")); c.appendChild(top);
  var who = el("div", "mc-who"); who.appendChild(putPhoto(el("span", "av mc-av", initial(uid)), uid));
  var n = el("div"); n.appendChild(el("b", 0, p.pseudo)); n.appendChild(el("span", 0, [p.bateau, p.port].filter(Boolean).join(" · ") || "Membre")); who.appendChild(n); c.appendChild(who);
  var o = el("div", "mc-off"); o.appendChild(el("small", 0, "Offre membres chez " + x.n)); o.appendChild(el("b", 0, x.pa.offre)); c.appendChild(o);
  var clk = el("div", "mc-clk"); c.appendChild(clk);
  bx.appendChild(c);
  bx.appendChild(el("p", "mu", "Montrez cet écran au restaurant. L'heure défile en direct : une capture d'écran n'est pas valable."));
  var D = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  function tick() { if (!c.isConnected) { clearInterval(iv); return; } var d = new Date(); clk.textContent = D[d.getDay()] + " " + d.toLocaleDateString("fr-CH") + " · " + d.toLocaleTimeString("fr-CH"); }
  var iv = setInterval(tick, 1000); tick();
}

/* ================= SORTIES ================= */
function soUp() { var d = today(); return SO.filter(function (x) { return x.jour >= d; }).sort(function (a, b) { return (a.jour + a.heure).localeCompare(b.jour + b.heure); }); }
function soWho(id) { return SI.filter(function (i) { return i.sortie_id === id && (i.statut || "ok") === "ok"; }).map(function (i) { return i.uid; }); }
function soReq(id) { return SI.filter(function (i) { return i.sortie_id === id && i.statut === "demande"; }); }
function soMine(id) { return SI.filter(function (i) { return i.sortie_id === id && i.uid === uid; })[0] || null; }
function soDecide(x, u, st, btn) { if (btn) btn.disabled = true; sb.from("sortie_inscrits").update({ statut: st }).eq("sortie_id", x.id).eq("uid", u).then(function (r) { if (r.error) toast(/complet/.test(r.error.message || "") ? "Toutes les places sont déjà prises." : "Action impossible. Réessayez."); else toast(st === "ok" ? "Accepté : l'équipier est prévenu." : "Demande refusée."); load("sortie_inscrits"); }); }
function soCard(x, small) {
  var c = el("div", "card evcard socard" + (x.auteur === uid ? " mine" : "")), d = new Date(x.jour + "T12:00:00");
  var dt = el("div", "evdate"); dt.appendChild(el("b", 0, String(d.getDate()))); dt.appendChild(el("span", 0, MOIS[d.getMonth()])); c.appendChild(dt);
  var b = el("div", "evbody"); b.appendChild(el("h3", 0, x.titre));
  b.appendChild(el("div", "mu", dFr(x.jour) + (x.heure ? " · " + x.heure : "") + " · départ " + x.depart + (x.dest ? " → " + x.dest : "")));
  var w = el("div"); w.style.margin = "6px 0"; w.appendChild(badge(x.auteur)); b.appendChild(w);
  var ins = soWho(x.id), full = x.places && ins.length >= x.places, inn = ins.indexOf(uid) >= 0;
  if (!small && x.descr) b.appendChild(el("div", 0, x.descr));
  if (x.frais) b.appendChild(el("div", "so-fr", "Participation aux frais : " + x.frais));
  var pl = el("div", "so-pl");
  if (ins.length) { var st = el("span", "stack"); ins.slice(0, 6).forEach(function (u) { st.appendChild(putPhoto(el("span", "av", initial(u)), u)); }); pl.appendChild(st); }
  pl.appendChild(el("span", "mu", ins.length ? ins.length + " à bord" + (x.places ? " sur " + x.places : "") + (small ? "" : " : " + ins.map(function (u) { return (P[u] && P[u].pseudo) || "?"; }).join(", ")) : x.places ? x.places + " place" + (x.places > 1 ? "s" : "") + " · soyez le premier" : "Soyez le premier à rejoindre"));
  b.appendChild(pl);
  if (small) { c.onclick = function () { location.hash = "sorties"; }; c.appendChild(b); return c; }
  var A = el("div", "row"); A.style.marginTop = "8px";
  if (x.auteur !== uid) {
    var my = soMine(x.id), mst = my ? (my.statut || "ok") : "";
    if (mst) b.appendChild(el("div", mst === "ok" ? "okm" : mst === "refuse" ? "err" : "mu", mst === "ok" ? "Vous êtes à bord ✓" : mst === "refuse" ? "Demande refusée par l'organisateur" : "Demande envoyée : l'organisateur va vous répondre"));
    var j = el("button", "btn sm" + (mst ? " g" : ""), mst === "ok" ? "Je ne viens plus" : mst === "demande" ? "Annuler ma demande" : mst === "refuse" ? "Demande refusée" : full ? "Complet" : "Je demande une place");
    j.disabled = mst === "refuse" || (!mst && full);
    j.onclick = function () {
      if (!requireProfile(null, "Pour demander une place à bord, créez votre compte gratuit : l'organisateur saura qui vous êtes.")) return;
      j.disabled = true;
      (mst ? sb.from("sortie_inscrits").delete().eq("sortie_id", x.id).eq("uid", uid) : sb.from("sortie_inscrits").insert({ sortie_id: x.id }))
        .then(function (r) { if (r.error) toast(full ? "Toutes les places sont prises." : "Action impossible. Réessayez."); else toast(mst ? "C'est noté." : "Demande envoyée ! L'organisateur est prévenu."); load("sortie_inscrits"); });
    };
    A.appendChild(j);
    if (real() && P[x.auteur]) { var wr = el("button", "btn g sm", "Écrire"); wr.onclick = function () { openThread(x.auteur, "Bonjour, à propos de la sortie « " + x.titre + " »… "); }; A.appendChild(wr); }
  } else {
    var rq = soReq(x.id);
    if (rq.length) {
      var R = el("div", "so-req"); R.appendChild(el("b", 0, rq.length + " demande" + (rq.length > 1 ? "s" : "") + " de place"));
      rq.forEach(function (i) {
        var r = el("div", "so-rq"); r.appendChild(badge(i.uid));
        var ok = el("button", "btn sm", "Accepter"), no = el("button", "btn g sm", "Refuser");
        ok.disabled = !!full; ok.onclick = function () { soDecide(x, i.uid, "ok", ok); }; no.onclick = function () { soDecide(x, i.uid, "refuse", no); };
        r.appendChild(ok); r.appendChild(no); R.appendChild(r);
      });
      b.appendChild(R);
    }
    if (ins.length) {
      var Rk = el("div", "so-req"); Rk.appendChild(el("b", 0, "À bord"));
      ins.forEach(function (u) { var r = el("div", "so-rq"); r.appendChild(badge(u)); var w2 = el("button", "btn g sm", "Écrire"); w2.onclick = function () { openThread(u); }; var rm = el("button", "btn g sm", "Retirer"); rm.onclick = function () { if (rm.dataset.ok !== "1") { rm.dataset.ok = "1"; rm.textContent = "Confirmer"; return; } sb.from("sortie_inscrits").delete().eq("sortie_id", x.id).eq("uid", u).then(function () { load("sortie_inscrits"); }); }; r.appendChild(w2); r.appendChild(rm); Rk.appendChild(r); });
      b.appendChild(Rk);
    }
    var del = el("button", "btn g sm", "Annuler la sortie");
    del.onclick = function () { if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmer l'annulation"; return; } sb.from("sorties").delete().eq("id", x.id).then(function () { toast("Sortie annulée"); load("sorties"); }); };
    A.appendChild(del);
  }
  if (isAdmin && x.auteur !== uid) { var ad = el("button", "btn g sm", "Retirer (admin)"); ad.onclick = function () { if (confirm("Retirer cette sortie ?")) sb.from("sorties").delete().eq("id", x.id).then(function () { load("sorties"); }); }; A.appendChild(ad); }
  var sh = el("button", "btn g sm", "Partager"); sh.onclick = function () { shareIt("Places à bord sur le Léman : " + x.titre + ", " + dFr(x.jour) + (x.heure ? " à " + x.heure : "") + ", départ " + x.depart + ". Demande ta place sur Nauticonnect", "sorties", "Partager la sortie"); }; A.appendChild(sh);
  b.appendChild(A); c.appendChild(b); return c;
}
function renderSorties() {
  var L = $("soList"); L.textContent = ""; var up = soUp();
  if (!up.length) L.appendChild(el("p", "mu", "Aucune place à bord proposée pour l'instant. Vous avez de la place sur votre bateau ? Proposez-la : une balade, un apéro au large, une virée à Yvoire…"));
  up.forEach(function (x) { L.appendChild(soCard(x)); });
}
function renderHomeSorties() {
  var H = $("homeSo"); if (!H) return; H.textContent = "";
  document.querySelector(".hso").hidden = !SORTIES_ON; if (!SORTIES_ON) return;
  var up = sb ? soUp() : [];
  up.slice(0, 2).forEach(function (x) { H.appendChild(soCard(x, true)); });
  if (!up.length) H.appendChild(el("p", "mu", "Aucune place à bord proposée. De la place sur votre bateau ? Proposez-la !"));
  $("homeSoAll").textContent = up.length > 2 ? "Voir les " + up.length + " sorties" : "Voir tout";
}
function soMsg(t, ok) { $("soMsg").className = ok ? "okm" : "err"; $("soMsg").textContent = t || ""; }
(function () { var dl = $("soPorts"); if (dl) ZA().forEach(function (z) { var o = document.createElement("option"); o.value = z[0]; dl.appendChild(o); }); })();
$("soAdd").onclick = function () {
  soMsg(); if (!requireProfile($("soMsg"), "Pour proposer des places à bord, créez votre compte gratuit.")) return;
  var f = $("soForm"); f.hidden = false; if (!$("soJo").value) $("soJo").value = today(); $("soJo").min = today();
  if (!$("soDe").value && me().port) $("soDe").value = me().port; $("soTi").focus();
};
$("homeSoAdd").onclick = function () { location.hash = "sorties"; setTimeout(function () { $("soAdd").onclick(); }, 50); };
$("soCx").onclick = function () { $("soForm").hidden = true; soMsg(); };
$("soSv").onclick = function () {
  soMsg(); if (!requireProfile($("soMsg"))) return;
  var d = { titre: $("soTi").value.trim(), depart: $("soDe").value.trim(), dest: $("soDs").value.trim(), jour: $("soJo").value, heure: $("soHe").value, places: +$("soPl").value || null, descr: $("soTx").value.trim() }; var frEl = $("soFr"); if (frEl && frEl.value.trim()) d.frais = frEl.value.trim().slice(0, 60);
  if (d.titre.length < 3) { soMsg("Donnez un titre à la sortie (ex. Apéro au large de Saint-Gingolph)."); return; }
  if (d.depart.length < 2) { soMsg("Indiquez le port de départ."); return; }
  if (!d.jour || d.jour < today()) { soMsg("Choisissez une date à venir."); return; }
  $("soSv").disabled = true;
  sb.from("sorties").insert(d).then(function (r) {
    if (r.error) { soMsg("Publication impossible. Réessayez."); return; }
    $("soForm").hidden = true; ["soTi", "soDs", "soHe", "soPl", "soTx", "soFr"].forEach(function (k) { if ($(k)) $(k).value = ""; });
    toast("C'est publié ! Les membres sont prévenus."); load("sorties");
  }).then(function () { $("soSv").disabled = false; });
};

/* ================= ACCUEIL DES NOUVEAUX ================= */
function welcome(ret) {
  var p = me(); if (!p) return;
  var md = modal("Bienvenue à bord, " + p.pseudo + " !"), bx = md.bx;
  bx.appendChild(el("p", "mu", "Trois petites choses pour bien démarrer sur Nauticonnect."));
  function step(n, t, sub) { var c = el("div", "card wl-st"); var h = el("div", "wl-h"); h.appendChild(el("span", "wl-n", String(n))); h.appendChild(el("b", 0, t)); c.appendChild(h); if (sub) c.appendChild(el("div", "mu", sub)); bx.appendChild(c); return c; }
  var s1 = step(1, "Activez les notifications", "Alerte vaudaire, appels à l'aide sur le lac, messages et amis sur l'eau.");
  var nb = el("button", "btn", mySub ? "Notifications activées" : "Activer les notifications"); nb.disabled = !!mySub;
  nb.onclick = function () { pushEnable(); setTimeout(function () { if (mySub) { nb.textContent = "Notifications activées"; nb.disabled = true; } }, 2500); };
  var vw = el("button", "btn g sm", "Régler mes alertes vent"); vw.style.marginTop = "6px"; vw.onclick = function () { md.close(); vpGoTo(); };
  if (pushOk) { s1.appendChild(nb); s1.appendChild(vw); } else s1.appendChild(el("div", "mu", "Installez l'appli sur l'écran d'accueil de votre téléphone pour les recevoir."));
  var mine = Object.keys(P).filter(function (k) { return k !== uid; }), same = p.port ? mine.filter(function (k) { return P[k].port === p.port; }) : [];
  var L = (same.length ? same : mine).slice(0, 5);
  if (L.length) {
    var s2 = step(2, same.length ? "Leur bateau est aussi à " + p.port : "Quelques membres du lac", "Ajoutez-les en ami : vous saurez quand ils sont sur l'eau.");
    L.forEach(function (id) {
      var r = el("div", "wl-m"); r.appendChild(badge(id));
      var b = el("button", "btn g sm", rel(id) === "ami" ? "Ami" : rel(id) === "envoye" ? "Demande envoyée" : "Ajouter en ami");
      b.disabled = !!rel(id); b.onclick = function () { befriend(id); b.textContent = "Demande envoyée"; b.disabled = true; };
      r.appendChild(b); s2.appendChild(r);
    });
  }
  if (SORTIES_ON) {
  var s3 = step(L.length ? 3 : 2, "Retrouvez-vous sur l'eau", soUp().length ? soUp().length + " sortie" + (soUp().length > 1 ? "s" : "") + " avec des places à bord : demandez la vôtre, ou proposez de la place sur votre bateau." : "Proposez de la place sur votre bateau, ou dites bonjour sur le Ponton.");
  var r3 = el("div", "row"), a = el("button", "btn sm", "Places à bord"), b2 = el("button", "btn g sm", "Ouvrir le chat");
  a.onclick = function () { md.close(); location.hash = "sorties"; }; b2.onclick = function () { md.close(); location.hash = "ponton"; };
  r3.appendChild(a); r3.appendChild(b2); s3.appendChild(r3);
  } else {
    var s3b = step(L.length ? 3 : 2, "Dites bonjour sur le Ponton", "Le chat des plaisanciers du Léman : présentez-vous et votre bateau.");
    var c3 = el("button", "btn sm", "Ouvrir le chat"); c3.onclick = function () { md.close(); location.hash = "ponton"; }; s3b.appendChild(c3);
  }
  var gd = el("button", "linkb", "Découvrir toutes les fonctions (mode d'emploi)"); gd.onclick = function () { md.close(); location.hash = "aide"; }; bx.appendChild(gd);
  var go = el("button", "btn", "C'est parti"); go.style.marginTop = "6px"; go.onclick = function () { md.close(); location.hash = ret && ret !== "profil" ? ret : ""; }; bx.appendChild(go);
}

/* ================= BADGES ================= */
var BG = {}, bgT = null;
function loadBadges() { if (!sb) return; sb.rpc("badges").then(function (r) { if (r.error || !r.data) return; var o = {}; r.data.forEach(function (x) { o[x.uid] = x; }); BG = o; renderAll(); }); }
function badgesSoon() { clearTimeout(bgT); bgT = setTimeout(loadBadges, 3000); }
setInterval(function () { if (!document.hidden) loadBadges(); }, 10 * 60000);
/* [clé, nom, comment l'obtenir, obtenu ?, détail] */
function badgeList(id) {
  var b = BG[id] || { aides: 0, orga: 0, rejoint: 0, photos: 0, rang: 0 };
  return [
    ["fond", "Membre fondateur", "Faire partie des 100 premiers membres", b.rang > 0 && b.rang <= 100, b.rang ? "Membre n° " + b.rang : ""],
    ["aide", b.aides >= 5 ? "Sauveteur du lac" : "Entraide", "Proposer son aide à un bateau en panne", b.aides >= 1, b.aides ? "A répondu à " + b.aides + " appel" + (b.aides > 1 ? "s" : "") + " à l'aide" : ""],
  ].concat(SORTIES_ON ? [
    ["orga", "Capitaine de sorties", "Organiser une sortie", b.orga >= 1, b.orga ? b.orga + " sortie" + (b.orga > 1 ? "s" : "") + " organisée" + (b.orga > 1 ? "s" : "") : ""],
    ["equi", "Équipier fidèle", "Rejoindre 3 sorties", b.rejoint >= 3, b.rejoint ? b.rejoint + " sortie" + (b.rejoint > 1 ? "s" : "") + " rejointe" + (b.rejoint > 1 ? "s" : "") : ""]] : [], [
    ["repo", "Reporter du lac", "Partager 3 photos du lac", b.photos >= 3, b.photos ? b.photos + " photo" + (b.photos > 1 ? "s" : "") + " partagée" + (b.photos > 1 ? "s" : "") : ""]
  ]);
}
function badgeRow(id) {
  var got = badgeList(id).filter(function (x) { return x[3]; }); if (!got.length) return null;
  var w = el("div", "bdg-row"); got.forEach(function (x) { var s = el("span", "bdg bdg-" + x[0], x[1]); s.title = x[4]; w.appendChild(s); }); return w;
}
function renderMyBadges() {
  var B = $("myBadges"); if (!B) return; B.textContent = "";
  $("bdgBox").hidden = !me(); if (!me()) return;
  var L = badgeList(uid), n = L.filter(function (x) { return x[3]; }).length;
  $("bdgSum").textContent = n + " sur " + L.length;
  L.forEach(function (x) {
    var r = el("div", "bdg-it" + (x[3] ? " on" : "")); r.appendChild(el("span", "bdg bdg-" + x[0], x[1]));
    r.appendChild(el("span", "mu", x[3] ? x[4] || "Obtenu" : "Pour l'obtenir : " + x[2].charAt(0).toLowerCase() + x[2].slice(1)));
    B.appendChild(r);
  });
}

/* ================= COMPTEUR DE VISITES (anonyme) ================= */
(function () {
  if (!sb) return;
  var d = new Date().toISOString().slice(0, 10), src = "";
  try { src = (new URLSearchParams(location.search).get("src") || "").slice(0, 20); } catch (e) {}
  if (src) { ls("nc-src", src); try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {} }
  if (ls("nc-vis") === d) return;
  var neuf = !ls("nc-seen"); ls("nc-vis", d); ls("nc-seen", "1");
  sb.rpc("visite", { src: neuf ? (src || "direct") : "retour", nouveau: neuf }).then(function () {});
})();

/* ================= TABLEAU DE BORD ADMIN ================= */
$("dashBox").addEventListener("toggle", function () { if (this.open) loadDash(); });
function loadDash() {
  var D = $("dash"); D.textContent = ""; D.appendChild(el("p", "mu", "Chargement…"));
  sb.rpc("stats_admin").then(function (r) {
    D.textContent = "";
    if (r.error || !r.data) { D.appendChild(el("p", "err", "Statistiques indisponibles.")); return; }
    var s = r.data;
    function tiles(t, list) {
      D.appendChild(el("h3", "dh", t)); var g = el("div", "dgrid");
      list.forEach(function (x) { var c = el("div", "dt"); c.appendChild(el("b", 0, String(x[1]))); c.appendChild(el("span", 0, x[0])); g.appendChild(c); });
      D.appendChild(g);
    }
    tiles("Membres", [["inscrits", s.membres], ["nouveaux cette semaine", s.nouveaux7], ["nouveaux sur 30 jours", s.nouveaux30], ["actifs cette semaine", s.actifs7], ["avec profil", s.fiches], ["notifications activées", s.notifs]]);
    D.appendChild(el("h3", "dh", "Inscriptions par semaine"));
    var ch = el("div", "dchart"), W = s.semaines || [], mx = Math.max.apply(null, W.map(function (w) { return w.n; }).concat([1]));
    W.forEach(function (w) { var c = el("div", "dcol"); c.appendChild(el("small", 0, String(w.n))); var bar = el("i"); bar.style.height = Math.max(3, Math.round(w.n / mx * 90)) + "px"; c.appendChild(bar); c.appendChild(el("span", 0, w.s)); ch.appendChild(c); });
    D.appendChild(ch);
    tiles("Activité", [["messages salon (7 j)", s.salon7], ["messages privés (7 j)", s.prives7], ].concat(SORTIES_ON ? [["sorties à venir", s.sorties], ["inscrits aux sorties", s.inscrits]] : [], [["alertes panne (30 j)", s.alertes30]]));
    tiles("Visites", [["visites (7 j)", s.visites7], ["nouveaux visiteurs (7 j)", s.nouvvis7]]);
    var SRC = { direct: "Accès direct", affiche: "Affiche QR", qr: "QR d'invitation", partage: "Contenu partagé", invitation: "Invitation d'un membre", autre: "Autre" };
    var src = {}, raw = s.sources || {};
    Object.keys(raw).forEach(function (k) { var c = SRC[k] ? k : "autre"; src[c] = (src[c] || 0) + (Number(raw[k]) || 0); });
    var ks = Object.keys(src).sort(function (a, b) { return a === "autre" ? 1 : b === "autre" ? -1 : src[b] - src[a]; });
    D.appendChild(el("h3", "dh", "D'où viennent les nouveaux visiteurs (30 j)"));
    if (!ks.length) D.appendChild(el("p", "mu", "Pas encore de données : le compteur démarre aujourd'hui."));
    ks.forEach(function (k) { var r2 = el("div", "dsrc"); r2.appendChild(el("span", 0, SRC[k] || k)); r2.appendChild(el("b", 0, String(src[k]))); D.appendChild(r2); });
    D.appendChild(el("p", "mu", "Les visites sont comptées une fois par jour et par téléphone, sans aucune donnée personnelle."));
  });
}

/* ================= GESTION DES MEMBRES (admin) ================= */
var MB = null, mbOpen = null, mbDel = null;
$("mbBox").addEventListener("toggle", function () { if (this.open) loadMb(); });
$("admQ").oninput = function () { renderMb(); };
function loadMb() {
  var L = $("admList"); L.textContent = ""; L.appendChild(el("p", "mu", "Chargement…"));
  sb.rpc("admin_membres").then(function (r) {
    if (r.error) { L.textContent = ""; L.appendChild(el("p", "err", "Liste indisponible : " + r.error.message)); return; }
    MB = r.data || []; renderMb();
  });
}
function mbDate(t) { if (!t) return "jamais"; var d = new Date(t); return d.toLocaleDateString("fr-CH", { day: "numeric", month: "short", year: "numeric" }); }
function renderMb() {
  var L = $("admList"); if (!L || !MB) return; L.textContent = "";
  var q = norm($("admQ").value || "");
  var list = MB.filter(function (m) { return !q || norm([m.pseudo, m.bateau, m.email, m.port, m.immat].join(" ")).indexOf(q) >= 0; });
  L.appendChild(el("p", "mu", list.length + " compte" + (list.length > 1 ? "s" : "") + (q ? " trouvé" + (list.length > 1 ? "s" : "") : " au total")));
  list.forEach(function (m) {
    var c = el("div", "mbit"); c.style.cssText = "border:1px solid var(--line, #ccd);border-radius:12px;padding:10px 12px;margin:8px 0";
    var t = el("div"); t.appendChild(el("b", 0, m.pseudo || "(sans profil)"));
    if (m.admin) t.appendChild(el("span", "mu", "  · admin"));
    c.appendChild(t);
    c.appendChild(el("div", "mu", [m.bateau, m.type, m.port].filter(Boolean).join(" · ") || "Profil pas encore créé"));
    c.appendChild(el("div", "mu", (m.email || "") + " · inscrit le " + mbDate(m.inscrit) + " · vu le " + mbDate(m.vu)));
    var row = el("div", "row"); row.style.marginTop = "8px";
    var be = el("button", "btn g sm", mbOpen === m.id ? "Fermer" : "Modifier");
    be.onclick = function () { mbOpen = mbOpen === m.id ? null : m.id; mbDel = null; renderMb(); };
    row.appendChild(be);
    if (!m.pseudo && m.email) {
      var bm = el("button", "btn g sm", "Envoyer un e-mail");
      bm.onclick = function () {
        var sub = "Ton inscription sur Nauticonnect ⛵";
        var body = "Salut !\n\nMerci de t'être inscrit sur Nauticonnect, l'appli des plaisanciers du Léman.\n\nIl ne te manque qu'une étape : ouvre l'appli, va dans Chat et choisis ton prénom (ou un pseudo). Ça prend 10 secondes, et tu pourras ensuite discuter sur le Ponton, écrire en privé aux autres membres et recevoir les alertes (panne, vaudaire).\n\nLien de l'appli : " + location.origin + location.pathname + "\n\nÀ bientôt sur l'eau !\nManu – Nauticonnect";
        location.href = "mailto:" + encodeURIComponent(m.email) + "?subject=" + encodeURIComponent(sub) + "&body=" + encodeURIComponent(body);
      };
      row.appendChild(bm);
    }
    if (!m.admin && m.id !== uid) {
      var bd = el("button", "btn g sm", mbDel === m.id ? "Confirmer la suppression" : "Supprimer"); bd.style.color = "var(--red)";
      bd.onclick = function () { if (mbDel !== m.id) { mbDel = m.id; mbOpen = null; renderMb(); return; } mbDelete(m, bd); };
      row.appendChild(bd);
    }
    c.appendChild(row);
    if (mbDel === m.id) c.appendChild(el("p", "err", "Le compte, la fiche, les messages, annonces, avis et photos de ce membre seront effacés définitivement. Touchez encore « Confirmer » pour valider."));
    if (mbOpen === m.id) c.appendChild(mbForm(m));
    L.appendChild(c);
  });
}
function mbForm(m) {
  var F = el("div"); F.style.marginTop = "10px";
  function fld(lab, val, max) { F.appendChild(el("label", "l", lab)); var i = el("input", "f"); i.value = val || ""; if (max) i.maxLength = max; F.appendChild(i); return i; }
  var ps = fld("Pseudo *", m.pseudo, 24), bt = fld("Nom du bateau", m.bateau, 30);
  F.appendChild(el("label", "l", "Type")); var ty = el("select", "f");
  ["", "Sans bateau (équipier, passager)", "Je loue des bateaux", "Voilier", "Bateau à moteur", "Jet / semi-rigide", "Planche / paddle", "Autre"].forEach(function (x) { var o = el("option", 0, x || "— Non précisé —"); o.value = x; ty.appendChild(o); }); ty.value = m.type || ""; F.appendChild(ty);
  F.appendChild(el("label", "l", "Port")); var po = el("select", "f"); var o0 = el("option", 0, "— aucun —"); o0.value = ""; po.appendChild(o0);
  ZA().forEach(function (z) { var o = el("option", 0, z[0]); o.value = z[0]; po.appendChild(o); }); if (m.port && !Z.some(function (z) { return z[0] === m.port; })) { var ox = el("option", 0, m.port); ox.value = m.port; po.appendChild(ox); } po.value = m.port || ""; F.appendChild(po);
  var im = fld("Immatriculation", m.immat, 16);
  var ph = null;
  if (m.photo) { var lb = el("label"); lb.style.cssText = "display:flex;gap:8px;align-items:center;margin-top:10px"; ph = el("input"); ph.type = "checkbox"; lb.appendChild(ph); lb.appendChild(el("span", 0, "Retirer sa photo de profil")); F.appendChild(lb); }
  var msg = el("div", "err"), sv = el("button", "btn sm", "Enregistrer"); sv.style.marginTop = "10px";
  sv.onclick = function () {
    var p = ps.value.trim(); if (p.length < 2) { msg.textContent = "Pseudo trop court (2 caractères min.)."; return; }
    sv.disabled = true; msg.className = "err"; msg.textContent = "";
    var sans = !!(ph && ph.checked), old = m.photo;
    sb.rpc("admin_modifier_membre", { m: m.id, p_pseudo: p, p_bateau: bt.value.trim(), p_type: ty.value, p_port: po.value, p_immat: im.value.trim().toUpperCase(), p_sans_photo: sans }).then(function (r) {
      sv.disabled = false;
      if (r.error) { msg.textContent = "Enregistrement impossible : " + r.error.message; return; }
      if (sans && old) sb.storage.from("photos").remove([old]).then(function () {});
      toast("Membre mis à jour."); mbOpen = null; load("profils"); loadMb();
    });
  };
  F.appendChild(sv); F.appendChild(msg);
  return F;
}
function mbDelete(m, b) {
  b.disabled = true; b.textContent = "Suppression…";
  sb.storage.from("photos").list(m.id, { limit: 1000 }).then(function (r) {
    var files = (r.data || []).map(function (f) { return m.id + "/" + f.name; });
    return files.length ? sb.storage.from("photos").remove(files) : null;
  }).catch(function () {}).then(function () { return sb.rpc("admin_supprimer_membre", { m: m.id }); }).then(function (r) {
    if (r && r.error) { b.disabled = false; b.textContent = "Confirmer la suppression"; toast("Suppression impossible : " + r.error.message, 4000); return; }
    toast("Membre supprimé."); mbDel = null; load("profils"); loadMb();
  });
}

/* ================= APERÇU ADMIN ================= */
var VIEWN = { admin: "Admin (modérateur)", membre: "Membre", invite: "Invité sans compte" }, VIEWS2 = { membre: "membre", invite: "invité" };
function applyView() {
  if (!realAdmin) viewAs = "admin";
  isAdmin = realAdmin && viewAs === "admin";
  var bar = $("vwBar");
  if (bar) { bar.hidden = !preview(); $("pvTxt").textContent = "Aperçu " + (VIEWS2[viewAs] || ""); }
  document.documentElement.classList.toggle("previewing", preview());
  var B = $("pvBox"); if (B) { B.hidden = !realAdmin; Array.prototype.forEach.call(B.querySelectorAll("[data-view]"), function (b) { b.classList.toggle("g", b.dataset.view !== viewAs); }); }
}
function setView(v) {
  viewAs = v; try { sessionStorage.setItem("nc-view", v); } catch (e) {}
  applyView(); toast(v === "admin" ? "Retour en mode admin" : "Vous voyez l'appli comme : " + VIEWN[v]);
  if (v === "admin") location.hash = "profil"; else location.hash = ""; renderAll();
}
Array.prototype.forEach.call(document.querySelectorAll("[data-view]"), function (b) { b.onclick = function () { setView(b.dataset.view); }; });
$("pvExit").onclick = function () { setView("admin"); };
applyView();

/* ================= ALERTE VAUDAIRE : s'abonner ================= */
function vdOn() { return !!(mySub && myAbo && myAbo.vent) && real(); }
function vaudaireOn() {
  if (!requireProfile(null, "Pour recevoir l'alerte vaudaire sur votre téléphone, créez votre compte gratuit. Vous serez prévenu avant que le foehn se lève sur le Haut-Lac.")) return;
  if (!pushOk) { toast("Installez d'abord l'appli sur l'écran d'accueil de votre téléphone (menu de Chrome › Ajouter à l'écran d'accueil)."); return; }
  if (Notification.permission === "denied") { toast("Notifications bloquées. " + notifHelp()); return; }
  if (mySub && myAbo) { pushSave(mySub, { vent: true }).then(function () { toast("Alerte vaudaire activée sur ce téléphone !"); renderVd(); }); return; }
  pushEnable({ vent: true });
}
function renderVd() {
  /* tant que l'état des notifications n'est pas connu, on garde le dernier affichage : pas de clignotement */
  var on = pushKnown || preview() ? vdOn() : ls("nc-vdon") === "1";
  if (pushKnown && !preview()) ls("nc-vdon", on ? "1" : "");
  ["vdHome", "vdMeteo"].forEach(function (id) { var c = $(id); if (!c) return; c.classList.toggle("on", on); c.hidden = on && id === "vdHome"; });
}
Array.prototype.forEach.call(document.querySelectorAll(".vdGo"), function (b) { b.onclick = vaudaireOn; });

/* ================= MODÉRATION : vider le chat principal ================= */
$("modClear").onclick = function () {
  var b = this, m = $("modMsg"); m.textContent = "";
  if (!isAdmin) return;
  if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "Confirmer : tout effacer (" + SL.length + " message" + (SL.length > 1 ? "s" : "") + ")"; b.classList.add("danger"); setTimeout(function () { if (b.dataset.ok === "1") { b.dataset.ok = ""; b.textContent = "Vider le chat principal"; b.classList.remove("danger"); } }, 6000); return; }
  b.dataset.ok = ""; b.disabled = true;
  sb.rpc("vider_salon").then(function (r) {
    b.disabled = false; b.textContent = "Vider le chat principal"; b.classList.remove("danger");
    if (r.error) { m.className = "err"; m.textContent = "Impossible de vider le chat : " + r.error.message; return; }
    SL = []; LK = []; m.className = "okm"; m.textContent = r.data + " message" + (r.data > 1 ? "s" : "") + " effacé" + (r.data > 1 ? "s" : "") + ". Le salon est vide.";
    load("salon"); load("likes"); renderAll();
  });
};

/* ================= SÉLECTION DE MESSAGES (façon WhatsApp) ================= */
var SEL = null; /* { group: bool, ids: {id: message} } */
function canSel(m, group) { return !!me() && (m.de === uid || (group && isAdmin)); }
function isSel(m, group) { return !!(SEL && SEL.group === !!group && SEL.ids[m.id]); }
function bindBubble(b, row, m, group, mine) {
  var t = null, lp = false;
  function cancel() { clearTimeout(t); t = null; }
  b.addEventListener("pointerdown", function () { lp = false; cancel(); if (!canSel(m, group)) return; t = setTimeout(function () { lp = true; if (navigator.vibrate) navigator.vibrate(30); if (SEL && SEL.group === !!group) selToggle(m); else selStart(m, group); }, 480); });
  ["pointerup", "pointerleave", "pointercancel", "pointermove"].forEach(function (ev) { b.addEventListener(ev, function (e) { if (ev === "pointermove" && e.pointerType === "mouse") return; if (ev !== "pointerup" || !lp) cancel(); }); });
  b.addEventListener("contextmenu", function (e) { if (canSel(m, group)) e.preventDefault(); });
  /* après un appui long ou en mode sélection, on bloque les clics sur le nom, la photo, etc. */
  b.addEventListener("click", function (e) { if ((lp || (SEL && SEL.group === !!group)) && e.target !== b) { e.stopPropagation(); e.preventDefault(); b.onclick(e); } }, true);
  b.onclick = function (e) {
    if (lp) { lp = false; return; }
    if (e.target.closest && e.target.closest(".wa-menu")) return;
    if (SEL && SEL.group === !!group) { if (canSel(m, group)) selToggle(m); else toast(group ? "Vous ne pouvez supprimer que vos messages." : "Seuls vos propres messages peuvent être supprimés."); return; }
    bubbleMenu(b, m, group, mine);
  };
}
function selStart(m, group) { var old = document.querySelector(".wa-menu"); if (old) old.remove(); SEL = { group: !!group, ids: {} }; SEL.ids[m.id] = m; selUI(); }
function selToggle(m) { if (SEL.ids[m.id]) delete SEL.ids[m.id]; else SEL.ids[m.id] = m; if (!Object.keys(SEL.ids).length) { selEnd(); return; } selUI(); }
function selEnd(quiet) { SEL = null; $("selBar").hidden = true; document.documentElement.classList.remove("selecting"); if (!quiet && cur() === "ponton") renderPonton(); }
function selUI() {
  var n = Object.keys(SEL.ids).length;
  $("selN").textContent = n + " sélectionné" + (n > 1 ? "s" : "");
  $("selBar").hidden = false; document.documentElement.classList.add("selecting");
  Array.prototype.forEach.call(document.querySelectorAll(".wa-row"), function (r) { var id = r.id.replace(/^(sl|pm)-/, ""); var on = !!SEL.ids[id] && r.id.indexOf(SEL.group ? "sl-" : "pm-") === 0; r.classList.toggle("sel", on); });
}
$("selX").onclick = function () { selEnd(); };
$("selDel").onclick = function () {
  if (!SEL) return; var ids = Object.keys(SEL.ids), n = ids.length;
  if (!confirm("Supprimer " + n + " message" + (n > 1 ? "s" : "") + " pour tout le monde ?")) return;
  delMsgs(ids.map(Number), SEL.group, ids.map(function (k) { return SEL.ids[k]; }));
};
function delMsgs(ids, group, list) {
  if (!ids.length) return;
  list = list || (group ? SL : M).filter(function (m) { return ids.indexOf(m.id) >= 0; });
  sb.from(group ? "salon" : "messages").delete().in("id", ids).then(function (r) {
    if (r.error) { toast("Suppression impossible."); return; }
    if (group) { var ph = list.filter(function (m) { return m.photo; }).map(function (m) { return m.photo; }); if (ph.length) sb.storage.from("photos").remove(ph); SL = SL.filter(function (m) { return ids.indexOf(m.id) < 0; }); }
    else M = M.filter(function (m) { return ids.indexOf(m.id) < 0; });
    toast(ids.length > 1 ? ids.length + " messages supprimés" : "Message supprimé");
    selEnd(); load(group ? "salon" : "messages");
  });
}
/* menu ⋮ de la discussion privée : ami, bloquer, effacer */
function pvMenuClose() { var m = document.querySelector(".wa-dd"); if (m) m.remove(); document.removeEventListener("click", pvMenuOut, true); }
function pvMenuOut(e) { var m = document.querySelector(".wa-dd"); if (m && !m.contains(e.target) && e.target !== $("pvMore")) pvMenuClose(); }
$("pvMore").onclick = function (e) {
  e.stopPropagation(); if (document.querySelector(".wa-dd")) { pvMenuClose(); return; }
  var k = openWith; if (!k) return;
  var M = el("div", "wa-dd"); M.setAttribute("role", "menu");
  var add = function (t, f, cls, off) { var b = el("button", cls || 0, t); b.type = "button"; b.setAttribute("role", "menuitem"); if (off) b.disabled = true; b.onclick = function () { pvMenuClose(); f(); }; M.appendChild(b); };
  var r = rel(k);
  if (r === "ami") add("✓ Vous êtes amis", function () {}, 0, true);
  else if (r === "envoye") add("Demande d'ami envoyée", function () {}, 0, true);
  else add(r === "recu" ? "Accepter en ami" : "Ajouter en ami", function () { befriend(k); });
  if ((threads()[k] || []).length) add("Effacer la discussion", clearConv);
  add(isBl(k) ? "Débloquer ce membre" : "Bloquer ce membre", function () { toggleBlock(k); }, "red");
  $("pvMore").parentNode.appendChild(M);
  setTimeout(function () { document.addEventListener("click", pvMenuOut, true); }, 0);
};
function clearConv() {
  var k = openWith; if (!k) return;
  if (!confirm("Effacer cette discussion de votre téléphone ? L'autre personne la garde. Vos propres messages restent visibles chez elle.")) return;
  ls("nc-clr-" + k, String(Date.now())); toast("Discussion effacée"); renderPonton();
};

/* ================= MESSAGE DE BIENVENUE ÉPINGLÉ (salon) ================= */
var WEL_DEF = "Bienvenue sur Le Ponton, le chat des plaisanciers du Léman !\n\n" +
  "• Écrivez ici pour discuter avec tous les membres : météo, bons plans, rendez-vous au port ou sur l'eau.\n" +
  "• Touchez un message pour y répondre, écrire en privé à son auteur ou le signaler.\n" +
  "• Appui long sur un de vos messages pour le sélectionner et le supprimer.\n" +
  "• Tapez @ suivi d'un prénom pour interpeller un membre : il reçoit une notification.\n" +
  "• L'appareil photo à gauche permet de partager une photo du lac.\n" +
  "• Onglet Privé : vos discussions personnelles. Onglet Amis : cherchez un plaisancier, ajoutez-le en ami et retrouvez vos amis. Onglet Sur l'eau : hissez le pavillon pour montrer que vous naviguez.\n" +
  "• En panne sur le lac ? Bouton rouge SOS : les plaisanciers proches sont alertés. En cas de danger, appelez d'abord le 117.\n\n" +
  "Restons courtois et bienveillants : les messages déplacés sont supprimés.\n\nBon vent ! L'équipe Nauticonnect";
function welText() { return (REG.salon_bienvenue || "").trim() || WEL_DEF; }
function welKey(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return String(h); }
function pinBlock() {
  var t = welText(), k = welKey(t), small = ls("nc-pin-min") === k;
  var c = el("div", "wa-pin" + (small ? " min" : ""));
  var hd = el("button", "wa-pin-h"); hd.type = "button";
  hd.appendChild(el("span", "wa-pin-ic", "N")); var tt = el("span", "wa-pin-t"); tt.appendChild(el("b", 0, "Nauticonnect")); tt.appendChild(el("small", 0, "Message épinglé · comment ça marche")); hd.appendChild(tt);
  hd.appendChild(el("span", "wa-pin-tg", small ? "Afficher" : "Réduire"));
  hd.onclick = function () { ls("nc-pin-min", small ? "" : k); renderPonton(); };
  c.appendChild(hd);
  if (!small) { var b = el("div", "wa-pin-b"); b.textContent = t; c.appendChild(b); }
  return c;
}
$("modWelSave").onclick = function () {
  if (!isAdmin) return; var v = $("modWel").value.trim();
  sb.from("reglages").upsert({ k: "salon_bienvenue", v: v === WEL_DEF ? "" : v }).then(function (r) { toast(r.error ? "Enregistrement impossible" : "Message de bienvenue mis à jour"); load("reglages"); });
};
$("modWelReset").onclick = function () { $("modWel").value = WEL_DEF; };
$("modWel").value = welText();

/* ================= BOUSSOLE (capteur du téléphone) + repère vers le port d'attache ================= */
var BS = { on: false, cap: null, shown: null, pos: null, wid: null, raf: 0, abs: false, last: 0 };
var BSDIR = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
(function () {
  var T = $("bsTicks"); if (!T) return; var ns = "http://www.w3.org/2000/svg", out = "";
  for (var d = 0; d < 360; d += 5) { var big = d % 30 === 0, r1 = 138, r2 = big ? 120 : 129, a = d * Math.PI / 180;
    out += '<line x1="' + (150 + r1 * Math.sin(a)).toFixed(1) + '" y1="' + (150 - r1 * Math.cos(a)).toFixed(1) + '" x2="' + (150 + r2 * Math.sin(a)).toFixed(1) + '" y2="' + (150 - r2 * Math.cos(a)).toFixed(1) + '" stroke="#F4F1EA" stroke-width="' + (big ? 2.2 : 1) + '" opacity="' + (big ? 0.95 : 0.55) + '"/>';
    if (big && d % 90) out += '<text x="' + (150 + 104 * Math.sin(a)).toFixed(1) + '" y="' + (155 - 104 * Math.cos(a)).toFixed(1) + '" font-size="12" text-anchor="middle" fill="#B9C7CF" font-family="IBM Plex Mono,monospace">' + d + '</text>'; }
  T.innerHTML = out;
})();
function bsMsg(t) { var m = $("bsMsg"); if (m) m.textContent = t || ""; }
function bsSensor(e) {
  var c = null;
  if (typeof e.webkitCompassHeading === "number") c = e.webkitCompassHeading; /* iPhone */
  else if (e.alpha != null && (e.absolute || e.type === "deviceorientationabsolute")) { c = 360 - e.alpha; BS.abs = true; }
  if (c == null) return;
  var sa = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  c = ((c + sa) % 360 + 360) % 360;
  BS.cap = BS.cap == null ? c : (function (o, n) { var d = ((n - o + 540) % 360) - 180; return (o + d * 0.25 + 360) % 360; })(BS.cap, c); /* lissage */
  BS.last = Date.now();
  if (!BS.raf) BS.raf = requestAnimationFrame(bsDraw);
}
function bsDraw() {
  BS.raf = 0; var r = $("bsRose"); if (!r || BS.cap == null) return;
  r.setAttribute("transform", "rotate(" + (-BS.cap).toFixed(1) + " 150 150)");
  var c = Math.round(BS.cap) % 360; $("bsDeg").textContent = c + "°"; $("bsDir").textContent = BSDIR[Math.round(c / 22.5) % 16] + (BS.abs || typeof window.DeviceOrientationEvent === "undefined" ? "" : "");
}
function bsStart() {
  if (BS.on) return; BS.on = true; bsMsg("");
  if ("ondeviceorientationabsolute" in window) window.addEventListener("deviceorientationabsolute", bsSensor);
  else window.addEventListener("deviceorientation", bsSensor);
  $("bsGo").textContent = "Boussole active"; $("bsGo").disabled = true;
  setTimeout(function () { if (BS.on && BS.cap == null) bsMsg("Pas de cap reçu : ce téléphone n'a peut-être pas de boussole, ou le capteur est bloqué. Essayez de bouger un peu le téléphone."); }, 3000);
}
function bsLeave() {
  if (!BS || (!BS.on && BS.wid == null)) return; /* au démarrage, BS n'existe pas encore */
  window.removeEventListener("deviceorientationabsolute", bsSensor); window.removeEventListener("deviceorientation", bsSensor); BS.on = false;
  if (BS.wid != null && navigator.geolocation) { navigator.geolocation.clearWatch(BS.wid); BS.wid = null; }
  var g = $("bsGo"); if (g) { g.disabled = false; g.textContent = "Activer la boussole"; }
}
function bsEnter() {
  if (!BS) { setTimeout(bsEnter, 0); return; }
  bsPort();
  /* Android : démarre tout seul ; iPhone : il faut toucher le bouton (autorisation) */
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== "function") bsStart();
}
function bsBearing(a, b, c, d) { var r = Math.PI / 180, y = Math.sin((d - b) * r) * Math.cos(c * r), x = Math.cos(a * r) * Math.sin(c * r) - Math.sin(a * r) * Math.cos(c * r) * Math.cos((d - b) * r); return (Math.atan2(y, x) / r + 360) % 360; }
function bsPort() {
  var t = $("bsPortTxt"), g = $("bsPort"); if (!t || !g) return;
  var p = me(), z = p && p.port ? Z.filter(function (x) { return x[0] === p.port; })[0] : null;
  if (!z) { g.style.display = "none"; t.textContent = real() ? "Choisissez votre port d'attache dans Mon profil pour avoir le repère jaune vers votre port." : "Avec un compte, le repère jaune vous indique la direction de votre port d'attache."; return; }
  var nom = z[0].replace(/\s*\((F|CH)\)\s*$/, "");
  if (!BS.pos) { g.style.display = "none"; t.textContent = "Touchez « Repère vers mon port » pour voir la direction et la distance de " + nom + "."; return; }
  var b = bsBearing(BS.pos.lat, BS.pos.lon, z[1], z[2]), dk = km(BS.pos.lat, BS.pos.lon, z[1], z[2]);
  g.style.display = ""; g.setAttribute("transform", "rotate(" + b.toFixed(1) + " 150 150)");
  t.textContent = (dk < 0.15 ? "Vous êtes à " + nom + "." : "Repère jaune : " + nom + " · " + (dk < 10 ? dk.toFixed(1).replace(".", ",") : Math.round(dk)) + " km · cap " + Math.round(b) + "° " + BSDIR[Math.round(b / 22.5) % 16]);
}
(function () {
  var go = $("bsGo"), gp = $("bsGps"); if (!go || !gp) return;
  go.onclick = function () {
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then(function (r) { if (r === "granted") bsStart(); else bsMsg("Accès au capteur refusé. Autorisez « Mouvement et orientation » dans les réglages."); }).catch(function () { bsMsg("Impossible d'activer le capteur."); });
    } else if (window.DeviceOrientationEvent) bsStart();
    else bsMsg("Ce téléphone ou ce navigateur ne fournit pas de boussole.");
  };
  gp.onclick = function () {
    if (!navigator.geolocation) { bsMsg("GPS indisponible."); return; }
    if (BS.wid != null) return; $("bsPortTxt").textContent = "Recherche de votre position…";
    BS.wid = navigator.geolocation.watchPosition(function (p) { BS.pos = { lat: p.coords.latitude, lon: p.coords.longitude }; bsPort(); },
      function (e) { BS.wid = null; bsMsg(e.code === 1 ? "GPS refusé : autorisez la position pour Nauticonnect." : "Position indisponible, réessayez en extérieur."); }, { enableHighAccuracy: true, maximumAge: 10000 });
  };
})();

/* ================= CARNET DE BORD : enregistrement des sorties par GPS ================= */
var TR = null, trWid = null, trLock = null, trTick = null, ckEnd = null; /* CK est déclaré en haut du fichier (utilisé dès le démarrage) */
try { TR = JSON.parse(ls("nc-trip") || "null"); if (TR && (!TR.on || Date.now() - TR.start > 24 * 36e5)) { if (!TR.on) TR = null; } } catch (e) { TR = null; }
function trSave() { try { ls("nc-trip", TR ? JSON.stringify(TR) : ""); } catch (e) {} }
function fKm(k) { return (k < 10 ? (+k).toFixed(1) : String(Math.round(k))).replace(".", ","); }
function fKn(v) { return (+v || 0).toFixed(1).replace(".", ","); }
function fDur(ms) { var m = Math.max(0, Math.round(ms / 60000)), hh = Math.floor(m / 60), mm = m % 60; return hh + ":" + ("0" + mm).slice(-2); }
function fDurTxt(ms) { var m = Math.max(1, Math.round(ms / 60000)), hh = Math.floor(m / 60), mm = m % 60; return hh ? hh + " h " + ("0" + mm).slice(-2) : mm + " min"; }
/* dessine un trajet sur un petit plan du lac, cadré sur la sortie */
function drawTrip(svg, pts, hideEnds) {
  svg.textContent = ""; if (!pts || pts.length < 2) { if (svg.id === "cbMap") baseMap(svg, true); return; }
  var P2 = pts;
  if (hideEnds) { /* vie privée : on masque les 500 premiers et derniers mètres */
    var acc = 0, a = 0, b = pts.length - 1;
    for (a = 1; a < pts.length && acc < 0.5; a++) acc += km(pts[a - 1][0], pts[a - 1][1], pts[a][0], pts[a][1]);
    acc = 0; for (b = pts.length - 2; b > a && acc < 0.5; b--) acc += km(pts[b + 1][0], pts[b + 1][1], pts[b][0], pts[b][1]);
    P2 = pts.slice(a, b + 1); if (P2.length < 2) return;
  }
  var la0 = 1e9, la1 = -1e9, lo0 = 1e9, lo1 = -1e9;
  P2.forEach(function (p) { la0 = Math.min(la0, p[0]); la1 = Math.max(la1, p[0]); lo0 = Math.min(lo0, p[1]); lo1 = Math.max(lo1, p[1]); });
  var kx = Math.cos((la0 + la1) / 2 * Math.PI / 180), W = 680, H = +svg.getAttribute("viewBox").split(" ")[3] || 410;
  var dLo = Math.max((lo1 - lo0) * kx, 0.03), dLa = Math.max(la1 - la0, 0.03), sc = Math.min(W / dLo, H / dLa) * 0.82;
  var cx = (lo0 + lo1) / 2, cy = (la0 + la1) / 2;
  function px(lo) { return (W / 2 + (lo - cx) * kx * sc).toFixed(1); } function py(la) { return (H / 2 - (la - cy) * sc).toFixed(1); }
  function mk(t, at) { var e = document.createElementNS(NS, t); for (var k in at) e.setAttribute(k, at[k]); svg.appendChild(e); return e; }
  mk("rect", { x: 0, y: 0, width: W, height: H, fill: "#e6efe4" });
  mk("polygon", { points: OUT.map(function (q) { return px(q[0]) + "," + py(q[1]); }).join(" "), fill: "#bfe0f2", stroke: "#7fb6d6", "stroke-width": 2 });
  mk("polyline", { points: P2.map(function (p) { return px(p[1]) + "," + py(p[0]); }).join(" "), fill: "none", stroke: "#0E2A3B", "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round" });
  var f = P2[0], l = P2[P2.length - 1];
  mk("circle", { cx: px(f[1]), cy: py(f[0]), r: 8, fill: "#1f8a5b", stroke: "#fff", "stroke-width": 3 });
  mk("circle", { cx: px(l[1]), cy: py(l[0]), r: 8, fill: "#d62f2f", stroke: "#fff", "stroke-width": 3 });
}
function trLive() {
  if (!$("cbKm")) return; var on = !!(TR && TR.on);
  $("cbStart").hidden = on; $("cbStop").hidden = !on;
  $("cbKm").textContent = fKm(on ? TR.km : 0); $("cbDur").textContent = fDur(on ? Date.now() - TR.start : 0);
  $("cbV").textContent = fKn(on ? TR.v : 0); $("cbVx").textContent = fKn(on ? TR.vmax : 0);
  $("cbSt").textContent = on ? (trWid != null ? "Enregistrement en cours · " + TR.pts.length + " points" + (trLock ? " · écran maintenu allumé" : "") : "En pause : revenez dans l'appli pour reprendre") : "";
  if (cur() === "carnet") drawTrip($("cbMap"), on ? TR.pts : null);
}
function trWake() { try { if (navigator.wakeLock && TR && TR.on && !document.hidden) navigator.wakeLock.request("screen").then(function (l) { trLock = l; l.addEventListener("release", function () { trLock = null; }); }, function () {}); } catch (e) {} }
function trPoint(p) {
  if (!TR || !TR.on) return; var c = p.coords; if (c.accuracy > 60) return;
  var pt = [Math.round(c.latitude * 1e5) / 1e5, Math.round(c.longitude * 1e5) / 1e5, p.timestamp || Date.now()], L = TR.pts[TR.pts.length - 1];
  var v = c.speed != null && c.speed >= 0 ? c.speed * 1.94384 : 0;
  if (L) {
    var d = km(L[0], L[1], pt[0], pt[1]), dt = (pt[2] - L[2]) / 36e5;
    if (d < 0.015 && pt[2] - L[2] < 60000) { TR.v = v; trLive(); return; }
    if (d > 3 && dt > 0 && d / dt > 110) return; /* saut GPS improbable */
    TR.km += d; if (c.speed == null && dt > 0) v = d / dt / 1.852;
  }
  TR.v = v; if (c.accuracy <= 30 && v < 60) TR.vmax = Math.max(TR.vmax, v);
  TR.pts.push(pt); if (TR.pts.length > 5000) TR.pts = TR.pts.filter(function (x, i) { return i % 2 === 0 || i === TR.pts.length - 1; });
  trSave(); trLive();
}
function trWatch() {
  if (trWid != null || !TR || !TR.on || !navigator.geolocation) return;
  trWid = navigator.geolocation.watchPosition(trPoint, function (e) { if (e.code === 1) { $("cbErr").textContent = "GPS refusé : autorisez la position pour Nauticonnect."; } }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
  trWake(); clearInterval(trTick); trTick = setInterval(trLive, 15000); trLive();
}
function trUnwatch() { if (trWid != null && navigator.geolocation) navigator.geolocation.clearWatch(trWid); trWid = null; try { if (trLock) trLock.release(); } catch (e) {} trLock = null; clearInterval(trTick); }
document.addEventListener("visibilitychange", function () { if (TR && TR.on && !document.hidden) { trWatch(); trWake(); trLive(); } });
if (TR && TR.on) setTimeout(trWatch, 1500); /* une sortie était en cours : on reprend */
function trSimplify(pts) { var n = pts.length, st = Math.max(1, Math.ceil(n / 400)), o = []; for (var i = 0; i < n; i += st) o.push([pts[i][0], pts[i][1]]); var l = pts[n - 1]; if (o[o.length - 1][0] !== l[0] || o[o.length - 1][1] !== l[1]) o.push([l[0], l[1]]); return o; }
(function () {
  var a = $("cbStart"), b = $("cbStop"); if (!a || !b) return;
  a.onclick = function () {
    $("cbErr").textContent = ""; if (!requireProfile($("cbErr"), "Pour enregistrer vos sorties, créez votre compte gratuit.")) return;
    if (!navigator.geolocation) { $("cbErr").textContent = "GPS indisponible sur ce téléphone."; return; }
    TR = { on: true, start: Date.now(), pts: [], km: 0, vmax: 0, v: 0 }; ckEnd = null; trSave(); trWatch(); renderCarnet();
  };
  b.onclick = function () {
    if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "Confirmer : terminer la sortie"; setTimeout(function () { b.dataset.ok = ""; b.textContent = "Terminer la sortie"; }, 4000); return; }
    b.dataset.ok = ""; b.textContent = "Terminer la sortie";
    trUnwatch(); var T = TR; TR = null; trSave();
    ckEnd = T && T.pts.length >= 2 && T.km >= 0.05 ? T : { trop: true }; renderCarnet();
  };
})();
function ckEndForm() {
  var E = $("cbEnd"); if (!E) return; E.textContent = ""; if (!ckEnd) return;
  var c = el("div", "card"); E.appendChild(c);
  if (ckEnd.trop) { c.appendChild(el("b", 0, "Sortie trop courte")); c.appendChild(el("div", "mu", "Moins de 50 mètres enregistrés : elle n'est pas sauvegardée.")); var ok0 = el("button", "btn g sm", "OK"); ok0.onclick = function () { ckEnd = null; renderCarnet(); }; c.appendChild(ok0); return; }
  var T = ckEnd, dur = (T.pts[T.pts.length - 1][2] || Date.now()) - T.start, f = T.pts[0], l = T.pts[T.pts.length - 1];
  var dep = nearPort(f[0], f[1]), arr = nearPort(l[0], l[1]), vm = dur > 0 ? T.km / (dur / 36e5) / 1.852 : 0;
  c.appendChild(el("b", 0, "Bravo ! Sortie terminée"));
  c.appendChild(el("div", "mu", fKm(T.km) + " km · " + fDurTxt(dur) + " · max " + fKn(T.vmax) + " nœuds · moyenne " + fKn(vm) + " nœuds"));
  c.appendChild(el("div", "mu", dep === arr ? "Autour de " + dep : dep + " → " + arr));
  var ti = el("input", "f"); ti.maxLength = 80; ti.value = "Sortie du " + dFr(new Date(T.start).toISOString().slice(0, 10)); ti.setAttribute("aria-label", "Titre de la sortie");
  var no = el("textarea", "f"); no.rows = 2; no.maxLength = 500; no.placeholder = "Un mot sur la sortie (facultatif)"; no.setAttribute("aria-label", "Note");
  var ph = el("input"); ph.type = "file"; ph.accept = "image/*"; ph.multiple = true; ph.setAttribute("aria-label", "Photos");
  var pl = el("label", "l", "Photos (jusqu'à 3, facultatif)"); var pu = el("label", "chk"), pc = el("input"); pc.type = "checkbox"; pu.appendChild(pc); pu.appendChild(document.createTextNode(" Partager avec les membres (le début et la fin du trajet sont masqués)"));
  c.appendChild(ti); c.appendChild(no); c.appendChild(pl); c.appendChild(ph); c.appendChild(pu);
  var m = el("div", "err"), sv = el("button", "btn", "Enregistrer dans mon carnet"), dl = el("button", "btn g", "Ne pas enregistrer");
  var r = el("div", "row"); r.style.marginTop = "8px"; r.appendChild(dl); r.appendChild(sv); c.appendChild(r); c.appendChild(m);
  dl.onclick = function () { if (dl.dataset.ok !== "1") { dl.dataset.ok = "1"; dl.textContent = "Confirmer : effacer"; return; } ckEnd = null; renderCarnet(); };
  sv.onclick = function () {
    if (!real()) { m.textContent = "Connectez-vous pour enregistrer."; return; }
    sv.disabled = true; m.className = "mu"; m.textContent = "Enregistrement…";
    var files = Array.prototype.slice.call(ph.files || [], 0, 3), paths = [];
    var chain = Promise.resolve();
    files.forEach(function (fi, i) { chain = chain.then(function () { var path = uid + "/carnet-" + Date.now() + "-" + i + ".jpg"; return shrink(fi, 1400).then(function (blob) { return sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" }); }).then(function (q) { if (!q.error) paths.push(path); }); }); });
    chain.then(function () {
      return sb.from("carnet").insert({ titre: ti.value.trim().slice(0, 80) || "Sortie", note: no.value.trim().slice(0, 500), debut: new Date(T.start).toISOString(), fin: new Date(T.start + dur).toISOString(),
        km: Math.round(T.km * 100) / 100, vmax: Math.round(T.vmax * 10) / 10, vmoy: Math.round(vm * 10) / 10, depart: dep, arrivee: arr, trace: trSimplify(T.pts), photos: paths, public: pc.checked });
    }).then(function (q) {
      sv.disabled = false; if (q && q.error) { m.className = "err"; m.textContent = "Enregistrement impossible, réessayez."; return; }
      ckEnd = null; toast(pc.checked ? "Sortie enregistrée et partagée !" : "Sortie enregistrée dans votre carnet"); load("carnet");
    }, function () { sv.disabled = false; m.className = "err"; m.textContent = "Enregistrement impossible, réessayez."; });
  };
}
function ckCard(x) {
  var c = el("div", "card ck"), mine = x.auteur === uid, dur = ts(x.fin) - ts(x.debut);
  if (!mine) { var w = el("div"); w.appendChild(badge(x.auteur)); c.appendChild(w); }
  c.appendChild(el("b", "ck-t", x.titre || "Sortie"));
  c.appendChild(el("div", "mu", dFr(String(x.debut).slice(0, 10)) + " · " + (x.depart === x.arrivee ? "autour de " + x.depart : x.depart + " → " + x.arrivee)));
  c.appendChild(el("div", "ck-s", fKm(+x.km) + " km · " + fDurTxt(dur) + " · max " + fKn(x.vmax) + " nd · moy " + fKn(x.vmoy) + " nd"));
  var sv = document.createElementNS(NS, "svg"); sv.setAttribute("viewBox", "0 0 680 300"); sv.setAttribute("class", "cb-map"); sv.setAttribute("role", "img"); sv.setAttribute("aria-label", "Trajet"); c.appendChild(sv); drawTrip(sv, x.trace, !mine);
  if (x.note) c.appendChild(el("div", 0, x.note));
  if (mine) { var fr = friendIds(), a0 = ts(x.debut), b0 = ts(x.fin), w2 = {};
    CK.forEach(function (y) { if (y.auteur !== uid && y.public && fr.indexOf(y.auteur) >= 0 && ts(y.debut) < b0 && ts(y.fin) > a0 && P[y.auteur]) w2[P[y.auteur].pseudo] = 1; });
    var nm2 = Object.keys(w2); if (nm2.length) c.appendChild(el("div", "ck-fr", "Sur l'eau en même temps : " + nm2.join(", "))); }
  if (x.photos && x.photos.length) { var g = el("div", "ck-ph"); x.photos.forEach(function (p) { var im = el("img"); im.src = photoUrl(p); im.alt = "Photo de la sortie"; im.loading = "lazy"; im.onclick = function () { viewPhoto(im.src); }; g.appendChild(im); }); c.appendChild(g); }
  var A = el("div", "row"); A.style.marginTop = "8px";
  if (mine) {
    var sh = el("button", "btn g sm", x.public ? "Ne plus partager" : "Partager avec les membres");
    sh.onclick = function () { sh.disabled = true; sb.from("carnet").update({ public: !x.public }).eq("id", x.id).then(function (q) { if (q.error) toast("Action impossible."); else toast(x.public ? "Sortie redevenue privée" : "Sortie partagée avec les membres"); load("carnet"); }); };
    var de = el("button", "btn g sm", "Supprimer"); de.style.color = "var(--red)";
    de.onclick = function () { if (de.dataset.ok !== "1") { de.dataset.ok = "1"; de.textContent = "Confirmer"; return; } sb.from("carnet").delete().eq("id", x.id).then(function () { if (x.photos && x.photos.length) sb.storage.from("photos").remove(x.photos); load("carnet"); }); };
    var gx = el("button", "btn g sm", "Exporter (GPX)"); gx.onclick = function () { ckGpx(x); };
    A.appendChild(sh); A.appendChild(gx); A.appendChild(de); if (x.public) c.insertBefore(el("span", "ck-pub", "Partagée"), c.firstChild);
  } else {
    if (P[x.auteur]) { var wr = el("button", "btn g sm", "Écrire"); wr.onclick = function () { openThread(x.auteur, "Belle sortie « " + (x.titre || "") + " » ! "); }; A.appendChild(wr); }
    if (isAdmin) { var ad = el("button", "btn g sm", "Retirer (admin)"); ad.onclick = function () { if (confirm("Retirer cette sortie ?")) sb.from("carnet").delete().eq("id", x.id).then(function () { load("carnet"); }); }; A.appendChild(ad); }
  }
  if (A.firstChild) c.appendChild(A);
  return c;
}
function renderCarnet() {
  if (!$("cbMine")) return; trLive(); ckEndForm();
  var M = $("cbMine"), U = $("cbPub"); M.textContent = ""; U.textContent = "";
  if (!real()) { M.appendChild(el("p", "mu", "Créez votre compte gratuit pour garder vos sorties.")); return; }
  var mine = CK.filter(function (x) { return x.auteur === uid; }), pub = CK.filter(function (x) { return x.auteur !== uid && x.public && !isBl(x.auteur); });
  if (mine.length) M.appendChild(ckSeason(mine));
  var shown = isPremium() ? mine : mine.slice(0, 5);
  shown.forEach(function (x) { M.appendChild(ckCard(x)); });
  if (shown.length < mine.length) M.appendChild(el("div", "note", "Vos " + (mine.length - shown.length) + " sorties plus anciennes sont gardées : elles sont visibles avec Nauticonnect+."));
  if (!mine.length) M.appendChild(el("p", "mu", "Aucune sortie enregistrée. Touchez « Démarrer ma sortie » en larguant les amarres !"));
  pub.slice(0, 20).forEach(function (x) { U.appendChild(ckCard(x)); });
  if (!pub.length) U.appendChild(el("p", "mu", "Aucune sortie partagée pour l'instant."));
}
/* bandeau vert dans le salon : sorties partagées dans les dernières 24 h */
function ckBanners(box) {
  var lim = Date.now() - 864e5;
  CK.filter(function (x) { return x.public && x.auteur !== uid && P[x.auteur] && !isBl(x.auteur) && ts(x.t) > lim; }).slice(0, 2).forEach(function (x) {
    var b = el("button", "wa-pav wa-ck"); b.type = "button"; b.appendChild(el("i", 0, ""));
    var t = el("span"); t.appendChild(el("b", 0, P[x.auteur].pseudo)); t.appendChild(document.createTextNode(" a partagé sa sortie : " + fKm(+x.km) + " km · " + (x.depart === x.arrivee ? "autour de " + x.depart : x.depart + " → " + x.arrivee)));
    t.appendChild(el("small", 0, "Touchez pour voir le trajet")); b.appendChild(t); b.onclick = function () { location.hash = "carnet"; }; box.appendChild(b);
  });
}

/* ---- Ma saison : statistiques de l'année ---- */
function ckSeason(mine) {
  var y = new Date().getFullYear(), L = mine.filter(function (x) { return new Date(x.debut).getFullYear() === y; });
  var c = el("div", "card ck-season"); c.appendChild(el("b", "ck-t", "Ma saison " + y));
  if (!L.length) { c.appendChild(el("div", "mu", "Pas encore de sortie cette année.")); return c; }
  var km0 = 0, ms = 0, rec = L[0], lon = L[0], ports = {};
  L.forEach(function (x) { km0 += +x.km || 0; ms += Math.max(0, ts(x.fin) - ts(x.debut)); if (+x.vmax > +rec.vmax) rec = x; if (+x.km > +lon.km) lon = x; [x.depart, x.arrivee].forEach(function (p) { if (p) ports[p] = (ports[p] || 0) + 1; }); });
  var fav = Object.keys(ports).sort(function (a, b) { return ports[b] - ports[a]; })[0];
  var g = el("div", "cb-stats");
  [[String(L.length), "sortie" + (L.length > 1 ? "s" : "")], [fKm(km0), "km"], [fDurTxt(ms).replace(" min", " m"), "sur l'eau"], [fKn(rec.vmax), "record (nd)"]].forEach(function (v) { var d = el("div"); d.appendChild(el("b", 0, v[0])); d.appendChild(el("span", 0, v[1])); g.appendChild(d); });
  c.appendChild(g);
  c.appendChild(el("div", "mu", "Plus longue sortie : " + (lon.titre || "Sortie") + " · " + fKm(+lon.km) + " km"));
  if (fav) c.appendChild(el("div", "mu", "Port le plus fréquenté : " + fav));
  return c;
}
/* ---- export GPX (Google Earth, Navionics, etc.) ---- */
function ckGpx(x) {
  var esc = function (t) { return String(t || "").replace(/[<>&"']/g, function (ch) { return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[ch]; }); };
  var pts = (x.trace || []).map(function (p) { return '<trkpt lat="' + p[0] + '" lon="' + p[1] + '"></trkpt>'; }).join("\n");
  var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Nauticonnect" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>' + esc(x.titre) + '</name><time>' + new Date(x.debut).toISOString() + '</time></metadata>\n<trk><name>' + esc(x.titre) + '</name><desc>' + esc(fKm(+x.km) + " km · " + x.depart + " → " + x.arrivee) + '</desc><trkseg>\n' + pts + '\n</trkseg></trk>\n</gpx>\n';
  var name = "nauticonnect-" + String(x.debut).slice(0, 10) + ".gpx", blob = new Blob([gpx], { type: "application/gpx+xml" });
  try {
    var file = new File([blob], name, { type: "application/gpx+xml" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: x.titre || "Sortie" }).catch(function () {}); return; }
  } catch (e) {}
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); toast("Fichier GPX téléchargé");
}

/* ================= PRÉVISIONS DÉTAILLÉES : mes ports, 3 jours, toutes les 3 heures ================= */
var FC = null, fcBusy = false;
function fcPorts() {
  var L = [], p = me(), seen = {};
  if (p && p.port) { var z = Z.filter(function (x) { return x[0] === p.port; })[0]; if (z) { L.push({ k: "home", n: z[0].replace(/\s*\((F|CH)\)\s*$/, ""), la: z[1], lo: z[2] }); seen[L[0].n] = 1; } }
  Object.keys(favs || {}).forEach(function (id) { var g = PGPS[id], po = PORTS.filter(function (x) { return x.id === id; })[0]; if (g && po && !seen[po.n]) { L.push({ k: id, n: po.n, la: g[0], lo: g[1] }); seen[po.n] = 1; } });
  return L.slice(0, 4);
}
function fcLoad() {
  var box = $("fcBox"); if (!box) return;
  var L = fcPorts(), key = L.map(function (x) { return x.k; }).join(",");
  if (!L.length) { box.textContent = ""; box.appendChild(el("p", "mu", "Choisissez votre port d'attache dans Mon profil, ou touchez ★ sur des ports dans « Ports » : leurs prévisions s'afficheront ici.")); return; }
  if (!FC) { try { var c = JSON.parse(ls("nc-fc") || "null"); if (c && c.key === key && Date.now() - c.at < 30 * 6e4) FC = c; } catch (e) {} }
  if (FC && FC.key === key && Date.now() - FC.at < 30 * 6e4) { fcRender(); return; }
  if (fcBusy) return; fcBusy = true; if (!FC) { box.textContent = ""; box.appendChild(el("p", "mu", "Chargement des prévisions…")); }
  var u = "https://api.open-meteo.com/v1/forecast?latitude=" + L.map(function (x) { return x.la; }).join(",") + "&longitude=" + L.map(function (x) { return x.lo; }).join(",") +
    "&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&forecast_days=3&wind_speed_unit=kn&timezone=Europe%2FZurich";
  fetch(u).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
    if (!Array.isArray(j)) j = [j];
    FC = { at: Date.now(), key: key, ports: L.map(function (p, i) { var h = (j[i] && j[i].hourly) || {}; return { n: p.n, home: p.k === "home", t: h.time || [], s: h.wind_speed_10m || [], d: h.wind_direction_10m || [], g: h.wind_gusts_10m || [] }; }) };
    ls("nc-fc", JSON.stringify(FC));
  }).catch(function () { if (!FC) { box.textContent = ""; box.appendChild(el("p", "mu", "Prévisions indisponibles pour le moment. Réessayez plus tard.")); } }).then(function () { fcBusy = false; if (FC) fcRender(); });
}
function fcCat(s, g) { return g >= 25 || s >= 20 ? ["eviter", "À éviter"] : s >= 12 ? ["sport", "Sportif"] : s >= 5 ? ["bon", "Agréable"] : ["calme", "Calme"]; }
function fcRender() {
  var box = $("fcBox"); if (!box || !FC) return; box.textContent = "";
  var now = Date.now() - 18e5, J = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  var ports = isPremium() ? FC.ports : FC.ports.slice(0, 1);
  ports.forEach(function (p) {
    var c = el("div", "card fc"), h = el("div", "fc-h"); h.appendChild(el("b", 0, p.n)); if (p.home) h.appendChild(el("span", "fc-tag", "Mon port")); c.appendChild(h);
    var strip = el("div", "fc-strip"), lastDay = "";
    for (var i = 0; i < p.t.length; i++) {
      var tt = new Date(p.t[i]).getTime(), hr = new Date(p.t[i]).getHours(); if (tt < now || hr % 3) continue;
      var dd = new Date(p.t[i]), dk = dd.toDateString();
      if (dk !== lastDay) { lastDay = dk; var isToday = dk === new Date().toDateString(); strip.appendChild(el("div", "fc-day", isToday ? "Auj." : J[dd.getDay()] + " " + dd.getDate())); }
      var cat = fcCat(p.s[i], p.g[i]), cell = el("div", "fc-c " + cat[0]); cell.title = cat[1];
      cell.appendChild(el("small", 0, hr + "h"));
      var ar = el("span", "fc-ar", "↓"); ar.style.transform = "rotate(" + Math.round(p.d[i] || 0) + "deg)"; ar.setAttribute("aria-label", "vent du " + (BSDIR ? BSDIR[Math.round((p.d[i] || 0) / 22.5) % 16] : "")); cell.appendChild(ar);
      cell.appendChild(el("b", 0, String(Math.round(p.s[i] || 0)))); cell.appendChild(el("small", 0, "raf. " + Math.round(p.g[i] || 0)));
      strip.appendChild(cell);
    }
    c.appendChild(strip); box.appendChild(c);
  });
  if (ports.length < FC.ports.length) box.appendChild(el("div", "note", "Les prévisions de vos autres ports sont disponibles avec Nauticonnect+."));
  var lg = el("div", "leg fc-leg"); [["calme", "Calme < 5 nd"], ["bon", "Agréable 5–12"], ["sport", "Sportif 12–20"], ["eviter", "À éviter 20+ ou rafales 25+"]].forEach(function (x) { var sp = el("span"); sp.appendChild(el("i", "fc-c " + x[0], "")); sp.appendChild(document.createTextNode(x[1])); lg.appendChild(sp); });
  box.appendChild(lg);
  box.appendChild(el("p", "mu", "Vent moyen et rafales en nœuds, toutes les 3 heures. La flèche montre où va le vent. Prévisions du modèle MétéoSuisse (via Open-Meteo), mises à jour toutes les 30 minutes."));
}

/* ================= ALERTES VENT SUR MESURE (profil) ================= */
var VP = null, vpSel = [];
function vpDraw() {
  var B = $("vpPorts"); if (!B) return; B.textContent = "";
  if (!vpSel.length) B.appendChild(el("div", "mu", "Aucun port choisi."));
  vpSel.forEach(function (n, i) { var r = el("div", "vp-p"); r.appendChild(el("b", 0, n)); var x = el("button", "btn g sm", "Retirer"); x.type = "button"; x.onclick = function () { vpSel.splice(i, 1); vpDraw(); }; r.appendChild(x); B.appendChild(r); });
  $("vpAdd").disabled = vpSel.length >= 4;
}
function vpOpen(keep) {
  if (!real()) return; if (!keep) $("vpMsg").textContent = "";
  sb.from("alertes_vent").select("*").eq("uid", uid).maybeSingle().then(function (r) {
    VP = r.data || null; var p = me();
    vpSel = VP ? (VP.ports || []).map(function (x) { return x.n; }) : (p && p.port ? [p.port] : []);
    $("vpOn").checked = VP ? !!VP.actif : true; $("vpSeuil").value = String(VP ? VP.seuil : 15);
    $("vpMatin").checked = VP ? !!VP.matin : false; $("vpHeure").value = String(VP ? VP.heure : 7);
    $("vpSum").textContent = VP && VP.actif ? "Activées · dès " + VP.seuil + " nœuds" : "Vos ports, votre seuil, bulletin du matin";
    vpDraw();
  });
}
(function () {
  var box = $("vpBox"); if (!box) return;
  var o0 = el("option", 0, "+ Ajouter un port"); o0.value = ""; $("vpAdd").appendChild(o0);
  ZA().forEach(function (z) { var o = el("option", 0, z[0]); o.value = z[0]; $("vpAdd").appendChild(o); });
  [8, 10, 12, 15, 18, 20, 25].forEach(function (k) { var o = el("option", 0, k + " nœuds" + (k === 15 ? " (conseillé)" : "")); o.value = String(k); $("vpSeuil").appendChild(o); });
  [6, 7, 8, 9, 10].forEach(function (k) { var o = el("option", 0, "à " + k + "h00"); o.value = String(k); $("vpHeure").appendChild(o); });
  $("vpAdd").onchange = function () { var v = this.value; this.value = ""; if (v && vpSel.indexOf(v) < 0 && vpSel.length < 4) { vpSel.push(v); vpDraw(); } };
  box.addEventListener("toggle", function () { if (this.open) vpOpen(); });
  $("vpSave").onclick = function () {
    var m = $("vpMsg"); m.className = "err"; m.textContent = "";
    if (!real()) { m.textContent = "Connectez-vous d'abord."; return; }
    var ports = vpSel.map(function (n) { var z = Z.filter(function (x) { return x[0] === n; })[0]; return z ? { n: n.replace(/\s*\((F|CH)\)\s*$/, ""), la: z[1], lo: z[2] } : null; }).filter(Boolean);
    if (($("vpOn").checked || $("vpMatin").checked) && !ports.length) { m.textContent = "Choisissez au moins un port."; return; }
    $("vpSave").disabled = true;
    sb.from("alertes_vent").upsert({ uid: uid, ports: ports, seuil: +$("vpSeuil").value, actif: $("vpOn").checked, matin: $("vpMatin").checked, heure: +$("vpHeure").value, maj: nowIso() }).then(function (r) {
      $("vpSave").disabled = false; if (r.error) { m.textContent = "Enregistrement impossible, réessayez."; return; }
      var on = $("vpOn").checked, mt = $("vpMatin").checked;
      var txt = !on && !mt ? "Alertes vent désactivées." : "Alertes vent enregistrées" + (on ? " : dès " + $("vpSeuil").value + " nœuds" : "") + (mt ? (on ? ", " : " : ") + "bulletin à " + $("vpHeure").value + "h00" : "") + ".";
      toast(txt); vpCacheAt = 0;
      m.className = "okm"; m.textContent = !(mySub && myAbo) ? txt + " Pensez à activer les notifications juste au-dessus, sinon vous ne recevrez rien." : txt + " Vous serez prévenu sur ce téléphone.";
      try { m.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
      vpOpen(true);
    });
  };
})();

/* raccourci « Mes alertes vent » dans la page Météo */
var vpGo = false, vpCache = null, vpCacheAt = 0;
function vpGoTo() { if (!real()) { location.hash = "compte"; return; } vpGo = true; if (cur() === "profil") fillProfile(); else location.hash = "profil"; }
function renderVpMeteo() {
  var B = $("vpMeteo"); if (!B) return;
  function draw() {
    B.textContent = ""; var v = vpCache, on = v && (v.actif || v.matin) && (v.ports || []).length;
    B.appendChild(el("b", 0, "Mes alertes vent"));
    if (!real()) B.appendChild(el("div", "mu", "Avec un compte gratuit, soyez prévenu quand le vent dépasse votre seuil sur vos ports, et recevez un bulletin chaque matin."));
    else if (on) B.appendChild(el("div", "okm", "Activées" + (v.actif ? " · dès " + v.seuil + " nœuds" : "") + " · " + v.ports.map(function (p) { return p.n; }).join(", ") + (v.matin ? " · bulletin à " + v.heure + "h00" : "")));
    else B.appendChild(el("div", "mu", "Soyez prévenu quand le vent dépasse votre seuil sur vos ports, et recevez un bulletin chaque matin."));
    var b = el("button", "btn sm" + (on ? " g" : ""), !real() ? "Créer mon compte" : on ? "Modifier" : "Régler mes alertes"); b.type = "button"; b.onclick = vpGoTo; B.appendChild(b);
  }
  draw();
  if (real() && Date.now() - vpCacheAt > 6e4) { vpCacheAt = Date.now(); sb.from("alertes_vent").select("*").eq("uid", uid).maybeSingle().then(function (r) { vpCache = r.data || null; draw(); }); }
}

/* ================= MODE D'EMPLOI ================= */
/* [titre, mots-clés, étapes, lien vers la fonction] */
var AIDE = [
["En cas de problème", [
 ["Je suis en panne (SOS)", "panne sos aide urgence moteur batterie alerte", ["Touchez le bouton rouge SOS en bas de l'écran, ou « Je suis en panne » sur l'accueil.", "Indiquez où vous êtes : « Utiliser ma position GPS », ou touchez le port le plus proche sur la carte.", "Choisissez le problème (moteur, batterie, carburant, échouement…), ajoutez un détail et votre numéro si vous voulez être appelé.", "Touchez « Envoyer l'alerte » : les membres qui ont activé les notifications SOS sont prévenus.", "Danger pour des personnes ? Appelez d'abord le 117 ou le 144, ou la VHF canal 16. Nauticonnect est un complément, pas un service de secours."], "panne"],
 ["Aider un bateau en panne", "aider secours alerte entraide", ["Quand un bateau est en panne, vous recevez une notification (si elle est activée) et l'alerte s'affiche sur l'accueil.", "Ouvrez l'alerte pour voir où il se trouve et le problème.", "Touchez « Itinéraire » pour vous y rendre, ou appelez le numéro indiqué.", "La page indique aussi la section de sauvetage (SISL) la plus proche."], "panne"]
]],
["Sur l'eau", [
 ["Météo et balises vent", "meteo vent balises rafales feux tempete", ["Ouvrez Météo (en bas de l'écran).", "« Le lac en ce moment » et les balises vent montrent le vent en direct sur la carte, et pour les 12 prochaines heures.", "Les couleurs : vert calme, bleu modéré, orange fort, rouge très fort.", "Fiez-vous toujours aux feux d'avis de tempête sur les rives."], "meteo"],
 ["Alerte vaudaire et coups de vent", "vaudaire foehn coup de vent alerte notification", ["Dans Météo, touchez « Recevoir l'alerte vaudaire » et acceptez les notifications.", "Vous êtes prévenu quand le foehn se lève sur le Haut-Lac, ou en cas de coup de vent sur le Léman, même appli fermée."], "meteo"],
 ["Alertes vent sur mesure et bulletin du matin", "alertes vent seuil bulletin matin ports", ["Dans Météo, carte « Mes alertes vent », touchez « Régler mes alertes » (ou Profil › Alertes vent sur mesure).", "Choisissez jusqu'à 4 ports et votre seuil (par exemple 15 nœuds).", "Cochez « Bulletin du matin » et l'heure si vous voulez le vent prévu chaque matin.", "Touchez « Enregistrer » : un message confirme le réglage."], "meteo"],
 ["Prévisions de mes ports (3 jours)", "previsions 3 jours ports favoris", ["Dans Météo, rubrique « Prévisions de mes ports ».", "Vous voyez votre port d'attache et vos ports favoris (étoile dans Ports), toutes les 3 heures.", "Flèche = direction où va le vent ; couleur : gris calme, vert agréable, orange sportif, rouge à éviter."], "meteo"],
 ["État du lac en photos", "photo lac etat partager", ["Dans Météo, rubrique « État du lac en photos ».", "Choisissez votre zone et partagez une photo du lac là où vous êtes.", "Les photos des dernières 48 heures aident les autres à voir les conditions."], "meteo"],
 ["Ports, places libres et carburant", "ports places visiteurs favoris carburant essence diesel prix", ["Ouvrez Ports. Filtrez par zone, « Près de moi », « Favoris » ou « Carburant ».", "Touchez un port pour voir les infos ; touchez l'étoile pour l'ajouter à vos favoris.", "Indiquez si le ponton visiteurs est « Libre », « Peu » ou « Complet » pour aider les autres.", "Après un plein, touchez « J'ai fait le plein : signaler le prix ». Le filtre Carburant classe les ports du moins cher au plus cher."], "ports"],
 ["Webcams du Léman", "webcam camera lac", ["Ouvrez Webcams (menu).", "Touchez une caméra sur la carte pour voir l'état du lac avant de partir."], "webcams"],
 ["Compteur de vitesse", "vitesse noeuds gps compteur", ["Ouvrez Vitesse (menu) et autorisez le GPS.", "Vous voyez votre vitesse en nœuds et en km/h, la vitesse max et la moyenne."], "vitesse"],
 ["Boussole", "boussole cap compas nord port", ["Ouvrez Boussole (menu, ou depuis Météo) et tenez le téléphone à plat.", "Le cap s'affiche en grand ; touchez « Repère vers mon port » pour voir la direction et la distance de votre port d'attache.", "Si le cap semble faux, éloignez-vous du moteur et dessinez quelques 8 avec le téléphone. Indicatif seulement."], "boussole"],
 ["Carnet de bord", "carnet sortie trajet gps distance saison gpx", ["Ouvrez Carnet de bord (menu) et touchez « Démarrer ma sortie » en partant.", "Gardez l'appli ouverte : l'écran reste allumé. Si vous la quittez, l'enregistrement reprend à votre retour.", "Au retour, « Terminer la sortie » (deux fois), ajoutez un titre et des photos, puis enregistrez.", "La sortie est privée ; cochez « Partager avec les membres » pour la montrer (début et fin masqués).", "« Ma saison » résume votre année ; « Exporter (GPX) » envoie le trajet vers Google Earth ou Navionics."], "carnet"],
 ["Hisser le pavillon et partager sa position", "pavillon position amis partager sur l'eau carte", ["Dans Chat, onglet « Sur l'eau ».", "« Hisser le pavillon » : vous apparaissez pour tous les membres pendant 2 h (position arrondie), ouvert à la rencontre.", "« Partager avec mes amis » : position exacte, seulement pour les amis cochés, pendant la durée choisie (2 h, 4 h ou sans limite).", "Activez le GPS ou touchez la carte pour indiquer où vous êtes. Fonctionne seulement sur le Léman."], "ponton"]
]],
["Entre membres", [
 ["Le salon (chat de tous les membres)", "chat salon ponton message photo mention", ["Ouvrez Chat, onglet « Salon ».", "Écrivez en bas ; ajoutez une photo avec l'appareil photo.", "Tapez @ et un prénom pour citer quelqu'un : il reçoit une notification.", "Les bandeaux en bas du salon montrent les pavillons hissés, les places à bord et les sorties partagées."], "ponton"],
 ["Réagir, répondre, supprimer, signaler", "reaction smiley repondre supprimer signaler appui long", ["Faites un appui long sur un message.", "Touchez un smiley pour réagir (un seul par personne, retouchez pour l'enlever).", "« Répondre » cite le message ; « Sélectionner » permet d'en effacer plusieurs.", "« Signaler » prévient la modération ; « Bloquer ce membre » cache ses messages."], "ponton"],
 ["Messages privés", "prive message ecrire nouveau message", ["Chat › onglet « Privé » › « Nouveau message ».", "Cherchez un prénom, un bateau ou un port, puis touchez le membre.", "Dans une discussion, le bouton ⋮ en haut à droite permet d'ajouter en ami, d'effacer la discussion ou de bloquer."], "ponton"],
 ["Amis", "amis ajouter ami demande", ["Chat › onglet « Amis » : cherchez un membre et touchez « Ajouter en ami ».", "Il reçoit une demande ; une fois acceptée, vous saurez quand il est sur l'eau."], "ponton"],
 ["Places à bord", "places bord sortie equipier sans bateau frais", ["Ouvrez Places à bord (menu ou accueil).", "Vous avez de la place ? « Proposer des places à bord » : date, départ, nombre de places, participation aux frais.", "Pas de bateau ? Touchez « Je demande une place » : l'organisateur accepte ou refuse, et vous êtes prévenu.", "Les frais se règlent entre vous, pas dans l'appli."], "sorties"],
 ["Location entre membres", "location louer bateau skipper permis", ["Ouvrez Location (menu).", "Filtrez par type de bateau et par permis ; contactez le propriétaire.", "Vous pouvez aussi proposer votre bateau quand il reste au port."], "location"],
 ["À vendre, je recherche, troc, don", "annonce vendre acheter recherche troc don", ["Ouvrez À vendre (menu).", "Publiez une annonce (vente, recherche, troc ou don) avec photo et prix.", "Voyez l'objet avant de payer et ne versez jamais d'avance."], "annonces"],
 ["Événements au bord du lac", "evenement fete regate concert proposer", ["Ouvrez Événements (menu) pour voir les rendez-vous autour du Léman.", "Vous organisez quelque chose ? « Proposer un événement » : c'est gratuit, publié après vérification."], "evenements"],
 ["Escales gourmandes", "escale restaurant resto manger bord du lac", ["Ouvrez Escales (menu) : restaurants au bord de l'eau, accessibles en bateau.", "Certains partenaires proposent des offres aux membres."], "restos"]
]],
["Découvrir", [
 ["Nœuds marins", "noeuds apprendre", ["Ouvrez Nœuds (menu) et apprenez les 12 nœuds essentiels pas à pas.", "Cochez ceux que vous maîtrisez pour suivre vos progrès."], "noeuds"],
 ["Épaves du Léman", "epaves carte histoire", ["Ouvrez Épaves (menu, membres) pour découvrir les épaves du lac sur la carte."], "epaves"]
]],
["Mon compte", [
 ["Mon profil et ma photo", "profil photo prenom bateau port sans bateau", ["Ouvrez Profil (en bas à droite).", "Seul le prénom est obligatoire ; bateau et port sont facultatifs (« Sans bateau » ou « Je loue des bateaux » si besoin).", "Ajoutez une photo depuis la galerie ou l'appareil ; touchez-la pour l'agrandir."], "profil"],
 ["Notifications", "notifications activer bloquees reparer", ["Profil › Notifications › « Activer les notifications » et acceptez.", "Choisissez ce que vous recevez : messages, SOS, vaudaire.", "Bloquées ? Réglages du téléphone › Applications › Nauticonnect Léman (ou Chrome) › Notifications, puis « Réparer les notifications »."], "profil"],
 ["Badges", "badges fondateur sauveteur reporter", ["Profil › Mes badges.", "Exemples : « Membre fondateur » pour les 100 premiers inscrits, « Entraide » quand vous aidez un bateau en panne, « Reporter du lac » pour 3 photos partagées."], "profil"],
 ["Inviter un ami et affiche QR", "inviter ami qr affiche partager", ["Profil › « Inviter un ami sur Nauticonnect » : envoyez le lien ou montrez le QR code.", "« Affiche à imprimer pour votre port » crée une affiche avec QR code à poser à la capitainerie."], "profil"],
 ["Boîte à idées", "idee avis suggestion voter ameliorer", ["Ouvrez la Boîte à idées pour dire ce qui vous plaît ou proposer une amélioration.", "Votez pour les idées des autres : les plus soutenues passent en priorité."], "avis"]
]],
["Questions fréquentes", [
 ["Je ne reçois pas les notifications", "notification probleme recois pas", ["Vérifiez Profil › Notifications : elles doivent être « activées ».", "Réglages du téléphone › Applications › Nauticonnect Léman › Notifications › Activer.", "Revenez dans l'appli et touchez « Réparer les notifications »."], "profil"],
 ["Une barre d'adresse s'affiche en haut", "barre adresse url haut", ["Désinstallez puis réinstallez l'appli depuis le Play Store : la vérification se refait à l'installation."], ""],
 ["Ma position n'apparaît pas", "position gps apparait pas", ["Autorisez la position pour Nauticonnect dans les réglages du téléphone.", "Le partage fonctionne seulement sur le Léman et ses rives, et quand l'appli est ouverte."], "ponton"],
 ["Un cadre rouge « Erreur » s'affiche", "erreur cadre rouge bug", ["Faites une capture d'écran et envoyez-la à nauticonnect.leman@gmail.com, puis touchez le cadre pour le fermer.", "Fermez complètement l'appli et rouvrez-la : souvent, c'est une mise à jour en cours."], ""]
]]
];
function renderAide() {
  if (!AIDE) { setTimeout(renderAide, 0); return; } /* au démarrage, AIDE n'est pas encore chargé */
  var L = $("aiList"); if (!L) return; L.textContent = "";
  var q = norm(($("aiQ").value || "").trim()), words = q ? q.split(/\s+/) : [], n = 0;
  AIDE.forEach(function (sec) {
    var items = sec[1].filter(function (f) { if (!SORTIES_ON && f[0] === "Places à bord") return false; if (!words.length) return true; var hay = norm(f[0] + " " + f[1] + " " + f[2].join(" ")); return words.every(function (w) { return hay.indexOf(w) >= 0; }); });
    if (!items.length) return;
    L.appendChild(el("h2", 0, sec[0]));
    items.forEach(function (f) {
      n++; var d = el("details", "card acc ai"); if (words.length && items.length <= 3) d.open = true;
      var sm = el("summary"); sm.appendChild(el("b", 0, f[0])); d.appendChild(sm);
      var ol = el("ol", "ai-st"); f[2].forEach(function (t) { ol.appendChild(el("li", 0, t)); }); d.appendChild(ol);
      if (f[3]) { var a = el("a", "btn g sm", "Ouvrir"); a.href = "#" + f[3]; d.appendChild(a); }
      L.appendChild(d);
    });
  });
  if (!n) L.appendChild(el("p", "mu", "Rien trouvé. Essayez un autre mot, ou écrivez-nous à nauticonnect.leman@gmail.com."));
}
(function () { var q = $("aiQ"); if (q) q.oninput = renderAide; })();
