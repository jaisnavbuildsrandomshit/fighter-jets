/* Fighter Jets: custom presentation engine.
   Fixed 1920x1080 stage, letterboxed like a projector.
   Transitions are a tracking shot: the camera whip-pans in the direction the next jet is flying.
   The background streaks with motion blur and settles into the sharp photo, while the jet itself
   (cut out of its own photo) stays sharp and eases into exactly where it sits in the shot. */
(() => {
  const SW = 1920, SH = 1080, PAN = 430, OVER = 1.48;
  const SCENES = window.SCENES;
  const stage = document.getElementById("stage");
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const vec = deg => [Math.sin(deg * Math.PI / 180), -Math.cos(deg * Math.PI / 180)];

  function fit() {
    const k = Math.min(innerWidth / SW, innerHeight / SH);
    stage.style.transform = `translate(${(innerWidth - SW * k) / 2}px, ${(innerHeight - SH * k) / 2}px) scale(${k})`;
  }
  addEventListener("resize", fit); fit();

  function frame(iw, ih, s) {
    const k = Math.max(SW / iw, SH / ih) * (s.over || 1) * 1.03;
    const pw = iw * k, ph = ih * k;
    return { pw, ph, l: -(pw - SW) * (s.fx ?? .5), t: -(ph - SH) * (s.fy ?? .5) };
  }
  function mapper(s, iw, ih) {
    const f = frame(iw, ih, s);
    const kd = Math.max(960 / iw, 540 / ih) * (s.over || 1) * 1.03, dw = iw * kd, dh = ih * kd;
    const dl = -(dw - 960) * (s.fx ?? .5), dt = -(dh - 540) * (s.fy ?? .5);
    return { f, pt: (x, y) => [f.l + (x - dl) / dw * f.pw, f.t + (y - dt) / dh * f.ph], frac: (u, v) => [f.l + u * f.pw, f.t + v * f.ph] };
  }

  /* ---------- build ---------- */
  const els = SCENES.map((s, i) => {
    const sec = document.createElement("section"); sec.className = "scene";
    sec.innerHTML = `
      <div class="cam">
        <div class="bgl">
          <img class="photo" src="${s.photo}" alt="${s.model || ""}">
          ${s.video ? `<video class="vid" src="${s.video}" muted playsinline preload="metadata"></video>` : ""}
          ${s.streak ? `<img class="streak" src="${s.streak}" alt="">` : ""}
          <div class="shade" style="background:${s.shade || "none"}"></div>
        </div>
        ${s.cut ? `<div class="jet"><div class="flames"></div><img src="${s.cut.src}" alt=""></div>` : ""}
        <svg class="calls" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}"></svg>
        <div class="labs"></div>
      </div>
      <div class="text"></div>`;
    document.getElementById("shaker").appendChild(sec);
    const t = $(".text", sec);
    let html = "";
    if (s.model) html += `<div class="kicker"><span class="tag">${String(i).padStart(2, "0")}</span><span class="mdl">${s.model}</span><span class="rule"></span><span class="mk">${s.maker}</span></div>`;
    const [lines, pos] = s.head; const hs = s.headSize ? `font-size:${s.headSize}px;` : "";
    const block = l => `<span class="ln"><span>${l}</span></span>`;
    if (pos === "split") html += `<div class="head" style="${hs}top:120px">${block(lines[0])}</div><div class="head" style="${hs}bottom:150px">${block(lines[1])}</div>`;
    else html += `<div class="head" style="${hs}${pos === "top" ? "top:120px" : "bottom:150px"}">${lines.map(block).join("")}</div>`;
    if (s.sub) html += `<div class="sub">${s.sub}</div>`;
    if (s.specs) html += `<div class="specs${s.specsLeft ? " left" : ""}${s.specsTop ? " top" : ""}">${s.specs.map(p => `<div class="spec"><small>${p[0]}</small><b data-v="${p[1]}">${p[1]}</b></div>`).join("")}</div>`;
    if (s.timeline) html += `<div class="tl"><div class="axis"></div>${s.timeline.map((n, k) =>
      `<div class="node" style="left:${k * 22}%"><div class="yr${k === 0 || k === s.timeline.length - 1 ? " hot" : ""}">${n[0]}</div><div class="dot"></div><div class="nm">${n[1]}</div><div class="ds">${n[2]}</div></div>`).join("")}</div>`;
    if (s.end) html += `<button class="btn" id="again">↻ FLY AGAIN</button>`;
    html += `<div class="credit">${s.credit}</div>`;
    t.innerHTML = html;
    return sec;
  });

  function layout(i) {
    const s = SCENES[i], sec = els[i], photo = $(".photo", sec);
    const iw = photo.naturalWidth, ih = photo.naturalHeight; if (!iw) return false;
    const m = mapper(s, iw, ih);
    const box = { width: m.f.pw + "px", height: m.f.ph + "px", left: m.f.l + "px", top: m.f.t + "px" };
    Object.assign(photo.style, box);
    const vid = $(".vid", sec); if (vid) Object.assign(vid.style, box);
    if (s.streak) Object.assign($(".streak", sec).style, box);
    if (s.cut) {
      const [x0, y0] = m.frac(s.cut.x, s.cut.y), [x1, y1] = m.frac(s.cut.x + s.cut.w, s.cut.y + s.cut.h);
      const jet = $(".jet", sec); Object.assign(jet.style, { left: x0 + "px", top: y0 + "px", width: (x1 - x0) + "px", height: (y1 - y0) + "px" });
      const fl = $(".flames", jet); fl.innerHTML = "";
      const nz = (x1 - x0) * (s.cut.nozzle || .05);
      (s.cut.nozzles || []).forEach(([u, v]) => {
        const f = document.createElement("div"); f.className = "flame";
        Object.assign(f.style, { left: (u * 100) + "%", top: (v * 100) + "%", width: nz + "px", height: (nz * 4.2) + "px", transform: `translate(-50%, 0) rotate(${s.heading}deg)` });
        f.innerHTML = `<i class="glow"></i><i class="cone"></i><i class="core"></i><i class="dia"></i>`;
        fl.appendChild(f);
      });
    }
    const svg = $("svg.calls", sec), labs = $(".labs", sec);
    svg.innerHTML = ""; labs.innerHTML = "";
    (s.calls || []).forEach((c, k) => {
      const [px, py] = m.pt(c[0], c[1]); let [lx, ly] = m.pt(c[2], c[3]);
      lx = Math.max(60, Math.min(SW - 60, lx)); ly = Math.max(150, Math.min(SH - 150, ly));
      // keep labels on screen: flip side if the label would run off an edge
      const estW = 60 + Math.max(17.5 * c[4].length, 12.4 * c[5].length);
      let dir = c[6] ? -1 : 1;
      if (dir > 0 && lx + estW > SW - 40) dir = -1;
      if (dir < 0 && lx - estW < 40) dir = 1;
      const run = Math.max(330, estW), ex = lx + dir * run, b = 22, g = 9;
      const br = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) =>
        `M${px + sx * b} ${py + sy * (b - g)} L${px + sx * b} ${py + sy * b} L${px + sx * (b - g)} ${py + sy * b}`).join(" ");
      svg.insertAdjacentHTML("beforeend", `<g class="co">
        <circle class="pulse" cx="${px}" cy="${py}" r="10"/><path class="ret" d="${br}"/><circle class="dot" cx="${px}" cy="${py}" r="5"/>
        <polyline class="ld" points="${px},${py} ${lx},${ly} ${ex},${ly}"/><line class="tick" x1="${ex}" y1="${ly - 9}" x2="${ex}" y2="${ly + 9}"/></g>`);
      const lab = document.createElement("div"); lab.className = "lab" + (dir < 0 ? " r" : "");
      lab.innerHTML = `<div class="plate"><b><em>${String(k + 1).padStart(2, "0")}</em><span class="ty" data-t="${c[4]}"></span></b><span class="ty d" data-t="${c[5]}"></span><i class="scan"></i></div>`;
      lab.style.top = (ly - 96) + "px"; lab.style.left = lx + "px";
      labs.appendChild(lab);
    });
    return true;
  }

  /* ---------- text + callouts ---------- */
  function enterText(i) {
    const sec = els[i], tl = gsap.timeline();
    gsap.set($(".text", sec), { opacity: 1 }); gsap.set($$(".labs, svg.calls", sec), { opacity: 1 });
    tl.fromTo($$(".head .ln > span", sec), { yPercent: 115 }, { yPercent: 0, duration: 1.0, ease: "expo.out", stagger: .1 }, 0);
    tl.fromTo($$(".kicker .rule", sec), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: "expo.out" }, .05);
    tl.fromTo($$(".kicker .tag, .kicker .mdl, .kicker .mk, .sub", sec), { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: .6, stagger: .07 }, .1);
    $$("svg.calls g.co", sec).forEach((g, k) => {
      const at = .45 + k * .4, dot = $(".dot", g), cx = dot.cx.baseVal.value, cy = dot.cy.baseVal.value;
      const pl = $(".ld", g), pts = [...pl.points]; let len = 0;
      for (let j = 1; j < pts.length; j++) len += Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y);
      tl.set(g, { opacity: 1 }, at);
      tl.fromTo($(".ret", g), { opacity: 0, scale: 3, rotation: 90, svgOrigin: `${cx} ${cy}` }, { opacity: 1, scale: 1, rotation: 0, svgOrigin: `${cx} ${cy}`, duration: .5, ease: "power4.out" }, at);
      tl.to($(".ret", g), { keyframes: [{ opacity: .15 }, { opacity: 1 }, { opacity: .15 }, { opacity: 1 }], duration: .28 }, at + .5);
      tl.fromTo([dot, $(".pulse", g)], { opacity: 0 }, { opacity: 1, duration: .1 }, at + .25);
      tl.fromTo(pl, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: .5, ease: "power2.inOut" }, at + .35);
      tl.fromTo($(".tick", g), { opacity: 0 }, { opacity: 1, duration: .1 }, at + .82);
      const lab = $$(".lab", sec)[k]; if (!lab) return;
      tl.fromTo(lab, { opacity: 0, clipPath: "inset(0 100% 0 0)" }, { opacity: 1, clipPath: "inset(0 0% 0 0)", duration: .35, ease: "power2.out" }, at + .7);
      tl.fromTo($(".scan", lab), { xPercent: -100, opacity: 1 }, { xPercent: 420, opacity: 0, duration: .6, ease: "power1.in" }, at + .75);
      $$(".ty", lab).forEach((el, j) => {
        const full = el.dataset.t, o = { n: 0 }; el.textContent = "";
        tl.to(o, { n: full.length, duration: Math.min(.8, .028 * full.length), ease: "none",
          onUpdate: () => { const c = Math.round(o.n); el.textContent = full.slice(0, c) + (c < full.length ? "▌" : ""); } }, at + .78 + j * .2);
      });
    });
    tl.fromTo($$(".spec", sec), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .6, stagger: .1 }, .9);
    $$(".spec b", sec).forEach((b, k) => {
      const v = b.dataset.v, m = v.match(/^(\d[\d,]*)(.*)$/); if (!m) return;
      const target = +m[1].replace(/,/g, ""), o = { n: target > 1900 ? target - 60 : 0 };
      tl.to(o, { n: target, duration: 1.1, ease: "power2.out", onUpdate: () => { b.textContent = Math.round(o.n) + m[2]; } }, .95 + k * .1);
    });
    tl.fromTo($$(".tl .axis", sec), { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "expo.out" }, .2);
    tl.fromTo($$(".tl .node", sec), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .6, stagger: .15 }, .4);
    tl.fromTo($$(".credit, .btn", sec), { opacity: 0 }, { opacity: 1, duration: .8 }, 1.2);
    return tl;
  }
  function resetText(sec) {
    gsap.set($(".text", sec), { opacity: 1 });
    gsap.set($$(".head .ln > span", sec), { yPercent: 115 });
    gsap.set($$(".lab, .spec, .credit, .btn, .tl .node, .kicker .tag, .kicker .mdl, .kicker .mk, .sub", sec), { opacity: 0 });
    gsap.set($$(".kicker .rule, .tl .axis", sec), { scaleX: 0 });
    gsap.set($$("svg.calls g.co", sec), { opacity: 0 });
  }

  /* ---------- the tracking-shot transition ---------- */
  let cur = 0, busy = false, ambient = null, paused = false, timer = null;
  function startAmbient(i) {
    if (ambient) ambient.kill();
    ambient = gsap.to($(".cam", els[i]), { scale: 1.05, xPercent: i % 2 ? -1 : 1, yPercent: -.5, duration: 22, ease: "none" });
  }
  function shake(tl, at, amp, dur) {
    const n = Math.round(dur / .045), kf = [];
    for (let k = 0; k < n; k++) { const d = amp * (1 - k / n); kf.push({ x: (Math.random() - .5) * 2 * d, y: (Math.random() - .5) * 2 * d, rotation: (Math.random() - .5) * d * .04 }); }
    kf.push({ x: 0, y: 0, rotation: 0 });
    tl.to("#shaker", { keyframes: kf, duration: dur, ease: "none" }, at);
  }
  // distance that puts two full frames edge to edge along a direction (so a pan never shows a gap)
  const span = (vx, vy) => Math.abs(vx) * SW + Math.abs(vy) * SH;
  // the new shot: background streaks in along the jet's heading and settles; the jet stays locked
  function arrive(n, tl, at, T = 1.7, ease = "expo.out") {
    if (SCENES[n].video) return arriveVideo(n, tl, at, T);
    const s = SCENES[n], sec = els[n], cam = $(".cam", sec), bgl = $(".bgl", sec);
    const photo = $(".photo", sec), streak = $(".streak", sec), [vx, vy] = vec(s.heading ?? 90), D = span(vx, vy);
    gsap.set(cam, { scale: 1, xPercent: 0, yPercent: 0, x: 0, y: 0, rotation: 0 });
    gsap.set(sec, { opacity: 1 });
    if (s.cut && s.cut.zoom) {   // head-on: the jet comes straight at the camera
      gsap.set(bgl, { x: 0, y: 0, scale: 1.35 });
      tl.to(bgl, { scale: 1, duration: T, ease: "expo.out" }, at);
    } else {
      gsap.set(bgl, { x: vx * D, y: vy * D, scale: 1 });
      tl.to(bgl, { x: 0, y: 0, duration: T, ease }, at);
    }
    gsap.set(photo, { opacity: 1 });
    if (streak) { gsap.set(streak, { opacity: 1 }); tl.to(streak, { opacity: 0, duration: .7, ease: "power1.in" }, at + T * .5); }
    if (s.cut) {
      const jet = $(".jet", sec), fl = $(".flames", jet);
      gsap.set(fl, { opacity: 1 });
      if (s.cut.zoom) {
        gsap.set(jet, { opacity: 0, x: 0, y: 30, scale: .06, rotation: 0 });
        tl.to(jet, { opacity: 1, duration: .2 }, at);
        tl.to(jet, { scale: 1, y: 0, duration: T + .2, ease: "power2.out" }, at);
      } else {
        // the camera ship holds the jet in frame: it drifts in a little, banks and settles
        gsap.set(jet, { opacity: 1, x: vx * 340, y: vy * 340, scale: .9, rotation: -3 });
        tl.to(jet, { x: 0, y: 0, scale: 1, rotation: 0, duration: T + .25, ease: "power3.out" }, at);
      }
      tl.to(fl, { opacity: s.cut.keepBurner ? .5 : 0, duration: .8 }, at + T - .2);
      tl.to(jet, { opacity: 0, duration: .4, ease: "none" }, at + T + .45);   // the photo holds the same jet underneath
    }
    shake(tl, at + .05, 9, 1.1);
    return T + .25;
  }
  /* ---------- edit-style footage: flash cut, zoom punch, RGB split, letterbox, speed ramp, freeze ---------- */
  // pre-load the start of the next clip while the current scene is on screen
  function prime(n) { const s = SCENES[n], v = s && s.video && $(".vid", els[n]); if (v && v.paused) { v.preload = "auto"; v.currentTime = s.vStart; } }
  function flash(tl, at, k = .9) { tl.fromTo("#flash", { opacity: k }, { opacity: 0, duration: .35, ease: "power2.out" }, at); }
  function rgb(tl, el, at, dur) {
    tl.fromTo(el, { filter: "contrast(1.08) saturate(1.1) drop-shadow(16px 0 0 rgba(255,0,60,.55)) drop-shadow(-16px 0 0 rgba(0,200,255,.55))" },
      { filter: "contrast(1.08) saturate(1.1) drop-shadow(0px 0 0 rgba(255,0,60,0)) drop-shadow(0px 0 0 rgba(0,200,255,0))", duration: dur, ease: "power2.out" }, at);
  }
  function letterbox(tl, at, on) { tl.to(["#lbt", "#lbb"], { height: on ? 118 : 0, duration: on ? .22 : .6, ease: on ? "power4.out" : "power3.inOut" }, at); }
  function arriveVideo(n, tl, at, T) {
    const s = SCENES[n], sec = els[n], v = $(".vid", sec), bgl = $(".bgl", sec), cam = $(".cam", sec);
    gsap.set(cam, { scale: 1, x: 0, y: 0, xPercent: 0, yPercent: 0, rotation: 0 });
    gsap.set(sec, { opacity: 0 }); gsap.set($(".photo", sec), { opacity: 0 }); gsap.set(v, { opacity: 1 });
    const cut = at + .12;   // hard cut on the flash, before the old shot has left
    tl.add(() => { v.currentTime = s.vStart; v.playbackRate = s.rate || 1.5; v.play().catch(() => {}); watch(n); }, cut - .08);
    tl.set(sec, { opacity: 1 }, cut);
    flash(tl, cut);
    tl.fromTo(bgl, { scale: 1.4, x: 0, y: 0 }, { scale: 1.05, duration: .7, ease: "expo.out" }, cut);
    rgb(tl, v, cut, .4);
    letterbox(tl, cut, true);
    shake(tl, cut, 16, .55);
    return T;
  }
  // speed ramp: footage runs fast, then eases into slow motion and slams to a freeze
  function watch(n) {
    const s = SCENES[n], v = $(".vid", els[n]), tok = {}; v._tok = tok;
    const tick = () => {
      if (v._tok !== tok) return;
      const left = s.vFreeze - v.currentTime;
      if (left <= (s.slow || 1.0)) v.playbackRate = Math.max(.22, .22 + left * .7);
      if (left <= 0 || v.ended) { v.pause(); freezeHit(n); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function freezeHit(n) {
    const sec = els[n], bgl = $(".bgl", sec), v = $(".vid", sec), tl = gsap.timeline();
    flash(tl, 0, .55);
    tl.fromTo(bgl, { scale: 1.12 }, { scale: 1, duration: .55, ease: "power4.out" }, 0);
    tl.fromTo(v, { filter: "contrast(1.35) saturate(0) brightness(1.35)" }, { filter: "contrast(1.08) saturate(1.1) brightness(1)", duration: .7, ease: "power2.out" }, 0);
    letterbox(tl, .3, false);
    shake(tl, 0, 11, .35);
    tl.add(() => enterText(n), .45);
  }

  // the old shot: camera whips away toward the next jet, background smears
  function depart(i, nextHeading, tl, at, T, ease, zoom) {
    const s = SCENES[i], sec = els[i], [vx, vy] = vec(nextHeading ?? 90), D = span(vx, vy);
    const vid = $(".vid", sec); if (vid) { vid._tok = null; tl.add(() => vid.pause(), at + T); }
    tl.to($(".text", sec), { opacity: 0, duration: .25 }, 0);
    tl.to($$(".labs, svg.calls", sec), { opacity: 0, duration: .2 }, 0);
    const streak = $(".streak", sec);
    if (streak) tl.to(streak, { opacity: 1, duration: .35, ease: "power1.in" }, at);
    if (s.cut) tl.set($(".jet", sec), { opacity: 0 }, 0);
    if (zoom) tl.to($(".cam", sec), { scale: 1.6, opacity: 0, duration: T * .6, ease: "power2.in" }, at);
    else tl.to($(".cam", sec), { x: -vx * D, y: -vy * D, duration: T, ease }, at);
  }

  /* ---------- sound: synthesized jet flyby (no audio files) ---------- */
  const Audio = (() => {
    let ctx = null, master = null, noiseBuf = null, muted = false;
    function init() {
      if (ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = .9;
      const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); let b = 0;
      for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = (b + .02 * w) / 1.02; d[i] = b * 3.5 + w * .15; }   // brown-ish noise
      // distant wind bed
      const wind = noise(true), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      lp.type = "lowpass"; lp.frequency.value = 380; g.gain.value = .05;
      wind.connect(lp).connect(g).connect(master); wind.start();
    }
    function noise(loop) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = !!loop; return s; }
    // a jet passing the camera: roar swells and its pitch drops (doppler), panning across
    function flyby(vx, T = 1.6, power = 1) {
      if (!ctx || muted) return; const t0 = ctx.currentTime + .02, dur = T + 1.4;
      const src = noise(true), bp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), pan = ctx.createStereoPanner();
      bp.type = "bandpass"; bp.Q.value = .7; lp.type = "lowpass";
      bp.frequency.setValueAtTime(380, t0); bp.frequency.exponentialRampToValueAtTime(1500, t0 + T * .55); bp.frequency.exponentialRampToValueAtTime(260, t0 + dur);
      lp.frequency.setValueAtTime(1400, t0); lp.frequency.exponentialRampToValueAtTime(5200, t0 + T * .55); lp.frequency.exponentialRampToValueAtTime(700, t0 + dur);
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.95 * power, t0 + T * .55); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      pan.pan.setValueAtTime(-.9 * Math.sign(vx || 1), t0); pan.pan.linearRampToValueAtTime(.9 * Math.sign(vx || 1), t0 + dur);
      src.connect(bp).connect(lp).connect(g).connect(pan).connect(master); src.start(t0); src.stop(t0 + dur + .1);
      // turbine whine with a doppler drop
      const o = ctx.createOscillator(), og = ctx.createGain(), of = ctx.createBiquadFilter();
      o.type = "sawtooth"; of.type = "bandpass"; of.frequency.value = 1800; of.Q.value = 3;
      o.frequency.setValueAtTime(1250, t0); o.frequency.exponentialRampToValueAtTime(1050, t0 + T * .5); o.frequency.exponentialRampToValueAtTime(640, t0 + dur);
      og.gain.setValueAtTime(.0001, t0); og.gain.exponentialRampToValueAtTime(.07 * power, t0 + T * .5); og.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      o.connect(of).connect(og).connect(pan); o.start(t0); o.stop(t0 + dur + .1);
      // low rumble you feel more than hear
      const r = noise(true), rl = ctx.createBiquadFilter(), rg = ctx.createGain();
      rl.type = "lowpass"; rl.frequency.value = 110;
      rg.gain.setValueAtTime(.0001, t0); rg.gain.exponentialRampToValueAtTime(1.3 * power, t0 + T * .6); rg.gain.exponentialRampToValueAtTime(.0001, t0 + dur + .4);
      r.connect(rl).connect(rg).connect(master); r.start(t0); r.stop(t0 + dur + .5);
    }
    return { init, flyby, toggle() { muted = !muted; if (master) master.gain.value = muted ? 0 : .9; return muted; } };
  })();

  /* ---------- foreground clouds + lens fringing during the pan ---------- */
  function fx(n, tl, at, T) {
    const s = SCENES[n], [vx, vy] = vec(s.heading ?? 90), zoom = !!(s.cut && s.cut.zoom);
    Audio.flyby(vx, T, s.cut ? 1 : .6);
    $$("#fx img").forEach((c, k) => {
      const off = k ? .35 : -.25, D = span(vx, vy) * 1.5;
      if (zoom) {
        gsap.set(c, { x: SW / 2 - 700 + k * 300, y: SH / 2 - 300 - k * 120, scale: .4, opacity: 0, rotation: 0 });
        tl.to(c, { scale: 3.2, opacity: .85, duration: T * .55, ease: "power2.in" }, at + k * .1)
          .to(c, { opacity: 0, duration: .3 }, at + k * .1 + T * .55);
      } else {
        const px = SW / 2 - 700 + -vy * off * SH, py = SH / 2 - 260 + vx * off * SH;
        gsap.set(c, { x: px + vx * D, y: py + vy * D, scale: 2.4, opacity: 0, rotation: Math.atan2(vy, vx) * 57.3 * .15 });
        tl.to(c, { x: px - vx * D, y: py - vy * D, duration: T * .9, ease: "none" }, at + k * .08)
          .to(c, { keyframes: [{ opacity: .0 }, { opacity: .8 }, { opacity: .8 }, { opacity: 0 }], duration: T * .9, ease: "none" }, at + k * .08);
      }
    });
    if (s.cut) {   // chromatic fringing on the jet while it's moving fast, gone once it settles
      const img = $(".jet img", els[n]);
      tl.fromTo(img, { filter: "contrast(1.08) saturate(1.1) drop-shadow(7px 0 0 rgba(255,40,40,.45)) drop-shadow(-7px 0 0 rgba(40,170,255,.45))" },
        { filter: "contrast(1.08) saturate(1.1) drop-shadow(0px 0 0 rgba(255,40,40,0)) drop-shadow(0px 0 0 rgba(40,170,255,0))", duration: T * .9, ease: "power2.in" }, at);
    }
  }

  // a blurred wash of the incoming sky sits behind the pan, so a diagonal whip never shows black corners
  function backdrop(n) {
    const b = document.getElementById("backdrop"), s = SCENES[n];
    b.src = s.streak || s.photo;
  }

  function go(n) {
    if (busy || n === cur || n < 0 || n >= SCENES.length) return;
    busy = true; if (timer) timer.kill(); if (ambient) ambient.kill();
    const from = els[cur], to = els[n], s = SCENES[n];
    layout(n); resetText(to);
    const tl = gsap.timeline({ onComplete: () => {
      from.classList.remove("on"); gsap.set(from, { clearProps: "zIndex,opacity" });
      gsap.set($(".cam", from), { clearProps: "all" }); gsap.set($(".bgl", from), { clearProps: "transform" });
      gsap.set($(".bgl", to), { "--f": "0%" }); gsap.set($(".bgl", from), { "--f": "0%" });
      if ($(".streak", from)) gsap.set($(".streak", from), { opacity: 0 });
      cur = n; busy = false; hud(); startAmbient(n); restartTimer(); prime(n + 1);
    } });
    gsap.set($(".cam", from), { scale: 1, xPercent: 0, yPercent: 0 });
    const T = 1.6, ease = "power3.inOut", at = .2, zoom = !!(s.cut && s.cut.zoom);
    backdrop(n);
    // soften both frames' edges during the whip so they melt into the sky wash
    tl.fromTo($(".bgl", from), { "--f": "0%" }, { "--f": "22%", duration: .45, ease: "power1.out" }, at);
    tl.fromTo($(".bgl", to), { "--f": "22%" }, { "--f": "0%", duration: .7, ease: "power2.in" }, at + T * .55);
    depart(cur, s.heading, tl, at, T, ease, zoom);
    to.classList.add("on"); gsap.set(to, { zIndex: 3 }); gsap.set(from, { zIndex: 2 });
    const landed = arrive(n, tl, at, T, ease);
    fx(n, tl, at, T);
    if (!s.video) { tl.add(() => enterText(n), at + landed + .2); flash(tl, at + T * .5, .5); }
  }

  /* ---------- HUD / timer / keys ---------- */
  const bar = document.getElementById("bar");
  function restartTimer() {
    if (timer) timer.kill();
    if (paused || SCENES[cur].end) { gsap.set(bar, { scaleX: 0 }); return; }
    timer = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: SCENES[cur].hold || 20, ease: "none", onComplete: () => go(cur + 1) });
  }
  function hud() {
    document.getElementById("count").textContent = String(cur + 1).padStart(2, "0") + " / " + String(SCENES.length).padStart(2, "0");
    document.getElementById("notes").textContent = SCENES[cur].notes || "";
  }
  let started = false;
  addEventListener("keydown", e => {
    if (!started) { e.preventDefault(); begin(); return; }
    if (/^[mM]$/.test(e.key)) { Audio.toggle(); return; }
    if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); go(cur + 1); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(cur - 1); }
    else if (/^[pP]$/.test(e.key)) { paused = !paused; if (paused && timer) timer.pause(); else restartTimer(); }
    else if (/^[fF]$/.test(e.key)) { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    else if (/^[nN]$/.test(e.key)) document.getElementById("notes").classList.toggle("show");
    else if (e.key === "Home") go(0);
  });
  document.addEventListener("click", e => {
    if (!started) return begin();
    if (e.target.id === "again") return go(0);
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    go(cur + 1);
  });

  /* ---------- window parallax ---------- */
  const qx = [], mv = { x: 0, y: 0 };
  els.forEach(sec => { const t = $(".text", sec), b = $(".photo", sec);
    qx.push([gsap.quickTo(b, "xPercent", { duration: 1.4, ease: "power3" }), gsap.quickTo(b, "yPercent", { duration: 1.4, ease: "power3" }), 1.0],
            [gsap.quickTo(t, "x", { duration: 1.4, ease: "power3" }), gsap.quickTo(t, "y", { duration: 1.4, ease: "power3" }), -8]); });
  const apply = () => qx.forEach(([a, b, k]) => { a(-mv.x * k); b(-mv.y * k); });
  addEventListener("pointermove", e => { mv.x = e.clientX / innerWidth - .5; mv.y = e.clientY / innerHeight - .5; apply(); });
  addEventListener("deviceorientation", e => { if (e.gamma == null) return; mv.x = Math.max(-.5, Math.min(.5, e.gamma / 40)); mv.y = Math.max(-.5, Math.min(.5, (e.beta - 45) / 60)); apply(); });

  /* ---------- start ---------- */
  const imgs = els.flatMap(sec => $$("img", sec));
  let loaded = false;
  Promise.all(imgs.map(im => im.complete ? Promise.resolve() : new Promise(r => { im.onload = im.onerror = r; }))).then(() => {
    els.forEach((_, i) => layout(i)); els.forEach(resetText);
    cur = Math.max(0, Math.min(SCENES.length - 1, parseInt(location.hash.slice(1)) || 0));
    loaded = true;
    gsap.to("#ready", { opacity: 1, duration: .8 });
    const q = new URLSearchParams(location.search);
    if (q.has("auto") || q.has("to")) begin(true);
    // test hook: ?to=N&t=T jumps to the transition into scene N, frozen at T seconds
    if (q.has("to")) {
      gsap.globalTimeline.time(gsap.globalTimeline.time() + 6);
      const c = document.getElementById("curtain"); if (c) c.remove();
      go(+q.get("to"));
      if (!q.has("final")) { gsap.globalTimeline.time(gsap.globalTimeline.time() + (+q.get("t") || 0)); gsap.globalTimeline.pause(); }
      document.title = "READY";
    }
  });
  // cold open: black, a jet rumbles in from far away, then the first shot whips in
  function begin(silent) {
    if (!loaded || started) return; started = true;
    Audio.init(); fit();
    if (!silent && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    gsap.killTweensOf("#ready"); gsap.to("#ready", { opacity: 0, duration: .3, onComplete: () => { const r = document.getElementById("ready"); if (r) r.remove(); } });
    backdrop(cur);
    const sec = els[cur]; sec.classList.add("on"); gsap.set(sec, { zIndex: 2 });
    const T = 1.6, at = 1.1, tl = gsap.timeline();
    const landed = arrive(cur, tl, at, T, "expo.out");
    fx(cur, tl, at, T);
    tl.to("#curtain", { opacity: 0, duration: .5, onComplete: () => { const c = document.getElementById("curtain"); if (c) c.remove(); } }, at);
    if (!SCENES[cur].video) tl.add(() => enterText(cur), at + landed + .2);
    tl.add(() => { hud(); startAmbient(cur); restartTimer(); prime(cur + 1); }, at + landed);
  }
  addEventListener("resize", () => els.forEach((_, i) => layout(i)));
})();
