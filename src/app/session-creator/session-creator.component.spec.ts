import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

import { SessionCreatorComponent } from './session-creator.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Nl2BrPipeModule } from 'nl2br-pipe';

describe('SessionCreatorComponent', () => {
  let component: SessionCreatorComponent;
  let fixture: ComponentFixture<SessionCreatorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        MatDialogModule,
        MatSelectModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        NoopAnimationsModule,
        FormsModule,
        HttpClientTestingModule,
        Nl2BrPipeModule,
      ],
      declarations: [SessionCreatorComponent, ConfirmationDialogComponent],
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
    fixture = TestBed.createComponent(SessionCreatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
