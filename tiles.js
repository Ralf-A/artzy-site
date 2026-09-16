(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- cursor ---------- */
  const cur = document.getElementById('cur');
  let cx = innerWidth/2, cy = innerHeight/2, tx = cx, ty = cy;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
  document.querySelectorAll('.tile').forEach(t => {
    t.addEventListener('pointerenter', () => cur.classList.add('big'));
    t.addEventListener('pointerleave', () => cur.classList.remove('big'));
  });

  /* ---------- WebGL tiles ---------- */
  const VS = `attribute vec2 p; varying vec2 v; void main(){ v = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;
  const FS = `
  precision highp float;
  varying vec2 v;
  uniform vec2 uRes, uMouse, uVel, uFocus; uniform float uStr, uT, uSeed, uTexAR; uniform int uScene, uHasTex; uniform sampler2D uTex;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
  float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
  float band(float y, float c, float w){ float d=(y-c)/w; return exp(-d*d); }
  // cover-fit: map tile uv onto the visible window of the photo, biased toward uFocus (like object-position)
  vec2 cover(vec2 uv){
    float ar = uRes.x/uRes.y;
    vec2 s = (ar > uTexAR) ? vec2(1., uTexAR/ar) : vec2(ar/uTexAR, 1.);
    return uFocus*(1.-s) + uv*s;
  }
  vec3 scene(vec2 uv){
    if(uHasTex==1){ vec2 t = cover(uv); return texture2D(uTex, vec2(t.x, 1.-t.y)).rgb; }
    vec3 c = vec3(.045,.045,.055);
    float ar = uRes.x/uRes.y;
    if(uScene==0){ // studio: scrim + softbox streak on a roofline
      c = mix(vec3(.08,.08,.09), vec3(.02), uv.y);
      float roof = .48 + .16*sin((uv.x-.5)*3.1) - .06*uv.x;
      c += vec3(.95,.95,1.) * band(uv.y, roof, .018) * (0.55+0.45*sin(uv.x*6.2+1.));
      c += vec3(.9,.92,1.) * band(uv.y, roof-.02, .12) * .10;
      c += vec3(.6,.62,.7) * band(uv.y, .18, .06) * smoothstep(.05,.4,uv.x)*smoothstep(.95,.6,uv.x) * .35;
    } else if(uScene==1){ // rolling: horizontal motion streaks
      vec2 p = vec2(uv.x*1.6 + uT*.05, uv.y*14.);
      float s = fbm(p);
      c = mix(vec3(.04,.05,.08), vec3(.28,.31,.36), s*s);
      c += vec3(.9,.85,.7) * band(uv.y, .42, .015) * (fbm(vec2(uv.x*3.+uT*.2, 7.))*1.4);
      c *= smoothstep(1.,.35,uv.y)+.15;
    } else if(uScene==2){ // track: asphalt grain, kerb, apex highlight
      float g = fbm(uv*vec2(60.*ar,60.));
      c = vec3(.10,.10,.11) + g*.06;
      float kerb = smoothstep(.02,.0, abs(uv.y - (.22 + .12*uv.x*uv.x)) - .03);
      float stripe = step(.5, fract(uv.x*7.));
      c = mix(c, mix(vec3(.62,.12,.1), vec3(.85,.82,.78), stripe), kerb);
      c += vec3(1.,.75,.45) * exp(-pow((uv.x-.78)*2.2,2.)-pow((uv.y-.62)*3.,2.)) * .5;
      c += vec3(.7,.75,.8) * band(uv.y, .86, .05) * .12;
    } else if(uScene==3){ // details: macro speculars over carbon weave
      float w = step(.5, fract(uv.x*90.*ar)) + step(.5, fract(uv.y*90.)); w = mod(w,2.)*.04;
      c = vec3(.05,.05,.06) + w;
      c += vec3(.94,.76,.53) * exp(-pow((uv.x-.32)*3.,2.)-pow((uv.y-.55)*1.6,2.)) * .55;
      c += vec3(.8,.85,1.) * exp(-pow((uv.x-.74)*5.,2.)-pow((uv.y-.28)*4.,2.)) * .35;
      c += vec3(1.) * band(uv.y, .55+.22*(uv.x-.5), .006) * .9;
    } else if(uScene==4){ // night: light trails + bokeh
      c = vec3(.02,.025,.05);
      for(int i=0;i<4;i++){ float fi=float(i);
        float y = .28 + .12*fi + .07*sin(uv.x*2.2+fi*1.7+uT*.1);
        vec3 col = (mod(fi,2.)<1.) ? vec3(1.,.18,.12) : vec3(1.,.9,.75);
        c += col * band(uv.y, y, .006+.004*fi) * (.9-.15*fi) * (0.4+0.6*smoothstep(0.,.3,uv.x)); }
      for(int i=0;i<7;i++){ float fi=float(i);
        vec2 q = vec2(h(vec2(fi,uSeed)), .6+.35*h(vec2(fi+3.,uSeed)));
        float d = length((uv-q)*vec2(ar,1.));
        c += vec3(1.,.85,.6) * smoothstep(.05,.03,d) * .18; }
      c += vec3(.1,.12,.2) * fbm(uv*3.+uT*.02) * .5;
    } else { // classics: chrome bumper band, sepia, vignette
      float g = fbm(uv*vec2(30.*ar,30.));
      c = vec3(.16,.13,.10) + g*.06;
      float bumper = band(uv.y, .38, .05);
      c = mix(c, mix(vec3(.05), vec3(.92,.9,.85), pow(abs(sin((uv.y-.38)*70.)),8.)), bumper);
      c += vec3(.95,.85,.65) * band(uv.y, .62, .1) * smoothstep(.3,.9,uv.x) * .25;
      c *= 1.-.9*pow(length((uv-.5)*vec2(1.,1.4)),2.6);
    }
    return c;
  }
  void main(){
    vec2 uv = v; float ar = uRes.x/uRes.y;
    vec2 d = (uv - uMouse) * vec2(ar,1.);
    float r = length(d);
    float f = exp(-r*r*22.) * uStr;
    vec2 disp = uVel * f * .55 + (d/(r+.02)) * f * .022;
    vec3 c;
    c.r = scene(uv - disp).r;
    c.g = scene(uv - disp*1.35).g;
    c.b = scene(uv - disp*1.7).b;
    c += vec3(1.,.85,.6) * f * .08;                 // halogen glow under the cursor
    c += (h(uv*uRes + fract(uT))-.5)*.035;          // grain
    float vig = uHasTex==1 ? .38 : .55;             // photos already carry their own falloff
    c *= 1.-vig*pow(length((uv-.5)*vec2(1.,1.2)),3.); // vignette
    gl_FragColor = vec4(c,1.);
  }`;

  class Tile {
    constructor(el){
      this.el = el; this.cv = el.querySelector('canvas');
      const gl = this.gl = this.cv.getContext('webgl', {antialias:false, premultipliedAlpha:false});
      if(!gl){ this.dead = true; if(el.dataset.src) el.style.backgroundImage = `url(${el.dataset.src}-2000.jpg)`; return; }
      const mk = (t,s)=>{ const sh=gl.createShader(t); gl.shaderSource(sh,s); gl.compileShader(sh); return sh; };
      const pr = gl.createProgram(); gl.attachShader(pr, mk(gl.VERTEX_SHADER,VS)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER,FS)); gl.linkProgram(pr); gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      this.u = {}; ['uRes','uMouse','uVel','uStr','uT','uSeed','uScene','uHasTex','uTex','uTexAR','uFocus'].forEach(k => this.u[k] = gl.getUniformLocation(pr,k));
      gl.uniform1i(this.u.uScene, +el.dataset.scene); gl.uniform1i(this.u.uHasTex, 0); gl.uniform1f(this.u.uSeed, Math.random()*10);
      const [fx=.5, fy=.5] = (el.dataset.focus||'').split(/\s+/).map(Number);
      gl.uniform2f(this.u.uFocus, fx, 1-fy); // data-focus is top-left based like object-position; texture v runs bottom-up
      this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      this.m = [0.5,0.5]; this.tm = [0.5,0.5]; this.vel=[0,0]; this.str=0; this.tstr=0; this.visible=false; this.last=null;
      el.addEventListener('pointermove', e => {
        const b = el.getBoundingClientRect();
        const nx = (e.clientX-b.left)/b.width, ny = 1-(e.clientY-b.top)/b.height;
        if(this.last){ this.vel[0] += (nx-this.last[0])*1.4; this.vel[1] += (ny-this.last[1])*1.4; }
        this.last=[nx,ny]; this.tm=[nx,ny]; this.tstr=1;
      });
      el.addEventListener('pointerleave', () => { this.tstr=0; this.last=null; });
      this.resize();
    }
    resize(){
      if(this.dead) return;
      const dpr = Math.min(devicePixelRatio||1, 1.5), b = this.el.getBoundingClientRect();
      const w = Math.max(1, Math.round(b.width*dpr)), h = Math.max(1, Math.round(b.height*dpr));
      if(this.cv.width!==w || this.cv.height!==h){ this.cv.width=w; this.cv.height=h; this.gl.viewport(0,0,w,h); this.gl.uniform2f(this.u.uRes,w,h); }
    }
    load(){ // lazy: called once the tile first scrolls into view; picks the variant by rendered size
      if(this.loaded || this.dead || !this.el.dataset.src) return;
      this.loaded = true;
      const px = this.el.getBoundingClientRect().width * Math.min(devicePixelRatio||1, 1.5);
      this.setImage(`${this.el.dataset.src}-${px > 900 ? 2000 : 800}.jpg`);
    }
    setImage(url){ // hook: drop a real frame into the tile, shader keeps the distortion
      const img = new Image(); img.crossOrigin='anonymous';
      img.onload = () => { const gl=this.gl; gl.bindTexture(gl.TEXTURE_2D,this.tex);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
        gl.uniform1f(this.u.uTexAR, img.naturalWidth/img.naturalHeight); gl.uniform1i(this.u.uHasTex,1); };
      img.src = url;
    }
    draw(t){
      if(this.dead || !this.visible) return;
      const k = reduce ? 1 : 0.12;
      this.m[0] += (this.tm[0]-this.m[0])*k; this.m[1] += (this.tm[1]-this.m[1])*k;
      this.str += (this.tstr-this.str)*(this.tstr? .18 : .05);
      this.vel[0]*=.9; this.vel[1]*=.9;
      const gl=this.gl;
      gl.uniform2f(this.u.uMouse, this.m[0], this.m[1]); gl.uniform2f(this.u.uVel, this.vel[0], this.vel[1]);
      gl.uniform1f(this.u.uStr, reduce?0:this.str); gl.uniform1f(this.u.uT, t/1000);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
  }

  const tiles = [...document.querySelectorAll('.tile')].map(el => new Tile(el));

  /* ---------- lightbox: tiles with data-full open the full frame in place ---------- */
  const lb = document.querySelector('.lb');
  if(lb){
    const img = lb.querySelector('img');
    document.querySelectorAll('.tile[data-full]').forEach(t => t.addEventListener('click', e => {
      e.preventDefault(); img.src = t.dataset.full; img.alt = t.querySelector('h2')?.textContent || ''; lb.showModal();
    }));
    lb.addEventListener('click', e => { if(e.target===lb || e.target.classList.contains('x')) lb.close(); });
    lb.addEventListener('close', () => { img.removeAttribute('src'); });
  }
  window.setTileImage = (i,url) => tiles[i] && tiles[i].setImage(url);
  const io = new IntersectionObserver(es => es.forEach(e => { const t = tiles.find(t=>t.el===e.target); if(t){ t.visible = e.isIntersecting; if(t.visible) t.load(); } }), {rootMargin:'80px'});
  tiles.forEach(t => io.observe(t.el));
  const ro = new ResizeObserver(() => tiles.forEach(t=>t.resize())); tiles.forEach(t => ro.observe(t.el));

  function loop(t){
    cx += (tx-cx)*.22; cy += (ty-cy)*.22; cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
    tiles.forEach(x => x.draw(t));
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
