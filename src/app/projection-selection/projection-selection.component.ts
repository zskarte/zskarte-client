import { Component, Input, Output, EventEmitter } from '@angular/core';
import type { ZsKarteProjection } from '../helper/projections';
import { availableProjections } from '../helper/projections';
import { I18NService } from '../state/i18n.service';

export type ChangeType = { projectionFormatIndex?: number; projectionFormatIndexes?: number[]; numerical?: boolean };

@Component({
  selector: 'app-projection-selection',
  templateUrl: './projection-selection.component.html',
  styleUrl: './projection-selection.component.scss',
})
export class ProjectionSelectionComponent {
  @Input() projectionFormatIndex: number = 0;
  @Input() projectionFormatIndexes: number[] = [0];
  @Input() numerical: boolean = true;
  @Output() change = new EventEmitter<ChangeType>();

  @Input() multiple: boolean = false;
  @Input() showNumerical: boolean = true;
  @Input() disabled: boolean = false;

  availableProjections: Array<ZsKarteProjection> = availableProjections;

  constructor(public i18n: I18NService) {}

  updateFormat(value: number) {
    this.projectionFormatIndex = value;
    this.emitChange();
  }

  updateFormats(formatIndex: number, value: boolean) {
    if (value && !this.projectionFormatIndexes.includes(formatIndex)) {
      this.projectionFormatIndexes.push(formatIndex);
    } else if (!value && this.projectionFormatIndexes.includes(formatIndex)) {
      const index = this.projectionFormatIndexes.indexOf(formatIndex);
      if (index !== -1) {
        this.projectionFormatIndexes.splice(index, 1);
      }
    }
    this.emitChange();
  }

  updateNumerical(value: boolean) {
    this.numerical = value;
    this.emitChange();
  }

  emitChange() {
    const state: ChangeType = {};
    if (this.showNumerical) {
      state.numerical = this.numerical;
    }
    if (this.multiple) {
      state.projectionFormatIndexes = this.projectionFormatIndexes;
    } else {
      state.projectionFormatIndex = this.projectionFormatIndex;
    }
    this.change.emit(state);
  }
}
