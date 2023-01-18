import { ChangeDetectionStrategy, Component, HostListener, OnInit } from '@angular/core';
import { ShortcutService } from './shortcut/shortcut.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  height = window.innerHeight;
  width = window.innerWidth;

  constructor(private _shortcut: ShortcutService) {
    this._shortcut.initialize();
  }

  ngOnInit(): void {
    this.setSize();
  }

  @HostListener('window:resize', ['$event'])
  setSize(): void {
    this.height = document.documentElement?.clientHeight || window.innerHeight;
    this.width = window.innerWidth;
  }
}
