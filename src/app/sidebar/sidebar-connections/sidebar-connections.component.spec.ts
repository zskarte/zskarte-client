import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarConnectionsComponent } from './sidebar-connections.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('SidebarConnectionsComponent', () => {
  let component: SidebarConnectionsComponent;
  let fixture: ComponentFixture<SidebarConnectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [SidebarConnectionsComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarConnectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
