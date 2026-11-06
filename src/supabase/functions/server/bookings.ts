import { HOURS, hasTooManyConsecutiveHours } from '../../../lib/bookingRules.mjs';
const validDate = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
export function registerBookings(app, db) {
  const prefix='/make-server-2b20b999';
  app.get(`${prefix}/bookings`, async c=>{
    try {
      const bookings=[];let expected;
      for(let offset=0;offset<50000;offset+=500) {
        const {data,error,count}=await db().from('kv_store_2b20b999').select('key,value',{count:'exact'}).like('key','booking:%').order('key').range(offset,offset+499);
        if(error||!Array.isArray(data)||count===null||expected!==undefined&&expected!==count)throw Error('Calendar incomplete');
        expected=count;bookings.push(...data.map(row=>row.value));
        if(bookings.length===count) {
          const active=bookings.filter(row=>!['cancelled','rejected'].includes(row.status));
          if(active.some(row=>!validDate(row.date)||!HOURS.includes(row.hour)))throw Error('Invalid calendar');
          // Occupancy only: customer identities are never exposed publicly.
          return c.json({bookings:active.map(row=>({date:row.date,hour:row.hour}))});
        }
        if(data.length!==500)throw Error('Calendar incomplete');
      }
      throw Error('Calendar too large');
    } catch { return c.json({error:'Calendrier indisponible. Réessayez plus tard.'},503); }
  });
  async function create(c,batch) {
    try {
      const raw=await c.req.text();if(raw.length>4000)return c.json({error:'Demande trop volumineuse'},413);
      let body;try{body=JSON.parse(raw);}catch{return c.json({error:'Demande invalide'},400);}
      const {date,clientName,clientEmail}=body,slots=batch?body.slots:[body.hour];
      if(!validDate(date)||typeof clientName!=='string'||!clientName.trim()||clientName.length>150||typeof clientEmail!=='string'||clientEmail.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(clientEmail)||!Array.isArray(slots)||slots.length<1||slots.length>16||new Set(slots).size!==slots.length||!slots.every(hour=>Number.isInteger(hour)&&HOURS.includes(hour)))return c.json({error:'Date, créneaux ou coordonnées invalides'},400);
      if(hasTooManyConsecutiveHours(slots))return c.json({error:'Vous ne pouvez pas réserver plus de 2 heures consécutives.'},400);
      if(date < new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris'}).format(new Date()))return c.json({error:'La date de réservation est passée.'},400);
      // Civil date as used by the actual deployed calendar; never shift existing bookings.
      const bookings=slots.map(hour=>({id:crypto.randomUUID(),date,hour,clientName:clientName.trim(),clientEmail:clientEmail.trim(),status:'accepted',createdAt:new Date().toISOString()}));
      const {data,error}=await db().rpc('soulor_create_wellness_group',{p_bookings:bookings});
      if(error)throw error;
      if(!data?.success)return c.json({error:'Un créneau vient d’être réservé. Actualisez le calendrier.'},409);
      return c.json({success:true});
    } catch { return c.json({error:'Impossible d’enregistrer la réservation. Actualisez avant de réessayer.'},503); }
  }
  app.post(`${prefix}/bookings/batch`,c=>create(c,true));
  // Compatibility with already-open older clients, without allowing overwrites by caller-supplied IDs.
  app.post(`${prefix}/bookings`,c=>create(c,false));
}
