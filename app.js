'use strict';
const $ = s => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const opening = $('#opening');
const invitation = $('#invitation');
function reveal(animate=true){
 if(!opening || opening.classList.contains('finished')) return;
 $('#envelope').disabled=true;
 if(animate){
  opening.classList.add('opened');
  if(!reduced) for(let i=0;i<24;i++){
   const b=document.createElement('span');b.className='butterfly';
   b.style.setProperty('--butterfly-scale',String(.8+Math.random()*.5));
   const angle=(i/24)*Math.PI*2;
   b.style.setProperty('--x',(Math.cos(angle)*(250+Math.random()*450))+'px');
   b.style.setProperty('--y',(-120-Math.random()*600)+'px');
   b.style.setProperty('--r',(Math.cos(angle)*80)+'deg');
   b.style.setProperty('--delay',(0.4+Math.random()*.55)+'s');
   $('#butterflies').append(b);
  }
 }
 setTimeout(()=>{
  opening.classList.add('finished'); invitation.inert=false; document.body.classList.remove('invitation-closed');
  if(animate) $('.hero h1').setAttribute('tabindex','-1'),$('.hero h1').focus({preventScroll:true});
 },animate&&!reduced?3300:0);
}
if(opening){
 $('#envelope').addEventListener('click',()=>reveal());
 if(location.hash) reveal(false);
 $('#replay').addEventListener('click',()=>{
  window.scrollTo({top:0,behavior:'instant'});opening.classList.remove('finished','opened');
  $('#butterflies').replaceChildren();$('#envelope').disabled=false;
  invitation.inert=true;document.body.classList.add('invitation-closed');
  $('#envelope').focus({preventScroll:true});
 });
}
if($('#calendar')){
 const calendar=$('#calendar'),offset=(new Date(2027,6,1).getDay()+6)%7;
 for(let i=0;i<offset+31;i++){
  const s=document.createElement('span');s.textContent=i<offset?'':String(i-offset+1);
  if(i-offset+1===8){s.className='wedding-day';s.setAttribute('aria-label','8 июля — день свадьбы');}
  calendar.append(s);
 }
}
function countdown(){
 if(!$('#countdown'))return;
 const remaining=new Date('2027-07-08T14:00:00+03:00').getTime()-Date.now();
 if(remaining<=0){$('#countdown').textContent='Наш день настал!';return;}
 const seconds=Math.floor(remaining/1000);
 const values=[Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];
 $('#countdown').replaceChildren(...values.map((v,i)=>{
 const el=document.createElement('div'),n=document.createElement('b'),label=document.createElement('small');
 n.textContent=String(v).padStart(2,'0');label.textContent=['ДНЕЙ','ЧАСОВ','МИНУТ','СЕКУНД'][i];el.append(n,label);return el;
 }));
}
countdown();if($('#countdown'))setInterval(countdown,1000);
for(const list of document.querySelectorAll('[data-options]')){
 for(const option of list.dataset.options.split('|')){
  const label=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span');
  input.type='checkbox';input.name=list.dataset.name;input.value=option;text.textContent=option;label.append(input,text);list.append(label);
 }
}
const form=$('#guest-form');
if(form){
 let sending=false,submissionId=null;
 const errorMessage=document.createElement('p');errorMessage.className='form-error';errorMessage.setAttribute('role','alert');errorMessage.hidden=true;$('.form-send').prepend(errorMessage);
 const resetSubmission=()=>{submissionId=null;errorMessage.hidden=true;};
 form.addEventListener('input',resetSubmission);
 form.addEventListener('change',()=>{
  resetSubmission();const no=form.elements.attendance.value==='К сожалению, не смогу';
  $('#preferences').hidden=no;
  for(const control of $('#preferences').querySelectorAll('input,textarea'))control.disabled=no;
 });
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(sending)return;const name=form.elements.name;
  if(!name.value.trim()){name.setCustomValidity('Пожалуйста, укажите фамилию и имя');name.reportValidity();return;}
  name.setCustomValidity('');if(!form.reportValidity())return;
  const d=new FormData(form);
  submissionId??=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  const payload={name:String(d.get('name')).trim(),attendance:d.get('attendance'),food:d.getAll('food'),drinks:d.getAll('drinks'),foodOther:d.get('foodOther')||'',drinksOther:d.get('drinksOther')||'',allergies:d.get('allergies')||'',songs:d.get('songs')||'',website:d.get('website')||'',submissionId};
  const button=form.querySelector('button[type=submit]'),original=button.innerHTML;
  sending=true;button.disabled=true;button.textContent='Отправляем…';errorMessage.hidden=true;
  try{
   const sessionResponse=await fetch('https://alexandra-sergey-080727.fornization.chatgpt.site/api/external-rsvp-session',{credentials:'omit',signal:AbortSignal.timeout(12000)});
   const session=await sessionResponse.json();
   if(!sessionResponse.ok||!session.ok)throw Error('Отправка временно недоступна. Попробуйте позже или напишите Александре.');
   const response=await fetch('https://alexandra-sergey-080727.fornization.chatgpt.site/api/external-rsvp',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json','X-RSVP-Token':session.token},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
   let result;try{result=await response.json();}catch{throw Error('Не удалось отправить ответ. Попробуйте ещё раз или напишите Александре.');}
   if(!response.ok||result.ok!==true)throw Error(result.error||'Не удалось отправить ответ. Попробуйте ещё раз.');
   form.hidden=true;const panel=$('#response-panel');panel.hidden=false;
   panel.closest('.form-main').classList.add('response-complete');
   panel.innerHTML='<h2>Спасибо за ваш ответ!</h2><p>Сергей и Александра получили вашу анкету.<br>До встречи в наш особенный день!</p><a class="button" href="index.html#home">Вернуться к приглашению ↗</a>';
   panel.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});
  }catch(error){
   errorMessage.textContent=error.name==='TimeoutError'?'Ответ отправляется дольше обычного. Попробуйте ещё раз или напишите Александре.':error.message;errorMessage.hidden=false;errorMessage.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});
  }finally{sending=false;button.disabled=false;button.innerHTML=original;}
 });
 form.elements.name.addEventListener('input',()=>form.elements.name.setCustomValidity(''));
}

// Original gentle music-box score, synthesized locally after a visitor gesture.
let audio=null,master=null,timer=null,playing=false,step=0,nextNote=0;
const melody=[72,76,79,76,74,71,67,71,69,72,76,72,67,71,74,71,65,69,72,69,67,71,74,71,60,64,67,72,71,67,64,67];
const bass=[48,43,45,43,41,43,48,43];
function tone(midi,time,volume,duration){
 const osc=audio.createOscillator(),gain=audio.createGain();
 osc.type='sine';osc.frequency.value=440*Math.pow(2,(midi-69)/12);
 gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.018);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
 osc.connect(gain);gain.connect(master);osc.start(time);osc.stop(time+duration+.05);
}
function schedule(){
 while(nextNote<audio.currentTime+.5){tone(melody[step%melody.length],nextNote,.15,2.2);if(step%4===0){tone(bass[Math.floor(step/4)%8],nextNote,.11,3.7);tone(bass[Math.floor(step/4)%8]+7,nextNote+.08,.045,3.2);}step++;nextNote+=.62;}
}
async function stopMusic(){
 playing=false;clearInterval(timer);timer=null;if(audio)await audio.suspend();
 $('#music').setAttribute('aria-pressed','false');$('#music').setAttribute('aria-label','Включить фоновую музыку');$('#music-label').textContent='Включить музыку';
}
$('#music')?.addEventListener('click',async()=>{
 if(playing){await stopMusic();return;}
 try{
  if(!audio){const AC=window.AudioContext||window.webkitAudioContext;audio=new AC();master=audio.createGain();master.gain.value=.3;master.connect(audio.destination);}
  await audio.resume();playing=true;nextNote=audio.currentTime+.05;schedule();timer=setInterval(schedule,150);
  $('#music').setAttribute('aria-pressed','true');$('#music').setAttribute('aria-label','Выключить фоновую музыку');$('#music-label').textContent='Выключить музыку';
 }catch{$('#music-label').textContent='Музыка недоступна';}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)stopMusic();});





