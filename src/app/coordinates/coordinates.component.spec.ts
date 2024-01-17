import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoordinatesComponent } from './coordinates.component';

describe('CoordinatesComponent', () => {
  let component: CoordinatesComponent;
  let fixture: ComponentFixture<CoordinatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoordinatesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CoordinatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
