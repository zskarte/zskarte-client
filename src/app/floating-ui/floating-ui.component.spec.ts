import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingUiComponent } from './floating-ui.component';

describe('FloatingUiComponent', () => {
  let component: FloatingUiComponent;
  let fixture: ComponentFixture<FloatingUiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingUiComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingUiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
