import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NgxIndexedDBService } from 'ngx-indexed-db';

import { SelectSignDialog } from './select-sign-dialog.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('DrawingDialogComponent', () => {
  let component: SelectSignDialog;
  let fixture: ComponentFixture<SelectSignDialog>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SelectSignDialog],
      schemas: [NO_ERRORS_SCHEMA],
      imports: [MatDialogModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: jasmine.createSpyObj('MatDialogRef', ['close']),
        },
        {
          provide: NgxIndexedDBService,
          useValue: jasmine.createSpyObj('NgxIndexedDBService', ['add']),
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectSignDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
