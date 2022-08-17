import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MapComponent } from './map/map.component';
import { AuthGuard } from './session/auth.guard';
import { LoginComponent } from './session/login/login.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'map', component: MapComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'map', pathMatch: 'full' },
  // { path: '', component: LoginComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  providers: [AuthGuard],
  exports: [RouterModule],
})
export class AppRoutingModule {}
