import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { EditCoordinatesComponent } from './edit-coordinates.component';

describe('EditCoordinatesComponent', () => {
  let component: EditCoordinatesComponent;
  let fixture: ComponentFixture<EditCoordinatesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditCoordinatesComponent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: jasmine.createSpyObj('MatDialogRef', ['close']),
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditCoordinatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
