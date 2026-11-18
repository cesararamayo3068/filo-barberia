import {describe,it,expect} from 'vitest';
import {layoutEvents} from './agenda.component';
import {Appointment} from '../core/models';
const a=(id:number,time:string,duration:number)=>({id,time,duration} as Appointment);
describe('Distribución de turnos simultáneos',()=>{
 it('mantiene visibles los turnos que se superponen y reinicia las columnas después',()=>{
  const events=layoutEvents([a(1,'09:00',60),a(2,'09:30',30),a(3,'10:00',30)]);
  expect(events.map(e=>[e.lane,e.lanes])).toEqual([[0,2],[1,2],[0,1]]);
 });
});
