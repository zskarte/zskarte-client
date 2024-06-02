import { TestBed } from '@angular/core/testing';

import { GeoJSONService } from './geojson.service';

describe('WmsService', () => {
  let service: GeoJSONService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeoJSONService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
