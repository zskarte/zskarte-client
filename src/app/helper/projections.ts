import { get, transform } from 'ol/proj';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import Projection from 'ol/proj/Projection';
import { Coordinate } from 'ol/coordinate';

proj4.defs(
  'EPSG:2056',
  '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs',
);
register(proj4);

export const coordinatesProjection = getCoordinatesProjection();
export const mercatorProjection = getMercatorProjection();
export const swissProjection = getSwissProjection();

type CoordinateTypes<T> = T | Array<T> | Array<Array<T>>;

interface IOverloadedCoordinateFunction<T, U> {
  (coordinates: T): U;
  (coordinates: Array<T>): Array<U>;
  (coordinates: Array<Array<T>>): Array<Array<U>>;
}

export type ZsKarteProjection = {
  name: string;
  projection: Projection | null;
  parse: (coords: string) => Coordinate | undefined;
  translate: (coords: Coordinate, prefix?: boolean) => string;
  transformTo: IOverloadedCoordinateFunction<Coordinate, Coordinate>;
  transformFrom: IOverloadedCoordinateFunction<Coordinate, Coordinate>;
  asString: IOverloadedCoordinateFunction<Coordinate, string>;
  fromString: IOverloadedCoordinateFunction<string, Coordinate>;
};

const callUnpacked = <U>(coordinates: CoordinateTypes<Coordinate>, func: (c: Coordinate) => U) => {
  if (Array.isArray(coordinates) && coordinates.length === 2 && !Array.isArray(coordinates[0])) {
    return func(coordinates as Coordinate);
  }
  return coordinates.map((c) => callUnpacked(c, func));
};
const callUnpackedString = (coordinates: CoordinateTypes<string>, func: (c: string) => Coordinate | undefined) => {
  if (typeof coordinates === 'string') {
    return func(coordinates);
  }
  return coordinates.map((c: CoordinateTypes<string>) => callUnpackedString(c, func));
};

const addTransformationFunctions = (
  proj: Omit<ZsKarteProjection, 'transformTo' | 'transformFrom' | 'asString' | 'fromString'>,
): ZsKarteProjection => {
  if (!proj.projection || !mercatorProjection) {
    throw Error(`projection for ${proj.name} or mercatorProjection is missing!`);
  }
  const projection = proj.projection;

  return {
    ...proj,
    transformTo(coordinates: CoordinateTypes<Coordinate>) {
      return callUnpacked(coordinates, (c: Coordinate) => transform(c, mercatorProjection, projection));
    },
    transformFrom(coordinates: CoordinateTypes<Coordinate>) {
      return callUnpacked(coordinates, (c: Coordinate) => transform(c, projection, mercatorProjection));
    },
    asString(coordinates: CoordinateTypes<Coordinate>) {
      return callUnpacked(coordinates, (c: Coordinate) => this.translate(transform(c, mercatorProjection, projection), false));
    },
    fromString(coordinates: CoordinateTypes<string>) {
      return callUnpackedString(coordinates, (c: string) => {
        const parsedCoord = this.parse(c);
        if (parsedCoord) {
          return transform(parsedCoord, projection, mercatorProjection);
        } else {
          return undefined;
        }
      });
    },
  };
};

export const availableProjections: Array<ZsKarteProjection> = [
  addTransformationFunctions({
    name: 'LV95',
    projection: swissProjection,
    // see: https://www.swisstopo.admin.ch/de/wissen-fakten/geodaesie-vermessung/bezugsrahmen/lokal/lv95.html > E / N
    translate(coords?: Coordinate, prefix = true): string {
      const numberFormatOptions = {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      };
      if (!coords || coords.length !== 2) return '';
      const longitude = coords[0].toLocaleString('de-CH', numberFormatOptions);
      const latitude = coords[1].toLocaleString('de-CH', numberFormatOptions);
      return `${prefix ? 'LV95 ' : ''}E${longitude} / N${latitude}`;
    },
    parse(coords: string): Coordinate | undefined {
      const values = coords.match(/E([0-9'’]+(?:\.\d+)?) *\/ *N([0-9'’]+(?:\.\d+)?)/u);
      if (!values) {
        return undefined;
      }
      values.shift(); //skip fullmatch
      return values.map((v) => parseFloat(v.replace(/['’]/gu, '')));
    },
  }),
  addTransformationFunctions({
    name: 'GPS',
    projection: coordinatesProjection,
    // see: https://de.wikipedia.org/wiki/Geographische_Koordinaten > LAT(N) should be 1st and LONG(E) 2nd
    translate(coords: Coordinate, prefix = true): string {
      if (!coords || coords.length !== 2) return 'GPS';
      const latitude = coords[1].toFixed(6);
      const longitude = coords[0].toFixed(6);
      return `${prefix ? 'GPS ' : ''}N${latitude}°, E${longitude}°`;
    },
    parse(coords: string): Coordinate | undefined {
      const values = coords.match(/N(\d+(?:\.\d+)?)°? *, *E(\d+(?:\.\d+)?)°?/);
      if (!values) {
        return undefined;
      }
      values.shift(); //skip fullmatch
      const numbers = values.map(parseFloat);
      return [numbers[1], numbers[0]];
    },
  }),
  addTransformationFunctions({
    name: 'GPS°\'"',
    projection: coordinatesProjection,
    // see: https://de.wikipedia.org/wiki/Geographische_Koordinaten > LAT(N) should be 1st and LONG(E) 2nd
    translate(coords: Coordinate, prefix = true): string {
      if (!coords || coords.length !== 2) return 'GPS';
      const latitudeGrad = Math.floor(coords[1]);
      const latitudeMin = Math.floor((coords[1] - latitudeGrad) * 60);
      const latitudeSec = (((coords[1] - latitudeGrad) * 60 - latitudeMin) * 60).toFixed(3);
      const longitudeGrad = Math.floor(coords[0]);
      const longitudeMin = Math.floor((coords[0] - longitudeGrad) * 60);
      const longitudeSec = (((coords[0] - longitudeGrad) * 60 - longitudeMin) * 60).toFixed(3);
      return `${prefix ? 'GPS ' : ''}N${latitudeGrad}° ${latitudeMin}' ${latitudeSec}", E${longitudeGrad}° ${longitudeMin}' ${longitudeSec}"`;
    },
    parse(coords: string): Coordinate | undefined {
      const values = coords.match(/N(\d+)° *(?:(\d\d?)')? *(?:(\d\d?(?:\.\d+)?)"?)? *, *E(\d+)° *(?:(\d\d?)')? *(?:(\d\d?(?:\.\d+)?)"?)?/);
      if (!values) {
        return undefined;
      }
      values?.shift(); //skip fullmatch
      const numbers = values.map(parseFloat);
      let latitude = 0;
      if (numbers[2]) {
        latitude += numbers[2];
      }
      latitude /= 60;
      if (numbers[1]) {
        latitude += numbers[1];
      }
      latitude /= 60;
      latitude += numbers[0];
      let longitude = 0;
      if (numbers[5]) {
        longitude += numbers[5];
      }
      longitude /= 60;
      if (numbers[4]) {
        longitude += numbers[4];
      }
      longitude /= 60;
      longitude += numbers[3];
      return [longitude, latitude];
    },
  }),
  addTransformationFunctions({
    name: 'Mercator',
    projection: mercatorProjection,
    translate(coords: Coordinate, prefix = true): string {
      if (!coords || coords.length !== 2) return 'Mercator';
      const longitude = coords[0].toFixed(8);
      const latitude = coords[1].toFixed(8);
      return `${prefix ? 'Mercator ' : ''}${longitude} / ${latitude}`;
    },
    parse(coords: string): Coordinate | undefined {
      const values = coords.match(/(\d+(?:\.\d+)?) *\/ *(\d+(?:\.\d+)?)/);
      if (!values) {
        return undefined;
      }
      values.shift(); //skip fullmatch
      return values.map(parseFloat);
    },
  }),
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

export const projectionByIndex = (projectionIndex: number) => {
  return availableProjections[projectionIndex];
};
export const projectionByName = (formatName: string) => {
  return availableProjections.find((p) => p.name === formatName);
};

interface IOverloadedConvertFunction<T, U> {
  (coordinates: T, projectionFormatIndex: number, numerical?: boolean): U;
  (coordinates: Array<T>, projectionFormatIndex: number, numerical?: boolean): Array<U>;
  (coordinates: Array<Array<T>>, projectionFormatIndex: number, numerical?: boolean): Array<Array<U>>;
}

export const convertTo: IOverloadedConvertFunction<Coordinate, Coordinate | string> = <U>(
  coordinates,
  projectionFormatIndex: number,
  numerical = true,
): U => {
  const proj = projectionByIndex(projectionFormatIndex);
  return numerical ? (proj.transformTo(coordinates) as U) : (proj.asString(coordinates) as U);
};

export const convertFrom: IOverloadedConvertFunction<Coordinate | string, Coordinate> = <U>(
  coordinates,
  projectionFormatIndex: number,
  numerical = true,
): U => {
  const proj = projectionByIndex(projectionFormatIndex);
  return numerical ? (proj.transformFrom(coordinates) as U) : (proj.fromString(coordinates) as U);
};
