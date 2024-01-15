import { get } from 'ol/proj';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import Projection from 'ol/proj/Projection';

proj4.defs(
  'EPSG:2056',
  '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs',
);
register(proj4);

export const coordinatesProjection = getCoordinatesProjection();
export const mercatorProjection = getMercatorProjection();
export const swissProjection = getSwissProjection();

type ZsKarteProjection = {
  format: string;
  projection: Projection | null;
  translate: (coords: number[]) => string;
};

export const availableProjections: Array<ZsKarteProjection> = [
  {
    format: '1.2-2',
    projection: swissProjection,
    // see: https://www.swisstopo.admin.ch/de/wissen-fakten/geodaesie-vermessung/bezugsrahmen/lokal/lv95.html > E / N
    translate(coords?: number[]): string {
      const numberFormatOptions = {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      };
      if (!coords || coords.length !== 2) return '';
      const e = coords[0].toLocaleString('de-CH', numberFormatOptions);
      const n = coords[1].toLocaleString('de-CH', numberFormatOptions);
      return `LV95 E${e} / N${n}`;
    },
  },
  {
    format: '1.5-5',
    projection: coordinatesProjection,
    // see: https://de.wikipedia.org/wiki/Geographische_Koordinaten > LAT(N) should be 1st and LONG(E) 2nd
    translate(coords: number[]) {
      if (!coords || coords.length !== 2) return 'GPS';
      const latitude = coords[1].toFixed(5);
      const longitude = coords[0].toFixed(5);
      return `GPS N${latitude}°, E${longitude}°`;
    },
  },
];

function getCoordinatesProjection() {
  return get('EPSG:4326'); // see: https://epsg.io/4326 > WGS84 - World Geodetic System 1984, used in GPS
}

function getMercatorProjection() {
  return get('EPSG:3857'); // see: https://epsg.io/3857 > Pseudo-Mercator - Spherical Mercator, Google Maps, OpenStreetMap, Bing, ArcGIS, ESRI
}

function getSwissProjection() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projection = get('EPSG:2056') as any; // see: https://epsg.io/2056 > Swiss CH1903+ / LV95
  if (projection) {
    projection.setExtent([2420000, 130000, 2900000, 1350000]);
    const RESOLUTIONS = [
      4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250, 1000, 750, 650, 500, 250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1,
      0.5, 0.25, 0.1,
    ];
    const matrixIds: number[] = [];
    for (let i = 0; i < RESOLUTIONS.length; i++) {
      matrixIds.push(i);
    }
    projection.matrixIds = matrixIds;
    projection.resolutions = RESOLUTIONS;
  }
  return projection;
}
