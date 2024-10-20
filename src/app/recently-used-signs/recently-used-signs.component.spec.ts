import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentlyUsedSignsComponent } from './recently-used-signs.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('RecentlyUsedSignsComponent', () => {
  let component: RecentlyUsedSignsComponent;
  let fixture: ComponentFixture<RecentlyUsedSignsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RecentlyUsedSignsComponent],
      schemas: [NO_ERRORS_SCHEMA],
      imports: [MatMenuModule, MatIconModule],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RecentlyUsedSignsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
