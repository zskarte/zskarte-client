import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private _session: SessionService, private _router: Router) {}
  async canActivate(): Promise<boolean | UrlTree> {
    const isAuthenticated = await firstValueFrom(this._session.observeAuthenticated());
    if (isAuthenticated) {
      return true;
    }
    return this._router.parseUrl('/login');
  }
}
