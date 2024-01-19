import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { getOS, OS } from '../helper/os';
import { ZsMapDrawElementStateType } from '../state/interfaces';
import { ZsMapStateService } from '../state/state.service';
import { IShortcut } from './shortcut.interfaces';
import { ZsMapBaseDrawElement } from '../map-renderer/elements/base/base-draw-element';

@Injectable({
  providedIn: 'root',
})
export class ShortcutService {
  private _selectedElement: ZsMapBaseDrawElement | undefined = undefined;
  private _selectedFeatureId: string | undefined = undefined;
  private _copyElement: ZsMapBaseDrawElement | undefined = undefined;
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
  private _inputs = ['INPUT', 'TEXTAREA'];
  private _keydownObserver: Observable<KeyboardEvent>;
  private _readOnlyMode = false;

  constructor(private _state: ZsMapStateService) {
    this._keydownObserver = new Observable((observer) => {
      window.addEventListener('keydown', (event) => {
        observer.next(event);
      });
    });

    this._state.observeSelectedElement().subscribe((element) => {
      this._selectedElement = element;
    });

    this._state.observeIsReadOnly().subscribe((readOnlyMode) => {
      this._readOnlyMode = readOnlyMode;
    });
  }

  public initialize(): void {
    this._listen({ shortcut: 'mod+backspace', drawModeOnly: true }).subscribe(async () => {
      if (this._selectedFeatureId) {
        this._state.removeDrawElement(this._selectedFeatureId);
      }
    });

    this._listen({ shortcut: 'mod+1', drawModeOnly: true }).subscribe(() => {
      const layer = this._state.getActiveLayer();
      layer?.draw(ZsMapDrawElementStateType.TEXT);
    });

    this._listen({ shortcut: 'mod+2', drawModeOnly: true }).subscribe(() => {
      const layer = this._state.getActiveLayer();
      layer?.draw(ZsMapDrawElementStateType.POLYGON);
    });

    this._listen({ shortcut: 'mod+3', drawModeOnly: true }).subscribe(() => {
      const layer = this._state.getActiveLayer();
      layer?.draw(ZsMapDrawElementStateType.LINE);
    });

    this._listen({ shortcut: 'mod+4', drawModeOnly: true }).subscribe(() => {
      const layer = this._state.getActiveLayer();
      layer?.draw(ZsMapDrawElementStateType.FREEHAND);
    });

    this._listen({ shortcut: 'mod+5', drawModeOnly: true }).subscribe(() => {
      const layer = this._state.getActiveLayer();
      layer?.draw(ZsMapDrawElementStateType.SYMBOL);
    });

    this._listen({ shortcut: 'mod+c' }).subscribe(() => {
      this._copyElement = this._selectedElement;
    });

    this._listen({ shortcut: 'mod+v', drawModeOnly: true }).subscribe(() => {
      if (this._copyElement?.elementState) {
        this._state.addDrawElement(this._copyElement.elementState);
      }
    });

    this._listen({ shortcut: 'mod+y', drawModeOnly: true }).subscribe(() => {
      this._state.undoMapStateChange();
    });

    this._listen({ shortcut: 'mod+z', drawModeOnly: true }).subscribe(() => {
      this._state.redoMapStateChange();
    });

    this._listen({ shortcut: 'escape', drawModeOnly: true }).subscribe(() => {
      this._state.cancelDrawing();
    });
  }

  private _listen({ shortcut, preventDefault = true, drawModeOnly = false }: IShortcut): Observable<KeyboardEvent> {
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
        if (drawModeOnly && this._readOnlyMode) {
          return false;
        }

        if (!shortcut || !key) {
          return true;
        }

        // While writing into an input, don't allow shortcuts
        if (this._inputs.includes((event.target as HTMLElement).tagName)) {
          return false;
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
