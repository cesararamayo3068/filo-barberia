import {AfterViewInit,OnInit,Component,ElementRef,EventEmitter,Input,Output,ViewChild,inject,signal} from '@angular/core';
import {ReactiveFormsModule,FormBuilder,Validators} from '@angular/forms';
import {CurrencyPipe} from '@angular/common';
import {ApiService} from '../core/api.service';
import {Appointment,AppointmentInput,Barber,Client,Service,Status,statuses,bookingToday} from '../core/models';
@Component({selector:'filo-appointment-editor',imports:[ReactiveFormsModule,CurrencyPipe],template:`
<dialog #dialog (cancel)="onCancel($event)" aria-labelledby="appointment-title"><div class="modal-inner">
<div class="modal-head"><h2 id="appointment-title">{{appointment?'Editar turno':'Nuevo turno'}}</h2><button class="btn icon" aria-label="Cerrar" [disabled]="busy()" (click)="closed.emit()">×</button></div>
@if(confirmCancel()){
 <p>El horario quedará libre y el turno seguirá en el historial del cliente.</p>
 <div class="modal-actions"><button class="btn" [disabled]="busy()" (click)="confirmCancel.set(false)">Volver</button><button class="btn primary" [disabled]="busy()" (click)="cancelAppointment()">Confirmar cancelación</button></div>
} @else {
<form [formGroup]="form" (ngSubmit)="save()"><fieldset [disabled]="busy()" class="form-grid">
<label class="field full">Cliente<select formControlName="clientId"><option [ngValue]="null">Elegí un cliente</option>@for(c of availableClients;track c.id){<option [ngValue]="c.id">{{c.name}}{{c.active?'':' (inactivo)'}}</option>}</select></label>
<label class="field">Servicio<select formControlName="serviceId"><option [ngValue]="null">Elegí un servicio</option>@for(s of availableServices;track s.id){<option [ngValue]="s.id">{{s.name}}{{s.active?'':' (inactivo)'}}</option>}</select></label>
<label class="field">Barbero<select formControlName="barberId"><option [ngValue]="null">Elegí un barbero</option>@for(b of availableBarbers;track b.id){<option [ngValue]="b.id">{{b.name}}{{b.active?'':' (inactivo)'}}</option>}</select></label>
<label class="field">Fecha<input type="date" formControlName="date" [min]="minimumDate" required></label><label class="field">Hora<input type="time" formControlName="time" step="300" min="08:00" max="19:45" required></label>
<label class="field full">Estado<select formControlName="status">@for(s of statusKeys;track s){<option [ngValue]="s">{{statuses[s]}}</option>}</select></label>
<label class="field full">Notas<textarea formControlName="notes" maxlength="500"></textarea></label>
</fieldset>
@if(selectedService();as service){<p class="hint">{{snapshotDuration(service)}} min · {{snapshotPrice(service)|currency:'ARS':'symbol-narrow':'1.0-2':'es-AR'}} · Hora de Argentina</p>}
@if(error()){<p class="error" role="alert">{{error()}}</p>}
@if(form.hasError('pastDate')){<p class="error" role="alert">Para reservar o reprogramar, elegí hoy o una fecha futura.</p>}
<div class="modal-actions">
@if(appointment&&appointment.status!=='CANCELLED'){<button type="button" class="btn danger" [disabled]="busy()" (click)="confirmCancel.set(true)">Cancelar turno</button>}
<button type="button" class="btn" [disabled]="busy()" (click)="closed.emit()">Cerrar</button>
<button class="btn primary" type="submit" [disabled]="busy()||form.invalid">{{busy()?'Guardando…':'Guardar turno'}}</button></div></form>
}
@if(confirmCancel()&&error()){<p class="error" role="alert">{{error()}}</p>}
</div></dialog>`})
export class AppointmentEditorComponent implements OnInit,AfterViewInit {
 @Input() appointment:Appointment|null=null;@Input() clients:Client[]=[];@Input() services:Service[]=[];@Input() barbers:Barber[]=[];
 @Input() date='';@Input() time='09:00';@Input() barberId:number|null=null;
 @Output() closed=new EventEmitter<void>();@Output() saved=new EventEmitter<Appointment>();
 @ViewChild('dialog',{static:true}) dialog!:ElementRef<HTMLDialogElement>;
 private fb=inject(FormBuilder);private api=inject(ApiService);busy=signal(false);error=signal('');confirmCancel=signal(false);
 statuses=statuses;statusKeys=Object.keys(statuses) as Status[];
 form=this.fb.group({clientId:this.fb.control<number|null>(null,Validators.required),serviceId:this.fb.control<number|null>(null,Validators.required),barberId:this.fb.control<number|null>(null,Validators.required),
 date:['',Validators.required],time:['09:00',Validators.required],status:this.fb.nonNullable.control<Status>('CONFIRMED',Validators.required),notes:this.fb.nonNullable.control('',Validators.maxLength(500))},{validators:control=>{
  const v=control.value,a=this.appointment;
  if(!v.date||v.date>=bookingToday())return null;
  const unchanged=a&&v.date===a.date&&v.time===a.time.slice(0,5)&&v.clientId===a.clientId&&v.barberId===a.barberId&&v.serviceId===a.serviceId;
  return unchanged&&!(a.status==='CANCELLED'&&v.status!=='CANCELLED')?null:{pastDate:true};
 }});
 get minimumDate(){return bookingToday();}
 get availableClients(){return this.clients.filter(c=>c.active||c.id===this.appointment?.clientId);}
 get availableServices(){return this.services.filter(s=>s.active||s.id===this.appointment?.serviceId);}
 get availableBarbers(){return this.barbers.filter(b=>b.active||b.id===this.appointment?.barberId);}
 ngOnInit(){if(this.appointment)this.form.patchValue({...this.appointment,time:this.appointment.time.slice(0,5)});else this.form.patchValue({date:this.date,time:this.time,barberId:this.barberId});}
 ngAfterViewInit(){this.dialog.nativeElement.showModal();}
 onCancel(event:Event){if(this.busy())event.preventDefault();else this.closed.emit();}
 selectedService(){return this.services.find(s=>s.id===this.form.controls.serviceId.value);}
 snapshotDuration(s:Service){return this.appointment?.serviceId===s.id?this.appointment.duration:s.duration;}
 snapshotPrice(s:Service){return this.appointment?.serviceId===s.id?this.appointment.price:s.price;}
 async save(){
  if(this.form.invalid||this.busy())return;
  const v=this.form.getRawValue();
  await this.submit({version:this.appointment?.version??null,clientId:v.clientId!,serviceId:v.serviceId!,barberId:v.barberId!,date:v.date!,time:v.time!,status:v.status,notes:v.notes});
 }
 async cancelAppointment(){
  if(!this.appointment)return;
  const a=this.appointment;await this.submit({version:a.version,clientId:a.clientId,barberId:a.barberId,serviceId:a.serviceId,date:a.date,time:a.time,status:'CANCELLED',notes:a.notes});
 }
 private async submit(v:AppointmentInput){
  if(this.busy())return;this.busy.set(true);this.error.set('');
  try{this.saved.emit(await this.api.saveAppointment(v,this.appointment?.id));}
  catch(e){this.error.set(this.api.error(e));}finally{this.busy.set(false);}
 }
}
