import {describe,it,expect} from 'vitest';
import {dateKey,weekStart,addDays,bookingToday} from './models';
describe('Calendario local',()=>{
 it('usa la fecha de Argentina al cambiar el día en UTC',()=>{
  expect(bookingToday(new Date('2026-11-18T02:59:59Z'))).toBe('2026-11-17');
  expect(bookingToday(new Date('2026-11-18T03:00:00Z'))).toBe('2026-11-18');
 });
 it('calcula la semana desde el lunes y no desde UTC',()=>{const d=new Date(2026,10,8,23,30);expect(dateKey(weekStart(d))).toBe('2026-11-02');expect(dateKey(addDays(d,1))).toBe('2026-11-09');});
 it('cruza un cambio de año sin alterar la fecha local',()=>expect(dateKey(addDays(new Date(2026,11,31),1))).toBe('2027-01-01'));
});
