import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { TextDialogComponent } from './text-dialog.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('TextDialogComponent', () => {
  let component: TextDialogComponent;
  let fixture: ComponentFixture<TextDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TextDialogComponent],
      schemas: [NO_ERRORS_SCHEMA],
      imports: [],
      providers: [
        {
          provide: MatDialogRef,
          useValue: jasmine.createSpyObj('MatDialogRef', ['close']),
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TextDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
