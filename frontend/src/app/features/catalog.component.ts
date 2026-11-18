import {Component,OnInit,inject,signal,computed} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {CurrencyPipe} from '@angular/common';
import {ApiService} from '../core/api.service';
import {CatalogKind,CatalogRecord,Client,Service} from '../core/models';
import {CatalogEditorComponent} from '../shared/catalog-editor.component';
@Component({selector:'filo-catalog',imports:[CurrencyPipe,CatalogEditorComponent],template:`
<div class="content"><section class="intro"><div><p class="eyebrow">{{kind==='clients'?'BASE DE CLIENTES':kind==='services'?'CATÁLOGO':'BARBERÍA'}}</p><h1>{{title}}</h1><p>{{description}}</p></div><button class="btn primary" [disabled]="loading()" (click)="edit(null)">＋ {{addLabel}}</button></section>
<div class="list-controls"><input type="search" class="list-search" aria-label="Buscar por nombre o teléfono" placeholder="Buscar por nombre o teléfono" [value]="query()" (input)="query.set($any($event.target).value)"><span class="hint">{{rows().length}} registros</span></div>
@if(error()){<div class="notice error" role="alert">{{error()}} <button class="btn" (click)="load()">Reintentar</button></div>}
@if(message()){<p role="status" class="notice">{{message()}}</p>}
@if(loading()){<p role="status">Cargando datos…</p>}
@else{<div class="cards">@for(r of filtered();track r.id){<article class="panel tile"><div class="tile-top"><span class="tile-icon">{{kind==='services'?'✂':kind==='clients'?'♙':'◫'}}</span><span class="record-state" [class.inactive]="!r.active">{{r.active?'Activo':'Inactivo'}}</span></div><h2>{{r.name}}</h2>
@if(kind==='clients'){<p>{{phone(r)||'Sin teléfono'}}</p>}@else if(kind==='services'){<p>{{service(r).duration}} min · {{service(r).price|currency:'ARS':'symbol-narrow':'1.0-2':'es-AR'}}</p>}@else{<p>Integrante del equipo</p>}
<button class="btn" (click)="edit(r)">{{kind==='clients'?'Ver ficha':'Editar'}}</button></article>}
@empty{<div class="panel empty"><h2>{{query()?'Sin resultados':'Empecemos por lo básico'}}</h2><p>{{query()?'Probá buscar con otro nombre.':'Agregá el primer registro para empezar a organizar tu barbería.'}}</p></div>}</div>}
</div>
@if(editor()){<filo-catalog-editor [kind]="kind" [record]="selected" (closed)="editor.set(false)" (saved)="onSaved()" />}`})
export class CatalogComponent implements OnInit {
 private route=inject(ActivatedRoute);private api=inject(ApiService);kind=this.route.snapshot.data['kind'] as CatalogKind;
 rows=signal<CatalogRecord[]>([]);query=signal('');loading=signal(true);error=signal('');message=signal('');editor=signal(false);selected:CatalogRecord|null=null;
 get title(){return this.kind==='clients'?'Clientes':this.kind==='services'?'Servicios':'Equipo';}
 get addLabel(){return this.kind==='clients'?'Nuevo cliente':this.kind==='services'?'Nuevo servicio':'Nuevo barbero';}
 get description(){return this.kind==='clients'?'Datos de contacto, notas e historial de cada persona.':this.kind==='services'?'Precios y duración de los servicios de tu barbería.':'Las personas que hacen que tu barbería funcione.';}
 filtered=computed(()=>{const normalize=(v:string)=>v.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();const q=normalize(this.query());return this.rows().filter(r=>normalize(r.name+' '+this.phone(r)).includes(q));});
 phone(r:CatalogRecord){return 'phone'in r?r.phone:'';}
 service(r:CatalogRecord){return r as Service;}
 ngOnInit(){void this.load();}
 async load(){this.loading.set(true);this.error.set('');try{this.rows.set(await(this.kind==='clients'?this.api.clients():this.kind==='services'?this.api.services():this.api.barbers()));}catch(e){this.error.set(this.api.error(e));}finally{this.loading.set(false);}}
 edit(r:CatalogRecord|null){this.selected=r;this.editor.set(true);this.message.set('');}
 onSaved(){this.editor.set(false);this.message.set('Cambios guardados en la base de datos.');void this.load();}
}
