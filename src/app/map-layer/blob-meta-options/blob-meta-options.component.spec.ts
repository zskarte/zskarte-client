import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlobMetaOptionsComponent } from './blob-meta-options.component';

describe('BlobMetaOptionsComponent', () => {
  let component: BlobMetaOptionsComponent;
  let fixture: ComponentFixture<BlobMetaOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlobMetaOptionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BlobMetaOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
