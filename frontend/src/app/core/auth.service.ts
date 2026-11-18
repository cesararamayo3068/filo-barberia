import { Injectable,inject,signal } from '@angular/core';
import { HttpClient,HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
@Injectable({providedIn:'root'})
export class AuthService {
 private http=inject(HttpClient);
 username=signal<string|null>(null);
 async csrf(){await firstValueFrom(this.http.get('/api/csrf'));}
 async restore():Promise<boolean>{
  try{await this.csrf();const s=await firstValueFrom(this.http.get<{username:string}>('/api/session'));this.username.set(s.username);return true;}
  catch{this.username.set(null);return false;}
 }
 async login(username:string,password:string){
  await this.csrf();
  await firstValueFrom(this.http.post('/api/login',new HttpParams().set('username',username).set('password',password),{responseType:'text'}));
  if(!await this.restore())throw new Error('No se pudo establecer la sesión.');
 }
 async logout(){await this.csrf();await firstValueFrom(this.http.post('/api/logout',{}, {responseType:'text'}));this.username.set(null);}
}
