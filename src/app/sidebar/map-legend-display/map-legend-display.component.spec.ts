import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { MapLegendDisplayComponent } from './map-legend-display.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('MapLegendDisplayComponent', () => {
  let component: MapLegendDisplayComponent;
  let fixture: ComponentFixture<MapLegendDisplayComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    declarations: [MapLegendDisplayComponent],
    schemas: [NO_ERRORS_SCHEMA],
    imports: [],
    providers: [
        {
            provide: MatDialogRef,
            useValue: jasmine.createSpyObj('MatDialogRef', ['close']),
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
});
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MapLegendDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
