import { Component, computed, inject, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ResourceAvailability } from '@zskarte/types';
import { I18NService } from '../../state/i18n.service';

interface AvailabilityOption {
  value: ResourceAvailability;
  labelKey: string;
}

/**
 * Filter bar for the resource catalogue: free-text search plus multi-select filters for
 * article group, article type, storage site and availability bucket. All filter state is
 * owned by the parent (`ResourceCatalogueComponent`) via two-way `model()` bindings so the
 * parent can combine them (AND) with the catalogue rows.
 */
@Component({
  selector: 'app-resource-catalogue-filter',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './resource-catalogue-filter.component.html',
  styleUrl: './resource-catalogue-filter.component.scss',
})
export class ResourceCatalogueFilterComponent {
  i18n = inject(I18NService);

  articleGroups = input<string[]>([]);
  /**
   * The availability buckets only make sense where stock can still be free. On the
   * "Im Einsatz" tab every row is assigned by definition, so that select is hidden there.
   */
  showAvailability = input<boolean>(true);
  articleTypes = input<string[]>([]);
  storageSites = input<string[]>([]);

  search = model<string>('');
  selectedGroups = model<string[]>([]);
  selectedTypes = model<string[]>([]);
  selectedStorageSites = model<string[]>([]);
  selectedAvailability = model<ResourceAvailability[]>([]);

  readonly availabilityOptions: AvailabilityOption[] = [
    { value: 'available', labelKey: 'resourceAvailable' },
    { value: 'assigned', labelKey: 'resourceAssigned' },
    { value: 'unavailable', labelKey: 'resourceUnavailable' },
  ];

  readonly hasActiveFilters = computed(
    () =>
      this.search().trim().length > 0 ||
      this.selectedGroups().length > 0 ||
      this.selectedTypes().length > 0 ||
      this.selectedStorageSites().length > 0 ||
      (this.showAvailability() && this.selectedAvailability().length > 0),
  );

  clearSearch(): void {
    this.search.set('');
  }

  clearFilters(): void {
    this.search.set('');
    this.selectedGroups.set([]);
    this.selectedTypes.set([]);
    this.selectedStorageSites.set([]);
    this.selectedAvailability.set([]);
  }
}
