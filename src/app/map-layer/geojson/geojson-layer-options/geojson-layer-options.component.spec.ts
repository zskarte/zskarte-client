import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeoJSONLayerOptionsComponent } from './geojson-layer-options.component';

describe('GeoJSONFeatureOptionsComponent', () => {
  let component: GeoJSONLayerOptionsComponent;
  let fixture: ComponentFixture<GeoJSONLayerOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeoJSONLayerOptionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GeoJSONLayerOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
