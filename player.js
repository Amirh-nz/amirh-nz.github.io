/* Music player: playlist on the Music page + the player at the top right.
   Silent until the visitor presses play. Beat map drives the background (App.pulse / App.energy). */
(function(){
  const btn=document.getElementById('play'),vol=document.getElementById('vol'),list=document.getElementById('tracks');
  const label=document.querySelector('.ptrack'),TRACKS=window.TRACKS||[];
  if(!btn||!TRACKS.length)return;
  const au=new Audio();au.preload='none';au.volume=.625;
  let cur=0,loaded=-1,playing=false,bi=0,lastT=0;

  TRACKS.forEach(t=>{if(t.beats){const sc=document.createElement('script');sc.src=t.beats;document.head.appendChild(sc)}});

  function ui(){
    const t=TRACKS[cur];
    btn.classList.toggle('on',playing);
    btn.setAttribute('aria-pressed',String(playing));
    btn.setAttribute('aria-label',playing?'Pause music':'Play music');
    label.innerHTML=t.title+'<small>'+(t.note||'')+'</small>';
    [...list.children].forEach((b,i)=>b.setAttribute('aria-current',String(playing&&i===cur)));
  }
  function stop(){au.pause();playing=false;ui()}
  async function play(i){
    if(playing&&i!==cur)au.pause();
    if(loaded!==i){au.src=TRACKS[i].src;loaded=i;bi=0;lastT=0}
    cur=i;
    try{await au.play()}catch(e){
      list.children[i].querySelector('small').textContent='File not found';
      playing=false;ui();return;
    }
    playing=true;ui();
  }
  au.addEventListener('ended',()=>{loaded=-1;play((cur+1)%TRACKS.length)});

  TRACKS.forEach((t,i)=>{
    const b=document.createElement('button');b.type='button';b.className='trk';
    b.innerHTML='<span></span><small></small>';
    b.firstChild.textContent=t.title;b.lastChild.textContent=t.note||'';
    b.addEventListener('click',()=>playing&&i===cur?stop():play(i));
    list.appendChild(b);
  });
  btn.addEventListener('click',()=>playing?stop():play(cur));
  vol.addEventListener('input',()=>{au.volume=Math.min(1,+vol.value/.8)});

  // beat sync: [time, strength] hits from the beat map + a bass envelope at 25 fps
  window.App.onFrame.push(()=>{
    App.energy=0;
    const m=(window.BEATMAPS||{})[TRACKS[cur].src];
    if(!m||!playing)return;
    const t=au.currentTime;
    if(t<lastT-.3||t>lastT+1){bi=m.beats.findIndex(b=>b[0]>=t);if(bi<0)bi=m.beats.length}
    lastT=t;
    while(bi<m.beats.length&&m.beats[bi][0]<=t+.04){App.pulse=Math.max(App.pulse,m.beats[bi][1]);bi++}
    m.e=m.e||Uint8Array.from(atob(m.env),c=>c.charCodeAt(0));
    App.energy=m.e[Math.min(m.e.length-1,Math.floor(t*25))]/255;
  });
  ui();
})();
