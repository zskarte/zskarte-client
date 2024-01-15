import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextDividerComponent } from './text-divider.component';

describe('TextDividerComponent', () => {
  let component: TextDividerComponent;
  let fixture: ComponentFixture<TextDividerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TextDividerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextDividerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
