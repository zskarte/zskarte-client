import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentSelectComponent } from './incident-select.component';

describe('IncidentSelectComponent', () => {
  let component: IncidentSelectComponent;
  let fixture: ComponentFixture<IncidentSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentSelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IncidentSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
