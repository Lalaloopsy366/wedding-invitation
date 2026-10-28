const paperMusic=document.getElementById('paper-music');
const floatingMusic=document.getElementById('music');
if(paperMusic&&floatingMusic){
 const syncMusic=()=>{const playing=floatingMusic.getAttribute('aria-pressed')==='true';paperMusic.setAttribute('aria-label',playing?'Выключить нашу мелодию':'Включить нашу мелодию');paperMusic.setAttribute('aria-pressed',String(playing));document.getElementById('paper-music-label').textContent=playing?'Мелодия звучит':'Включить нашу мелодию';paperMusic.querySelector('.music-play').textContent=playing?'Ⅱ':'▶';};
 paperMusic.addEventListener('click',()=>floatingMusic.click());
 new MutationObserver(syncMusic).observe(floatingMusic,{attributes:true,attributeFilter:['aria-pressed']});
 syncMusic();
}

const rsvpDock=document.getElementById('rsvp-dock');
const rsvpLink=rsvpDock?.querySelector('.floating-rsvp');
if(rsvpDock&&rsvpLink){
 let frame=0;
 const updateRsvpPosition=()=>{
  frame=0;
  const rect=rsvpDock.getBoundingClientRect();
  const gap=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rsvp-dock-gap'))||22;
  // A permanent slot keeps this threshold stable in both button states.
  const fixedTop=window.innerHeight-gap-rect.height;
  rsvpLink.classList.toggle('is-docked',rect.top<=fixedTop);
 };
 const scheduleRsvpPosition=()=>{if(!frame)frame=requestAnimationFrame(updateRsvpPosition);};
 window.addEventListener('scroll',scheduleRsvpPosition,{passive:true});
 window.addEventListener('resize',scheduleRsvpPosition);
 window.addEventListener('pageshow',scheduleRsvpPosition);
 window.addEventListener('load',scheduleRsvpPosition);
 new ResizeObserver(scheduleRsvpPosition).observe(rsvpDock);
 document.fonts?.ready.then(scheduleRsvpPosition);
 scheduleRsvpPosition();
}
