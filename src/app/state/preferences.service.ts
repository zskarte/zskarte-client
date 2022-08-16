import { Injectable } from '@angular/core';
import {Viewport} from "../core/entity/viewport";
import {LIST_OF_ZSO, ZSO} from "../core/entity/zso";

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  constructor() {}

  static fallbackViewport: Viewport = {
    coordinates: [905336.3755895211, 5935224.7522306945],
    zoomLevel: 8,
  };

  static guestSessionTimeout: number = 3600000; // 1h = 60m = 3600s = 3600000ms

  public setLastSessionId(lastSessionId: string) {
    localStorage.setItem('lastSession', lastSessionId);
  }

  public getLastSessionId(): string {
    return localStorage.getItem('lastSession') || "";
  }

  public setLocale(locale: string) {
    localStorage.setItem('locale', locale);
  }

  public getLocale(): string {
    const locale = localStorage.getItem('locale');
    if (locale) {
      return locale;
    } else {
      const zso = this.getZSO();
      if (zso) {
        return zso.defaultLocale;
      } else {
        return "de";
      }
    }
  }

  public removeSessionSpecificPreferences(sessionId: string) {
    localStorage.removeItem('viewport_4_' + sessionId);
    if (this.getLastSessionId() === sessionId) {
      localStorage.removeItem('lastSession');
    }
  }

  public setViewPortForSession(sessionId: string, viewPort: Viewport) {
    localStorage.setItem('viewport_4_' + sessionId, JSON.stringify(viewPort));
  }

  public getViewPortForSession(sessionId: string): Viewport {
    const viewport = localStorage.getItem('viewport_4_' + sessionId);
    if (viewport) {
      // If there is a viewport defined for this session id, we take it...
      return JSON.parse(viewport);
    } else {
      const zso = this.getZSO();
      if (zso) {
        // If a default ZSO is defined, we're going to take the ZSO default viewport...
        return zso.initialViewPort;
      } else {
        // Otherwise, we fall back to the "whole Switzerland" viewport
        return PreferencesService.fallbackViewport;
      }
    }
  }

  public setZSO(zsoId: string) {
    localStorage.setItem('zso', zsoId);
  }

  public getZSO(): ZSO | null {
    const preferredZSOId = this.getLastZsoId();
    if (preferredZSOId) {
      for (const l of LIST_OF_ZSO) {
        if (l.id === preferredZSOId) {
          return l;
        }
      }
    }
    return null;
  }

  public getLastZsoId(): string {
    return localStorage.getItem('zso') || "";
  }
}
