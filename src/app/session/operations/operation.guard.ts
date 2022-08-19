import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { SessionService } from '../session.service';
import { ZsMapStateService } from '../../state/state.service';

@Injectable({
  providedIn: 'root',
})
export class OperationGuard implements CanActivate {
  constructor(private _router: Router, private _session: SessionService) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (!this._session.getOperationId()) {
      return this._router.parseUrl('/operations');
    }
    return true;
  }
}
