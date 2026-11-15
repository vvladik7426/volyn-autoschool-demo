/* Волинська приватна автошкола — демо-концепт: інтерактив */
(() => {
  "use strict";
  const CFG = window.SITE_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  $("#yr").textContent = new Date().getFullYear();

  /* demo bar height */
  const demo = $(".demo");
  const setH = () => root.style.setProperty("--demo-h", (demo ? demo.offsetHeight : 0) + "px");
  setH();
  if (demo && "ResizeObserver" in window) new ResizeObserver(setH).observe(demo);
  if (!CFG.demo) $$(".form__demo").forEach((n) => n.remove());

  setTimeout(() => document.body.classList.add("ready"), 80);

  /* reveal */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: "0px 0px -5% 0px" });
  $$(".reveal, .xcard").forEach((el) => io.observe(el));

  /* header + nav + sticky CTA */
  const hdr = $(".hdr"), cta = $(".sticky-cta"), booking = $("#booking");
  const links = $$(".menu a").map((a) => [a, $(a.getAttribute("href"))]);
  function onScroll() {
    const y = scrollY;
    hdr.classList.toggle("is-solid", y > 20);
    const br = booking.getBoundingClientRect();
    cta.classList.toggle("on", y > innerHeight * .8 && !(br.top < innerHeight && br.bottom > 0));
    links.forEach(([a, s]) => { const r = s.getBoundingClientRect(); a.classList.toggle("on", r.top < innerHeight * .4 && r.bottom > innerHeight * .4); });
    hscroll(); parallax();
  }
  addEventListener("scroll", () => requestAnimationFrame(onScroll), { passive: true });
  addEventListener("resize", () => { sizeOnline(); onScroll(); });

  /* drawer */
  const burger = $(".burger"), drawer = $(".drawer");
  const setDrawer = (o) => { burger.setAttribute("aria-expanded", o); drawer.classList.toggle("open", o); drawer.setAttribute("aria-hidden", !o); document.body.style.overflow = o ? "hidden" : ""; };
  burger.addEventListener("click", () => setDrawer(burger.getAttribute("aria-expanded") !== "true"));
  $$("a", drawer).forEach((a) => a.addEventListener("click", () => setDrawer(false)));
  addEventListener("keydown", (e) => e.key === "Escape" && setDrawer(false));

  /* flip cards: tap to flip on touch, click back side → booking */
  $$(".sign").forEach((s) => s.addEventListener("click", () => {
    const touch = matchMedia("(hover: none)").matches;
    if (touch && !s.classList.contains("flip")) { $$(".sign.flip").forEach((o) => o.classList.remove("flip")); s.classList.add("flip"); return; }
    pick(s.dataset.svc);
  }));
  $$("[data-pick]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); pick(b.dataset.pick); }));

  /* online course: vertical scroll → horizontal track */
  const online = $(".online"), pin = $(".online__pin"), track = $(".hscroll__track");
  let travel = 0;
  function sizeOnline() {
    if (matchMedia("(max-width: 900px)").matches) { online.style.height = ""; travel = 0; return; }
    travel = Math.max(0, track.scrollWidth - innerWidth);
    online.style.height = pin.offsetHeight + travel + "px";
  }
  function hscroll() {
    if (!travel) return;
    const r = online.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (online.offsetHeight - pin.offsetHeight)));
    track.style.transform = `translateX(${-p * travel}px)`;
  }
  addEventListener("load", () => { sizeOnline(); onScroll(); });
  sizeOnline();

  /* price counter */
  const price = $("[data-count]");
  new IntersectionObserver((es, o) => es.forEach((e) => {
    if (!e.isIntersecting) return; o.disconnect();
    const to = +price.dataset.count, t0 = performance.now();
    const tick = (t) => { const p = Math.min(1, (t - t0) / 1400); price.textContent = Math.round(to * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(tick); };
    reduced ? (price.textContent = to) : requestAnimationFrame(tick);
  }), { threshold: .5 }).observe(price);

  /* parallax photo band */
  const band = $(".photo-band"), bandImg = $(".photo-band__img");
  function parallax() {
    if (reduced) return;
    const r = band.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    bandImg.style.transform = `translateY(${p * -12}%) scale(1.05)`;
  }

  /* before/after */
  const ba = $("#ba"), range = $(".ba__range", ba);
  range.addEventListener("input", () => ba.style.setProperty("--pos", range.value + "%"));
  new IntersectionObserver((es, o) => es.forEach((e) => {
    if (!e.isIntersecting || reduced) return; o.disconnect();
    // підказка: повзунок сам «гойдається» один раз
    const seq = [50, 25, 75, 50]; let i = 0;
    const step = () => { if (i >= seq.length) return; animateTo(seq[i++], 600, step); };
    setTimeout(step, 400);
  }), { threshold: .6 }).observe(ba);
  function animateTo(to, dur, done) {
    const from = +range.value, t0 = performance.now();
    const f = (t) => { const p = Math.min(1, (t - t0) / dur), v = from + (to - from) * (0.5 - Math.cos(p * Math.PI) / 2);
      range.value = v; ba.style.setProperty("--pos", v + "%"); p < 1 ? requestAnimationFrame(f) : done && done(); };
    requestAnimationFrame(f);
  }

  /* ---------- quiz ---------- */
  const SIGN_MAIN = `<svg viewBox="0 0 100 100" aria-label="Жовтий ромб у білій рамці"><rect x="18" y="18" width="64" height="64" rx="4" transform="rotate(45 50 50)" fill="#fff" stroke="#1d1b1f" stroke-width="2"/><rect x="28" y="28" width="44" height="44" rx="2" transform="rotate(45 50 50)" fill="#ffcf2e"/></svg>`;
  const Q = [
    { q: "Що означає цей дорожній знак?", img: SIGN_MAIN, opts: ["Дати дорогу", "Головна дорога", "Кінець головної дороги"], a: 1,
      e: "Знак 2.3 «Головна дорога» — дає право першочергового проїзду нерегульованих перехресть. Такий знак видно і на нашому автодромі 😉" },
    { q: "Яка максимальна дозволена швидкість у населеному пункті (якщо знаки не встановлюють іншого)?", opts: ["40 км/год", "50 км/год", "60 км/год"], a: 1,
      e: "П. 12.4 ПДР: у населених пунктах рух дозволяється зі швидкістю не більше 50 км/год." },
    { q: "Коли поза населеними пунктами вдень обов'язково вмикати денні ходові вогні або ближнє світло фар?", opts: ["Лише в негоду", "З 1 жовтня по 1 травня", "Цілий рік — ніколи"], a: 1,
      e: "П. 9.8 ПДР: поза населеними пунктами з 1 жовтня по 1 травня у світлий час доби мають бути увімкнені денні ходові вогні або ближнє світло." },
  ];
  let qi = 0, score = 0;
  const qBody = $("#qBody"), qBar = $("#qBar"), qScore = $("#qScore");
  $("#qTotal").textContent = Q.length;
  function renderQ() {
    qBar.style.width = (qi / Q.length) * 100 + "%";
    if (qi >= Q.length) {
      const msg = score === Q.length ? "Ідеально! Схоже, ти майже готовий до іспиту 🏆" : score >= 2 ? "Непогано! Курс допоможе закріпити решту 💪" : "Нічого страшного — саме для цього є курс з 20 тем 🙂";
      qBody.innerHTML = `<div class="q__final"><b>${score}/${Q.length}</b><p>${msg}</p><button class="b b--red" data-pick="Дистанційний курс теорії" id="qGo"><span>Хочу на курс теорії</span></button> <button class="b b--line" id="qRe"><span>Ще раз</span></button></div>`;
      $("#qGo").addEventListener("click", () => pick("Дистанційний курс теорії"));
      $("#qRe").addEventListener("click", () => { qi = 0; score = 0; qScore.textContent = 0; renderQ(); });
      if (score === Q.length) burst(qBody.getBoundingClientRect());
      return;
    }
    const it = Q[qi];
    qBody.style.animation = "none"; void qBody.offsetWidth; qBody.style.animation = "";
    qBody.innerHTML = `<span class="q__num">питання ${qi + 1} з ${Q.length}</span><p class="q__text">${it.q}</p>${it.img ? `<div class="q__img">${it.img}</div>` : ""}
      <div class="q__opts">${it.opts.map((o, i) => `<button class="q__opt" data-i="${i}" data-k="${"АБВ"[i]}">${o}</button>`).join("")}</div>`;
    $$(".q__opt", qBody).forEach((b) => b.addEventListener("click", () => answer(+b.dataset.i)));
  }
  function answer(i) {
    const it = Q[qi], btns = $$(".q__opt", qBody);
    btns.forEach((b) => (b.disabled = true));
    btns[it.a].classList.add("ok");
    if (i === it.a) { score++; qScore.textContent = score; qScore.classList.add("bump"); setTimeout(() => qScore.classList.remove("bump"), 400); burst(btns[i].getBoundingClientRect(), 40); }
    else btns[i].classList.add("bad");
    qBody.insertAdjacentHTML("beforeend", `<p class="q__expl">${it.e}</p><button class="b b--line b--sm q__next"><span>${qi + 1 < Q.length ? "Далі →" : "Результат"}</span></button>`);
    $(".q__next", qBody).addEventListener("click", () => { qi++; renderQ(); });
  }
  renderQ();

  /* ---------- booking form ---------- */
  const form = $("#form"), err = $(".form__err", form), chips = $("#chips");
  function pick(svc) {
    const box = form.querySelector(`input[name="svc"][value="${svc}"]`);
    if (box) box.checked = true;
    chips.classList.remove("err");
    $("#booking").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    setTimeout(() => form.name.focus({ preventScroll: true }), 700);
  }
  const phone = form.phone;
  const fmt = (v) => {
    let d = v.replace(/\D/g, "");
    if (d.startsWith("0")) d = "38" + d; else if (d && !d.startsWith("380")) d = ("380" + d).slice(0, 12);
    d = d.slice(0, 12);
    const p = [d.slice(0, 3), d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)].filter(Boolean);
    return p.length ? "+" + p.join(" ") : "";
  };
  phone.addEventListener("input", () => (phone.value = fmt(phone.value)));
  phone.addEventListener("focus", () => { if (!phone.value) phone.value = "+380 "; });
  phone.addEventListener("blur", () => { if (phone.value.replace(/\D/g, "") === "380") phone.value = ""; });
  form.addEventListener("change", (e) => { if (e.target.name === "svc") chips.classList.remove("err"); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const svc = $$('input[name="svc"]:checked', form).map((i) => i.value);
    const nameF = form.name.closest(".fld"), phoneF = phone.closest(".fld"), agree = $(".agree", form);
    [chips, nameF, phoneF, agree].forEach((n) => n.classList.remove("err"));
    void form.offsetWidth;
    const bad = [];
    if (!svc.length) { chips.classList.add("err"); bad.push("обери послугу"); }
    if (form.name.value.trim().length < 2) { nameF.classList.add("err"); bad.push("вкажи ім'я"); }
    if (!/^380\d{9}$/.test(phone.value.replace(/\D/g, ""))) { phoneF.classList.add("err"); bad.push("перевір телефон"); }
    if (!form.agree.checked) { agree.classList.add("err"); bad.push("підтверди згоду"); }
    err.textContent = bad.length ? "Будь ласка, " + bad.join(", ") + "." : "";
    if (bad.length || form.website.value) return;

    const d = { services: svc.join(", "), name: form.name.value.trim(), phone: phone.value, via: form.via.value, page: location.href };
    const btn = $(".form__go", form);
    btn.classList.add("go"); btn.disabled = true;
    await new Promise((r) => setTimeout(r, reduced ? 50 : 900));

    let text;
    if (CFG.demo) {
      text = `Так виглядатиме успішний запис, ${d.name}! Це демо, тож заявку нікуди не надіслано. У робочій версії вона одразу прийде автошколі в Telegram, на пошту чи в Google Таблицю.`;
    } else {
      try {
        const res = await fetch(CFG.backendUrl, { method: "POST", body: JSON.stringify(d) });
        const out = await res.json();
        if (!out.ok) throw new Error(out.error);
        text = `Дякуємо, ${d.name}! Автошкола зв'яжеться з тобою найближчим часом (${d.via}).`;
      } catch {
        btn.classList.remove("go"); btn.disabled = false;
        err.innerHTML = 'Не вдалося надіслати. Зателефонуй: <a href="tel:+380990744254">(099) 074-42-54</a>';
        return;
      }
    }
    $("#okText").textContent = text;
    form.classList.add("done"); $(".form__ok", form).hidden = false;
    burst(form.getBoundingClientRect(), 140);
  });
  $("#again").addEventListener("click", () => {
    form.reset(); form.classList.remove("done"); $(".form__ok", form).hidden = true;
    const btn = $(".form__go", form); btn.classList.remove("go"); btn.disabled = false; err.textContent = "";
  });

  /* ---------- Google reviews (робоча версія) ---------- */
  async function loadReviews() {
    if (CFG.demo || !CFG.backendUrl) return;
    try {
      const r = await (await fetch(CFG.backendUrl + "?action=reviews")).json();
      if (!r.ok || !r.reviews?.length) return;
      const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
      $("#gRate").textContent = r.rating ? `${(+r.rating).toFixed(1).replace(".", ",")} ★` : "Google Maps";
      $("#gCount").textContent = `${r.count} відгуків`;
      $("#revs").innerHTML = r.reviews.slice(0, 6).map((v) => `<article class="rev is-in"><div class="rev__head">${v.photo ? `<img class="rev__ava" src="${esc(v.photo)}" alt="" referrerpolicy="no-referrer">` : ""}<div><b>${esc(v.author)}</b><br><small>${esc(v.when)}</small></div></div><span class="rev__stars">${"★".repeat(v.rating || 0)}</span><p>${esc(v.text)}</p></article>`).join("");
      $("#revNote").remove();
    } catch {}
  }
  loadReviews();

  /* ---------- confetti (червоні й білі «конуси») ---------- */
  const cv = $(".fx"), cx = cv.getContext("2d"); let P = [], raf = 0;
  function burst(rect, n = 100) {
    if (reduced) return;
    cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const x = rect.left + rect.width / 2, y = rect.top + Math.min(rect.height / 2, 160);
    const cols = ["#e30613", "#1d1b1f", "#ffcf2e", "#ffffff", "#e30613"];
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 9;
      P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, s: 6 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[i % cols.length], t: 0, tri: i % 3 === 0 }); }
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function frame() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    P = P.filter((p) => p.t < 150);
    P.forEach((p) => {
      p.t++; p.vy += .25; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.globalAlpha = 1 - p.t / 150; cx.fillStyle = p.c;
      if (p.c === "#ffffff") { cx.strokeStyle = "#e4ddd2"; }
      if (p.tri) { cx.beginPath(); cx.moveTo(0, -p.s / 2); cx.lineTo(p.s / 2, p.s / 2); cx.lineTo(-p.s / 2, p.s / 2); cx.fill(); }
      else cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      cx.restore();
    });
    raf = P.length ? requestAnimationFrame(frame) : (cx.clearRect(0, 0, innerWidth, innerHeight), 0);
  }

  onScroll();
})();
