import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MapComponent } from './map/map.component';
import { OperationsComponent } from './session/operations/operations.component';
import { OperationGuard } from './session/operations/operation.guard';
import { SessionGuard } from './session/session.guard';
import { LoginComponent } from './session/login/login.component';
import { ShareComponent } from './session/share/share.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'operations', component: OperationsComponent, canActivate: [SessionGuard] },
  { path: 'map', component: MapComponent, canActivate: [SessionGuard, OperationGuard] },
  { path: 'share/:accessToken', component: ShareComponent },
  { path: '**', redirectTo: 'map' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  providers: [SessionGuard],
  exports: [RouterModule],
})
export class AppRoutingModule {}
