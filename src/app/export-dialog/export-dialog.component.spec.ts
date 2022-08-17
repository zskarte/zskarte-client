import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NgxIndexedDBService } from 'ngx-indexed-db';

import { ExportDialogComponent } from './export-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ExportDialogComponent', () => {
  let component: ExportDialogComponent;
  let fixture: ComponentFixture<ExportDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExportDialogComponent],
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: jasmine.createSpyObj('MatDialogRef', ['close']),
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        {
          provide: NgxIndexedDBService,
          useValue: jasmine.createSpyObj('NgxIndexedDBService', ['add']),
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
