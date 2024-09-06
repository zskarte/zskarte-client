import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { SessionService } from '../session.service';

@Injectable({
  providedIn: 'root',
})
export class OperationGuard implements CanActivate {
  constructor(
    private _router: Router,
    private _session: SessionService,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (!this._session.getOperationId()) {
      const urlTree = this._router.parseUrl('/operations');
      urlTree.queryParams = route.queryParams;
      return urlTree;
    }
    return true;
  }
}
