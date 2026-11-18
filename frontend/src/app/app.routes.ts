import {inject} from '@angular/core';
import {Routes,Router} from '@angular/router';
import {AuthService} from './core/auth.service';
export const routes:Routes=[
 {path:'login',loadComponent:()=>import('./features/login.component').then(m=>m.LoginComponent)},
 {path:'',canActivate:[()=>{const auth=inject(AuthService),router=inject(Router);return auth.restore().then(ok=>ok||router.createUrlTree(['/login']));}],loadComponent:()=>import('./layouts/shell.component').then(m=>m.ShellComponent),children:[
  {path:'',pathMatch:'full',redirectTo:'agenda'},
  {path:'agenda',loadComponent:()=>import('./features/agenda.component').then(m=>m.AgendaComponent)},
  {path:'clientes',data:{kind:'clients'},loadComponent:()=>import('./features/catalog.component').then(m=>m.CatalogComponent)},
  {path:'servicios',data:{kind:'services'},loadComponent:()=>import('./features/catalog.component').then(m=>m.CatalogComponent)},
  {path:'equipo',data:{kind:'barbers'},loadComponent:()=>import('./features/catalog.component').then(m=>m.CatalogComponent)}
 ]},
 {path:'**',redirectTo:'agenda'}
];
