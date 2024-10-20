import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarFiltersComponent } from './sidebar-filters.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('SidebarFiltersComponent', () => {
  let component: SidebarFiltersComponent;
  let fixture: ComponentFixture<SidebarFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SidebarFiltersComponent],
      imports: [],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
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
