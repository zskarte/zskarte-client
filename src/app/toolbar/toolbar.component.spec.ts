import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { ToolbarComponent } from './toolbar.component';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HelpComponent } from '../help/help.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatCheckboxModule } from '@angular/material/checkbox';

describe('ToolbarComponent', () => {
  let component: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;

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
      ],
      providers: [
        {
          provide: NgxIndexedDBService,
          useValue: jasmine.createSpyObj('NgxIndexedDBService', ['add']),
        },
      ],
      declarations: [ToolbarComponent, HelpComponent, ConfirmationDialogComponent, SessionCreatorComponent],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
