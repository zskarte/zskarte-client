import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { I18NService } from '../state/i18n.service';
import { Sign } from '../core/entity/sign';
import { DrawStyle } from '../map-renderer/draw-style';

@Component({
  selector: 'app-detail-image-view',
  templateUrl: './detail-image-view.component.html',
  styleUrls: ['./detail-image-view.component.css'],
})
export class DetailImageViewComponent {
  title: string;
  imageSrc: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: Sign,
    public i18n: I18NService,
  ) {
    this.title = i18n.getLabelForSign(data);
    this.imageSrc = DrawStyle.getImageUrl(data.src);
  }
}
