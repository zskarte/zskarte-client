import { Injectable } from '@angular/core';
import { SidebarContext } from './sidebar.interfaces';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { ZsMapStateService } from '../state/state.service';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private _context = new BehaviorSubject<SidebarContext | undefined>(undefined);
  private _preventDeselect = false;

  constructor(private _state: ZsMapStateService) {
    this._state.observeSelectedFeature$().subscribe((element) => {
      if (element) {
        this.open(SidebarContext.SelectedFeature);
      } else {
        this._preventDeselect = true;
        this.close();
      }
    });
  }

  close(): void {
    if (!this._preventDeselect) {
      this._state.resetSelectedFeature();
    }
    this._context.next(undefined);
    this._preventDeselect = false;
  }

  open(context: SidebarContext): void {
    this._context.next(context);
  }

  toggle(context: SidebarContext): void {
    if (this._context.value === context) {
      this.close();
    } else {
      this.open(context);
    }
  }

  observeIsOpen(): Observable<boolean> {
    return this._context.pipe(map((context) => context !== undefined));
  }

  observeContext(): Observable<SidebarContext | undefined> {
    return this._context.asObservable();
  }
}
