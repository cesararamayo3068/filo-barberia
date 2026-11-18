export interface RecordBase {id:number;version:number;name:string;active:boolean;}
export interface Client extends RecordBase {phone:string;notes:string;}
export interface Service extends RecordBase {duration:number;price:number;}
export type Barber=RecordBase;
export type CatalogKind='clients'|'services'|'barbers';
export type CatalogRecord=Client|Service|Barber;
export type Status='CONFIRMED'|'PENDING'|'COMPLETE'|'CANCELLED';
export interface Appointment {
 id:number;version:number;clientId:number;clientName:string;barberId:number;barberName:string;serviceId:number;serviceName:string;
 date:string;time:string;duration:number;price:number;status:Status;notes:string;
}
export interface AppointmentInput {version:number|null;clientId:number;barberId:number;serviceId:number;date:string;time:string;status:Status;notes:string;}
export const statuses:Record<Status,string>={CONFIRMED:'Confirmado',PENDING:'Pendiente',COMPLETE:'Completado',CANCELLED:'Cancelado'};
export const dateKey=(d:Date):string=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export const parseDate=(s:string):Date=>new Date(s+'T12:00:00');
export const addDays=(d:Date,n:number):Date=>{const copy=new Date(d);copy.setDate(copy.getDate()+n);return copy;};
export const weekStart=(d:Date):Date=>addDays(d,-((d.getDay()+6)%7));
export const minutes=(time:string):number=>{const [h,m]=time.split(':').map(Number);return h*60+m;};
export const bookingToday=(now=new Date()):string=>{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 return ['year','month','day'].map(type=>parts.find(p=>p.type===type)!.value).join('-');
};
