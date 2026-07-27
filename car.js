/* ══════════════════════════════════════════════════════════
   CAR — a small car drives right around the globe on a tilted
   orbit, kicking up a trail of chunky pixel dust off its back
   tyres, with two CLICK ME signs riding above it that open the
   two live products.

   Self-contained and additive: it finds the atlas's scene and
   camera by borrowing the one call three makes on both every
   frame, finds the globe by looking for the highest-resolution
   sphere, and parents itself to that sphere so it turns with
   the world. If the assets fail to load, nothing happens.

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
  var GRIT   = REDUCED ? 0 : (MOBILE ? 10 : 16);   // dust blocks
  var EMIT   = 0.05;                 // seconds between blocks
  var LIFE   = 1.3;                  // block lifetime, seconds
  var DUST   = 0x9c8a6a;             // dust colour

  var LINKS = [
    { url: 'https://arthis.space', label: 'arthis.space' },
    { url: 'https://arthis.land',  label: 'arthis.land'  }
  ];

  var scene = null, camera = null, started = false, wired = false;
  var car = null, panels = [], last = 0;

  /* ---------- finding the scene and camera ----------
     both are shut inside the atlas's closure, so borrow them from the one
     call three makes on each of them every frame:
       renderer.render() → scene.updateMatrixWorld() and camera.updateMatrixWorld()
     The hook takes itself back out as soon as it has both. */
  var origUpdate = THREE.Object3D.prototype.updateMatrixWorld;
  THREE.Object3D.prototype.updateMatrixWorld = function (force) {
    if (!scene && this.isScene) {
      scene = this;
      if (!started) { started = true; load(); }
    } else if (!camera && this.isCamera) {
      camera = this;
    }
    if (scene && camera) THREE.Object3D.prototype.updateMatrixWorld = origUpdate;
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

  /* ---------- 8-bit dust blocks ---------- */
  var BLOBS = [
    ['00111000',
     '01111100',
     '11111110',
     '11111111',
     '11111110',
     '01111100',
     '00111000',
     '00010000'],
    ['00011000',
     '00111100',
     '01111110',
     '11111100',
     '01111110',
     '00111100',
     '00011000',
     '00000000'],
    ['00110000',
     '01111000',
     '11111100',
     '11111110',
     '01111100',
     '00111100',
     '00011000',
     '00000000']
  ];

  function blockTexture(rows) {
    var c = document.createElement('canvas'); c.width = c.height = 8;
    var g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    for (var y = 0; y < 8; y++)
      for (var x = 0; x < 8; x++)
        if (rows[y].charAt(x) === '1') g.fillRect(x, y, 1, 1);
    var t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  }

  /* ---------- the CLICK ME signs ---------- */
  function signTexture(label) {
    var W = 384, H = 132, c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');
    var FONT = '"Space Grotesk", system-ui, sans-serif';

    g.fillStyle = '#16181d'; g.fillRect(0, 0, W, H);              // hard ink border
    g.fillStyle = '#ffffff'; g.fillRect(6, 6, W - 12, H - 12);
    g.fillStyle = '#e8392b'; g.fillRect(6, 6, 10, H - 12);        // accent rail

    g.textAlign = 'center';
    g.fillStyle = '#16181d';
    g.font = '600 44px ' + FONT;
    g.fillText('CLICK ME', W / 2 + 6, 56);
    g.fillStyle = '#e8392b';
    g.font = '600 32px ' + FONT;
    g.fillText(label, W / 2 + 6, 102);

    var t = new THREE.CanvasTexture(c);
    t.anisotropy = MOBILE ? 2 : 8;
    if ('sRGBEncoding' in THREE) t.encoding = THREE.sRGBEncoding;
    return t;
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
    var scale = R * SIZE;
    mesh.scale.setScalar(scale);
    g.add(mesh);
    host.add(g);

    /* one sign per product, riding either side of the roof */
    for (var s = 0; s < LINKS.length; s++) {
      var sign = new THREE.Sprite(new THREE.SpriteMaterial({
        map: signTexture(LINKS[s].label), transparent: true,
        depthWrite: false, fog: false
      }));
      sign.scale.set(scale * 2.3, scale * 0.79, 1);
      sign.userData.url = LINKS[s].url;
      scene.add(sign);          // placed in world space so they sit neatly
      panels.push(sign);        // above the car whichever way the globe is turned
    }

    var grit = GRIT ? BLOBS.map(blockTexture) : null;
    var dust = [];
    for (var k = 0; k < GRIT; k++) {
      var d = new THREE.Sprite(new THREE.SpriteMaterial({
        map: grit[k % grit.length], color: DUST, transparent: true,
        opacity: 0, depthWrite: false, fog: false
      }));
      d.visible = false;
      host.add(d);
      dust.push({ s: d, t: 0, v: new THREE.Vector3() });
    }

    /* orbit plane: a great circle tilted off the equator */
    var u = new THREE.Vector3(Math.cos(TILT), Math.sin(TILT), 0).normalize();
    var v = new THREE.Vector3(0, 0, 1);

    car = { g: g, host: host, R: R, r: R * LIFT, u: u, v: v, a: 0,
            dust: dust, next: 0, n: 0, side: 1, scale: scale };

    wireClicks();
  }

  /* ---------- clicking a sign ---------- */
  function wireClicks() {
    if (wired) return;
    var canvas = document.getElementById('scene') || document.querySelector('canvas');
    if (!canvas) return;
    wired = true;

    var ray = new THREE.Raycaster(), pt = new THREE.Vector2();
    var armed = null, downX = 0, downY = 0, prevCursor = '';

    function pick(e) {
      if (!camera) return null;
      var r = canvas.getBoundingClientRect();
      pt.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
      pt.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
      ray.setFromCamera(pt, camera);
      var hits = ray.intersectObjects(panels, false);
      return hits.length ? hits[0].object : null;
    }

    addEventListener('pointermove', function (e) {
      if (armed) return;
      var over = !!pick(e);
      if (over) { canvas.style.cursor = 'pointer'; prevCursor = 'pointer'; }
      else if (prevCursor) { canvas.style.cursor = ''; prevCursor = ''; }
    }, { passive: true });

    canvas.addEventListener('pointerdown', function (e) {
      var hit = pick(e);
      if (!hit) return;
      armed = hit; downX = e.clientX; downY = e.clientY;
      e.stopPropagation();          // don't start dragging the globe
    }, true);

    canvas.addEventListener('pointerup', function (e) {
      if (!armed) return;
      var moved = Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY);
      var url = armed.userData.url;
      armed = null;
      if (moved < 8) { e.stopPropagation(); open(url, '_blank', 'noopener'); }
    }, true);
  }

  /* ---------- per frame ---------- */
  var P = new THREE.Vector3(), V = new THREE.Vector3(),
      UP = new THREE.Vector3(), RGT = new THREE.Vector3(),
      TMP = new THREE.Vector3(), M = new THREE.Matrix4(),
      CAMR = new THREE.Vector3(), CAMU = new THREE.Vector3(),
      CARW = new THREE.Vector3();

  var STEP_SCALE   = [0.30, 0.46, 0.66, 0.88];   // stepped, not smooth — keeps it 8-bit
  var STEP_OPACITY = [0.80, 0.62, 0.40, 0.17];

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

    /* signs float over the roof, one either side, with a slow bob.
       They are offset along the camera's own axes rather than the globe's,
       so they always read as sitting just above the car on screen */
    if (camera) {
      var lift = c.scale * (1.5 + Math.sin(now * 1.6) * 0.06);
      var e = camera.matrixWorld.elements;
      CAMR.set(e[0], e[1], e[2]).normalize();
      CAMU.set(e[4], e[5], e[6]).normalize();
      CARW.copy(P).applyMatrix4(c.host.matrixWorld);
      for (var s = 0; s < panels.length; s++) {
        panels[s].position.copy(CARW)
          .addScaledVector(CAMU, lift)
          .addScaledVector(CAMR, (s === 0 ? -1 : 1) * c.scale * 1.22);
      }
    }

    if (!c.dust.length) return;

    /* kick a block out from under whichever back tyre is next */
    c.next -= dt;
    if (c.next <= 0) {
      c.next = EMIT;
      c.side = -c.side;
      var p = c.dust[c.n % c.dust.length]; c.n++;
      p.t = LIFE;
      p.s.visible = true;
      TMP.copy(P)
        .addScaledVector(V, -c.scale * 0.34)
        .addScaledVector(RGT, c.scale * 0.19 * c.side)
        .addScaledVector(UP, c.scale * 0.07);
      p.s.position.copy(TMP);
      p.v.copy(V).multiplyScalar(-c.scale * 0.9)
        .addScaledVector(RGT, c.scale * (0.3 * c.side + (Math.random() - 0.5) * 0.3))
        .addScaledVector(UP, c.scale * (0.5 + Math.random() * 0.3));
    }

    for (var k = 0; k < c.dust.length; k++) {
      var q = c.dust[k];
      if (q.t <= 0) continue;
      q.t -= dt;
      if (q.t <= 0) { q.s.visible = false; q.s.material.opacity = 0; continue; }

      q.s.position.addScaledVector(q.v, dt);
      q.v.multiplyScalar(0.94);
      /* let it settle back toward the surface */
      TMP.copy(q.s.position).normalize();
      q.v.addScaledVector(TMP, -c.scale * 0.55 * dt);

      var stage = Math.min(3, Math.floor((1 - q.t / LIFE) * 4));
      var sc = STEP_SCALE[stage] * c.scale;
      q.s.scale.set(sc, sc, 1);
      q.s.material.opacity = STEP_OPACITY[stage];
    }
  }
})();
