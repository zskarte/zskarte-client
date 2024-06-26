import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WmsSourceComponent } from './wms-source.component';

describe('WmsSourceComponent', () => {
  let component: WmsSourceComponent;
  let fixture: ComponentFixture<WmsSourceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WmsSourceComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WmsSourceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
