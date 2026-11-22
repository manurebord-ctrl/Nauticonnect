/* =====================================================================
   NAUTICONNECT · application (Supabase + GitHub Pages)
   ===================================================================== */
"use strict";
var $ = function (i) { return document.getElementById(i); };
function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
function ls(k, v) { try { if (v == null) return localStorage.getItem(k) || ""; localStorage.setItem(k, v); } catch (e) { return ""; } }
function km(a, b, c, d) { var r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2), h = x * x + Math.cos(a * r) * Math.cos(c * r) * y * y; return 12742 * Math.asin(Math.sqrt(h)); }
function ts(v) { return typeof v === "number" ? v : Date.parse(v) || 0; }
function ago(v) { var m = Math.max(0, Math.round((Date.now() - ts(v)) / 60000)); return m < 1 ? "à l’instant" : m < 60 ? "il y a " + m + " min" : m < 1440 ? "il y a " + Math.round(m / 60) + " h" : "il y a " + Math.round(m / 1440) + " j"; }
function iso(msAgo) { return new Date(Date.now() - msAgo).toISOString(); }
function nowIso() { return new Date().toISOString(); }
function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
var toastT = null;
function toast(t) { var d = $("toastEl"); if (!d) { d = el("div", "toast"); d.id = "toastEl"; document.body.appendChild(d); } d.textContent = t; d.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { d.hidden = true; }, 2800); }

/* ---------------- connexion à Supabase ---------------- */
var CFG = window.NC_CONFIG || {};
var configured = /^https:\/\/.+/.test(CFG.url || "") && (CFG.key || "").length > 30;
var sb = null;
if (configured && window.supabase) sb = window.supabase.createClient(CFG.url, CFG.key);
var session = null, uid = null, isAdmin = false, guest = false;
/* guest = visiteur sans compte (connexion anonyme Supabase, invisible pour lui) */
function real() { return !!uid && !guest; }

/* ---------------- données ---------------- */
var SL = [], LO = [], EV = [], FS = [], PA = [], P = {}, A = [], O = [], M = [], AV = [], VO = [], PL = [], RU = [], EP = [], AN = [], PH = [], SC = [], REG = {};
function me() { return real() && P[uid] ? P[uid] : null; }
function nameOf(id, fb) { var p = P[id]; return p ? p.pseudo + (p.bateau ? " · " + p.bateau : "") : (fb || "Plaisancier"); }
function initial(id) { var p = P[id]; return ((p && p.pseudo) || "?").charAt(0).toUpperCase(); }
function photoOf(id) { var p = P[id]; return p && p.photo ? photoUrl(p.photo) : ""; }
function putPhoto(a, id) { var u = photoOf(id); if (u) { a.textContent = ""; a.style.backgroundImage = "url(\"" + u + "\")"; a.classList.add("ph"); } return a; }
function badge(id, fb) { var b = el("span", "badge"); b.appendChild(putPhoto(el("span", "av", initial(id)), id)); b.appendChild(document.createTextNode(nameOf(id, fb))); return b; }

var Q = {
  profils: function () { return sb.from("profils").select("id,pseudo,bateau,type,port,immat,photo,photo_ok").limit(5000); },
  alertes: function () { return sb.from("alertes").select("*").gte("maj", iso(12 * 36e5)); },
  ouverts: function () { return sb.from("ouverts").select("*").gte("maj", iso(2 * 36e5)); },
  salon: function () { return sb.from("salon").select("*").order("t", { ascending: false }).limit(200); },
  messages: function () { return uid ? sb.from("messages").select("*").gte("t", iso(7 * 864e5)).order("t").limit(800) : null; },
  avis: function () { return sb.from("avis").select("*").order("t", { ascending: false }).limit(300); },
  votes: function () { return sb.from("votes").select("*").limit(5000); },
  places: function () { return sb.from("places").select("*").gte("t", iso(12 * 36e5)); },
  restos: function () { return sb.from("restos").select("*").order("t", { ascending: false }).limit(300); },
  epaves: function () { return sb.from("epaves").select("*").limit(500); },
  locations: function () { return sb.from("locations").select("*").order("maj", { ascending: false }).limit(300); },
  annonces: function () { return sb.from("annonces").select("*").gte("maj", iso(90 * 864e5)).order("maj", { ascending: false }).limit(300); },
  photos: function () { return sb.from("photos").select("*").order("t", { ascending: false }).limit(400); },
  reglages: function () { return sb.from("reglages").select("*"); },
  sauvetages: function () { return sb.from("sauvetages").select("*"); },
  evenements: function () { return sb.from("evenements").select("*").order("debut").limit(300); },
  amities: function () { return real() ? sb.from("amities").select("*") : null; },
  partenaires: function () { return sb.from("partenaires").select("*").order("t"); }
};
function store(t, rows) {
  rows = rows || [];
  if (t === "profils") { var o = {}; rows.forEach(function (r) { o[r.id] = r; }); P = o; }
  else if (t === "alertes") A = rows; else if (t === "ouverts") O = rows; else if (t === "messages") M = rows; else if (t === "salon") SL = rows.slice().reverse();
  else if (t === "avis") AV = rows; else if (t === "votes") VO = rows; else if (t === "places") PL = rows;
  else if (t === "restos") RU = rows; else if (t === "epaves") EP = rows; else if (t === "annonces") AN = rows; else if (t === "locations") LO = rows;
  else if (t === "partenaires") PA = rows;
  else if (t === "amities") FS = rows;
  else if (t === "evenements") EV = rows;
  else if (t === "photos") PH = rows; else if (t === "sauvetages") SC = rows;
  else if (t === "reglages") { var g = {}; rows.forEach(function (r) { g[r.k] = r.v; }); REG = g; applyBanner(); }
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
  Object.keys(Q).forEach(function (t) { channel.on("postgres_changes", { event: "*", schema: "public", table: t }, function () { reload(t); }); });
  channel.subscribe();
}
function loadAll() { return Promise.all(Object.keys(Q).map(load)); }
setInterval(function () { if (sb && !document.hidden) { load("ouverts"); load("places"); load("alertes"); } }, 120000);

/* ---------------- navigation ---------------- */
var VIEWS = ["accueil", "compte", "profil", "panne", "ponton", "avis", "ports", "meteo", "webcams", "restos", "epaves", "vitesse", "noeuds", "annonces", "location", "evenements"];
var NEEDS_AUTH = { profil: 1 };
function cur() { var h = location.hash.slice(1); return VIEWS.indexOf(h) < 0 ? "accueil" : h; }
function goAuth(ret) { try { sessionStorage.setItem("nc-ret", ret || cur()); } catch (e) {} location.hash = "compte"; }
function requireProfile(msgEl) {
  if (!sb) { if (msgEl) msgEl.textContent = "L'appli n'est pas encore configurée."; return false; }
  if (!real()) { goAuth(); return false; }
  if (!me()) { try { sessionStorage.setItem("nc-ret", cur()); } catch (e) {} location.hash = "profil"; toast("Créez d'abord votre fiche bateau"); return false; }
  return true;
}
/* Fonctions ouvertes à tous : sans compte, on crée en silence une session invité */
var guestBusy = false;
function guestOk(retry, msgEl) {
  if (!sb) { if (msgEl) msgEl.textContent = "L'appli n'est pas encore configurée."; return false; }
  if (uid) return true;
  if (guestBusy) return false; guestBusy = true;
  sb.auth.signInAnonymously().then(function (r) {
    guestBusy = false;
    if (r.error || !r.data || !r.data.session) { var t = "Action impossible pour le moment. Réessayez dans un instant."; if (msgEl) { msgEl.className = "err"; msgEl.textContent = t; } else toast(t); return; }
    onSession(r.data.session, "SIGNED_IN"); retry();
  }).catch(function () { guestBusy = false; toast("Pas de connexion internet ?"); });
  return false;
}
function route() {
  var h = cur();
  if (NEEDS_AUTH[h] && !real() && sb) { goAuth(h); return; }
  VIEWS.forEach(function (v) { $("v-" + v).hidden = v !== h; });
  Array.prototype.forEach.call($("nav").querySelectorAll("a[data-v]"), function (a) { a.classList.toggle("on", a.dataset.v === h); });
  if (h === "profil") fillProfile();
  if (h === "compte" && authMode !== "reset") setAuthMode(uid ? "in" : authMode);
  if (h === "ponton") markRead();
  if (h === "webcams") wcFromHash();
  renderAll(); window.scrollTo(0, 0); heroStart();
}
window.addEventListener("hashchange", route);

/* ---------------- géographie commune ---------------- */
var Z = [["Hermance",46.301,6.243],["Corsier-Port",46.268,6.226],["Genève – Port-Noir / Eaux-Vives",46.222,6.168],["Genève – Pâquis",46.213,6.155],["Genthod",46.257,6.158],["Versoix",46.280,6.165],["Coppet",46.316,6.191],["Nyon",46.381,6.240],["Gland",46.415,6.267],["Yvoire (F)",46.371,6.329],["Rolle",46.454,6.337],["Sciez (F)",46.386,6.371],["Saint-Prex",46.483,6.455],["Thonon (F)",46.409,6.489],["Morges",46.506,6.495],["Préverenges",46.512,6.528],["Saint-Sulpice",46.511,6.557],["Lausanne – Vidy",46.515,6.590],["Évian (F)",46.401,6.589],["Lausanne – Ouchy",46.508,6.627],["Pully",46.507,6.660],["Lutry",46.503,6.687],["Cully",46.488,6.729],["Saint-Saphorin",46.471,6.795],["Saint-Gingolph",46.399,6.806],["Vevey",46.459,6.840],["Le Bouveret",46.392,6.857],["La Tour-de-Peilz",46.453,6.859],["Clarens / Montreux",46.432,6.911],["Territet",46.433,6.925],["Villeneuve",46.399,6.926]];
Z.sort(function (a, b) { return a[2] - b[2]; });
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
  $("auLead").textContent = reset ? "Choisissez votre nouveau mot de passe." : m === "up" ? "Un compte sert uniquement au Ponton, le chat des plaisanciers. Tout le reste de l'appli est libre d'accès." : "Connectez-vous avec votre e-mail.";
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
  var m = $("auMsg"); m.className = "err"; m.textContent = "";
  if (!sb) { m.textContent = "L'appli n'est pas encore configurée (fichier config.js)."; return; }
  var em = $("auEmail").value.trim(), pw = $("auPass").value;
  if (authMode !== "reset" && !/^\S+@\S+\.\S+$/.test(em)) { m.textContent = "Adresse e-mail invalide."; return; }
  if (pw.length < 8) { m.textContent = "Mot de passe : 8 caractères minimum."; return; }
  $("auGo").disabled = true;
  var p = authMode === "up" ? sb.auth.signUp({ email: em, password: pw, options: { emailRedirectTo: location.origin + location.pathname } })
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
    isAdmin = false;
    if (uid) sb.from("admins").select("uid").eq("uid", uid).then(function (r) { isAdmin = !!(r.data && r.data.length); if (isAdmin) load("photos"); renderAll(); });
    subscribeAll(); loadAll().then(function () { pushRefresh();
      if (real() && cur() === "compte" && authMode !== "reset") {
        var ret = ""; try { ret = sessionStorage.getItem("nc-ret") || ""; sessionStorage.removeItem("nc-ret"); } catch (e) {}
        location.hash = me() ? (ret && ret !== "compte" ? ret : "") : (ret === "ponton" ? "ponton" : "profil");
      }
    });
  }
  renderAll();
}

/* ================= PROFIL ================= */
var o0 = el("option", 0, "— choisir —"); o0.value = ""; $("pPort").appendChild(o0);
Z.forEach(function (z) { var o = el("option", 0, z[0]); o.value = z[0]; $("pPort").appendChild(o); });
function fillProfile() {
  drawPfPhoto();
  var p = me(); $("pfTitle").textContent = p ? "Ma fiche bateau" : "Créez votre fiche bateau";
  $("pSave").textContent = p ? "Mettre à jour" : "Rejoindre l'équipage";
  if (p) { $("pPseudo").value = p.pseudo || ""; $("pBoat").value = p.bateau || ""; $("pType").value = p.type || "Voilier"; $("pPort").value = p.port || ""; $("pImm").value = p.immat || ""; }
  $("pEmail").textContent = session ? "Connecté avec " + session.user.email : "";
  $("pMsg").textContent = "";
}
$("pSave").onclick = function () {
  var m = $("pMsg"); m.className = "err"; m.textContent = "";
  if (!real()) { goAuth("profil"); return; }
  var ps = $("pPseudo").value.trim(), bt = $("pBoat").value.trim();
  if (ps.length < 2) { m.textContent = "Indiquez un prénom ou un pseudo (2 caractères min.)."; return; }
  var taken = Object.keys(P).some(function (k) { return k !== uid && norm(P[k].pseudo) === norm(ps) && norm(P[k].bateau) === norm(bt); });
  if (taken) { m.textContent = "Ce pseudo est déjà pris avec ce nom de bateau. Ajoutez votre bateau ou changez de pseudo."; return; }
  var first = !me();
  var d = { id: uid, pseudo: ps, bateau: bt, type: $("pType").value, port: $("pPort").value, immat: $("pImm").value.trim().toUpperCase(), maj: nowIso() };
  $("pSave").disabled = true;
  sb.from("profils").upsert(d).then(function (r) {
    if (r.error) { m.textContent = "Enregistrement impossible : " + r.error.message; return; }
    P[uid] = Object.assign({}, P[uid], d); m.className = "okm"; m.textContent = first ? "Bienvenue à bord, " + ps + " !" : "Fiche mise à jour.";
    renderAll();
    var ret = ""; try { ret = sessionStorage.getItem("nc-ret") || ""; sessionStorage.removeItem("nc-ret"); } catch (e) {}
    if (first || ret) setTimeout(function () { location.hash = ret && ret !== "profil" ? ret : "ponton"; }, 900);
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
function renderChip() {
  var c = $("meChip"), p = me(); c.textContent = "";
  if (p) { c.className = "me"; c.href = "#profil"; c.appendChild(putPhoto(el("span", "av", initial(uid)), uid)); c.appendChild(el("span", 0, p.pseudo)); }
  else if (real()) { c.className = "me new"; c.href = "#profil"; c.textContent = "Ma fiche bateau"; }
  else { c.className = "me new"; c.href = "#compte"; c.textContent = "Se connecter"; }
}
var AVC = ["#f29a5b", "#9fe3c4", "#a9c8f5", "#f5d07a", "#e9a8d0", "#c7b8f5"];
function openNow() { var l = Date.now() - 2 * 36e5; return O.filter(function (x) { return ts(x.maj) > l; }); }
function renderHome() {
  renderChip(); var ph = document.querySelector(".p-how"); if (ph) ph.hidden = !!me();
  var op = openNow();
  var nm = Object.keys(P).length; $("stMembers").textContent = !sb ? "–" : nm; $("stMembers").nextElementSibling.textContent = nm === 1 ? "membre" : "membres"; $("stOpen").textContent = sb ? op.length : "–";
  var N = $("pNow"); N.textContent = "";
  if (op.length) {
    var st = el("div", "stack"); op.slice(0, 5).forEach(function (x, i) { var a = el("span", 0, initial(x.id)); a.style.background = AVC[i % AVC.length]; st.appendChild(a); }); N.appendChild(st);
    var t = op.slice(0, 2).map(function (x) { return (P[x.id] && P[x.id].pseudo) || "Un plaisancier"; }).join(", ");
    N.appendChild(el("p", 0, t + (op.length > 2 ? " et " + (op.length - 2) + " autre" + (op.length > 3 ? "s" : "") : "") + (op.length > 1 ? " ont" : " a") + " hissé le pavillon."));
  } else N.appendChild(el("p", 0, "Personne n'a encore hissé le pavillon. Lancez la première sortie !"));
  var c = $("ctaMain"), p = me();
  c.textContent = p ? "Hisser le pavillon" : "Rejoindre l'équipage"; c.href = p ? "#ponton" : real() ? "#profil" : "#compte";
  var n = activeAlerts().length; $("alertPill").hidden = !n; $("alertPill").textContent = n + " alerte" + (n > 1 ? "s" : "") + " active" + (n > 1 ? "s" : "");
  var u = unread() + pendingIn().length; $("msgChip").hidden = !u; $("unreadHome").textContent = u; $("unreadNav").hidden = !u; $("unreadNav").textContent = u;
  $("avCount").textContent = AV.length ? AV.length + " avis · donner le vôtre ›" : "Donner mon avis ›";
  $("phBtn").hidden = !isAdmin;
  var pq = isAdmin ? PH.filter(function (p) { return !pub(p); }).length : 0, hm = $("homeMod");
  hm.hidden = !pq; hm.textContent = pq + " photo" + (pq > 1 ? "s" : "") + " à vérifier ›";
}
/* bannière animée */
var heroRunning = false;
function heroStart() { if (!heroRunning && !$("v-accueil").hidden) { heroRunning = true; heroSize(); requestAnimationFrame(heroDraw); } }
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
  if (p) { $("heroPh").style.backgroundImage = 'url("' + photoUrl(p) + '")'; h.classList.add("photo"); } else { h.classList.remove("photo"); heroStart(); }
}
$("phIn").onchange = function () {
  var f = this.files && this.files[0], inp = this; if (!f || !isAdmin) return; var lb = $("phBtn"); lb.firstChild.textContent = "Envoi… ";
  shrink(f, 2000).then(function (blob) {
    var path = uid + "/banniere-" + Date.now() + ".jpg";
    return sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" }).then(function (r) {
      if (r.error) throw r.error; var old = REG.banniere;
      return sb.from("reglages").upsert({ k: "banniere", v: path }).then(function (r2) { if (r2.error) throw r2.error; REG.banniere = path; applyBanner(); if (old && old.indexOf(uid + "/") === 0) sb.storage.from("photos").remove([old]); });
    });
  }).then(function () { lb.firstChild.textContent = "Photo de la bannière"; }, function () { lb.firstChild.textContent = "Échec, réessayer"; }).then(function () { inp.value = ""; });
};
/* installation */
var deferredInstall = null;
window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredInstall = e; $("installBox").hidden = false; });
$("installBtn").onclick = function () { if (!deferredInstall) return; deferredInstall.prompt(); deferredInstall.userChoice.then(function () { deferredInstall = null; $("installBox").hidden = true; }); };
window.addEventListener("appinstalled", function () { $("installBox").hidden = true; toast("Nauticonnect est installé !"); });
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});

/* ================= PANNE ================= */
var gp = null, pbv = "", PB = ["Panne moteur", "Batterie / électricité", "Panne de carburant", "Échouement", "Hélice / safran", "Autre"];
Z.forEach(function (z, i) { var o = el("option", 0, "Zone : " + z[0]); o.value = i; $("pnZone").appendChild(o); });
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
$("pnSos").onclick = function () { pnMsg(); var f = $("pnForm"); f.hidden = !f.hidden; if (!f.hidden) f.scrollIntoView({ behavior: "smooth" }); };
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
      var a = o.a, m = a.auteur === uid, c = el("div", "card" + (m ? " mine" : ""));
      c.appendChild(el("b", 0, (m ? "Mon alerte · " : "") + a.probleme));
      if (!m) { var w = el("div"); w.style.margin = "6px 0"; w.appendChild(badge(a.auteur, a.par)); c.appendChild(w); }
      c.appendChild(el("div", "mu", a.zone + " · à " + o.d.toFixed(1) + " km · " + ago(a.maj)));
      if (a.detail) c.appendChild(el("div", 0, a.detail));
      if (a.faux && (isAdmin || m)) c.appendChild(el("div", "err", "Signalée comme fausse alerte par " + a.faux + " membre" + (a.faux > 1 ? "s" : "")));
      if (a.tel && !m) { var t = el("div"); t.appendChild(document.createTextNode("Tél. ")); var tl = el("a", 0, a.tel); tl.href = "tel:" + a.tel.replace(/[^0-9+]/g, ""); tl.style.cssText = "color:var(--ac);font-weight:700"; t.appendChild(tl); c.appendChild(t); }
      var ai = a.aides || [];
      if (ai.length) c.appendChild(el("div", "okm", "Viennent aider : " + ai.map(function (x) { return nameOf(x); }).join(", ")));
      else if (m) c.appendChild(el("div", "mu", "En attente d’un plaisancier… Si personne ne répond, appelez le 117. L’alerte se désactive seule après 6 heures."));
      var row = el("div", "row"); row.style.marginTop = "8px";
      if (!m) {
        var b = el("button", "btn" + (ai.indexOf(uid) >= 0 ? " g" : ""), ai.indexOf(uid) >= 0 ? "Je ne peux plus venir" : "Je peux aider");
        b.onclick = function () { if (!guestOk(function () { b.onclick(); })) return; b.disabled = true; sb.rpc("basculer_aide", { alerte_id: a.id }).then(function () { load("alertes"); }); };
        row.appendChild(b);
        if (P[a.auteur]) { var w2 = el("button", "btn g", "Écrire"); w2.onclick = function () { openThread(a.auteur); }; row.appendChild(w2); }
        var fk = "nc-faux-" + a.id, b4 = el("button", "linkb", ls(fk) ? "Signalée comme fausse alerte" : "Signaler une fausse alerte"); b4.disabled = !!ls(fk);
        b4.onclick = function () {
          if (!real()) { toast("Connectez-vous pour signaler une alerte."); goAuth(); return; }
          if (!confirm("Signaler une fausse alerte ? À 2 signalements de membres différents, elle est fermée.")) return;
          sb.from("signalements").insert({ quoi: "alerte", ref: String(a.id) }).then(function (r) { if (r.error) { toast("Signalement impossible."); return; } ls(fk, "1"); load("alertes"); toast("Merci, signalement envoyé."); });
        };
        c.appendChild(row); row = el("div"); row.style.marginTop = "6px"; row.appendChild(b4);
        if (isAdmin) { var b3 = el("button", "btn g", "Clôturer (admin)"); b3.onclick = function () { if (!confirm("Clôturer cette alerte ? Elle disparaîtra pour tout le monde.")) return; sb.from("alertes").update({ etat: "resolue" }).eq("id", a.id).then(function (r) { if (r.error) toast("Clôture impossible."); else { load("alertes"); toast("Alerte clôturée"); } }); }; c.appendChild(row); row = el("div", "row"); row.style.marginTop = "8px"; row.appendChild(b3); }
      } else {
        var b2 = el("button", "btn", "Problème résolu · désactiver l'alerte"); b2.onclick = function () { b2.disabled = true; sb.from("alertes").update({ etat: "resolue" }).eq("id", a.id).then(function (r) { if (r.error) { b2.disabled = false; toast("Impossible de désactiver. Réessayez."); return; } load("alertes"); toast("Alerte désactivée. Bon retour au port !"); }); }; row.appendChild(b2);
      }
      c.appendChild(row); L.appendChild(c);
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
  pnMsg(); if (!guestOk(function () { $("scSave").onclick(); }, $("pnMsg"))) return;
  var n = $("scName").value.trim(), t = $("scTel").value.trim();
  if (!n || !/^[+0-9 ().\/-]{7,20}$/.test(t)) { pnMsg("Section et numéro valide requis."); return; }
  sb.from("sauvetages").upsert({ nom: n.slice(0, 40), tel: t, maj: nowIso() }).then(function (r) { if (r.error) pnMsg("Enregistrement refusé."); else { $("scTel").value = ""; load("sauvetages"); } });
};

/* ================= LE PONTON ================= */
var rgp = null, rman = null, sel = null, lastPush = 0, openWith = ls("nc-open") || null, FR = [], watchId = null;
try { var mm = JSON.parse(ls("nc-man") || "null"); if (mm && typeof mm.lat === "number") rman = mm; } catch (e) {}
function rPos() { return rgp || rman; }
function rErr(t) { $("rnErr").textContent = t || ""; }
$("rnCode").value = ls("nc-code"); $("rnMsgTxt").value = ls("nc-msg");
$("rnOpen").checked = ls("nc-isopen") === "1"; $("rnFr").checked = ls("nc-isfr") === "1";
function openOthers() { return openNow().filter(function (x) { return x.id !== uid; }); }
function stat() { var o = $("rnOpen").checked, f = $("rnFr").checked, b = $("rnStt"); b.className = "stt" + (o || f ? " on" : ""); b.textContent = o && f ? "Pavillon hissé · amis et membres" : o ? "Pavillon hissé · visible par les membres (position arrondie)" : f ? "Position partagée avec mes amis uniquement" : "Pavillon baissé : votre position n'est pas partagée"; }
function code() { return "amitie"; }
function rel(id) { for (var i = 0; i < FS.length; i++) { var f = FS[i]; if ((f.de === uid && f.a === id) || (f.a === uid && f.de === id)) return f.statut === "ok" ? "ami" : f.de === uid ? "envoye" : "recu"; } return ""; }
function friendIds() { return FS.filter(function (f) { return f.statut === "ok"; }).map(function (f) { return f.de === uid ? f.a : f.de; }); }
function pendingIn() { return FS.filter(function (f) { return f.statut === "attente" && f.a === uid; }).map(function (f) { return f.de; }); }
function push() {
  var p = rPos(); if (!p || !uid || !me()) return;
  if ($("rnOpen").checked) sb.from("ouverts").upsert({ id: uid, msg: $("rnMsgTxt").value.trim().slice(0, 60), lat: Math.round(p.lat * 100) / 100, lon: Math.round(p.lon * 100) / 100, maj: nowIso() }).then(function (r) { if (r.error) rErr("Partage refusé."); else load("ouverts"); });
  var c = code(); if ($("rnFr").checked) sb.from("amis").upsert({ code: c, auteur: uid, lat: p.lat, lon: p.lon, maj: nowIso() }, { onConflict: "code,auteur" }).then(function () { loadFriends(); });
}
function loadFriends() { if (!real()) { FR = []; return; } sb.rpc("positions_amis").then(function (r) { FR = (r.data || []).filter(function (x) { return x.auteur !== uid; }); if (cur() === "ponton") renderPonton(); }); }
setInterval(function () { if (cur() === "ponton" && !document.hidden) { loadFriends(); if (Date.now() - lastPush > 5 * 60000) { lastPush = Date.now(); push(); } } }, 30000);
$("rnOpen").onchange = function () {
  rErr(); if (!requireProfile()) { this.checked = false; return; }
  ls("nc-isopen", this.checked ? "1" : "0");
  if (this.checked) { if (!rPos()) rErr("Localisez-vous (GPS) ou touchez la carte."); push(); } else sb.from("ouverts").delete().eq("id", uid).then(function () { load("ouverts"); });
  stat();
};
$("rnFr").onchange = function () {
  rErr(); if (!requireProfile()) { this.checked = false; return; }
  var c = code(); ls("nc-code", c);
  if (this.checked) { if (!friendIds().length) rErr("Ajoutez d'abord des amis (recherche ci-dessus)."); if (!rPos()) rErr("Localisez-vous (GPS) ou touchez la carte."); push(); }
  else sb.from("amis").delete().eq("auteur", uid).then(function () { FR = []; renderPonton(); });
  ls("nc-isfr", this.checked ? "1" : "0"); stat();
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
  if (onWater(id)) rt.appendChild(el("span", "wa-tag on", "Sur l'eau"));
  var fb = el("span", "wa-add" + (r === "ami" || r === "envoye" ? " done" : ""), r === "ami" ? "Ami ✓" : r === "envoye" ? "Envoyée" : r === "recu" ? "Accepter" : "+ Ajouter");
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
  $("mbHead").textContent = words.length ? (res.length ? res.length + " résultat" + (res.length > 1 ? "s" : "") : "") : "Membres";
  $("mbHint").textContent = words.length && !res.length ? "Aucun plaisancier trouvé. Essayez un prénom, un bateau ou un port (ex. « bouveret », « voilier »)."
    : !words.length && !res.length ? (mbF === "port" ? (my.port ? "Personne d'autre à " + my.port + " pour l'instant." : "Indiquez votre port d'attache dans votre profil.") : mbF === "eau" ? "Personne n'a hissé le pavillon en ce moment." : mbF === "amis" ? "Pas encore d'amis : ouvrez une discussion et touchez « Ajouter en ami »." : "Pas encore d'autres membres.") : "";
  var max = mbMore || words.length ? 60 : 15;
  res.slice(0, max).forEach(function (id) { L.appendChild(memberRow(id)); });
  if (res.length > max) { var m = el("button", "linkb", "Voir les " + res.length + " membres"); m.onclick = function () { mbMore = true; renderMembers(); }; L.appendChild(m); }
  $("rnThreads").hidden = !!words.length;
  var S = $("mbSug"); S.textContent = "";
  var sug = words.length ? [] : ids.filter(function (id) { return !rel(id) && ((my.port && P[id].port === my.port) || onWater(id) || friendIds().some(function (f) { return fof(f, id); })); }).slice(0, 10);
  sug.forEach(function (id) { var pr = P[id], c = el("div", "sg"), a = avatar(id); c.appendChild(a); c.appendChild(el("b", 0, pr.pseudo)); c.appendChild(el("span", "mu", my.port && pr.port === my.port ? "Même port" : onWater(id) ? "Sur l'eau" : "Ami d'un ami"));
    var b = el("button", "btn sm", "Ajouter"); b.onclick = function () { b.disabled = true; b.textContent = "Envoyée"; befriend(id); }; c.appendChild(b); c.onclick = function (e) { if (e.target !== b) openThread(id); }; S.appendChild(c); });
  $("mbSugH").hidden = !sug.length;
  var R = $("mbReq"); R.textContent = ""; pendingIn().forEach(function (id) { if (P[id]) R.appendChild(memberCard(id, el("div", "okm", "veut devenir votre ami"))); });
  $("mbReqH").hidden = !R.firstChild;
}
Array.prototype.forEach.call(document.querySelectorAll("#mbChips button"), function (b) { b.onclick = function () { mbF = b.dataset.f; mbMore = false; renderMembers(); }; });
$("rnMsgTxt").onchange = function () { ls("nc-msg", this.value.trim()); push(); };
$("rnGps").onclick = function () {
  rErr(); if (!navigator.geolocation) { rErr("GPS indisponible : touchez la carte pour vous placer."); return; }
  if (watchId != null) return;
  watchId = navigator.geolocation.watchPosition(function (p) { rgp = { lat: p.coords.latitude, lon: p.coords.longitude }; $("rnGps").textContent = "Position GPS active"; if (Date.now() - lastPush > 20000) { lastPush = Date.now(); push(); } renderPonton(); },
    function () { watchId = null; rErr("GPS refusé ou indisponible : touchez la carte pour vous placer."); }, { enableHighAccuracy: true });
};
$("rnMap").onclick = function (e) { if (rgp) return; rman = svgPoint(this, e); ls("nc-man", JSON.stringify(rman)); push(); renderPonton(); };
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
function avatar(id) { var a = el("span", "wa-av", initial(id)); a.style.backgroundColor = ncol(id); return putPhoto(a, id); }
/* lu / non lu par discussion */
function seenMap() { try { return JSON.parse(ls("nc-seenmap") || "{}"); } catch (e) { return {}; } }
function seenOf(id) { var m = seenMap(); return m[id] || +ls("nc-seen") || 0; }
function markThread(id) { var m = seenMap(); m[id] = Date.now(); ls("nc-seenmap", JSON.stringify(m)); }
function markRead() { if (openWith) markThread(openWith); }
function threads() { var T = {}; M.forEach(function (m) { var o = m.de === uid ? m.a : m.a === uid ? m.de : null; if (!o) return; (T[o] = T[o] || []).push(m); }); return T; }
function unreadOf(id, list) { var s = seenOf(id); return (list || []).filter(function (m) { return m.de === id && ts(m.t) > s; }).length; }
function unread() { if (!uid) return 0; var T = threads(), n = 0; Object.keys(T).forEach(function (k) { if (!(cur() === "ponton" && waTab === "prive" && k === openWith)) n += unreadOf(k, T[k]); }); return n; }
function slUnread() { var s = +ls("nc-slseen") || 0; return SL.filter(function (m) { return m.de !== uid && ts(m.t) > s; }).length; }
/* onglets */
var waTab = ls("nc-watab") || "salon"; if (["salon", "prive", "eau"].indexOf(waTab) < 0) waTab = "salon";
Array.prototype.forEach.call(document.querySelectorAll(".wa-tabs button"), function (b) { b.onclick = function () { waTab = b.dataset.t; ls("nc-watab", waTab); if (waTab !== "prive") { openWith = null; ls("nc-open", ""); } renderPonton(); if (waTab === "salon") slBottom(true); }; });
function openThread(id, txt) {
  if (!id || id === uid) return;
  openWith = id; ls("nc-open", id); waTab = "prive"; ls("nc-watab", "prive");
  if (cur() !== "ponton") location.hash = "ponton"; else renderPonton();
  setTimeout(function () { pvBottom(true); var i = $("pvIn"); if (txt) i.value = txt; if (me()) i.focus(); }, 150);
}
$("pvBack").onclick = function () { openWith = null; ls("nc-open", ""); renderPonton(); };
/* rendu des bulles, commun au salon et au privé */
function drawBubbles(box, list, group) {
  var atBottom = box.dataset.n !== String(list.length) ? null : true;
  box.textContent = ""; var lastDay = "", lastDe = "", lastT = 0;
  if (!list.length) { box.appendChild(el("div", "wa-empty", group ? "Le salon est calme. Lancez la conversation !" : "Dites bonjour !")); }
  list.forEach(function (m) {
    var dk = dayKey(m.t); if (dk !== lastDay) { box.appendChild(el("div", "wa-day", dayLabel(m.t))); lastDay = dk; lastDe = ""; }
    var mine = m.de === uid, cont = m.de === lastDe && ts(m.t) - lastT < 5 * 6e4;
    var row = el("div", "wa-row " + (mine ? "out" : "in") + (cont ? " cont" : ""));
    if (group && !mine) { var av = avatar(m.de); if (cont) av.style.visibility = "hidden"; row.appendChild(av); }
    var b = el("div", "wa-b");
    if (group && !mine && !cont) { var nm = el("b", "wa-nm", (P[m.de] && P[m.de].pseudo) || "Plaisancier"); nm.style.color = ncol(m.de); var pr = P[m.de]; if (pr && (pr.bateau || pr.port)) nm.appendChild(el("span", 0, " · " + (pr.bateau || pr.port))); if (P[m.de] && m.de !== uid) { nm.style.cursor = "pointer"; nm.onclick = function () { openThread(m.de); }; } b.appendChild(nm); }
    b.appendChild(el("span", "wa-tx", m.txt));
    var meta = el("small", "wa-meta", hhmm(m.t) + (mine && !group ? " ✓✓" : "")); b.appendChild(meta);
    if (group && (mine || isAdmin)) { b.onclick = function () { if (b.querySelector(".wa-del")) return; var d = el("button", "wa-del", "Supprimer"); d.onclick = function (e) { e.stopPropagation(); sb.from("salon").delete().eq("id", m.id).then(function (r) { if (r.error) toast("Suppression impossible."); else load("salon"); }); }; b.appendChild(d); }; }
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
  sb.from("messages").insert({ a: to, txt: txt }).then(function (r) { if (r.error) toast("Message non envoyé."); else { openWith = to; markThread(to); load("messages").then(function () { pvBottom(true); }); } }).then(function () { sending = false; });
}
$("pvBar").onsubmit = function (e) { e.preventDefault(); var i = $("pvIn"), v = i.value; if (!openWith || !v.trim()) return; i.value = ""; sendMsg(openWith, v); };
$("slBar").onsubmit = function (e) {
  e.preventDefault(); var i = $("slIn"), v = i.value.trim().slice(0, 300); if (!v || sending) return; sending = true;
  sb.from("salon").insert({ txt: v }).then(function (r) {
    sending = false;
    if (r.error) { toast(/rapide/.test(r.error.message || "") ? "Doucement, un message toutes les 3 secondes." : "Message non envoyé."); return; }
    i.value = ""; load("salon").then(function () { slBottom(true); });
  });
};
/* rejoindre : compte puis juste un pseudo */
function drawJoin() {
  var J = $("waJoin"); J.textContent = "";
  if (!real()) {
    J.appendChild(el("b", 0, "Pour écrire, montez à bord"));
    J.appendChild(el("div", "mu", "Un compte gratuit avec votre e-mail, puis juste un prénom. Une minute en tout."));
    var a = el("a", "btn", "Créer mon compte"); a.href = "#compte"; a.onclick = function () { try { sessionStorage.setItem("nc-ret", "ponton"); } catch (e) {} }; J.appendChild(a);
    var l = el("a", "linkb", "J'ai déjà un compte"); l.href = "#compte"; l.onclick = a.onclick; J.appendChild(l);
    return;
  }
  J.appendChild(el("b", 0, "Comment vous appelle-t-on sur le Ponton ?"));
  J.appendChild(el("div", "mu", "Votre prénom ou un pseudo. Le reste de votre fiche (bateau, port) peut attendre."));
  var f = el("form", "wa-jf"), i = el("input", "f"); i.maxLength = 24; i.placeholder = "ex. Manu"; i.setAttribute("aria-label", "Prénom ou pseudo");
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
  var keys = Object.keys(T).sort(function (a, b) { return ts(T[b][T[b].length - 1].t) - ts(T[a][T[a].length - 1].t); });
  if (!keys.length) { W.appendChild(el("p", "mu wa-empty", "Pas encore de discussion privée. Touchez un membre juste en dessous pour lui écrire.")); return; }
  keys.forEach(function (k) {
    var L = T[k], last = L[L.length - 1], n = unreadOf(k, L), it = el("button", "wa-it" + (n ? " unr" : ""));
    it.appendChild(avatar(k));
    var mid = el("span", "wa-im"); mid.appendChild(el("b", 0, nameOf(k))); mid.appendChild(el("span", "wa-pv", (last.de === uid ? "Vous : " : "") + last.txt)); it.appendChild(mid);
    var rt = el("span", "wa-ir"); rt.appendChild(el("small", 0, listTime(last.t))); if (n) rt.appendChild(el("span", "wa-n", String(n))); it.appendChild(rt);
    it.onclick = function () { openThread(k); }; W.appendChild(it);
  });
}
function renderConv() {
  var k = openWith, L = threads()[k] || [];
  var W = $("pvWho"); W.textContent = ""; W.appendChild(avatar(k)); var t = el("span", "wa-ti"); t.appendChild(el("b", 0, (P[k] && P[k].pseudo) || "Plaisancier")); var pr = P[k] || {}; t.appendChild(el("span", 0, [pr.bateau, pr.port].filter(Boolean).join(" · ") || "Membre Nauticonnect")); W.appendChild(t);
  var f = el("button", "wa-fr", rel(k) === "ami" ? "Ami" : rel(k) === "envoye" ? "Demande envoyée" : rel(k) === "recu" ? "Accepter en ami" : "Ajouter en ami"); f.onclick = function () { befriend(k); }; W.appendChild(f);
  drawBubbles($("pvMsgs"), L, false); markThread(k);
  var Pp = $("pvPre"); Pp.textContent = ""; Pp.hidden = L.length > 0; PRESETS.forEach(function (x) { var b = el("button", "wa-chip", x); b.onclick = function () { sendMsg(k, x); }; Pp.appendChild(b); });
}
function renderPonton() {
  var ok = !!me();
  Array.prototype.forEach.call(document.querySelectorAll(".wa-tabs button"), function (b) { b.classList.toggle("on", b.dataset.t === waTab); });
  $("paneSalon").hidden = waTab !== "salon"; $("panePrive").hidden = waTab !== "prive"; $("paneEau").hidden = waTab !== "eau";
  var nm = Object.keys(P).length; $("waSub").textContent = nm ? nm + " membre" + (nm > 1 ? "s" : "") + " · " + openNow().length + " sur l'eau" : "Le chat des plaisanciers du Léman";
  $("waJoin").hidden = ok; if (!ok) drawJoin();
  $("waNotif").hidden = !(ok && pushOk && !(mySub && myAbo) && Notification.permission !== "denied");
  /* salon : lisible par tous */
  drawBubbles($("slMsgs"), SL, true); $("slBar").hidden = !ok;
  if (waTab === "salon") { if (SL.length) ls("nc-slseen", String(ts(SL[SL.length - 1].t))); slBottom(false); }
  var su = slUnread(); $("unreadSl").hidden = !su || waTab === "salon"; $("unreadSl").textContent = su;
  /* privé */
  var conv = waTab === "prive" && ok && openWith && openWith !== uid;
  $("pvList").hidden = conv || !ok; $("pvConv").hidden = !conv;
  if (ok) { if (conv) { renderConv(); slBottom(false); } else { renderThreads(); renderMembers(); } }
  var u = unread() + pendingIn().length; $("unreadRn").hidden = !u || (waTab === "prive" && !conv); $("unreadRn").textContent = u;
  /* sur l'eau */
  if (waTab === "eau") {
    if (!ok) { $("paneEau").hidden = true; return; }
    stat(); drawRnMap();
    var D = $("rnDet"); D.textContent = ""; openOthers().forEach(function (x) { if (x.id === sel) D.appendChild(personCard(x.id, x)); });
    var Fr = $("rnFriends"); Fr.textContent = ""; var p = rPos();
    friendIds().filter(function (id) { return P[id]; }).forEach(function (id) {
      var x = FR.filter(function (f) { return f.auteur === id; })[0], ex = null;
      if (x) { ex = el("div"); ex.appendChild(el("div", "okm", (p ? km(p.lat, p.lon, x.lat, x.lon).toFixed(1) + " km · " : "") + "position partagée " + ago(x.maj)));
        var a = el("a", "btn g sm", "Itinéraire"); a.href = "https://www.google.com/maps/dir/?api=1&destination=" + x.lat + "," + x.lon; a.target = "_blank"; a.rel = "noopener"; ex.appendChild(a); }
      Fr.appendChild(memberCard(id, ex)); });
    if (!Fr.firstChild) Fr.appendChild(el("p", "mu", "Pas encore d'amis. Ouvrez une discussion privée et touchez « Ajouter en ami »."));
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
  var m = $("avMsg"); m.className = "err"; m.textContent = ""; if (!guestOk(function () { $("avSend").onclick(); }, m)) return;
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
    vb.onclick = function () { if (!guestOk(function () { vb.onclick(); })) return; vb.disabled = true; (on ? sb.from("votes").delete().eq("avis_id", x.id).eq("auteur", uid) : sb.from("votes").insert({ avis_id: x.id })).then(function () { load("votes"); }); };
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
  if (p) putPhoto(A, uid);
  $("pfPhRm").hidden = !(p && p.photo);
  $("pfPhSt").textContent = !p ? "Enregistrez d'abord votre fiche, puis ajoutez une photo." : !p.photo ? "Une photo de vous ou de votre bateau, visible par les membres." : "Votre photo est visible par les membres.";
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
  if (!real()) { toast("Créez un compte (gratuit) pour partager des photos."); try { sessionStorage.setItem("nc-ret", cur()); } catch (e) {} location.hash = "compte"; return; }
  var md = modal("Ajouter une photo"), bx = md.bx;
  bx.appendChild(el("div", "mu", label));
  var fi = el("input", "f"); fi.type = "file"; fi.accept = "image/jpeg,image/png,image/webp"; fi.style.marginTop = "8px"; bx.appendChild(fi);
  var im = el("img", "ph-prev"); im.alt = ""; im.hidden = true; bx.appendChild(im);
  var cap = el("input", "f"); cap.maxLength = 120; cap.placeholder = "Légende (ex. ponton visiteurs plein, lac calme…)"; cap.style.marginTop = "8px"; bx.appendChild(cap);
  var go = el("button", "btn", "Publier la photo"); go.disabled = true; bx.appendChild(go);
  var msg = el("div", "err"); bx.appendChild(msg);
  var rl = el("div", "card wxal"); rl.style.margin = "10px 0 0"; rl.appendChild(el("b", 0, "Règles des photos")); rl.appendChild(el("div", "mu", "Photos du lac, des ports et de la météo uniquement. Aucune personne reconnaissable sans son accord. " + (isAdmin ? "" : "Chaque photo est vérifiée avant d'être visible par les autres membres.") + " Les abus entraînent la suppression du compte.")); bx.appendChild(rl);
  fi.onchange = function () { var f = fi.files && fi.files[0]; go.disabled = !f; if (f) { im.src = URL.createObjectURL(f); im.hidden = false; } };
  go.onclick = function () {
    var f = fi.files && fi.files[0]; if (!f) return; go.disabled = true; msg.className = "mu"; msg.textContent = "Envoi en cours…";
    var path = uid + "/" + Date.now() + ".jpg";
    shrink(f, 1600).then(function (blob) { return sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" }); })
      .then(function (r) { if (r.error) throw r.error; return sb.from("photos").insert({ k: k, chemin: path, c: cap.value.trim().slice(0, 120) }); })
      .then(function (r) { if (r.error) throw r.error; md.close(); toast(isAdmin ? "Photo publiée, merci !" : "Merci ! Votre photo sera visible après vérification."); load("photos"); })
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
["vev","Vevey","Vaud","Haut-Lac"],["ltp","La Tour-de-Peilz","Vaud","Haut-Lac"],["cla","Montreux – Clarens","Vaud","Haut-Lac"],["vil","Villeneuve","Vaud","Haut-Lac"],["bou","Le Bouveret","Valais","Haut-Lac"],["sgi","Saint-Gingolph","Valais","Haut-Lac"],
["evi","Évian-les-Bains","Haute-Savoie","Rive française"],["tho","Thonon – Port de Rives","Haute-Savoie","Rive française"],["yvo","Yvoire","Haute-Savoie","Rive française"]].map(function (a) { return { id: a[0], n: a[1], r: a[2], z: a[3] }; });
var PZ = ["Tous", "Favoris", "Petit-Lac", "Côte vaudoise", "Haut-Lac", "Rive française"], poZone = ls("nc-pzone") || "Tous", poQ = "", favs = {};
try { JSON.parse(ls("nc-favs") || "[]").forEach(function (f) { favs[f] = 1; }); } catch (e) {}
PZ.forEach(function (z) { var b = el("button", 0, z === "Favoris" ? "★ Favoris" : z); b.dataset.z = z; b.onclick = function () { poZone = z; ls("nc-pzone", z); renderPorts(); }; $("poChips").appendChild(b); });
$("poQ").oninput = function () { poQ = norm(this.value); renderPorts(); };
var LBL = { libre: "Places libres", peu: "Peu de places", complet: "Complet" };
function portStatus(id) { var best = null, n = 0, lim = Date.now() - 12 * 36e5; PL.forEach(function (r) { if (r.port !== id || ts(r.t) < lim) return; n++; if (!best || ts(r.t) > ts(best.t)) best = r; }); return best ? { s: best.s, t: best.t, n: n } : null; }
function renderPorts() {
  Array.prototype.forEach.call($("poChips").children, function (b) { b.classList.toggle("on", b.dataset.z === poZone); });
  var L = $("poList"); L.textContent = ""; var last = null, shown = 0;
  PORTS.filter(function (p) { return (poZone === "Tous" || (poZone === "Favoris" ? favs[p.id] : p.z === poZone)) && (!poQ || norm(p.n + " " + p.r).indexOf(poQ) >= 0); }).forEach(function (p) {
    if (p.z !== last && poZone !== "Favoris") { L.appendChild(el("h3", "sub", p.z)); last = p.z; }
    shown++; var s = portStatus(p.id), c = el("div", "port");
    var top = el("div", "ptop"), d = el("div", "sdot" + (s ? " " + s.s : "")), nm = el("div", "nm"); nm.appendChild(el("b", 0, p.n)); nm.appendChild(el("span", 0, p.r));
    var fv = el("button", "fav" + (favs[p.id] ? " on" : ""), "★"); fv.setAttribute("aria-label", "Favori"); fv.onclick = function () { if (favs[p.id]) delete favs[p.id]; else favs[p.id] = 1; ls("nc-favs", JSON.stringify(Object.keys(favs))); renderPorts(); };
    top.appendChild(d); top.appendChild(nm); top.appendChild(fv); c.appendChild(top);
    c.appendChild(el("div", "st " + (s ? s.s : "none"), s ? LBL[s.s] + " · " + ago(s.t) + (s.n > 1 ? " · " + s.n + " signalements" : "") : "Pas de signalement récent"));
    c.appendChild(thumb("port-" + p.id, p.n, "Port : " + p.n + " (ponton visiteurs, capitainerie, état du port…)"));
    var a = el("div", "act"), mine = PL.filter(function (r) { return r.port === p.id && r.auteur === uid && ts(r.t) > Date.now() - 12 * 36e5; })[0];
    ["libre", "peu", "complet"].forEach(function (k) { var b = el("button", k + (mine && mine.s === k ? " mine" : ""), k === "libre" ? "Libre" : k === "peu" ? "Peu" : "Complet");
      b.onclick = function () { if (!guestOk(function () { b.onclick(); })) return; b.disabled = true; (mine && mine.s === k ? sb.from("places").delete().eq("port", p.id).eq("auteur", uid) : sb.from("places").upsert({ port: p.id, auteur: uid, s: k, t: nowIso() }, { onConflict: "port,auteur" })).then(function () { load("places"); toast("Merci pour le signalement !"); }); };
      a.appendChild(b); });
    var m = el("a", 0, "Carte"); m.href = mapsSearch("port " + p.n.replace(" – ", " ")); m.target = "_blank"; m.rel = "noopener"; a.appendChild(m);
    var wc = el("a", 0, "Webcam"); wc.href = "#webcams"; wc.onclick = function () { wcPort = p.id; }; a.appendChild(wc);
    c.appendChild(a); L.appendChild(c);
  });
  if (!shown) L.appendChild(el("div", "note", poZone === "Favoris" ? "Touchez ★ sur un port pour l'ajouter à vos favoris." : "Aucun port ne correspond."));
}

/* ================= MÉTÉO ================= */
var MZ = ["Genève – Petit-Lac", "Nyon – Coppet", "Rolle – Morges", "Lausanne – Lutry", "Lavaux – Vevey", "Montreux – Villeneuve", "Le Bouveret – Saint-Gingolph", "Évian – Thonon", "Yvoire – Sciez", "Large du Grand-Lac"];
MZ.forEach(function (z, i) { var o = el("option", 0, z); o.value = "z" + i; $("mZone").appendChild(o); });
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
var PORTXY = { gen: [46.212, 6.165], her: [46.302, 6.243], ver: [46.283, 6.168], cop: [46.315, 6.192], nyo: [46.382, 6.240], rol: [46.458, 6.337], spx: [46.478, 6.455], mor: [46.505, 6.497], ssu: [46.508, 6.560], vid: [46.517, 6.597], ouc: [46.505, 6.627], pul: [46.507, 6.660], lut: [46.502, 6.685], cul: [46.488, 6.730], vev: [46.461, 6.842], ltp: [46.453, 6.858], cla: [46.440, 6.893], vil: [46.400, 6.925], bou: [46.383, 6.857], sgi: [46.390, 6.803], evi: [46.402, 6.590], tho: [46.377, 6.478], yvo: [46.372, 6.327] };
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
var RF = [["tous", "Tous"], ["bateau", "Accès en bateau"], ["CH", "Rive suisse"], ["FR", "Rive française"], ["user", "Ajouts des membres"]], reFilt = "tous", reCur = null;
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
  var S = allRestos().filter(function (x) { return reFilt === "tous" || (reFilt === "bateau" ? (x.a === "ponton" || x.a === "port") : reFilt === "user" ? !!x.u : x.r === reFilt); });
  var g = detailedLake($("reMap"));
  S.forEach(function (x) { if (x.la == null) return; var n = svgEl("g", { class: "pin" + (x.u ? " user" : "") + (x.pa ? " star" : "") + (x.id === reCur ? " on" : ""), transform: "translate(" + X2(x.lo).toFixed(1) + "," + Y2(x.la).toFixed(1) + ")" }, g);
    svgEl("circle", { r: 18, style: "fill:transparent" }, n); svgEl("circle", { class: "pb", r: x.id === reCur ? 10 : 8 }, n);
    n.onclick = function () { reCur = x.id; renderRestos(); var c = $("r-" + x.id); if (c) c.scrollIntoView({ behavior: "smooth", block: "center" }); }; });
  var L = $("reList"); L.textContent = "";
  if (!S.length) L.appendChild(el("p", "mu", reFilt === "user" ? "Aucune adresse ajoutée pour l'instant. Soyez le premier !" : "Aucune adresse."));
  S.forEach(function (x) {
    var c = el("div", "card rcard" + (x.pa ? " partner" : "") + (x.id === reCur ? " on" : "")); c.id = "r-" + x.id;
    if (x.pa) c.appendChild(el("div", "pbadge", paActive(x.pa) ? "Partenaire Nauticonnect" : "Partenariat expiré (visible par l'admin seulement)"));
    c.appendChild(el("h3", 0, x.n)); c.appendChild(el("div", "where", x.l + (x.r ? " · " + (x.r === "CH" ? "Suisse" : "France") : "")));
    var T = el("div", "tags"), ac = ACC[x.a]; if (ac) T.appendChild(el("span", "tag " + ac[1], ac[0])); if (x.u) T.appendChild(el("span", "tag us", "Ajouté par " + ((P[x.u] && P[x.u].pseudo) || "un membre"))); c.appendChild(T);
    if (x.pa && x.pa.offre) c.appendChild(el("div", "poffre", x.pa.offre));
    if (x.d) c.appendChild(el("div", 0, x.d));
    c.appendChild(thumb("resto-" + x.id, x.n, "Escale : " + x.n + " (plats, terrasse, ponton…)"));
    var A2 = el("div", "acts"), go = el("a", "p", "Y aller"); go.href = mapsSearch(x.n + " " + x.l); go.target = "_blank"; go.rel = "noopener"; A2.appendChild(go);
    if (x.pa && x.pa.tel) { var tl = el("a", 0, "Appeler"); tl.href = "tel:" + x.pa.tel.replace(/[^0-9+]/g, ""); A2.appendChild(tl); }
    if (x.pa && /^https?:\/\//.test(x.pa.site)) { var st = el("a", 0, "Site"); st.href = x.pa.site; st.target = "_blank"; st.rel = "noopener"; A2.appendChild(st); }
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
  var m = $("reMsg"); m.className = "err"; m.textContent = ""; if (!guestOk(function () { $("reAdd").onclick(); }, m)) return;
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
$("epAdd").onclick = function () { if (!guestOk(function () { epOpen(null); }, $("epMsg"))) return; epOpen(null); };
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
function knProg() { var n = KN.filter(function (k, i) { return ls("kn" + i) === "1"; }).length; $("knPg").textContent = "Appris : " + n + " sur " + KN.length; $("knPb").style.width = (n * 100 / KN.length) + "%"; }
function renderNoeuds() {
  var L = $("knList"), q = norm($("knQ").value), fc = $("knC").value; L.textContent = "";
  KN.forEach(function (k, i) {
    if (fc && k.c !== fc) return; if (norm(k.n + " " + k.en + " " + k.u + " " + k.c).indexOf(q) < 0) return;
    var d = el("details", "kn"), s = el("summary"), l = el("div"); l.appendChild(el("b", 0, k.n)); l.appendChild(el("span", "mu", k.en + " · " + k.c + " · " + ["Facile", "Moyen", "Avancé"][k.d - 1])); s.appendChild(l);
    var ok = el("span", "okm", ls("kn" + i) === "1" ? "✓" : ""); ok.style.fontSize = "20px"; s.appendChild(ok); d.appendChild(s);
    var n = el("div", "kin"); n.appendChild(el("div", 0, k.u)); var o = el("ol"); k.s.forEach(function (t) { o.appendChild(el("li", 0, t)); }); n.appendChild(o);
    if (k.t) n.appendChild(el("div", "tip", "Astuce : " + k.t)); if (k.w) n.appendChild(el("div", "wr", "À éviter : " + k.w));
    var lb = el("label", "sw"), cb = el("input"); cb.type = "checkbox"; cb.checked = ls("kn" + i) === "1"; cb.onchange = function () { ls("kn" + i, cb.checked ? "1" : "0"); ok.textContent = cb.checked ? "✓" : ""; knProg(); }; lb.appendChild(cb); lb.appendChild(el("b", 0, "Je sais le faire")); n.appendChild(lb);
    d.appendChild(n); L.appendChild(d);
  });
  if (!L.firstChild) L.appendChild(el("p", "mu", "Aucun nœud trouvé.")); knProg();
}
$("knQ").oninput = renderNoeuds; $("knC").onchange = renderNoeuds;

/* ================= ANNONCES ================= */
var CATS = ["Moteurs et hélices", "Voiles et gréement", "Électronique et GPS", "Sécurité", "Ancres et mouillage", "Remorques", "Annexes et pneumatiques", "Bateaux", "Plongée et loisirs", "Autre"];
var COL = { Vente: "#1f8a4c", Troc: "#0b6fa4", Don: "#c26a00" }, anEd = null;
var fo = el("option", 0, "Toutes les catégories"); fo.value = ""; $("anFc").appendChild(fo);
CATS.forEach(function (c) { $("anFc").appendChild(el("option", 0, c)); $("anCt").appendChild(el("option", 0, c)); });
function anMsg(t) { $("anMsg").textContent = t || ""; }
function renderAnnonces() {
  var L = $("anList"); L.textContent = ""; var q = norm($("anQ").value), ft = $("anFt").value, fc = $("anFc").value;
  AN.filter(function (a) { return (!ft || a.type === ft) && (!fc || a.cat === fc) && norm([a.titre, a.descr, a.lieu, a.cat].join(" ")).indexOf(q) > -1; }).forEach(function (a) {
    var c = el("div", "card"), h = el("div"), b = el("span", "bdg", a.type); b.style.background = COL[a.type] || "#555"; h.appendChild(b); h.appendChild(el("b", 0, a.titre)); c.appendChild(h);
    c.appendChild(el("div", "price", a.type === "Vente" ? (+a.prix ? a.prix + " CHF" : "Prix à discuter") : a.type === "Don" ? "Gratuit" : "Troc"));
    c.appendChild(el("div", "mu", [a.cat, a.etat, a.lieu].filter(Boolean).join(" · "))); if (a.descr) c.appendChild(el("div", 0, a.descr));
    var by = el("div", "mu"); by.style.marginTop = "6px"; by.appendChild(document.createTextNode("Par ")); by.appendChild(badge(a.auteur)); by.appendChild(document.createTextNode(" · " + ago(a.maj))); c.appendChild(by);
    if (a.auteur === uid || isAdmin) {
      var e = el("button", "btn g sm", "Modifier"); e.onclick = function () { anOpen(a); }; c.appendChild(e);
      var d = el("button", "btn g sm", "Retirer (vendu / donné)"); d.onclick = function () { sb.from("annonces").delete().eq("id", a.id).then(function () { load("annonces"); }); }; c.appendChild(d);
    } else {
      var k = el("button", "btn sm", "Contacter"); k.onclick = function () { openThread(a.auteur, "Bonjour, votre annonce « " + a.titre + " » m'intéresse. "); }; c.appendChild(k);
      var r = el("button", "btn g sm", "Signaler"); r.onclick = function () { if (!guestOk(function () { r.onclick(); })) return; sb.from("signalements").insert({ quoi: "annonce", ref: String(a.id) }).then(function () { r.textContent = "Signalée"; r.disabled = true; }); }; c.appendChild(r);
    }
    L.appendChild(c);
  });
  if (!L.firstChild) L.appendChild(el("p", "mu", "Aucune annonce pour l’instant. Publiez la première !"));
}
function anOpen(a) { anEd = a ? a.id : null; $("anTi").value = a ? a.titre : ""; $("anTy").value = a ? a.type : "Vente"; $("anPr").value = a ? a.prix || "" : ""; $("anCt").value = a ? a.cat : CATS[0]; $("anEt").value = a ? a.etat : "Bon"; $("anLo").value = a ? a.lieu || "" : ""; $("anDs").value = a ? a.descr || "" : ""; $("anForm").hidden = false; $("anForm").scrollIntoView({ behavior: "smooth" }); }
$("anAdd").onclick = function () { anMsg(); if (!guestOk(function () { anOpen(null); }, $("anMsg"))) return; anOpen(null); };
$("anCx").onclick = function () { $("anForm").hidden = true; anEd = null; };
$("anSv").onclick = function () {
  anMsg(); var t = $("anTi").value.trim(); if (t.length < 2) { anMsg("Titre requis."); return; }
  var o = { titre: t, type: $("anTy").value, prix: $("anTy").value === "Vente" ? +$("anPr").value || 0 : 0, cat: $("anCt").value, etat: $("anEt").value, lieu: $("anLo").value.trim(), descr: $("anDs").value.trim(), maj: nowIso() };
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
$("loAdd").onclick = function () { loMsg(); if (!requireProfile($("loMsg"))) return; loOpen(null); };
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
function pushRefresh() {
  if (!pushOk || !real()) { mySub = null; myAbo = null; notifUI(); return Promise.resolve(); }
  var r; return swReg().then(function (x) { r = x; return r.pushManager.getSubscription(); }).then(function (s) {
    if (!s && Notification.permission === "granted" && !ls("nc-push-off")) return r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(CFG.vapid) }).then(function (n) { return pushSave(n); }); /* déjà autorisé : on réabonne sans rien demander */
    mySub = s; if (!s) { myAbo = null; notifUI(); return; }
    return sb.from("push_abos").select("*").eq("endpoint", s.endpoint).maybeSingle().then(function (r) {
      myAbo = r.data || null;
      if (!myAbo && Notification.permission === "granted" && !ls("nc-push-off")) return pushSave(s); /* réabonner ce compte sur cet appareil */
      notifUI();
    });
  }).catch(function () { notifUI(); });
}
function pushSave(s, prefs) {
  var j = s.toJSON(), o = { endpoint: s.endpoint, uid: uid, p256dh: j.keys.p256dh, auth: j.keys.auth, maj: nowIso() };
  if (prefs) for (var k in prefs) o[k] = prefs[k];
  return sb.from("push_abos").upsert(o, { onConflict: "endpoint" }).select().maybeSingle().then(function (r) { if (r.error) throw r.error; myAbo = r.data; mySub = s; notifUI(); });
}
function pushEnable() {
  if (!pushOk) { toast("Votre navigateur ne gère pas les notifications. Installez l'appli sur l'écran d'accueil."); return; }
  if (!requireProfile()) return; ls("nc-push-off", "");
  Notification.requestPermission().then(function (p) {
    if (p !== "granted") { toast("Notifications refusées. Autorisez-les dans les réglages du téléphone (Applications › Chrome › Notifications)."); notifUI(); return; }
    return swReg().then(function (r) { return r.pushManager.getSubscription().then(function (s) { return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(CFG.vapid) }); }); })
      .then(function (s) { return pushSave(s); }).then(function () { toast("Notifications activées !"); });
  }).catch(function () { toast("Activation impossible. Réessayez."); });
}
function pushDisable() {
  var s = mySub; if (!s) return Promise.resolve();
  return sb.from("push_abos").delete().eq("endpoint", s.endpoint).then(function () { return s.unsubscribe(); }).then(function () { mySub = null; myAbo = null; notifUI(); });
}
function notifUI() {
  var on = !!(mySub && myAbo), den = pushOk && Notification.permission === "denied";
  $("nfState").textContent = !pushOk ? "Pas disponible sur ce navigateur. Installez l'appli sur l'écran d'accueil (Chrome)." : den ? "Bloquées sur ce téléphone : autorisez-les dans les réglages (Applications › Chrome › Notifications)." : on ? "Activées sur ce téléphone." : "Désactivées.";
  $("nfOn").hidden = on || !pushOk || den; $("nfPrefs").hidden = !on;
  if (on) { $("nfMsg").checked = myAbo.msg; $("nfSos").checked = myAbo.sos; $("nfVent").checked = myAbo.vent; }
  var ask = $("notifAsk"); ask.hidden = !(pushOk && me() && !on && !den && !ls("nc-notif-later"));
  if ($("waNotif")) $("waNotif").hidden = !(pushOk && me() && !on && !den);
}
["nfMsg", "nfSos", "nfVent"].forEach(function (id) { $(id).onchange = function () { if (!mySub) return; pushSave(mySub, { msg: $("nfMsg").checked, sos: $("nfSos").checked, vent: $("nfVent").checked }).then(function () { toast("Préférences enregistrées"); }); }; });
$("nfOn").onclick = pushEnable; $("notifAskGo").onclick = pushEnable; $("waNotifGo").onclick = pushEnable;
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
function invite() {
  var url = location.origin + location.pathname, txt = "Rejoins-moi sur Nauticonnect, l'appli des plaisanciers du Léman : chat, entraide en cas de panne, vent et météo du lac";
  if (navigator.share) { navigator.share({ title: "Nauticonnect", text: txt, url: url }).catch(function () {}); return; }
  var md = modal("Inviter un ami"), bx = md.bx;
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
function renderAll() {
  renderHome();
  var v = cur();
  if (v === "panne") renderPanne(); else if (v === "ponton") renderPonton();
  else if (v === "avis") renderAvis(); else if (v === "ports") renderPorts(); else if (v === "meteo") { renderMeteoFeed(); renderPhotoMod(); loadWind(); wxRender(); loadLac(); renderLac(); }
  else if (v === "profil") notifUI();
  else if (v === "webcams") renderWebcams(); else if (v === "restos") renderRestos(); else if (v === "epaves") renderEpaves();
  else if (v === "noeuds") renderNoeuds(); else if (v === "annonces") renderAnnonces(); else if (v === "location") renderLoc(); else if (v === "evenements") renderEvents();
}
if (!configured || !sb) {
  var warn = el("div", "card warn"); warn.style.margin = "16px";
  warn.innerHTML = "<b>Appli pas encore configurée.</b> Ouvrez le fichier <b>config.js</b> et collez-y l'adresse et la clé de votre projet Supabase (étape 4 du guide).";
  if (configured && !window.supabase) warn.innerHTML = "<b>Connexion impossible.</b> Vérifiez votre connexion internet puis rechargez la page.";
  document.body.insertBefore(warn, document.body.firstChild);
}
route();
if (sb) {
  sb.auth.getSession().then(function (r) { onSession(r.data.session, "INITIAL"); if (!r.data.session) { subscribeAll(); loadAll(); } });
  sb.auth.onAuthStateChange(function (ev, s) { if (ev === "INITIAL_SESSION") return; if (ev === "TOKEN_REFRESHED") { session = s; return; } onSession(s, ev); });
}

/* ================= ÉVÉNEMENTS (publication payante) ================= */
var MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."], JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
function dFr(d) { var x = new Date(d + "T12:00:00"); return JOURS[x.getDay()] + " " + x.getDate() + " " + MOIS[x.getMonth()]; }
function evDates(e) { return e.debut === e.fin ? dFr(e.debut) : "du " + dFr(e.debut) + " au " + dFr(e.fin); }
function evPrice() { return REG.ev_prix || "30"; }
var STE = { attente: "En attente de paiement / validation", publie: "Publié", refuse: "Refusé" };
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
  if (e.contact) { var ct = el("a", 0, "Contact"); ct.href = /@/.test(e.contact) ? "mailto:" + e.contact : "tel:" + e.contact.replace(/[^0-9+]/g, ""); A.appendChild(ct); }
  b.appendChild(A);
  if (adm && isAdmin) {
    var R = el("div", "row"); R.style.marginTop = "8px";
    if (e.statut !== "publie") { var ok = el("button", "btn sm", "Publier (payé)"); ok.onclick = function () { evSet(e.id, "publie"); }; R.appendChild(ok); }
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
function payBox() {
  var w = $("evPay"); w.textContent = "";
  w.appendChild(el("div", 0, "Publication : " + evPrice() + " CHF par événement."));
  var pay = REG.ev_paiement || "";
  if (/^https?:\/\//.test(pay)) { var a = el("a", "btn", "Payer " + evPrice() + " CHF"); a.href = pay; a.target = "_blank"; a.rel = "noopener"; a.style.marginTop = "8px"; w.appendChild(a); }
  else if (pay) w.appendChild(el("div", "okm", pay));
  else w.appendChild(el("div", "mu", "Les infos de paiement vous seront envoyées par l'équipe Nauticonnect au contact indiqué."));
  w.appendChild(el("div", "mu", "Votre événement est publié dès réception du paiement."));
}
function renderEvents() {
  var d = today(), L = $("evList"); L.textContent = "";
  var pub = EV.filter(function (e) { return e.statut === "publie" && e.fin >= d; });
  pub.forEach(function (e) { L.appendChild(evCard(e)); });
  if (!pub.length) L.appendChild(el("p", "mu", "Aucun événement à venir pour l'instant."));
  var M = $("evMine"); M.textContent = "";
  EV.filter(function (e) { return uid && e.auteur === uid && e.statut !== "publie"; }).forEach(function (e) { M.appendChild(evCard(e)); });
  $("evMineH").hidden = !M.firstChild; $("evPay").style.display = EV.some(function (e) { return uid && e.auteur === uid && e.statut === "attente"; }) ? "" : "none"; payBox();
  $("evPrice").textContent = evPrice();
  $("evAdmin").hidden = !isAdmin;
  if (isAdmin) {
    var Q2 = $("evQueue"); Q2.textContent = "";
    EV.filter(function (e) { return e.statut === "attente"; }).forEach(function (e) { Q2.appendChild(evCard(e, true)); });
    if (!Q2.firstChild) Q2.appendChild(el("p", "mu", "Aucune demande en attente."));
    var O2 = $("evAll"); O2.textContent = "";
    EV.filter(function (e) { return e.statut !== "attente"; }).forEach(function (e) { O2.appendChild(evCard(e, true)); });
    if (document.activeElement !== $("evSetP")) $("evSetP").value = evPrice();
    if (document.activeElement !== $("evSetL")) $("evSetL").value = REG.ev_paiement || "";
  }
}
function evMsg(t, ok) { $("evMsg").className = ok ? "okm" : "err"; $("evMsg").textContent = t || ""; }
$("evAdd").onclick = function () { $("evForm").hidden = !$("evForm").hidden; evMsg(); if (!$("evForm").hidden) $("evForm").scrollIntoView({ behavior: "smooth" }); };
$("evCx").onclick = function () { $("evForm").hidden = true; };
$("evSv").onclick = function () {
  evMsg(); if (!guestOk(function () { $("evSv").onclick(); }, $("evMsg"))) return;
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
    toast(isAdmin ? "Événement publié" : "Demande envoyée ! Réglez la publication ci-dessous.");
    setTimeout(function () { var h = $("evMineH"); if (h && !h.hidden) h.scrollIntoView({ behavior: "smooth" }); }, 600);
  }).then(function () { $("evSv").disabled = false; });
};
$("evSetSv").onclick = function () {
  if (!isAdmin) return;
  var pr = $("evSetP").value.trim(), lk = $("evSetL").value.trim();
  if (!/^\d{1,4}$/.test(pr)) { toast("Prix invalide"); return; }
  sb.from("reglages").upsert([{ k: "ev_prix", v: pr }, { k: "ev_paiement", v: lk }]).then(function (r) { toast(r.error ? "Enregistrement impossible" : "Réglages enregistrés"); load("reglages"); });
};
