import {Component,inject,signal} from '@angular/core';
import {ReactiveFormsModule,NonNullableFormBuilder,Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {AuthService} from '../core/auth.service';
@Component({selector:'filo-login',imports:[ReactiveFormsModule],template:`
<div class="login-page"><div class="login-brand">filo<span>.</span><small>BARBER STUDIO</small></div><section class="panel login-card">
<p class="eyebrow">TU BARBERÍA, EN ORDEN</p><h1>Bienvenido de nuevo</h1><p>Ingresá para organizar tu agenda y tu equipo.</p>
<form [formGroup]="form" (ngSubmit)="submit()"><label class="field">Usuario<input formControlName="username" autocomplete="username" required></label>
<label class="field">Contraseña<input type="password" formControlName="password" autocomplete="current-password" required></label>
@if(error()){<p class="error" role="alert">{{error()}}</p>}<button class="btn primary" type="submit" [disabled]="busy()||form.invalid">{{busy()?'Ingresando…':'Ingresar a mi barbería'}}</button></form>
</section><p class="login-foot">Agenda · Clientes · Servicios · Equipo</p></div>`})
export class LoginComponent {
 private auth=inject(AuthService);private router=inject(Router);private fb=inject(NonNullableFormBuilder);
 form=this.fb.group({username:['',Validators.required],password:['',Validators.required]});busy=signal(false);error=signal('');
 async submit(){if(this.form.invalid||this.busy())return;this.busy.set(true);this.error.set('');
  try{const v=this.form.getRawValue();await this.auth.login(v.username,v.password);await this.router.navigateByUrl('/agenda');}
  catch(e){this.error.set(e instanceof HttpErrorResponse&&e.status===429?'Demasiados intentos. Esperá un minuto.':e instanceof HttpErrorResponse&&e.status===401?'Usuario o contraseña incorrectos.':'No se pudo ingresar. Revisá que el servidor esté disponible.');}
  finally{this.busy.set(false);}
 }
}
