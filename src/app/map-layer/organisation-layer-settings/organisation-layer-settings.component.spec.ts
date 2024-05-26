import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganisationLayerSettingsComponent } from './organisation-layer-settings.component';

describe('OrganisationLayerSettingsComponent', () => {
  let component: OrganisationLayerSettingsComponent;
  let fixture: ComponentFixture<OrganisationLayerSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganisationLayerSettingsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganisationLayerSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
