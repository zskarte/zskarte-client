import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { HttpClientModule } from '@angular/common/http';
import { MatMenuModule } from '@angular/material/menu';
import { OverlayModule } from '@angular/cdk/overlay';

import { FabMenuComponent } from './fab-menu.component';
import { TextDialogComponent } from '../text-dialog/text-dialog.component';
import { DrawingDialogComponent } from '../drawing-dialog/drawing-dialog.component';

describe('FabMenuComponent', () => {
  let component: FabMenuComponent;
  let fixture: ComponentFixture<FabMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FabMenuComponent, TextDialogComponent, DrawingDialogComponent],
      imports: [MatDialogModule, HttpClientModule, MatMenuModule, OverlayModule],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FabMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
