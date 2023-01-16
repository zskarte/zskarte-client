import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProtocolTableComponent } from './protocol-table.component';

describe('ProtocolTableComponent', () => {
  let component: ProtocolTableComponent;
  let fixture: ComponentFixture<ProtocolTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProtocolTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProtocolTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
