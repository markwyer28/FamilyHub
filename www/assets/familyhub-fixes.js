/* Family Hub Android fixes: user-uploaded screensaver images + resilient Open-Meteo weather */
(()=>{
  'use strict';

  const $=id=>document.getElementById(id);

  /* ---------- Settings cleanup + screensaver image manager ---------- */
  const settingsGrid=document.querySelector('#settings .settings-grid');
  if(settingsGrid){
    const backupCard=[...settingsGrid.querySelectorAll('.settings-card')].find(card=>card.textContent.includes('Backup & restore'));
    if(backupCard) backupCard.remove();

    const displayCard=[...settingsGrid.querySelectorAll('.settings-card')].find(card=>card.textContent.includes('Display'));
    const imageCard=document.createElement('article');
    imageCard.className='card settings-card screensaver-upload-card';
    imageCard.innerHTML=`
      <h3>🖼 Screensaver images</h3>
      <p class="muted">No pictures are included by default. Upload photos from this device and Family Hub will rotate through them when the screensaver starts.</p>
      <input id="screensaverUpload" type="file" accept="image/*" multiple hidden>
      <button class="secondary settings-action" id="chooseScreensaverImages" type="button">＋ Upload images</button>
      <div id="screensaverImageList" class="screensaver-upload-list"></div>
      <p id="screensaverImageStatus" class="settings-status muted">No screensaver images uploaded.</p>`;
    if(displayCard) displayCard.insertAdjacentElement('afterend',imageCard); else settingsGrid.prepend(imageCard);
  }

  const DB_NAME='FamilyHubMedia', STORE='screensaverImages';
  const openDb=()=>new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'})};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  async function getImages(){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close()})}
  async function putImage(row){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(row);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}
  async function deleteImage(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}
  async function clearImages(){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}

  function imageToJpeg(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(reader.error);
      reader.onload=()=>{
        const im=new Image();
        im.onerror=()=>reject(new Error('Could not read '+file.name));
        im.onload=()=>{
          const max=1920,scale=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));
          const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(im.naturalWidth*scale));canvas.height=Math.max(1,Math.round(im.naturalHeight*scale));
          canvas.getContext('2d').drawImage(im,0,0,canvas.width,canvas.height);
          canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not prepare '+file.name)),'image/jpeg',0.86);
        };im.src=reader.result;
      };reader.readAsDataURL(file);
    });
  }

  let previewUrls=[];
  async function renderImageManager(){
    const list=$('screensaverImageList'),status=$('screensaverImageStatus');if(!list||!status)return;
    previewUrls.forEach(URL.revokeObjectURL);previewUrls=[];
    const images=await getImages();
    status.textContent=images.length?`${images.length} screensaver image${images.length===1?'':'s'} uploaded.`:'No screensaver images uploaded. The screensaver will stay off until you add some.';
    list.innerHTML='';
    images.forEach(row=>{
      const url=URL.createObjectURL(row.blob);previewUrls.push(url);
      const item=document.createElement('div');item.className='screensaver-upload-item';
      item.innerHTML=`<img src="${url}" alt=""><span>${String(row.name||'Photo').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span><button type="button" class="delete-btn" aria-label="Remove image">×</button>`;
      item.querySelector('button').onclick=async()=>{await deleteImage(row.id);await renderImageManager();window.dispatchEvent(new Event('family-screensaver-images-changed'))};list.appendChild(item);
    });
    if(images.length){const clear=document.createElement('button');clear.type='button';clear.className='secondary screensaver-clear';clear.textContent='Remove all images';clear.onclick=async()=>{if(confirm('Remove all screensaver images?')){await clearImages();await renderImageManager();window.dispatchEvent(new Event('family-screensaver-images-changed'))}};list.appendChild(clear)}
  }
  const choose=$('chooseScreensaverImages'),upload=$('screensaverUpload');
  if(choose&&upload){
    choose.onclick=()=>upload.click();
    upload.onchange=async()=>{
      const files=[...(upload.files||[])].filter(f=>f.type.startsWith('image/'));
      const status=$('screensaverImageStatus');
      try{
        if(status&&files.length)status.textContent=`Adding ${files.length} image${files.length===1?'':'s'}…`;
        for(const file of files){const blob=await imageToJpeg(file);await putImage({id:(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random()),name:file.name,blob,addedAt:Date.now()})}
        upload.value='';await renderImageManager();window.dispatchEvent(new Event('family-screensaver-images-changed'));
      }catch(err){if(status)status.textContent='Could not add image: '+err.message}
    };
    renderImageManager().catch(()=>{});
  }

  /* Disable the old bundled-image screensaver visually. */
  const oldSaver=$('familyScreensaver');if(oldSaver){oldSaver.style.display='none';oldSaver.setAttribute('aria-hidden','true')}

  /* New screensaver: it only exists when the user has uploaded images. */
  const saver=document.createElement('div');saver.id='familyUserScreensaver';saver.setAttribute('aria-label','Screensaver. Tap to return to Family Hub');
  const saverImg=document.createElement('img');saverImg.alt='Family Hub screensaver';saver.appendChild(saverImg);document.body.appendChild(saver);
  let idleTimer=null,rotateTimer=null,raf=null,last=0,x=28,y=28,vx=105,vy=82,slides=[],slideIndex=0,slideUrls=[];
  const cfg=()=>{try{return Object.assign({saverDelay:10,saverRotate:1},JSON.parse(localStorage.getItem('familyDisplaySettings')||'{}'))}catch(e){return {saverDelay:10,saverRotate:1}}};
  const idleMs=()=>Math.max(1,Number(cfg().saverDelay)||10)*60000,rotateMs=()=>Math.max(1,Number(cfg().saverRotate)||1)*60000;
  async function refreshSlides(){slideUrls.forEach(URL.revokeObjectURL);slideUrls=[];slides=(await getImages()).map(r=>{const u=URL.createObjectURL(r.blob);slideUrls.push(u);return u})}
  function showSlide(i){if(!slides.length)return;slideIndex=((i%slides.length)+slides.length)%slides.length;saverImg.src=slides[slideIndex]}
  function endRotation(){if(rotateTimer)clearInterval(rotateTimer);rotateTimer=null}
  function beginRotation(){endRotation();rotateTimer=setInterval(async()=>{await refreshSlides();if(!slides.length){stop();return}showSlide(slideIndex+1)},rotateMs())}
  function schedule(){if(idleTimer)clearTimeout(idleTimer);idleTimer=setTimeout(start,idleMs())}
  function stop(){endRotation();saver.classList.remove('active');if(raf)cancelAnimationFrame(raf);raf=null;last=0;schedule()}
  async function start(){if(document.querySelector('dialog[open]')){schedule();return}await refreshSlides();if(!slides.length){schedule();return}showSlide(slideIndex);saver.classList.add('active');const r=saver.getBoundingClientRect(),ir=saverImg.getBoundingClientRect();x=Math.min(28,Math.max(0,r.width-ir.width));y=Math.min(28,Math.max(0,r.height-ir.height));last=performance.now();beginRotation();raf=requestAnimationFrame(step)}
  function step(t){if(!saver.classList.contains('active'))return;const dt=Math.min((t-last)/1000,.05);last=t;const r=saver.getBoundingClientRect(),ir=saverImg.getBoundingClientRect(),mx=Math.max(0,r.width-ir.width),my=Math.max(0,r.height-ir.height);x+=vx*dt;y+=vy*dt;if(x<=0){x=0;vx=Math.abs(vx)}else if(x>=mx){x=mx;vx=-Math.abs(vx)}if(y<=0){y=0;vy=Math.abs(vy)}else if(y>=my){y=my;vy=-Math.abs(vy)}saverImg.style.transform=`translate3d(${x}px,${y}px,0)`;raf=requestAnimationFrame(step)}
  ['pointerdown','touchstart','keydown'].forEach(ev=>document.addEventListener(ev,()=>saver.classList.contains('active')?stop():schedule(),{passive:true}));
  saver.onclick=stop;window.addEventListener('family-display-settings-changed',schedule);window.addEventListener('family-screensaver-images-changed',()=>{if(saver.classList.contains('active'))stop();else schedule()});schedule();

  /* ---------- Weather fix ---------- */
  const WEATHER_CODES={0:['Clear','☀️'],1:['Mainly clear','🌤️'],2:['Partly cloudy','⛅'],3:['Overcast','☁️'],45:['Fog','🌫️'],48:['Rime fog','🌫️'],51:['Light drizzle','🌦️'],53:['Drizzle','🌦️'],55:['Heavy drizzle','🌧️'],61:['Light rain','🌦️'],63:['Rain','🌧️'],65:['Heavy rain','🌧️'],71:['Light snow','🌨️'],73:['Snow','❄️'],75:['Heavy snow','❄️'],80:['Rain showers','🌦️'],81:['Rain showers','🌧️'],82:['Heavy showers','⛈️'],95:['Thunderstorm','⛈️'],96:['Thunderstorm','⛈️'],99:['Thunderstorm','⛈️']};
  const weatherConfig=()=>{try{return JSON.parse(localStorage.getItem('familyWeather')||'{}')}catch(e){return {}}};
  function dayHtml(d,i,label){const code=Number(d.weather_code?.[i]),wd=WEATHER_CODES[code]||['Forecast','🌤️'],hi=d.temperature_2m_max?.[i],lo=d.temperature_2m_min?.[i],rain=d.precipitation_probability_max?.[i];return `<div class="weather-day"><span class="weather-icon">${wd[1]}</span><div><b>${label}</b><small>${wd[0]}${rain!=null?' · '+Math.round(rain)+'% rain':''}</small></div><div class="weather-temp">${hi!=null?Math.round(hi)+'°':'—'}${lo!=null?`<small> / ${Math.round(lo)}°</small>`:''}</div></div>`}
  async function fetchJson(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const r=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});if(!r.ok)throw new Error('Weather service returned '+r.status);return await r.json()}finally{clearTimeout(timer)}}
  window.loadWeather=async function(force=false){
    const locationEl=$('weatherLocation'),content=$('weatherContent');if(!locationEl||!content)return;
    const c=weatherConfig(),city=(c.place||'Great Yarmouth').trim();locationEl.textContent=city;
    let cached=null;try{cached=JSON.parse(localStorage.getItem('familyWeatherCache')||'null')}catch(e){}
    if(!force&&cached&&cached.city===city&&Date.now()-cached.at<30*60*1000){locationEl.textContent=cached.location||city;content.innerHTML=cached.html;return}
    content.innerHTML='<div class="weather-loading">Updating forecast…</div>';
    try{
      const query=encodeURIComponent(city);let gj=await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=en&format=json&countryCode=GB`);
      let place=(gj.results||[])[0];
      if(!place){gj=await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=en&format=json`);place=(gj.results||[])[0]}
      if(!place)throw new Error('Town or city not found');
      const fr=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(place.latitude)}&longitude=${encodeURIComponent(place.longitude)}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=2`;
      const fj=await fetchJson(fr);if(!fj.daily)throw new Error('Forecast unavailable');
      const location=[place.name,place.admin1,place.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', '),html=dayHtml(fj.daily,0,'Today')+dayHtml(fj.daily,1,'Tomorrow');
      locationEl.textContent=location||city;content.innerHTML=html;localStorage.setItem('familyWeatherCache',JSON.stringify({at:Date.now(),city,location,html}));
    }catch(err){
      const old=cached&&cached.html;if(old){locationEl.textContent=cached.location||city;content.innerHTML=old+'<small class="weather-stale">Last saved forecast</small>'}
      else content.innerHTML=`<div class="weather-error"><b>Weather unavailable</b><br><small>${String(err.name==='AbortError'?'Connection timed out':err.message)}. Tap ⚙ and try again.</small></div>`;
    }
  };
  const saveWeather=$('saveWeather'),weatherPlace=$('weatherPlace'),weatherDialog=$('weatherDialog');
  if(saveWeather&&weatherPlace&&weatherDialog)saveWeather.onclick=e=>{e.preventDefault();localStorage.setItem('familyWeather',JSON.stringify({place:weatherPlace.value.trim()||'Great Yarmouth'}));localStorage.removeItem('familyWeatherCache');weatherDialog.close();window.loadWeather(true)};
  window.loadWeather(true);
})();