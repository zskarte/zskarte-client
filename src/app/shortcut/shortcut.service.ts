import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { getOS, OS } from '../helper/os';
import { ZsMapDrawElementStateType } from '../state/interfaces';
import { ZsMapStateService } from '../state/state.service';
import { IShortcut } from './shortcut.interfaces';

@Injectable({
  providedIn: 'root',
})
export class ShortcutService {
  private _selectedFeatureId: string | undefined = undefined;
  private _copiedFeatureId: string | undefined = undefined;
  private _symbols: { [key: string]: string } = {
    command: '\u2318',
    // ⌘
    shift: '\u21E7',
    // ⇧
    left: '\u2190',
    // ←
    right: '\u2192',
    // →
    up: '\u2191',
    // ↑
    down: '\u2193',
    // ↓
    enter: '\u23CE',
    // ⏎
    backspace: '\u232B',
  };
  private _keydownObserver: Observable<KeyboardEvent>;

  constructor(private _state: ZsMapStateService) {
    this._keydownObserver = new Observable((observer) => {
      window.addEventListener('keydown', (event) => {
        observer.next(event);
      });
    });

    this._state.observeSelectedFeature().subscribe((id) => {
      this._selectedFeatureId = id;
    });
  }

  public initialize(): void {
    this._listen({ shortcut: 'mod+backspace' }).subscribe(async () => {
      if (this._selectedFeatureId) {
        this._state.removeDrawElement(this._selectedFeatureId);
      }
    });

    this._listen({ shortcut: 'mod+1' }).subscribe(() => {
      const layer = this._state.getActiveLayer();
      layer?.draw(ZsMapDrawElementStateType.TEXT);
    });

    this._listen({ shortcut: 'mod+2' }).subscribe(() => {
      const layer = this._state.getActiveLayer();
      layer?.draw(ZsMapDrawElementStateType.POLYGON);
    });

    this._listen({ shortcut: 'mod+3' }).subscribe(() => {
      const layer = this._state.getActiveLayer();
      layer?.draw(ZsMapDrawElementStateType.LINE);
    });

    this._listen({ shortcut: 'mod+4' }).subscribe(() => {
      const layer = this._state.getActiveLayer();
      layer?.draw(ZsMapDrawElementStateType.FREEHAND);
    });

    this._listen({ shortcut: 'mod+5' }).subscribe(() => {
      const layer = this._state.getActiveLayer();
      layer?.draw(ZsMapDrawElementStateType.SYMBOL);
    });

    // currently not implemented since it is not clear how to handle this without a proper UI state
    // this._listen({ shortcut: 'mod+c' }).subscribe(() => {
    //   this._copiedFeatureId = undefined;
    //   if (this._selectedFeatureId) {
    //     console.warn('todo', 'ctrl+c', this._selectedFeatureId);
    //     this._copiedFeatureId = this._selectedFeatureId;
    //   }
    // });

    // this._listen({ shortcut: 'mod+x' }).subscribe(() => {
    //   console.warn('todo', 'ctrl+x');
    // });

    // this._listen({ shortcut: 'mod+v' }).subscribe(() => {
    //   if (this._copiedFeatureId) {
    //     console.warn('todo', 'ctrl+v', this._copiedFeatureId);
    //     this._copiedFeatureId = undefined;
    //   }
    // });
  }

  private _listen({ shortcut, preventDefault }: IShortcut): Observable<KeyboardEvent> {
    if (preventDefault === undefined) {
      preventDefault = true;
    }
    const keys = (shortcut?.split('+') || []).map((key) => key.trim().toLowerCase());

    const shiftKey = keys.includes('shift');
    const altKey = keys.includes('alt');
    const cmdOrCtrlKey = keys.includes('ctrl') || keys.includes('cmd') || keys.includes('mod') || keys.includes('meta');

    const keysWithoutModifiers = keys.filter(
      (key) => key !== 'shift' && key !== 'alt' && key !== 'ctrl' && key !== 'cmd' && key !== 'mod' && key !== 'meta',
    );

    const key = keysWithoutModifiers?.[0]?.toLowerCase();

    return this._keydownObserver.pipe(
      filter((event) => {
        if (!shortcut || !key) {
          return true;
        }

        const eventCmdOrCtrlKey = event.ctrlKey || event.metaKey;
        if (shiftKey !== event.shiftKey) {
          return false;
        }
        if (altKey !== event.altKey) {
          return false;
        }
        if (cmdOrCtrlKey !== eventCmdOrCtrlKey) {
          return false;
        }

        // use 'code' instead of 'key' to prevent 'Dead' keys on MacOS
        const keyCode = event.code.toLowerCase().replace('key', '').replace('digit', '');

        if (key === keyCode) {
          if (preventDefault) {
            event.preventDefault();
          }
          return true;
        }
        return false;
      }),
    );
  }

  public symbolize(combo: string): string {
    if (!combo) {
      return combo;
    }

    const comboArray = combo.split('+');
    for (let i = 0; i < comboArray.length; i++) {
      // try to resolve command / ctrl based on OS:
      if (comboArray[i] === 'mod' || comboArray[i] === 'ctrl' || comboArray[i] === 'meta' || comboArray[i] === 'cmd') {
        if (getOS() === OS.MACOS || getOS() === OS.IOS) {
          comboArray[i] = 'command';
        } else {
          comboArray[i] = 'ctrl';
        }
      }
      comboArray[i] = this._symbols[comboArray[i]] || comboArray[i].toUpperCase();
    }
    return comboArray.join('+');
  }
}
