import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GeocoderComponent } from './geocoder.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('GeocoderComponent', () => {
  let component: GeocoderComponent;
  let fixture: ComponentFixture<GeocoderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    declarations: [GeocoderComponent],
    schemas: [NO_ERRORS_SCHEMA],
    imports: [MatAutocompleteModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GeocoderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
