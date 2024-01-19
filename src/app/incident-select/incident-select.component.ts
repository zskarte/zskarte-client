import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { I18NService } from '../state/i18n.service';
import { Signs } from '../map-renderer/signs';
import { SessionService } from '../session/session.service';
import { BehaviorSubject } from 'rxjs';
import { DrawStyle } from '../map-renderer/draw-style';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-incident-select',
  templateUrl: './incident-select.component.html',
  styleUrl: './incident-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentSelectComponent {
  @Input()
  set values(values: number[]) {
    this.incidents.setValue((values || []).map((o) => o + ''));
  }
  @Output() readonly valuesChange = new EventEmitter<number[]>();
  incidents = new FormControl<string[]>([]);
  incidentList = new BehaviorSubject<{ id: string | undefined; icon: string | undefined; name: string | undefined }[]>([]);

  constructor(
    public i18n: I18NService,
    private _session: SessionService,
  ) {
    const incidents = Signs.SIGNS.filter((o) => o.kat === 'incident').sort((a, b) => {
      let aValue = a[this._session.getLocale()];
      let bValue = b[this._session.getLocale()];
      aValue = aValue ? aValue.toLowerCase() : '';
      bValue = bValue ? bValue.toLowerCase() : '';
      return aValue.localeCompare(bValue);
    });

    this.incidentList.next(
      incidents.map((o) => ({ id: o.id + '', icon: DrawStyle.getImageUrl(o.src), name: o[this._session.getLocale()] })),
    );

    this.incidents.valueChanges.pipe(takeUntilDestroyed()).subscribe((values) => {
      this.valuesChange.emit(values?.map((o) => +o) || []);
    });
  }

  getIncident(id: string | undefined) {
    return this.incidentList.value.find((o) => o.id + '' === id + '');
  }
}
