/* ══════════════════════════════════════════════════════════
   CAR — a small car drives right around the globe on a tilted
   orbit, kicking up a trail of dust behind it.

   Self-contained and additive: it patches WebGLRenderer.render
   so it can reach the atlas's scene without touching the main
   script, finds the globe by looking for the highest-resolution
   sphere in it, and parents itself to that sphere so it turns
   with the world. If the assets fail to load, nothing happens.

   assets/car.bin  — quantised geometry (see parse() for layout)
   assets/car.jpg  — base colour map
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (typeof THREE === 'undefined' || !THREE.WebGLRenderer) return;

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOBILE  = innerWidth < 720;

  var SIZE   = 0.13;                 // car height, as a fraction of globe radius
  var LIFT   = 1.013;                // orbit radius, as a fraction of globe radius
  var TILT   = 0.42;                 // orbit inclination, radians
  var SPEED  = REDUCED ? 0 : 0.20;   // rad/s — one lap ≈ 31s
  var PUFFS  = REDUCED ? 0 : (MOBILE ? 10 : 16);
  var EMIT   = 0.06;                 // seconds between puffs
  var LIFE   = 1.9;                  // puff lifetime, seconds

  var scene = null, started = false, car = null, last = 0;

  /* ---------- finding the scene ----------
     the atlas keeps its scene inside a closure, so borrow it from the one
     call three makes on every frame: renderer.render() → scene.updateMatrixWorld().
     The hook removes itself the moment it has what it needs. */
  var origUpdate = THREE.Object3D.prototype.updateMatrixWorld;
  THREE.Object3D.prototype.updateMatrixWorld = function (force) {
    if (!started && this.isScene) {
      started = true;
      scene = this;
      THREE.Object3D.prototype.updateMatrixWorld = origUpdate;
      load();
    }
    return origUpdate.call(this, force);
  };

  (function frame() {
    requestAnimationFrame(frame);
    if (car) step();
  })();

  /* ---------- find the globe ---------- */
  /* the globe is the sphere built with by far the most segments —
     the place markers are low-poly spheres, so they never win */
  function findGlobe() {
    var best = null, bestScore = -1;
    scene.traverse(function (o) {
      if (!o.isMesh || !o.geometry || !o.geometry.parameters) return;
      if (o.geometry.type.indexOf('Sphere') !== 0) return;
      var p = o.geometry.parameters;
      var score = (p.widthSegments || 0) * (p.heightSegments || 0);
      if (score > bestScore) { bestScore = score; best = o; }
    });
    return (best && bestScore >= 400) ? best : null;
  }

  /* ---------- geometry blob ---------- */
  /* CARM | u32 vertCount | u32 indexCount | f32 min[3] | f32 size[3]
     u16 pos[v*3] · i8 nrm[v*3] · u16 uv[v*2] · u16 idx[i]   (4-byte aligned) */
  function parse(buf) {
    var dv = new DataView(buf);
    if (dv.getUint8(0) !== 67 || dv.getUint8(1) !== 65 ||
        dv.getUint8(2) !== 82 || dv.getUint8(3) !== 77) return null;

    var vc = dv.getUint32(4, true), ic = dv.getUint32(8, true);
    var mn = [dv.getFloat32(12, true), dv.getFloat32(16, true), dv.getFloat32(20, true)];
    var sz = [dv.getFloat32(24, true), dv.getFloat32(28, true), dv.getFloat32(32, true)];
    var pad = function (n) { return (n + 3) & ~3; };

    var o  = 36;
    var pq = new Uint16Array(buf, o, vc * 3); o = pad(o + vc * 6);
    var nq = new Int8Array  (buf, o, vc * 3); o = pad(o + vc * 3);
    var uq = new Uint16Array(buf, o, vc * 2); o = pad(o + vc * 4);
    var iq = new Uint16Array(buf, o, ic);

    var pos = new Float32Array(vc * 3), nrm = new Float32Array(vc * 3),
        uv  = new Float32Array(vc * 2);
    for (var i = 0; i < vc; i++) {
      for (var c = 0; c < 3; c++) {
        pos[i * 3 + c] = mn[c] + (pq[i * 3 + c] / 65535) * sz[c];
        nrm[i * 3 + c] = nq[i * 3 + c] / 127;
      }
      uv[i * 2]     = uq[i * 2]     / 65535;
      uv[i * 2 + 1] = uq[i * 2 + 1] / 65535;
    }

    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal',   new THREE.BufferAttribute(nrm, 3));
    g.setAttribute('uv',       new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(iq), 1));
    return g;
  }

  /* ---------- soft dust sprite ---------- */
  function puffTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    var r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0,   'rgba(255,255,255,.9)');
    r.addColorStop(.45, 'rgba(255,255,255,.36)');
    r.addColorStop(1,   'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  /* ---------- load ---------- */
  function load() {
    var geo = null, map = null, want = 2;
    var done = function () { if (--want === 0 && geo) build(geo, map); };

    fetch('assets/car.bin')
      .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
      .then(function (b) { if (b) geo = parse(b); done(); })
      .catch(done);

    map = new THREE.TextureLoader().load('assets/car.jpg', done, undefined, done);
    if ('sRGBEncoding' in THREE) map.encoding = THREE.sRGBEncoding;
    map.flipY = false;   // glTF-style UVs
  }

  /* ---------- build ---------- */
  function build(geo, map) {
    var globe = findGlobe();
    if (!globe) return;

    var R = (globe.geometry.parameters.radius || 1);
    var host = globe;                       // ride along with the globe's spin

    /* only shade the car if the atlas actually lights its scene —
       otherwise a lit material would come out black */
    var lit = false;
    scene.traverse(function (o) { if (o.isLight) lit = true; });
    var mat = lit ? new THREE.MeshLambertMaterial({ map: map })
                  : new THREE.MeshBasicMaterial({ map: map });
    var g = new THREE.Group();
    var mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(R * SIZE);
    g.add(mesh);
    host.add(g);

    var ptex = PUFFS ? puffTexture() : null;
    var puffs = [];
    for (var k = 0; k < PUFFS; k++) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: ptex, color: 0x9c8a6a, transparent: true,   /* dust, dark enough to read */
        opacity: 0, depthWrite: false, fog: false
      }));
      s.visible = false;
      host.add(s);
      puffs.push({ s: s, t: 0, v: new THREE.Vector3() });
    }

    /* orbit plane: a great circle tilted off the equator */
    var u = new THREE.Vector3(Math.cos(TILT), Math.sin(TILT), 0).normalize();
    var v = new THREE.Vector3(0, 0, 1);

    car = { g: g, R: R, r: R * LIFT, u: u, v: v, a: 0,
            puffs: puffs, next: 0, n: 0, scale: R * SIZE };
  }

  /* ---------- per frame ---------- */
  var P = new THREE.Vector3(), V = new THREE.Vector3(),
      UP = new THREE.Vector3(), RGT = new THREE.Vector3(),
      TMP = new THREE.Vector3(), M = new THREE.Matrix4();

  function step() {
    var now = performance.now() / 1000;
    var dt  = last ? Math.min(0.05, now - last) : 0.016;
    last = now;

    var c = car;
    c.a += SPEED * dt;
    var sa = Math.sin(c.a), ca = Math.cos(c.a);

    /* position on the tilted great circle, and its tangent */
    P.copy(c.u).multiplyScalar(ca * c.r).addScaledVector(c.v, sa * c.r);
    V.copy(c.u).multiplyScalar(-sa).addScaledVector(c.v, ca).normalize();

    c.g.position.copy(P);
    UP.copy(P).normalize();
    RGT.crossVectors(UP, V);
    M.makeBasis(RGT, UP, V);
    c.g.quaternion.setFromRotationMatrix(M);

    if (!c.puffs.length) return;

    c.next -= dt;
    if (c.next <= 0) {
      c.next = EMIT;
      var p = c.puffs[c.n % c.puffs.length]; c.n++;
      p.t = LIFE;
      p.s.visible = true;
      /* just behind the tailpipe, a hair above the surface */
      TMP.copy(P).addScaledVector(V, -c.scale * 0.62).addScaledVector(UP, c.scale * 0.18);
      p.s.position.copy(TMP);
      p.v.copy(V).multiplyScalar(-c.scale * 0.7)
        .addScaledVector(UP, c.scale * (0.55 + Math.random() * 0.4))
        .addScaledVector(RGT, c.scale * (Math.random() - 0.5) * 0.8);
    }

    for (var k = 0; k < c.puffs.length; k++) {
      var q = c.puffs[k];
      if (q.t <= 0) continue;
      q.t -= dt;
      if (q.t <= 0) { q.s.visible = false; q.s.material.opacity = 0; continue; }

      q.s.position.addScaledVector(q.v, dt);
      q.v.multiplyScalar(0.968);

      var t = 1 - q.t / LIFE;
      var sc = c.scale * (0.45 + t * 1.6);
      q.s.scale.set(sc, sc, 1);
      q.s.material.opacity = 0.4 * (1 - t) * Math.min(1, t * 6);
    }
  }
})();
