/* Local weather widget: IP location first, optional precise location, forecast + river data from Open-Meteo. */
(function(){
  const el=document.getElementById('wx'),$=s=>el.querySelector(s);
  const WMO=c=>c===0?'Clear':c<=3?'Partly cloudy':c<=48?'Fog':c<=57?'Drizzle':c<=67?'Rain':c<=77?'Snow':c<=82?'Showers':c<=86?'Snow showers':'Thunderstorm';
  const dayName=d=>new Date(d+'T12:00').toLocaleDateString('en',{weekday:'short'});
  const j=async u=>{const r=await fetch(u);if(!r.ok)throw new Error(r.status);return r.json()};
  const mark=(sel,txt,warn)=>{const b=$(sel);b.textContent=txt;b.parentNode.querySelector('.dot').classList.toggle('warn',!!warn)};
  async function ipLocate(){
    try{const d=await j('https://ipapi.co/json/');if(d.latitude)return{lat:d.latitude,lon:d.longitude,name:d.city,country:d.country_name}}catch(e){}
    const d=await j('https://ipwho.is/');if(!d.success)throw new Error('ip');
    return{lat:d.latitude,lon:d.longitude,name:d.city,country:d.country};
  }
  async function placeName(lat,lon){
    try{const d=await j('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude='+lat+'&longitude='+lon+'&localityLanguage=en');
      return{name:d.city||d.locality,country:d.countryName}}catch(e){return{}}
  }
  async function load(loc){
    $('.wx-place').textContent=[loc.name,loc.country].filter(Boolean).join(', ')||'Your location';
    const f=await j('https://api.open-meteo.com/v1/forecast?latitude='+loc.lat+'&longitude='+loc.lon+
      '&current=temperature_2m,apparent_temperature,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max&timezone=auto&forecast_days=4');
    const c=f.current,d=f.daily;
    $('.wx-temp').textContent=Math.round(c.temperature_2m)+'\u00b0';
    $('.wx-cond').textContent=WMO(c.weather_code)+' \u00b7 feels '+Math.round(c.apparent_temperature)+'\u00b0';
    mark('.wx-rain',d.precipitation_sum[0].toFixed(1)+' mm today \u00b7 '+(d.precipitation_probability_max[0]||0)+'%',d.precipitation_sum[0]>=20);
    const si=d.weather_code.findIndex(x=>x>=95),gi=d.wind_gusts_10m_max.findIndex(x=>x>=75);
    if(si>=0)mark('.wx-storm','Thunderstorm '+(si===0?'today':dayName(d.time[si])),true);
    else if(gi>=0)mark('.wx-storm','Gusts to '+Math.round(d.wind_gusts_10m_max[gi])+' km/h',true);
    else mark('.wx-storm','None expected',false);
    $('.wx-days').innerHTML=[1,2,3].map(i=>'<div><b>'+dayName(d.time[i])+'</b>'+Math.round(d.temperature_2m_max[i])+'\u00b0 / '+Math.round(d.temperature_2m_min[i])+'\u00b0</div>').join('');
    try{
      const fl=await j('https://flood-api.open-meteo.com/v1/flood?latitude='+loc.lat+'&longitude='+loc.lon+'&daily=river_discharge,river_discharge_mean&forecast_days=7');
      const q=fl.daily.river_discharge,m=fl.daily.river_discharge_mean;
      if(q.every(v=>v==null))throw new Error('none');
      const r=Math.max(...q.map((v,i)=>m[i]&&v!=null?v/m[i]:0));
      mark('.wx-flood',r>=3?'High river flow':r>=2?'Elevated river flow':'Normal river flow',r>=2);
    }catch(e){mark('.wx-flood','No river data nearby',false)}
  }
  async function run(loc){
    try{await load(loc)}catch(e){$('.wx-place').textContent='Weather unavailable';$('.wx-cond').textContent='Couldn\u2019t load data for your location'}
  }
  const byIp=async()=>{try{await run(await ipLocate())}catch(e){$('.wx-place').textContent='Location unavailable'}};
  (async()=>{
    let st='prompt';
    try{st=(await navigator.permissions.query({name:'geolocation'})).state}catch(e){}
    const btn=$('.wx-loc');
    if(st==='denied')btn.hidden=true;
    if(st==='granted'&&navigator.geolocation){
      btn.hidden=true;
      navigator.geolocation.getCurrentPosition(async p=>{
        const lat=p.coords.latitude,lon=p.coords.longitude;
        run(Object.assign({lat,lon},await placeName(lat,lon)));
      },byIp);
    }else byIp();
  })();
  const lb=$('.wx-loc');
  if(!navigator.geolocation)lb.hidden=true;
  lb.addEventListener('click',e=>{
    e.stopPropagation();
    navigator.geolocation.getCurrentPosition(async p=>{
      const lat=p.coords.latitude,lon=p.coords.longitude;
      run(Object.assign({lat,lon},await placeName(lat,lon)));lb.hidden=true;
    },()=>{lb.textContent='Location blocked'});
  });
  el.addEventListener('click',()=>{if(innerWidth<=700)el.classList.toggle('open')});
})();
