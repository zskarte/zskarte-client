import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { DetailImageViewComponent } from './detail-image-view.component';

describe('DetailImageViewComponent', () => {
  let component: DetailImageViewComponent;
  let fixture: ComponentFixture<DetailImageViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DetailImageViewComponent],
      providers: [{ provide: MAT_DIALOG_DATA, useValue: {} }],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailImageViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
