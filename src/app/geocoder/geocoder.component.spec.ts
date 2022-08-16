import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { GeocoderComponent } from './geocoder.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('GeocoderComponent', () => {
  let component: GeocoderComponent;
  let fixture: ComponentFixture<GeocoderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatAutocompleteModule, HttpClientTestingModule],
      declarations: [GeocoderComponent],
      schemas: [NO_ERRORS_SCHEMA],
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
