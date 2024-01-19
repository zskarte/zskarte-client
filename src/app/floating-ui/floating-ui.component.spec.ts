import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingUIComponent } from './floating-ui.component';

describe('FloatingUiComponent', () => {
  let component: FloatingUIComponent;
  let fixture: ComponentFixture<FloatingUIComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingUIComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingUIComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
