import {describe,it,expect} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {registerLocaleData} from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import {AgendaComponent} from './agenda.component';
import {ApiService} from '../core/api.service';
import {bookingToday,parseDate,addDays,dateKey} from '../core/models';

registerLocaleData(localeEsAr,'es-AR');
describe('Fechas disponibles en la agenda',()=>{
 it('bloquea los horarios de ayer, permite hoy y mañana, y abre Nuevo turno desde hoy',async()=>{
  const active={id:1,version:0,name:'Registro de prueba',active:true};
  await TestBed.configureTestingModule({
   imports:[AgendaComponent],
   providers:[provideRouter([]),{provide:ApiService,useValue:{
    clients:async()=>[{...active,phone:'',notes:''}],
    services:async()=>[{...active,duration:30,price:100}],
    barbers:async()=>[active],
    appointments:async()=>[]
   }}]
  }).compileComponents();
  const fixture=TestBed.createComponent(AgendaComponent),component=fixture.componentInstance;
  fixture.detectChanges();await component.load();fixture.detectChanges();
  expect(component.loading()).toBe(false);
  const today=parseDate(bookingToday()),yesterday=addDays(today,-1);
  component.view.set('day');component.focus.set(yesterday);fixture.detectChanges();
  const slots=()=>Array.from(fixture.nativeElement.querySelectorAll('button.slot')) as HTMLButtonElement[];
  expect(slots()).toHaveLength(12);
  expect(slots().every(slot=>slot.disabled)).toBe(true);
  component.open(null,dateKey(yesterday));
  expect(component.editor()).toBe(false);
  component.open();
  expect(component.editorDate).toBe(bookingToday());
  component.editor.set(false);
  for(const day of [today,addDays(today,1)]){
   component.focus.set(day);fixture.detectChanges();
   expect(slots().every(slot=>!slot.disabled)).toBe(true);
  }
  fixture.destroy();
 });
});
