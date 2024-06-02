import { Injectable, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Coordinate } from 'ol/coordinate';
import { LOG2_ZOOM_0_RESOLUTION, DEFAULT_RESOLUTION } from '../session/default-map-values';
import TileGrid, { Options as TileGridOptions } from 'ol/tilegrid/TileGrid';

@Injectable({
  providedIn: 'root',
})
export class MapLayerService {
  constructor(private _domSanitizer: DomSanitizer) {}

  public sanitizeHTML(html: string) {
    return this._domSanitizer.sanitize(SecurityContext.HTML, html) ?? '';
  }

  public sanitizeURLAttribute(url: string) {
    const result = this._domSanitizer.sanitize(SecurityContext.URL, url) ?? '';
    //prevent escape the href attribute
    return result.replace(/"/g, '&quot;');
  }

  createAttributionFromArray(attribution: [string, string][] | undefined) {
    if (attribution && attribution.length > 0) {
      return attribution.map((attr) => {
        const title = this.sanitizeHTML(attr[0]);
        if (attr[1]) {
          const url = this.sanitizeURLAttribute(attr[1]);
          return `<a target="_blank" href="${url}">${title}</a>`;
        } else {
          return title;
        }
      });
    }
    return null;
  }

  static getScaledTileGridInfos(grid: TileGrid, scaling = 1) {
    if (scaling === 1) {
      return null;
    }
    const resolutions = grid.getResolutions().slice(); // take a copy
    const origins: Coordinate[] = [];
    const tileSizes: Array<number | Array<number>> = [];
    for (let i = 0; i < resolutions.length; i++) {
      origins[i] = grid.getOrigin(i);
      tileSizes[i] = grid.getTileSize(i);
      if (!Array.isArray(tileSizes[i])) {
        // @ts-expect-error "it's not a number[], checked the line above..."
        tileSizes[i] = [tileSizes[i], tileSizes[i]];
      }
      tileSizes[i][0] = tileSizes[i][0] * scaling;
      tileSizes[i][1] = tileSizes[i][1] * scaling;
      resolutions[i] = resolutions[i] / scaling;
    }
    return {
      extent: grid.getExtent(),
      resolutions,
      tileSizes,
      origins,
    } as TileGridOptions;
  }

  public static scaleDominatorToZoom(scaleDenominator: number | undefined) {
    if (scaleDenominator === undefined) {
      return undefined;
    }
    //no idea why the * 0.97 is required to make value match more accurate
    return (LOG2_ZOOM_0_RESOLUTION - Math.log2(scaleDenominator / DEFAULT_RESOLUTION)) * 0.97;
  }
}
