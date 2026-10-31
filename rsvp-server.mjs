import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
const ATTENDANCE = new Set(['Да, с радостью буду!', 'К сожалению, не смогу', 'Пока в раздумьях']);
const FOOD = new Set(['Мясо','Птица','Рыба','Вегетарианское','Без предпочтений']);
const DRINKS = new Set(['Красное вино','Белое вино','Игристое','Крепкие напитки','Безалкогольные']);


function text(value, limit, required=false) {
 if(value===undefined||value===null) { if(required) throw Error('invalid'); return ''; }
 if(typeof value!=='string'||value.length>limit)throw Error('invalid');
 const clean=value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim();
 if(required&&!clean)throw Error('invalid');return clean;
}
function choices(values, allowed) {
 if(values===undefined)return [];
 if(!Array.isArray(values)||values.length>allowed.size||values.some(v=>typeof v!=='string'||!allowed.has(v)))throw Error('invalid');
 return [...new Set(values)];
}
export function normalizeRsvp(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('invalid');
 const name=text(data.name,100,true),attendance=text(data.attendance,80,true);
 if(!ATTENDANCE.has(attendance))throw Error('invalid');
 if(text(data.website,300))throw Error('invalid');
 const submissionId=text(data.submissionId,80,true);
 if(!/^[a-zA-Z0-9_-]{16,80}$/.test(submissionId))throw Error('invalid');
 if(attendance==='К сожалению, не смогу')return {name,attendance,submissionId};
 return {name,attendance,submissionId,food:choices(data.food,FOOD),drinks:choices(data.drinks,DRINKS),foodOther:text(data.foodOther,300),drinksOther:text(data.drinksOther,200),allergies:text(data.allergies,500),songs:text(data.songs,500)};
}
export function formatRsvp(data){
 const lines=['💌 Анкета гостя','Свадьба Сергея и Александры · 08.07.2027','','Гость: '+data.name,'Присутствие: '+data.attendance];
 if(data.attendance!=='К сожалению, не смогу')lines.push('','Еда: '+([...data.food,data.foodOther].filter(Boolean).join(', ')||'Не указано'),'Напитки: '+([...data.drinks,data.drinksOther].filter(Boolean).join(', ')||'Не указано'),'Аллергии и особенности питания: '+(data.allergies||'Не указано'),'Пожелания по музыке: '+(data.songs||'Не указано'));
 return lines.join('\n');
}

const allowedOrigins=new Set(['https://lalaloopsy366.github.io','https://invitationfromsa.ru','https://www.invitationfromsa.ru']);
const submissions=new Map(), attempts=new Map();
function response(body,status=200,origin=null){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(origin)headers['Access-Control-Allow-Origin']=origin;
 return new Response(JSON.stringify(body),{status,headers});
}
const fail=(message,status,origin)=>response({ok:false,error:message},status,origin);
const configured=env=>Boolean(env.TELEGRAM_BOT_TOKEN&&env.TELEGRAM_CHAT_ID);
const signature=(value,secret)=>createHmac('sha256',secret).update(value).digest('base64url');
function validSession(token,origin,secret){
 const parts=token.split('.');
 if(parts.length!==3||!/^[a-f0-9]{32}$/.test(parts[0])||!/^\d{13}$/.test(parts[1]))return false;
 const expires=Number(parts[1]),now=Date.now();
 if(expires<now||expires>now+3600000)return false;
 const expected=signature(origin+'|'+parts[0]+'.'+parts[1],secret);
 const a=Buffer.from(expected),b=Buffer.from(parts[2]);
 return a.length===b.length&&timingSafeEqual(a,b);
}
function rate(ip,kind,limit){
 const now=Date.now();
 for(const [key,item]of attempts)if(item.expires<now)attempts.delete(key);
 const key=kind+'|'+ip,item=attempts.get(key)||{count:0,expires:now+600000};
 item.count++;attempts.set(key,item);
 if(attempts.size>1000)attempts.delete(attempts.keys().next().value);
 return item.count>limit;
}
async function readBody(request){
 const reader=request.body?.getReader();if(!reader)throw Error('invalid');
 const chunks=[];let size=0;
 try{
  while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>10000){await reader.cancel();throw Error('large');}chunks.push(item.value);}
 }finally{reader.releaseLock();}
 return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
}
export async function handleReply(request,context={},env={},send=fetch){
 const origin=request.headers.get('Origin');
 if(origin&&!allowedOrigins.has(origin))return fail('Откройте анкету на сайте приглашения.',403);
 const path=new URL(request.url).pathname,kind=path.split('/').filter(Boolean).at(-1);
 if(!['health','session','reply'].includes(kind))return fail('Адрес не найден.',404,origin);
 if(request.method==='OPTIONS'){
  const method=kind==='reply'?'POST':'GET';
  const requested=(request.headers.get('Access-Control-Request-Headers')||'').toLowerCase().split(',').map(h=>h.trim()).filter(Boolean);
  if(!origin||request.headers.get('Access-Control-Request-Method')!==method||requested.some(h=>!['content-type','x-rsvp-token'].includes(h)))return fail('Запрос не разрешён.',403,origin);
  const res=new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':method,'Access-Control-Allow-Headers':'Content-Type, X-RSVP-Token','Access-Control-Max-Age':'600','Vary':'Origin'}});
  return res;
 }
 if(kind==='health'){
  if(request.method!=='GET')return fail('Метод не поддерживается.',405,origin);
  return response({ok:true,service:'wedding-rsvp',telegramConfigured:configured(env)},200,origin);
 }
 if(!origin)return fail('Откройте анкету на сайте приглашения.',403);
 if(request.method!==(kind==='reply'?'POST':'GET'))return fail('Метод не поддерживается.',405,origin);
 if(!configured(env))return fail('Отправка пока настраивается. Напишите Александре.',503,origin);
 const ip=String(context.ip||'unknown');
 if(kind==='session'){
  if(rate(ip,'session',30))return fail('Подождите немного и попробуйте снова.',429,origin);
  const value=randomBytes(16).toString('hex')+'.'+(Date.now()+3600000);
  return response({ok:true,token:value+'.'+signature(origin+'|'+value,env.TELEGRAM_BOT_TOKEN)},200,origin);
 }
 if(!validSession(request.headers.get('X-RSVP-Token')||'',origin,env.TELEGRAM_BOT_TOKEN))return fail('Обновите страницу анкеты и попробуйте ещё раз.',403,origin);
 if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))return fail('Неверный формат анкеты.',415,origin);
 let data;
 try{data=normalizeRsvp(JSON.parse(await readBody(request)));}
 catch(error){return fail(error.message==='large'?'Ответ слишком длинный.':'Проверьте имя и выбранные ответы.',error.message==='large'?413:400,origin);}
 if(rate(ip,'reply',12))return fail('Слишком много попыток. Попробуйте через несколько минут.',429,origin);
 const now=Date.now();
 for(const [key,item]of submissions)if(item.expires<now)submissions.delete(key);
 const previous=submissions.get(data.submissionId);
 if(previous){const result=await previous.promise;return response(result.body,result.status,origin);}
 const delivery=(async()=>{
  try{
   const result=await send('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text:formatRsvp(data),link_preview_options:{is_disabled:true}}),
    signal:AbortSignal.timeout(12000)
   });
   const body=await result.json();
   if(result.ok&&body.ok===true)return {status:200,body:{ok:true}};
  }catch{}
  return {status:502,body:{ok:false,error:'Не удалось передать ответ в Telegram. Попробуйте ещё раз или напишите Александре.'}};
 })();
 if(submissions.size>=500)submissions.delete(submissions.keys().next().value);
 submissions.set(data.submissionId,{promise:delivery,expires:now+600000});
 const result=await delivery;
 if(result.status!==200)submissions.delete(data.submissionId);
 return response(result.body,result.status,origin);
}
export default (request,context)=>handleReply(request,context,{
 TELEGRAM_BOT_TOKEN:process.env.TELEGRAM_BOT_TOKEN,
 TELEGRAM_CHAT_ID:process.env.TELEGRAM_CHAT_ID
});
