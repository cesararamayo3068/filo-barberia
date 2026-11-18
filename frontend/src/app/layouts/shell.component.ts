import {Component,inject,signal} from '@angular/core';
import {Router,RouterLink,RouterLinkActive,RouterOutlet} from '@angular/router';
import {AuthService} from '../core/auth.service';
import {ApiService} from '../core/api.service';
@Component({selector:'filo-shell',imports:[RouterLink,RouterLinkActive,RouterOutlet],template:`
<aside class="sidebar"><a routerLink="/agenda" class="brand" aria-label="Filo, agenda"><span class="brand-mark">✂</span><span>filo<span class="brand-dot">.</span><small>BARBER STUDIO</small></span></a>
<div class="nav-wrap"><span class="nav-label">ESPACIO DE TRABAJO</span><nav aria-label="Menú principal">
<a routerLink="/agenda" routerLinkActive="selected">▦ <span>Agenda</span></a>
<a routerLink="/clientes" routerLinkActive="selected">♙ <span>Clientes</span></a>
<a routerLink="/servicios" routerLinkActive="selected">✂ <span>Servicios</span></a>
<a routerLink="/equipo" routerLinkActive="selected">◫ <span>Equipo</span></a>
</nav></div><div class="sidebar-foot"><span class="avatar">FS</span><span><strong>Filo Studio</strong><small>{{auth.username()}}</small></span></div></aside>
<main><header class="topbar"><div class="crumb">▦ <span>Mi barbería</span></div><div class="header-actions"><span class="mode"><b></b> Administración</span><button class="btn" [disabled]="leaving()" (click)="logout()">Salir</button></div></header>
@if(error()){<p class="error global-error" role="alert">{{error()}}</p>}<router-outlet /></main>`})
export class ShellComponent {
 auth=inject(AuthService);private api=inject(ApiService);private router=inject(Router);error=signal('');leaving=signal(false);
 async logout(){this.leaving.set(true);try{await this.auth.logout();await this.router.navigateByUrl('/login');}catch(e){this.error.set(this.api.error(e));}finally{this.leaving.set(false);}}
}
