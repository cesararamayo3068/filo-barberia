import { Injectable,inject } from '@angular/core';
import { HttpClient,HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { Appointment,AppointmentInput,CatalogKind,CatalogRecord,Client,Service,Barber } from './models';
@Injectable({providedIn:'root'})
export class ApiService {
 private http=inject(HttpClient);
 private router=inject(Router);
 clients(){return firstValueFrom(this.http.get<Client[]>('/api/clients'));}
 services(){return firstValueFrom(this.http.get<Service[]>('/api/services'));}
 barbers(){return firstValueFrom(this.http.get<Barber[]>('/api/barbers'));}
 appointments(from:string,to:string){return firstValueFrom(this.http.get<Appointment[]>('/api/appointments',{params:{from,to}}));}
 history(id:number){return firstValueFrom(this.http.get<Appointment[]>('/api/clients/'+id+'/appointments'));}
 saveAppointment(value:AppointmentInput,id?:number){return firstValueFrom(id?this.http.put<Appointment>('/api/appointments/'+id,value):this.http.post<Appointment>('/api/appointments',value));}
 saveRecord(kind:CatalogKind,value:object,id?:number){return firstValueFrom(id?this.http.put<CatalogRecord>('/api/'+kind+'/'+id,value):this.http.post<CatalogRecord>('/api/'+kind,value));}
 error(e:unknown):string{
  if(e instanceof HttpErrorResponse){
   if(e.status===401){void this.router.navigateByUrl('/login');return 'La sesión venció. Volvé a ingresar.';}
   if(e.status===403)return 'La sesión o el permiso de seguridad venció. Recargá la página.';
   if(e.status===0)return 'No se pudo conectar con el servidor. Revisá la conexión.';
   return (e.error as {detail?:string}|null)?.detail??'No se pudo guardar. Recargá los datos e intentá de nuevo.';
  }
  return 'Ocurrió un error. Intentá nuevamente.';
 }
}
