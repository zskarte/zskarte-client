import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectionSelectionComponent } from './projection-selection.component';

describe('ProjectionSelectionComponent', () => {
  let component: ProjectionSelectionComponent;
  let fixture: ComponentFixture<ProjectionSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectionSelectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectionSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
