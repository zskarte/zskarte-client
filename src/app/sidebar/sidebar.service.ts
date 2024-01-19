import { Injectable } from '@angular/core';
import { SidebarContext } from './sidebar.interfaces';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { ZsMapStateService } from '../state/state.service';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private _context = new BehaviorSubject<SidebarContext | undefined>(undefined);

  constructor(private _state: ZsMapStateService) {
    this._state.observeSelectedFeature$().subscribe((element) => {
      if (element) {
        this.open(SidebarContext.SelectedFeature);
      } else {
        this.close();
      }
    });
  }

  close(): void {
    this._state.resetSelectedFeature();
    this._context.next(undefined);
  }

  open(context: SidebarContext): void {
    this._context.next(context);
  }

  observeIsOpen(): Observable<boolean> {
    return this._context.pipe(map((context) => context !== undefined));
  }

  observeContext(): Observable<SidebarContext | undefined> {
    return this._context.asObservable();
  }
}
