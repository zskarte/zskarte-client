import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarFiltersComponent } from './sidebar-filters.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('SidebarFiltersComponent', () => {
  let component: SidebarFiltersComponent;
  let fixture: ComponentFixture<SidebarFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [SidebarFiltersComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
