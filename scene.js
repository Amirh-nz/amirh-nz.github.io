/* 3D background: procedural silver watershed, river network, flow particles, AI node layer.
   Shared state with the music player lives on window.App (pulse = beat flash, energy = bass level). */
window.App=window.App||{pulse:0,energy:0,onFrame:[]};
(function(){
  const canvas=document.getElementById('bg');
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  const scene=new THREE.Scene();
  scene.fog=new THREE.Fog(0xd9dde2,16,44);
  const camera=new THREE.PerspectiveCamera(40,1,.1,100);
  camera.position.set(0,11,18);camera.lookAt(0,.5,0);

  scene.add(new THREE.AmbientLight(0xaab2bb,.9));
  const key=new THREE.DirectionalLight(0xffffff,1.1);key.position.set(-6,12,7);scene.add(key);
  const rim=new THREE.DirectionalLight(0xc4d0e0,.6);rim.position.set(8,5,-8);scene.add(rim);

  // --- terrain ---
  const N=90,SIZE=20,S=3.2;
  function hash(x,y){const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s)}
  function vn(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
    return hash(xi,yi)*(1-u)*(1-v)+hash(xi+1,yi)*u*(1-v)+hash(xi,yi+1)*(1-u)*v+hash(xi+1,yi+1)*u*v}
  function fbm(x,y){let a=.5,f=1,s=0;for(let i=0;i<4;i++){s+=a*vn(x*f,y*f);f*=2;a*=.5}return s}
  function height(u,v){
    const r2=u*u+v*v;
    const bowl=Math.pow(r2,.8)*1.1;
    const ch=Math.exp(-u*u*12)*Math.max(0,Math.min(1,(v+.3)/1.2))*.55;
    return bowl+.35*fbm(u*3+2,v*3+1)*(.3+r2)-ch;
  }
  const H=[];
  for(let iz=0;iz<=N;iz++){H[iz]=[];for(let ix=0;ix<=N;ix++){H[iz][ix]=height(ix/N*2-1,iz/N*2-1)}}

  const geo=new THREE.PlaneGeometry(SIZE,SIZE,N,N);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){pos.setY(i,H[Math.floor(i/(N+1))][i%(N+1)]*S)}
  geo.computeVertexNormals();

  const group=new THREE.Group();scene.add(group);
  group.add(new THREE.Mesh(geo,new THREE.MeshPhongMaterial({
    color:0xc8cdd3,specular:0xffffff,shininess:70,flatShading:true,
    polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1})));
  group.add(new THREE.LineSegments(new THREE.WireframeGeometry(geo),
    new THREE.LineBasicMaterial({color:0x6f7a86,transparent:true,opacity:.22})));

  // --- river network: steepest descent ---
  const toW=(ix,iz)=>new THREE.Vector3((ix/N-.5)*SIZE,H[iz][ix]*S+.06,(iz/N-.5)*SIZE);
  function trace(ix,iz){
    const p=[];
    for(let n=0;n<400;n++){
      p.push([ix,iz]);
      let best=H[iz][ix],bx=ix,bz=iz;
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        const nx=ix+dx,nz=iz+dz;
        if(nx<0||nz<0||nx>N||nz>N)continue;
        if(H[nz][nx]<best){best=H[nz][nx];bx=nx;bz=nz}
      }
      if(bx===ix&&bz===iz)break;
      ix=bx;iz=bz;
      if(ix<=0||iz<=0||ix>=N||iz>=N){p.push([ix,iz]);break}
    }
    return p;
  }
  const paths=[];
  for(let k=0;k<34;k++){
    const a=Math.random()*Math.PI*2,r=.5+Math.random()*.45;
    const ix=Math.round((Math.cos(a)*r*.5+.5)*N),iz=Math.round((Math.sin(a)*r*.5+.5)*N);
    const p=trace(ix,iz);
    if(p.length>14)paths.push(p.map(q=>toW(q[0],q[1])));
  }
  const riverMat=new THREE.LineBasicMaterial({color:0x2c3846,transparent:true,opacity:.8});
  paths.forEach(p=>group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),riverMat)));

  // flow particles
  const parts=[];
  paths.forEach(p=>{for(let j=0;j<3;j++)parts.push({p,t:Math.random()*p.length,s:3+Math.random()*3})});
  const pg=new THREE.BufferGeometry();
  pg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(parts.length*3),3));
  group.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0x111a24,size:.16,sizeAttenuation:true})));
  function placeParticles(){
    const a=pg.attributes.position;
    parts.forEach((q,i)=>{
      const n=q.p.length,i0=Math.floor(q.t)%n,i1=(i0+1)%n,f=q.t-Math.floor(q.t);
      const A=q.p[i0],B=q.p[i1];
      a.setXYZ(i,A.x+(B.x-A.x)*f,A.y+(B.y-A.y)*f+.08,A.z+(B.z-A.z)*f);
    });
    a.needsUpdate=true;
  }

  // --- AI layer: data nodes floating above river points, linked like a network ---
  const nodes=[];
  paths.forEach(p=>{for(let i=8;i<p.length;i+=16){const v=p[i].clone();v.y+=1.1+Math.random()*.8;nodes.push({top:v,base:p[i]})}});
  const ng=new THREE.BufferGeometry().setFromPoints(nodes.map(n=>n.top));
  group.add(new THREE.Points(ng,new THREE.PointsMaterial({color:0xf8fafc,size:.28,sizeAttenuation:true})));
  const halo=new THREE.Points(ng,new THREE.PointsMaterial({color:0x2c3846,size:.38,sizeAttenuation:true,opacity:.35,transparent:true}));
  group.add(halo);
  const links=[];
  nodes.forEach((n,i)=>{
    links.push(n.top,n.base);
    nodes.map((m,j)=>({j,d:n.top.distanceTo(m.top)})).filter(o=>o.j>i&&o.d<4.5).sort((a,b)=>a.d-b.d).slice(0,2)
      .forEach(o=>links.push(n.top,nodes[o.j].top));
  });
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(links),
    new THREE.LineBasicMaterial({color:0x56626f,transparent:true,opacity:.3})));

  // --- sizing, pointer, loop ---
  let mx=0,my=0,motion=true;const spd=reduce?.3:1;
  window.addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5},{passive:true});
  function resize(){
    const w=innerWidth,h=innerHeight;
    renderer.setSize(w,h,false);camera.aspect=w/h;
    group.position.x=w/h>1.1?4.2:0;
    group.position.y=w/h>1.1?0:-1;
    camera.position.z=w/h>1.1?18:24;
    camera.updateProjectionMatrix();
    draw(0);
  }
  window.addEventListener('resize',resize);
  let last=performance.now(),rot=.6;
  function draw(dt){
    rot+=dt*.05;
    group.rotation.y=rot+mx*.35;
    group.rotation.x=my*.08;
    App.onFrame.forEach(f=>f(dt));
    App.pulse=Math.max(0,App.pulse-dt*3.5);
    halo.material.size=.38+App.pulse*.3+App.energy*.08;
    parts.forEach(q=>{q.t+=q.s*dt*(1+App.pulse*1.2)});
    placeParticles();
    renderer.render(scene,camera);
  }
  resize();
  // always animate (slower if the OS asks for reduced motion); one error never stops the loop
  (function loop(now){
    requestAnimationFrame(loop);
    const dt=Math.min((now-last)/1000,.05);last=now;
    if(!motion)return;
    try{draw(dt*spd)}catch(e){console.error(e)}
  })(last);
  document.getElementById('mot').addEventListener('click',e=>{motion=!motion;e.currentTarget.setAttribute('aria-pressed',String(motion))});
})();
