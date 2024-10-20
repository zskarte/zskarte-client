import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { ImportDialogComponent } from './import-dialog.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('ImportDialogComponent', () => {
  let component: ImportDialogComponent;
  let fixture: ComponentFixture<ImportDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    declarations: [ImportDialogComponent],
    schemas: [NO_ERRORS_SCHEMA],
    imports: [],
    providers: [
        {
            provide: MatDialogRef,
            useValue: jasmine.createSpyObj('MatDialogRef', ['close']),
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
});
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
