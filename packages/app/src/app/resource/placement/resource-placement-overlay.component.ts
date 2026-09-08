import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { I18NService } from '../../state/i18n.service';
import { ResourcePlacementService } from './resource-placement.service';

/**
 * Floating banner shown while a resource placement is waiting for a map click, started by
 * `ResourcePlacementService.startClickPlacement(...)`. Modelled on `journal-draw-overlay`.
 */
@Component({
  selector: 'app-resource-placement-overlay',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './resource-placement-overlay.component.html',
  styleUrl: './resource-placement-overlay.component.scss',
})
export class ResourcePlacementOverlayComponent {
  placement = inject(ResourcePlacementService);
  i18n = inject(I18NService);

  cancel(): void {
    this.placement.cancelClickPlacement();
  }
}
