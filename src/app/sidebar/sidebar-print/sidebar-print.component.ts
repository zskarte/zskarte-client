import { Component, ViewChild, ElementRef } from '@angular/core';
import { Subject, map, takeUntil, distinctUntilChanged, Observable, firstValueFrom } from 'rxjs';
import { jsPDF } from 'jspdf';
import { ZsMapStateService } from '../../state/state.service';
import { I18NService } from '../../state/i18n.service';
import { PermissionType, AccessTokenType } from '../../session/session.interfaces';
import { IZsMapPrintState, PaperDimensions } from '../../state/interfaces';
import { SessionService } from '../../session/session.service';
import { toDataURL as QRCodeToDataURL } from 'qrcode';
import html2canvas from 'html2canvas';
import { DEVICE_PIXEL_RATIO } from 'ol/has';
import { mercatorProjection } from 'src/app/helper/projections';
import { getPointResolution } from 'ol/proj';
import { MM_PER_INCHES } from '../../session/default-map-values';
import { isWebGLSupported } from 'src/app/map-renderer/utils';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from 'src/app/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-sidebar-print',
  templateUrl: './sidebar-print.component.html',
  styleUrl: './sidebar-print.component.scss',
})
export class SidebarPrintComponent {
  @ViewChild('progress', { static: false }) progressEl!: ElementRef;
  private _ngUnsubscribe = new Subject<void>();
  PermissionType = PermissionType;
  paperDimensions = Object.keys(PaperDimensions);

  format = 'A4';
  orientation: 'landscape' | 'portrait' = 'landscape';
  printMargin = 10;
  dpi = 150;
  scale?: number;
  autoScaleVal?: number;
  autoScaleHint? = '';
  printScale = true;
  emptyMap = false;
  qrCode = true;
  shareLink = false;
  sharePermission: PermissionType = PermissionType.READ;
  dimensions: [number, number] = PaperDimensions['A4'];
  generating = false;
  generateError?: string;
  generatingProgress = '0';
  qrCodeSize = 20;
  attributions?: string[];

  constructor(
    public i18n: I18NService,
    public state: ZsMapStateService,
    public session: SessionService,
    private _dialog: MatDialog,
  ) {
    firstValueFrom(state.observePrintState()).then((printState) => {
      this.format = printState.format;
      this.orientation = printState.orientation;
      this.printMargin = printState.printMargin;
      this.dpi = printState.dpi;
      this.scale = printState.scale;
      this.autoScaleVal = printState.autoScaleVal;
      if (printState.autoScaleVal) {
        this.autoScaleHint = ` 1:${Math.floor(printState.autoScaleVal * 1000)}`;
      } else {
        this.autoScaleHint = '';
      }
      this.printScale = printState.printScale;
      this.emptyMap = printState.emptyMap;
      this.qrCode = printState.qrCode;
      this.shareLink = printState.shareLink;
      this.sharePermission = printState.sharePermission;
      this.attributions = printState.attributions;
      this.updateDimension();
    });
    this.observeAutoScaleVal().subscribe((autoScaleVal) => {
      this.autoScaleVal = autoScaleVal;
      if (autoScaleVal) {
        this.autoScaleHint = ` 1:${Math.floor(autoScaleVal * 1000)}`;
      } else {
        this.autoScaleHint = '';
      }
    });
    this.observeAttributions().subscribe((attributions) => {
      this.attributions = attributions;
    });

    this.state.updatePrintState((draft: IZsMapPrintState) => {
      draft.printView = true;
    });
  }

  private observeAutoScaleVal(): Observable<number | undefined> {
    return this.state.observePrintState().pipe(
      takeUntil(this._ngUnsubscribe),
      map((o) => {
        return o?.autoScaleVal;
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  private observeAttributions(): Observable<string[] | undefined> {
    return this.state.observePrintState().pipe(
      takeUntil(this._ngUnsubscribe),
      map((o) => {
        return o?.attributions;
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  public ngOnDestroy(): void {
    this.state.updatePrintState((draft: IZsMapPrintState) => {
      draft.printView = false;
    });
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  updateDimension() {
    this.state.updatePrintState((draft: IZsMapPrintState) => {
      draft.format = this.format;
      draft.orientation = this.orientation;
      draft.printMargin = this.printMargin;
      const dim = PaperDimensions[this.format];
      if (this.orientation === 'landscape') {
        this.dimensions = [dim[0] - this.printMargin - this.printMargin, dim[1] - this.printMargin - this.printMargin];
      } else {
        this.dimensions = [dim[1] - this.printMargin - this.printMargin, dim[0] - this.printMargin - this.printMargin];
      }
      draft.dimensions = this.dimensions;
    });
  }

  updatePrintSize() {
    this.state.updatePrintState((draft: IZsMapPrintState) => {
      draft.dpi = this.dpi;
      draft.scale = this.scale;
    });
  }

  updateSettings(fieldName: string, value?) {
    if (value !== undefined) {
      this[fieldName] = value;
    }
    this.state.updatePrintState((draft: IZsMapPrintState) => {
      draft[fieldName] = this[fieldName];
    });
    /*
    if (this.scale) {
      this.state.setMapZoomScale(this.scale * 1000, this.dpi);
    } else {
      this.state.setDPI(this.dpi);
    }
    */
  }

  private static drawCanvas(canvas, mapContext: CanvasRenderingContext2D) {
    if (canvas && canvas.width > 0) {
      const opacity = canvas.parentNode.style.opacity;
      mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
      const transform = canvas.style.transform;
      if (transform) {
        // Get the transform parameters from the style's transform matrix
        const matrix = transform
          .match(/^matrix\(([^)]*)\)$/)[1]
          .split(',')
          .map(Number);
        // Apply the transform to the export map context
        CanvasRenderingContext2D.prototype.setTransform.apply(mapContext, matrix);
      } else {
        //WebGL(GPUTileLayer) have no transform css but are transformed anyway
        //olHas.DEVICE_PIXEL_RATIO is the cached value of window.devicePixelRatio at initialize of ol (value stays if browser zoom is used)
        mapContext.setTransform(1 / DEVICE_PIXEL_RATIO, 0, 0, 1 / DEVICE_PIXEL_RATIO, 0, 0);
      }
      mapContext.drawImage(canvas, 0, 0);
    }
  }

  private generateQrCodeDataUrl(relativePath: string): Promise<string> {
    const fullpath = `${window.location.origin}/${relativePath}`;
    const dpi = this.dpi < 150 ? 150 : this.dpi;
    const width = (this.qrCodeSize * dpi) / MM_PER_INCHES;
    return QRCodeToDataURL(fullpath, {
      width,
      type: 'image/png',
      margin: this.dpi <= 150 ? 1 : undefined /* = default */,
    }).catch((err) => {
      console.error(`Error generating QR Code for ${fullpath}:`, err);
      this.generateError = 'Error generating QR Code, continue without.';
      return '';
    });
  }

  generate() {
    const fullWidth = Math.round((this.dimensions[0] * this.dpi) / MM_PER_INCHES);
    const fullHeight = Math.round((this.dimensions[1] * this.dpi) / MM_PER_INCHES);
    if (Math.max(fullWidth, fullHeight) > 4096) {
      if (isWebGLSupported()) {
        //with webGL rendering there are pontential support/memory problems and the image is shrinked if to big
        const confirmation = this._dialog.open(ConfirmationDialogComponent, {
          data: this.i18n.get('deactivateWebGL'),
        });
        confirmation.afterClosed().subscribe((res) => {
          if (res) {
            window.location.search = 'nowebgl';
          }
        });
        return;
      }
    }

    this.generating = true;
    this.generatingProgress = '1%';
    this.generateError = undefined;

    const generateCallback = async () => {
      try {
        const mapCanvas = document.createElement('canvas');
        const mapContext = mapCanvas.getContext('2d');
        if (mapContext) {
          this.updateGeneratingProgress(90);
          mapCanvas.width = fullWidth;
          mapCanvas.height = fullHeight;
          //add white background for transaparent vector tile base layer (local)
          mapContext.fillStyle = 'white';
          mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
          //WebGL(GPUTileLayer) have no div around canvas but have class ol-layer on canvas itself
          document.querySelectorAll('canvas.ol-layer, .ol-layer canvas').forEach((canvas) => {
            SidebarPrintComponent.drawCanvas(canvas, mapContext);
          });
          mapContext.globalAlpha = 1;
          mapContext.setTransform(1, 0, 0, 1, 0, 0);

          const pdf = new jsPDF(this.orientation, undefined, this.format);
          //add map image
          pdf.addImage(
            mapCanvas.toDataURL('image/jpeg'),
            'JPEG',
            this.printMargin,
            this.printMargin,
            this.dimensions[0],
            this.dimensions[1],
          );
          const addScalePromise = this.addScale(pdf);
          await this.addQRCode(pdf);
          this.updateGeneratingProgress(95);
          this.addAttributions(pdf);
          this.addOperationInfos(pdf);
          await addScalePromise;
          pdf.save('map.pdf');
          this.updateGeneratingProgress(100);
        }
      } catch (ex) {
        console.error('Error while create pdf:', ex);
        this.generateError = 'Error while create pdf.';
      }

      //reset view
      this.state.updatePrintState((draft: IZsMapPrintState) => {
        draft.generateCallback = undefined;
        draft.tileEventCallback = undefined;
      });
      this.generating = false;
    };

    //apply view and than call callback
    this.state.updatePrintState((draft: IZsMapPrintState) => {
      draft.generateCallback = generateCallback;
      draft.tileEventCallback = this.getTileLoadProgressCallback();
    });
  }

  updateGeneratingProgress(percent: number) {
    this.generatingProgress = `${percent.toFixed(1)}%`;
    //update to slow over var binding [style.width]="generatingProgress", do it the native way
    if (this.progressEl) {
      this.progressEl.nativeElement.style.width = this.generatingProgress;
    }
  }

  getTileLoadProgressCallback() {
    let tileCountInit = false;
    let tileCount = 0;
    let tileDone = 0;
    const tileEventCallback = (event) => {
      if (event.type === 'tileCountInfo') {
        if (!tileCountInit) {
          tileCount = 0;
        }
        tileCount += event.detail.tileCount;
        tileCountInit = true;
      } else if (event.type === 'tileloadstart') {
        if (!tileCountInit) {
          tileCount++;
        }
      } else if (event.type === 'tileloadend' || event.type === 'tileloaderror') {
        tileDone++;
      }
      this.updateGeneratingProgress((tileDone / tileCount) * 80);
    };
    return tileEventCallback;
  }

  addOperationInfos(pdf: jsPDF) {
    if (!this.emptyMap) {
      const now = new Date();
      const pad = (val: number) => `0${val}`.slice(-2);
      const generationDate = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const operationInfo = `${this.session.getOperationName()} (PDF date: ${generationDate})`;
      pdf.setDrawColor(0);
      pdf.setFillColor(255, 255, 255);
      pdf.setFontSize(14);
      const { w: textWidth, h: textHeight } = pdf.getTextDimensions(operationInfo);
      const textLeft = (this.printMargin * 2 + this.dimensions[0] - textWidth) / 2;
      const textTop = this.printMargin;
      pdf.rect(textLeft - 3, textTop, textWidth + 6, textHeight + 1, 'FD');
      pdf.text(operationInfo, textLeft, textTop + textHeight - 0.5);
    }
  }

  async addScale(pdf: jsPDF) {
    if (this.printScale) {
      //add scale bottom left
      const scaleEl = document.querySelector('.ol-scale-bar') as HTMLElement;
      if (scaleEl) {
        //use the original scale html as image
        scaleEl.classList.add('scale-print');
        const scaleCanvas = await html2canvas(scaleEl, { backgroundColor: null });
        const scaleWidth = ((scaleCanvas.width / this.dpi) * MM_PER_INCHES) / window.devicePixelRatio;
        const scaleHeight = ((scaleCanvas.height / this.dpi) * MM_PER_INCHES) / window.devicePixelRatio;
        const scaleLeft = this.printMargin;
        const scaleTop = this.printMargin + this.dimensions[1] - scaleHeight - 1;
        pdf.addImage(scaleCanvas.toDataURL('image/png'), 'PNG', scaleLeft, scaleTop, scaleWidth, scaleHeight);
        scaleEl.classList.remove('scale-print');
      } else {
        //fallback to scale text
        pdf.setFontSize(14);
        const scale = this.scale ? `1:${this.scale * 1000}` : this.autoScaleHint ?? '';
        pdf.text(scale, this.printMargin, this.printMargin + this.dimensions[1] - 1);
      }
    }
  }

  static extractAttribution(attribution: string) {
    return (
      attribution
        //keep content and link of first a tag
        //.replace(/<a.*href="([^"]+)".*>([^<]+)<\/a>/, '$2 ($1)')
        //keep content of first tag
        .replace(/<([^>]+) ?[^>]*>([^<]+)<\/\1>/, '$2')
        //remove all other tags and content
        .replace(/<([^>]+) ?[^>]*>([^<]+)<\/\1>/g, '')
        //remove none matching tags
        .replace(/<[^>]+>/g, '')
        //decode decimal html entities
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    );
  }

  addAttributions(pdf: jsPDF) {
    //add attributions bottom center
    if (this.attributions && this.attributions.length > 0) {
      const attribution = [...new Set(this.attributions.map((a) => SidebarPrintComponent.extractAttribution(a)))].join(' | ');
      pdf.setDrawColor(0);
      pdf.setFillColor(224, 224, 224);
      pdf.setFontSize(8);
      const { w: textWidth, h: textHeight } = pdf.getTextDimensions(attribution);
      const maxWidth = (this.dimensions[0] / 3) * 2;
      if (textWidth > maxWidth) {
        const texts = pdf.splitTextToSize(attribution, maxWidth) as string[];
        const textLeft = (this.printMargin * 2 + this.dimensions[0] - maxWidth) / 2;
        let textBottom = this.printMargin + this.dimensions[1] - 1;
        const fullHeight = textHeight * texts.length;
        pdf.rect(textLeft - 1, textBottom - fullHeight, maxWidth + 2, fullHeight + 1, 'F');
        texts.reverse();
        for (const text of texts) {
          pdf.text(text, textLeft, textBottom);
          textBottom -= textHeight;
        }
      } else {
        const textLeft = (this.printMargin * 2 + this.dimensions[0] - textWidth) / 2;
        const textBottom = this.printMargin + this.dimensions[1] - 1;
        pdf.rect(textLeft - 1, textBottom - textHeight, textWidth + 2, textHeight + 1, 'F');
        pdf.text(attribution, textLeft, textBottom);
      }
    } else {
      console.error('attributions missing');
      this.generateError = 'attributions missing, continue without.';
    }
  }

  async addQRCode(pdf: jsPDF) {
    if (this.qrCode && !this.emptyMap) {
      //add QR-Code bottom right
      let relativePath: string;
      if (this.shareLink) {
        const joinCode = await this.session.generateShareLink(this.sharePermission, AccessTokenType.LONG);
        relativePath = `share/${joinCode}`;
      } else {
        relativePath = 'map';
      }
      //add informations to link
      const printCenter = this.state.getPrintCenter();
      const center = printCenter?.map((x) => Math.floor(x)).join(',');
      relativePath += `?operationId=${this.session.getOperationId()}&center=${center}`;
      if (mercatorProjection && printCenter) {
        const resolution = this.scale ?? this.autoScaleVal ?? 10;
        const pointResolution = getPointResolution(mercatorProjection, resolution, printCenter, 'm');
        const reversePointResolution = (resolution / pointResolution) * resolution;
        const width = Math.floor(reversePointResolution * this.dimensions[0]);
        const height = Math.floor(reversePointResolution * this.dimensions[1]);
        relativePath += `&size=${width},${height}`;
      }
      const qrData = await this.generateQrCodeDataUrl(relativePath);
      pdf.addImage(
        qrData,
        'PNG',
        this.printMargin + this.dimensions[0] - this.qrCodeSize,
        this.printMargin + this.dimensions[1] - this.qrCodeSize,
        this.qrCodeSize,
        this.qrCodeSize,
      );
    }
  }
}
