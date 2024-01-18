import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevokeShareDialogComponent } from './revoke-share-dialog.component';

describe('RevokeShareDialogComponent', () => {
  let component: RevokeShareDialogComponent;
  let fixture: ComponentFixture<RevokeShareDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevokeShareDialogComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(RevokeShareDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
