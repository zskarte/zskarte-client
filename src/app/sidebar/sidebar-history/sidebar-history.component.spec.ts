import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarHistoryComponent } from './sidebar-history.component';

describe('SidebarHistoryComponent', () => {
  let component: SidebarHistoryComponent;
  let fixture: ComponentFixture<SidebarHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarHistoryComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SidebarHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
