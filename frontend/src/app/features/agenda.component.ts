import {Component,OnInit,inject,signal,computed} from '@angular/core';
import {CurrencyPipe,DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {ApiService} from '../core/api.service';
import {Appointment,Barber,Client,Service,Status,statuses,dateKey,addDays,weekStart,minutes,bookingToday,parseDate} from '../core/models';
import {AppointmentEditorComponent} from '../shared/appointment-editor.component';
interface CalendarEvent {appointment:Appointment;lane:number;lanes:number;}
export function layoutEvents(rows:Appointment[]):CalendarEvent[]{
 const result:CalendarEvent[]=[];let group:Omit<CalendarEvent,'lanes'>[]=[],ends:number[]=[],groupEnd=0;
 const flush=()=>{for(const item of group)result.push({...item,lanes:ends.length});group=[];ends=[];groupEnd=0;};
 for(const a of [...rows].sort((a,b)=>minutes(a.time)-minutes(b.time))){
  const start=minutes(a.time),end=start+a.duration;if(start>=groupEnd)flush();
  let lane=ends.findIndex(e=>e<=start);if(lane<0)lane=ends.length;
  ends[lane]=end;groupEnd=Math.max(groupEnd,end);group.push({appointment:a,lane});
 }
 flush();return result;
}
@Component({selector:'filo-agenda',imports:[CurrencyPipe,DatePipe,RouterLink,AppointmentEditorComponent],template:`
<div class="content"><section class="intro"><div><p class="eyebrow">GESTIÓN DE TURNOS</p><h1>Agenda</h1><p>Organizá los turnos y el día a día de tu barbería.</p></div><button class="btn primary" [disabled]="loading()||!ready()" (click)="open()">＋ Nuevo turno</button></section>
@if(error()){<div class="notice error" role="alert">{{error()}} <button class="btn" (click)="load()">Reintentar</button></div>}
@if(message()){<p class="notice" role="status">{{message()}}</p>}
@if(!loading()&&!ready()&&!error()){
<div class="panel setup"><h2>Prepará tu primer turno</h2><p>Cargá al menos un cliente, un servicio y un barbero activo para comenzar.</p><div class="header-actions"><a class="btn" routerLink="/clientes">Agregar clientes</a><a class="btn" routerLink="/servicios">Agregar servicios</a><a class="btn" routerLink="/equipo">Agregar equipo</a></div></div>
}
<div class="stats"><div class="stat"><div class="stat-icon">▦</div><div><span class="stat-label">Turnos del período</span><strong>{{loading()?'—':live().length}}</strong></div></div>
<div class="stat"><div class="stat-icon">✓</div><div><span class="stat-label">Confirmados</span><strong>{{loading()?'—':confirmed()}}</strong></div></div>
<div class="stat"><div class="stat-icon">$</div><div><span class="stat-label">Ingresos estimados</span><strong>{{loading()?'—':(income()|currency:'ARS':'symbol-narrow':'1.0-2':'es-AR')}}</strong></div></div></div>
<section class="panel" aria-label="Calendario"><div class="cal-tools"><button class="btn" (click)="today()">Hoy</button><div class="arrows"><button class="btn icon" aria-label="Período anterior" (click)="move(-1)">‹</button><button class="btn icon" aria-label="Período siguiente" (click)="move(1)">›</button></div>
<p class="date-label">@if(view()==='week'){{{days()[0]|date:'d MMM'}} – {{days()[6]|date:'d MMM yyyy'}}}@else{{{focus()|date:'EEEE d MMM yyyy'}}}</p>
<div class="tool-end"><select class="filter" aria-label="Filtrar por barbero" [value]="barberFilter()" (change)="barberFilter.set($any($event.target).value)"><option value="">Todos los barberos</option>@for(b of barbers();track b.id){<option [value]="b.id">{{b.name}}{{b.active?'':' (inactivo)'}}</option>}</select>
<div class="seg" aria-label="Vista del calendario"><button [class.active]="view()==='week'" [attr.aria-pressed]="view()==='week'" (click)="setView('week')">Semana</button><button [class.active]="view()==='day'" [attr.aria-pressed]="view()==='day'" (click)="setView('day')">Día</button></div></div></div>
<div class="legend">@for(s of statusKeys;track s){<span><i [class]="'dot '+s.toLowerCase()"></i>{{statuses[s]}}</span>}<span class="timezone">Hora de Argentina · 08:00 a 20:00</span></div>
@if(loading()){<p class="loading" role="status">Cargando agenda…</p>}
@else{
<div class="cal-scroll" tabindex="0" aria-label="Horarios del calendario"><div class="cal" [class.single]="view()==='day'" [style.--days]="days().length"><div class="cal-head"><div class="zone">HORA</div>
@for(d of days();track key(d)){<div [class.today]="key(d)===todayKey" [class.past-day]="key(d)<todayKey"><span class="day-name">{{d|date:'EEE'}}</span><span class="date-number">{{d|date:'d'}}</span></div>}</div>
<div class="cal-body"><div class="times">@for(h of hours;track h){<div>{{h}}</div>}</div>
@for(d of days();track key(d)){<div class="day-col" [class.today-col]="key(d)===todayKey" [class.past-day]="key(d)<todayKey"><div class="slots">@for(h of hours;track h){<button type="button" class="slot" [disabled]="!ready()||key(d)<todayKey" [attr.title]="key(d)<todayKey?'No se pueden reservar turnos en días anteriores a hoy':null" [attr.aria-label]="'Nuevo turno, '+key(d)+' a las '+h" (click)="open(null,key(d),h)"><span>＋</span></button>}</div>
@for(event of events(d);track event.appointment.id){<button type="button" [class]="'event '+event.appointment.status.toLowerCase()" [class.compact]="event.appointment.duration<35"
[style.top.px]="(minute(event.appointment.time)-480)/60*58+1" [style.height.px]="event.appointment.duration/60*58-2"
[style.left]="'calc('+(100*event.lane/event.lanes)+'% + 2px)'" [style.width]="'calc('+(100/event.lanes)+'% - 4px)'"
[attr.title]="eventLabel(event.appointment)" [attr.aria-label]="eventLabel(event.appointment)" (click)="open(event.appointment)">
<strong>{{event.appointment.clientName}}</strong><span>{{event.appointment.time.slice(0,5)}} · {{event.appointment.serviceName}}</span></button>}
</div>}</div></div></div>}
</section><p class="hint">Los ingresos estimados suman turnos confirmados y completados; no representan pagos cobrados.</p></div>
@if(editor()){<filo-appointment-editor [appointment]="selected" [date]="editorDate" [time]="editorTime" [barberId]="chosenBarber()" [clients]="clients()" [services]="services()" [barbers]="barbers()" (closed)="editor.set(false)" (saved)="onSaved($event)" />}`})
export class AgendaComponent implements OnInit{
 private api=inject(ApiService);private request=0;
 clients=signal<Client[]>([]);services=signal<Service[]>([]);barbers=signal<Barber[]>([]);appointments=signal<Appointment[]>([]);
 focus=signal(parseDate(bookingToday()));view=signal<'week'|'day'>(globalThis.matchMedia?.('(max-width:700px)').matches?'day':'week');barberFilter=signal('');
 loading=signal(true);error=signal('');message=signal('');editor=signal(false);selected:Appointment|null=null;editorDate='';editorTime='09:00';
 readonly statuses=statuses;readonly statusKeys=Object.keys(statuses) as Status[];get todayKey(){return bookingToday();}key=dateKey;minute=minutes;
 hours=Array.from({length:12},(_,i)=>String(i+8).padStart(2,'0')+':00');
 days=computed(()=>this.view()==='day'?[this.focus()]:Array.from({length:7},(_,i)=>addDays(weekStart(this.focus()),i)));
 chosenBarber=computed(()=>this.barberFilter()?Number(this.barberFilter()):null);
 filtered=computed(()=>this.appointments().filter(a=>!this.chosenBarber()||a.barberId===this.chosenBarber()));
 live=computed(()=>this.filtered().filter(a=>a.status!=='CANCELLED'));
 confirmed=computed(()=>this.live().filter(a=>a.status==='CONFIRMED').length);
 income=computed(()=>this.live().filter(a=>a.status==='CONFIRMED'||a.status==='COMPLETE').reduce((sum,a)=>sum+Math.round(a.price*100),0)/100);
 ready=computed(()=>this.clients().some(c=>c.active)&&this.services().some(s=>s.active)&&this.barbers().some(b=>b.active));
 ngOnInit(){void this.load();}
 async load(){
  const seq=++this.request;this.loading.set(true);this.error.set('');
  try{const [clients,services,barbers,appointments]=await Promise.all([this.api.clients(),this.api.services(),this.api.barbers(),this.api.appointments(dateKey(this.days()[0]),dateKey(this.days().at(-1)!))]);
   if(seq!==this.request)return;this.clients.set(clients);this.services.set(services);this.barbers.set(barbers);this.appointments.set(appointments);
  }catch(e){if(seq===this.request){this.appointments.set([]);this.error.set(this.api.error(e));}}
  finally{if(seq===this.request)this.loading.set(false);}
 }
 events(d:Date){return layoutEvents(this.filtered().filter(a=>a.date===dateKey(d)));}
 eventLabel(a:Appointment){return a.clientName+' · '+a.time.slice(0,5)+' · '+a.serviceName+' · '+a.barberName+' · '+statuses[a.status];}
 move(n:number){this.focus.set(addDays(this.focus(),n*(this.view()==='week'?7:1)));void this.load();}
 today(){this.focus.set(parseDate(bookingToday()));void this.load();}
 setView(v:'week'|'day'){this.view.set(v);void this.load();}
 open(a:Appointment|null=null,date=dateKey(this.focus())<this.todayKey?this.todayKey:dateKey(this.focus()),time='09:00'){if(!a&&date<this.todayKey)return;this.selected=a;this.editorDate=date;this.editorTime=time;this.message.set('');this.editor.set(true);}
 onSaved(a:Appointment){this.editor.set(false);this.message.set(a.status==='CANCELLED'?'Turno cancelado.':'Turno guardado en la base de datos.');void this.load();}
}
