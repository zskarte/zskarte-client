import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentlyUsedSignsComponent } from './recently-used-signs.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('RecentlyUsedSignsComponent', () => {
  let component: RecentlyUsedSignsComponent;
  let fixture: ComponentFixture<RecentlyUsedSignsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatMenuModule, MatIconModule, HttpClientTestingModule],
      declarations: [RecentlyUsedSignsComponent],
      schemas: [NO_ERRORS_SCHEMA],
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
