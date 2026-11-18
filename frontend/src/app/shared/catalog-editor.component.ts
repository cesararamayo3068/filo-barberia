import {AfterViewInit,OnInit,Component,ElementRef,EventEmitter,Input,Output,ViewChild,inject,signal} from '@angular/core';
import {ReactiveFormsModule,NonNullableFormBuilder,Validators} from '@angular/forms';
import {CurrencyPipe,DatePipe} from '@angular/common';
import {ApiService} from '../core/api.service';
import {Appointment,CatalogKind,CatalogRecord,Client,Service,statuses} from '../core/models';
@Component({selector:'filo-catalog-editor',imports:[ReactiveFormsModule,CurrencyPipe,DatePipe],template:`
<dialog #dialog (cancel)="onCancel($event)" aria-labelledby="record-title"><div class="modal-inner"><div class="modal-head"><h2 id="record-title">{{record?'Editar':'Agregar'}} {{label}}</h2><button class="btn icon" aria-label="Cerrar" [disabled]="busy()" (click)="closed.emit()">×</button></div>
<form [formGroup]="form" (ngSubmit)="save()"><fieldset class="form-grid" [disabled]="busy()">
<label class="field full">Nombre<input formControlName="name" maxlength="80" required></label>
@if(kind==='clients'){
<label class="field full">Teléfono<input formControlName="phone" maxlength="32" type="tel"></label>
<label class="field full">Notas<textarea formControlName="notes" maxlength="500"></textarea></label>
}
@if(kind==='services'){
<label class="field">Duración (minutos)<input formControlName="duration" type="number" min="15" max="240" step="5" required></label>
<label class="field">Precio (ARS)<input formControlName="price" type="number" min="0" max="9999999999.99" step="0.01" required></label>
}
<label class="check-field full"><input type="checkbox" formControlName="active"> Activo para nuevos turnos</label>
</fieldset>
@if(error()){<p class="error" role="alert">{{error()}}</p>}
<div class="modal-actions"><button type="button" class="btn" [disabled]="busy()" (click)="closed.emit()">Cerrar</button><button type="submit" class="btn primary" [disabled]="busy()||form.invalid">{{busy()?'Guardando…':'Guardar'}}</button></div></form>
@if(kind==='clients'&&record){<h3>Historial de turnos</h3>@if(historyLoading()){<p class="hint" role="status">Cargando historial…</p>}
@else if(historyError()){<p class="error" role="alert">{{historyError()}}</p>}
@else if(history().length){<ul class="history">@for(a of history();track a.id){<li>{{a.date|date:'dd/MM/yyyy'}} · {{a.time.slice(0,5)}}<br>{{a.serviceName}} · {{a.barberName}} · {{statuses[a.status]}} · {{a.price|currency:'ARS':'symbol-narrow':'1.0-2':'es-AR'}}</li>}</ul>}
@else{<p class="hint">Este cliente todavía no tiene turnos.</p>}}
</div></dialog>`})
export class CatalogEditorComponent implements OnInit,AfterViewInit{
 @Input() kind:CatalogKind='clients';@Input() record:CatalogRecord|null=null;
 @Output() closed=new EventEmitter<void>();@Output() saved=new EventEmitter<void>();
 @ViewChild('dialog',{static:true}) dialog!:ElementRef<HTMLDialogElement>;
 private fb=inject(NonNullableFormBuilder);private api=inject(ApiService);
 busy=signal(false);error=signal('');history=signal<Appointment[]>([]);historyLoading=signal(false);historyError=signal('');statuses=statuses;
 form=this.fb.group({name:['',[Validators.required,Validators.maxLength(80),Validators.pattern(/\S/)]],phone:['',Validators.maxLength(32)],notes:['',Validators.maxLength(500)],active:[true],duration:[30,[Validators.required,Validators.min(15),Validators.max(240)]],price:[0,[Validators.required,Validators.min(0),Validators.max(9999999999.99)]]});
 get label(){return this.kind==='clients'?'cliente':this.kind==='services'?'servicio':'barbero';}
 ngOnInit(){if(this.record)this.form.patchValue(this.record);if(this.kind==='clients'&&this.record)void this.loadHistory(this.record.id);}
 ngAfterViewInit(){this.dialog.nativeElement.showModal();}
 onCancel(event:Event){if(this.busy())event.preventDefault();else this.closed.emit();}
 async loadHistory(id:number){this.historyLoading.set(true);try{this.history.set(await this.api.history(id));}catch(e){this.historyError.set(this.api.error(e));}finally{this.historyLoading.set(false);}}
 async save(){
  if(this.form.invalid||this.busy())return;this.busy.set(true);this.error.set('');
  const v=this.form.getRawValue();
  const common={name:v.name.trim(),active:v.active,version:this.record?.version??null};
  const data=this.kind==='clients'?{...common,phone:v.phone,notes:v.notes}:this.kind==='services'?{...common,duration:v.duration,price:v.price}:common;
  try{await this.api.saveRecord(this.kind,data,this.record?.id);this.saved.emit();}
  catch(e){this.error.set(this.api.error(e));}finally{this.busy.set(false);}
 }
}
