import { Component, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { OfflineDialogComponent } from '../offline-dialog/offline-dialog.component';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
// skipcq: JS-0327
export class MapComponent {

  constructor(private dialog: MatDialog) {
    localStorage.setItem("TriedReloading", "FALSE")
  }


  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {

    if (!navigator.onLine && window.localStorage.getItem("TriedReloading") === "FALSE") {
      event.preventDefault();

      const dialogRef = this.dialog.open(OfflineDialogComponent);

      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          localStorage.setItem("TriedReloading", "TRUE")
          window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
          window.location.assign(window.location.href)
        }
      });
    }
  }

}
