import { Component, OnInit } from '@angular/core';
import { I18NService } from '../state/i18n.service';
import { getZSOById, ZSO } from '../core/entity/zso';
import { ZsMapStateService } from '../state/state.service';

@Component({
  selector: 'app-credits',
  templateUrl: './credits.component.html',
  styleUrls: ['./credits.component.css'],
})
export class CreditsComponent implements OnInit {
  constructor(public i18n: I18NService, public zsMapStateService: ZsMapStateService) {}

  zso: ZSO | null = null;

  ngOnInit() {
    this.zsMapStateService.observeSession().subscribe((s) => {
      if (s) {
        this.zso = getZSOById(s.zsoId);
      }
    });
  }
}
