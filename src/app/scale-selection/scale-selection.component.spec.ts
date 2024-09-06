import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ScaleSelectionComponent } from './scale-selection.component';

describe('ScaleSelectionComponent', () => {
  let component: ScaleSelectionComponent;
  let fixture: ComponentFixture<ScaleSelectionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ScaleSelectionComponent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: jasmine.createSpyObj('MatDialogRef', ['close']),
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    fixture = TestBed.createComponent(ScaleSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
