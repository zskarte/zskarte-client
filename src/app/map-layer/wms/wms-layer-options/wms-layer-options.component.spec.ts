import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WmsLayerOptionsComponent } from './wms-layer-options.component';

describe('WmsLayerOptionsComponent', () => {
  let component: WmsLayerOptionsComponent;
  let fixture: ComponentFixture<WmsLayerOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WmsLayerOptionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WmsLayerOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
