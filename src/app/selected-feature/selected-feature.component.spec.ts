import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { DetailImageViewComponent } from '../detail-image-view/detail-image-view.component';
import { DrawingDialogComponent } from '../drawing-dialog/drawing-dialog.component';

import { SelectedFeatureComponent } from './selected-feature.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Nl2BrPipeModule } from 'nl2br-pipe';

describe('SelectedFeatureComponent', () => {
  let component: SelectedFeatureComponent;
  let fixture: ComponentFixture<SelectedFeatureComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule, HttpClientTestingModule, Nl2BrPipeModule],
      declarations: [
        SelectedFeatureComponent,
        DrawingDialogComponent,
        ConfirmationDialogComponent,
        DetailImageViewComponent,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectedFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
