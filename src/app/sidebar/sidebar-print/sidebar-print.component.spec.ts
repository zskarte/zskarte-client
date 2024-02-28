import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarPrintComponent } from './sidebar-print.component';

describe('SidebarPrintComponent', () => {
  let component: SidebarPrintComponent;
  let fixture: ComponentFixture<SidebarPrintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarPrintComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarPrintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
