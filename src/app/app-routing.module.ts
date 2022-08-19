import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MapComponent } from './map/map.component';
import { OperationsComponent } from './operations/operations.component';
import { OperationGuard } from './operations/operation.guard';
import { SessionGuard } from './session/session.guard';
import { LoginComponent } from './session/login/login.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'operations', component: OperationsComponent, canActivate: [SessionGuard] },
  { path: 'map', component: MapComponent, canActivate: [SessionGuard, OperationGuard] },
  { path: '', redirectTo: 'map', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  providers: [SessionGuard],
  exports: [RouterModule],
})
export class AppRoutingModule {}
