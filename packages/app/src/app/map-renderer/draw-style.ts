import {
  defineDefaultValuesForSignature,
  FillStyle,
  getFirstCoordinate,
  getLastCoordinate,
  HierarchyLevel,
  Sign,
  signatureDefaultValues,
} from '@zskarte/types';
import FillPattern from 'ol-ext/style/FillPattern';
import { FeatureLike } from 'ol/Feature';
import { Geometry, MultiPolygon } from 'ol/geom';
import LineString from 'ol/geom/LineString';
import MultiPoint from 'ol/geom/MultiPoint';
import Point from 'ol/geom/Point';
import Circle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import Style, { StyleLike } from 'ol/style/Style';
import Text from 'ol/style/Text';
import { Md5 } from 'ts-md5';
import { ZsMapOLFeatureProps } from './elements/base/ol-feature-props';
import { Signs } from './signs';

// skipcq: JS-0327
export class DrawStyle {
  static defaultScaleFactor = 0.2;

  static textScaleFactor = 1;

  private static globalScaleFactor = 1;
  private static symbolStyleCache = {};
  private static vectorStyleCache = {};
  private static colorFill = {};
  private static clusterStyleCache = {};

  private static lastResolution = 0;

  public static getSignatureURI(signature: Sign): string {
    if (signature.id === Signs.HAZARD_SIGN_ID) {
      // The gefahrentafel is generated on the fly
      return DrawStyle.getHazardSignSvg(signature);
    } else if (signature.id === Signs.FORMATION_SIGN_ID) {
      // The formation sign is generated on the fly
      return DrawStyle.getFormationSvg(signature);
    } else if (signature.id === Signs.RESOURCE_PLACEHOLDER_SIGN_ID) {
      // The resource sign is generated on the fly
      return DrawStyle.getResourceSvg(signature);
    } else if (Signs.TRANSPORT_SIGN_IDS.includes(signature.id ?? 0)) {
      // The transport sign is generated on the fly
      return DrawStyle.getTransportSvg(signature);
    } else if (Signs.LEADER_SIGN_IDS.includes(signature.id ?? 0)) {
      // The leader sign is generated on the fly
      return DrawStyle.getLeaderSignSvg(signature);
    } else {
      return DrawStyle.getImageUrl(signature.src);
    }
  }

  public static getImageUrl(file: string): string {
    return `assets/img/signs/${file}`;
  }

  public static setGlobalScaleFactor(scale: number): void {
    const nextScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    if (nextScale === DrawStyle.globalScaleFactor) {
      return;
    }
    DrawStyle.globalScaleFactor = nextScale;
    DrawStyle.clearCaches();
  }

  private static scale(resolution: number, scaleFactor: number, min = 0.05): number {
    const baseScale = Math.max(min, (scaleFactor * Math.sqrt(0.5 * resolution)) / resolution);
    return baseScale * DrawStyle.globalScaleFactor;
  }

  private static getDash(lineStyle: string | undefined, resolution: number): number[] {
    let value = 0;
    if (lineStyle === 'dash') {
      value = Math.max(30, DrawStyle.scale(resolution, 20));
    }
    if (lineStyle === 'thindash') {
      value = Math.max(15, DrawStyle.scale(resolution, 10));
    }
    if (lineStyle === 'dotted') {
      value = DrawStyle.scale(resolution, 0.2);
      return [value, value * 40];
    }
    return [value, value];
  }

  private static getDashOffset(lineStyle: string | undefined, resolution: number): number {
    let value = 0;
    if (lineStyle === 'dash' || lineStyle === 'dotted') {
      value = Math.max(30, DrawStyle.scale(resolution, 20));
    }
    if (lineStyle === 'thindash') {
      value = Math.max(15, DrawStyle.scale(resolution, 10));
    }
    return value;
  }

  private static styleFunctionSelectSingleFeature(
    feature: FeatureLike,
    resolution: number,
    editMode: boolean,
  ) {
    if (resolution !== DrawStyle.lastResolution) {
      DrawStyle.lastResolution = resolution;
      DrawStyle.clearCaches();
    }
    // The feature shall not be displayed or is errorenous. Therefore, we return an empty style.
    const signature = feature.get('sig');
    if (!signature) {
      return [];
    } else {
      return DrawStyle.featureStyleFunction(feature, resolution, signature, true, editMode);
    }
  }

  public static styleFunctionSelect(
    feature: FeatureLike,
    resolution: number,
    editMode: boolean,
  ): Style[] {
    if (feature.get('features')) {
      const features = feature.get('features');
      if (features.length > 1) {
        return DrawStyle.clusterStyleFunction(feature, resolution);
      } else if (features.length > 0) {
        return DrawStyle.styleFunctionSelectSingleFeature(features[0], resolution, editMode);
      } else {
        return [];
      }
    } else {
      return DrawStyle.styleFunctionSelectSingleFeature(feature, resolution, editMode);
    }
  }

  private static getGridDimensions(totalSize: number): number {
    return Math.ceil(Math.sqrt(totalSize));
  }

  private static getNumberOfRows(totalSize: number): number {
    return Math.ceil(totalSize / DrawStyle.getGridDimensions(totalSize));
  }

  private static getNumberOfInstancesInLastRow(totalSize: number): number {
    const numberOfRows = DrawStyle.getNumberOfRows(totalSize);
    const gridDimensions = DrawStyle.getGridDimensions(totalSize);
    const remainder = totalSize % Math.max(1, (numberOfRows - 1) * gridDimensions);
    return remainder === 0 ? gridDimensions : remainder;
  }

  private static getIconLocation(index: number, totalSize: number, iconSizeInCoordinates: number): number[] {
    const numberOfRows = DrawStyle.getNumberOfRows(totalSize);
    const gridDimensions = DrawStyle.getGridDimensions(totalSize);
    const row = Math.floor(index / gridDimensions);
    const col = index - row * gridDimensions;
    const numberOfInstancesInRow =
      numberOfRows - row - 1 === 0 ? this.getNumberOfInstancesInLastRow(totalSize) : gridDimensions;
    const leftOffset = numberOfInstancesInRow / 2 - col + 0.5;
    const topOffset = numberOfRows / 2 - row + 0.5;
    return [
      iconSizeInCoordinates - leftOffset * iconSizeInCoordinates,
      iconSizeInCoordinates - topOffset * iconSizeInCoordinates,
    ];
  }

  public static clusterStyleFunctionDefault(feature: FeatureLike, resolution: number): StyleLike {
    if (resolution !== DrawStyle.lastResolution) {
      DrawStyle.lastResolution = resolution;
      DrawStyle.clearCaches();
    }
    return DrawStyle.clusterStyleFunction(feature, resolution);
  }

  private static clusterStyleFunction(feature: FeatureLike, resolution: number): Style[] {
    const features = feature.get('features') as FeatureLike[];
    const size = features.length;
    if (size === 0) {
      return [];
    } else if (size === 1) {
      return DrawStyle.styleFunction(features[0], resolution);
    }

    let style = this.clusterStyleCache[features.length];
    if (!style) {
      const scale = DrawStyle.scale(resolution, DrawStyle.defaultScaleFactor);
      style = [
        new Style({
          image: new Circle({
            radius: 250,
            scale,
            fill: new Fill({
              color: 'rgba(255, 153, 102, 0.3)',
            }),
          }),
        }),
        new Style({
          image: new Circle({
            radius: 200,
            scale,
            fill: new Fill({
              color: 'rgba(255, 165, 0, 0.7)',
            }),
          }),
          text: new Text({
            text: size.toString(),
            font: `${150}px sans-serif`,
            scale,
            fill: new Fill({
              color: '#fff',
            }),
            stroke: new Stroke({
              color: 'rgba(0, 0, 0, 0.6)',
              width: 30,
            }),
          }),
        }),
      ];
      this.clusterStyleCache[size] = style;
    }

    return style;
  }

  public static styleFunction(feature: FeatureLike, resolution: number, showNames?: boolean): Style[] {
    if (resolution !== DrawStyle.lastResolution) {
      DrawStyle.lastResolution = resolution;
      DrawStyle.clearCaches();
    }

    if (feature.get('features')) {
      const features = feature.get('features');
      if (features.length > 1) {
        return DrawStyle.clusterStyleFunction(feature, resolution);
      } else if (features.length > 0 && features[0].get('sig')) {
        return DrawStyle.featureStyleFunction(features[0], resolution, features[0].get('sig'), false, true, showNames);
      } else {
        return [];
      }
    } else if (feature.get('sig')) {
      return DrawStyle.featureStyleFunction(feature, resolution, feature.get('sig'), false, true, showNames);
    }

    // The feature shall not be displayed or is errorenous. Therefore, we return an empty style.
    return [];
  }

  private static featureStyleFunction(
    feature: FeatureLike,
    resolution: number,
    signature: Sign,
    selected: boolean,
    editMode: boolean,
    showNames?: boolean,
  ): Style[] {
    defineDefaultValuesForSignature(signature);
    const scale = DrawStyle.scale(resolution, DrawStyle.defaultScaleFactor);
    const vectorStyles = this.getVectorStyles(feature, resolution, signature, selected, scale, editMode);
    const iconStyles = this.getIconStyle(feature, resolution, signature, selected, scale, showNames);
    const styles: any[] = [];

    if (iconStyles) {
      iconStyles.forEach((i) => styles.push(i));
    }
    if (vectorStyles) {
      vectorStyles.forEach((v) => styles.push(v));
    }

    // Additional shizzle (Text and Circle) for text items:
    if (signature.text) {
      const zIndex = selected ? Infinity : this.getZIndex(feature);
      const color = signature.color ?? '';
      const fontSize = signature.fontSize ?? signatureDefaultValues.fontSize;

      styles.push(
        new Style({
          text: new Text({
            text: signature.text,
            backgroundFill: this.getColorFill('#FFFFFF'),
            font: `${fontSize * 30}px sans-serif`,
            rotation: signature.rotation !== undefined ? (signature.rotation * Math.PI) / 180 : 0,
            scale: DrawStyle.scale(resolution, DrawStyle.textScaleFactor, 0.4),
            fill: this.getColorFill(color),
            backgroundStroke: this.createDefaultStroke(scale, color),
            padding: [5, 5, 5, 5],
          }),
          geometry(feature) {
            return new Point(
              (feature.getGeometry() as any).getCoordinates()[
                (feature.getGeometry() as any).getCoordinates().length - 1
              ],
            );
          },
          zIndex,
        }),
      );
      styles.push(
        new Style({
          image: new Circle({
            radius: scale * 50,
            fill: this.getColorFill(color),
          }),
          geometry(feature) {
            return new Point((feature.getGeometry() as any).getCoordinates()[0]);
          },
          zIndex,
        }),
      );
    }

    return styles;
  }

  public static clearCaches(): void {
    DrawStyle.symbolStyleCache = {};
    DrawStyle.vectorStyleCache = {};
    DrawStyle.colorFill = {};
    DrawStyle.clusterStyleCache = {};
  }

  private static calculateCacheHashForCluster(groupedFeatures: any, selected: boolean): string {
    return Md5.hashStr(
      JSON.stringify({
        groupedFeatures,
        selected,
      }),
    ).toString();
  }

  private static asDataImageSvg(svg: string): string {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  private static escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  public static getHazardSignSvg(signature: Sign): string {
    const color = '#FF9100';
    const hazardCode = signature.hazardCode ?? '';
    const unNumber = signature.unNumber ?? '';
    const svg = `
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 156 156" width="156px" height="156px" style="enable-background:new 0 0 156 156;" xml:space="preserve">
<style type="text/css">
	.st0{fill:${color};}
	.st2{font-family:'Arial'; font-weight: 600; font-size: 36px; text-anchor: middle;}
</style>
<g>
	<path class="st0" d="M149.2,125.6H2.8V34.6h146.4L149.2,125.6L149.2,125.6z M10.2,118.1h131.5v-76H10.2V118.1z"/>
	<text x="78" y="72" class="st0 st2">${hazardCode}</text>
	<text x="78" y="115" class="st0 st2">${unNumber}</text>
	<rect x="6.5" y="76.2" class="st0" width="139.1" height="7.4"/>
</g>
</svg>`.trim();
    return this.asDataImageSvg(svg)
  }

  public static getTransportSvg(signature: Sign): string {
    const color = signature.color ?? '#0000FF';
    const organization = signature.organization ?? '';
    const formationDetail = signature.formationDetail ?? '';
    const signId = signature.id;

    // Use larger viewBox with padding to prevent clipping
    const padding = 40;
    const viewBoxWidth = 156 + padding * 2;
    const viewBoxHeight = 156 + padding * 2;

    // Generate wheels based on sign ID
    // 192 = Motorfahrzeug (2 wheels)
    // 201 = Transportfahrzeug (3 wheels)
    // 190 = Lastwagen (3 wheels in 1/2 pattern)
    let wheelsHtml = '';
    const wheelRadius = 16.5;
    const wheelStroke = 6.5;
    const wheelY = 135;

    if (signId === Signs.MOTOR_VEHICLE_SIGN_ID) {
      // Motorfahrzeug: 2 wheels
      wheelsHtml = `
        <circle cx="${padding + 45}" cy="${wheelY}" r="${wheelRadius}" fill="white" stroke="${color}" stroke-width="${wheelStroke}"/>
        <circle cx="${padding + 111}" cy="${wheelY}" r="${wheelRadius}" fill="white" stroke="${color}" stroke-width="${wheelStroke}"/>`;
    } else if (signId === Signs.TRANSPORT_VEHICLE_SIGN_ID) {
      // Transportfahrzeug: 3 wheels
      wheelsHtml = `
        <circle cx="${padding + 33}" cy="${wheelY}" r="${wheelRadius}" fill="white" stroke="${color}" stroke-width="${wheelStroke}"/>
        <circle cx="${padding + 78}" cy="${wheelY}" r="${wheelRadius}" fill="white" stroke="${color}" stroke-width="${wheelStroke}"/>
        <circle cx="${padding + 123}" cy="${wheelY}" r="${wheelRadius}" fill="white" stroke="${color}" stroke-width="${wheelStroke}"/>`;
    } else {
      // Lastwagen (190): 3 wheels, one in front, two in the back
      wheelsHtml = `
        <circle cx="${padding + 20}" cy="${wheelY}" r="${wheelRadius}" fill="white" stroke="${color}" stroke-width="${wheelStroke}"/>
        <circle cx="${padding + 95}" cy="${wheelY}" r="${wheelRadius}" fill="white" stroke="${color}" stroke-width="${wheelStroke}"/>
        <circle cx="${padding + 135}" cy="${wheelY}" r="${wheelRadius}" fill="white" stroke="${color}" stroke-width="${wheelStroke}"/>`;
    }

    // Calculate font size for organization text based on length
    let orgFontSize = 32;
    if (organization.length > 3) {
      orgFontSize = Math.max(18, 32 - (organization.length - 3) * 4);
    }

    // Truck body path
    const bodyPath = `M${padding + 3.8},${68.5 + padding} L${padding + 3.8},${3.8 + padding} L${padding + 41.5},${15 + padding} L${padding + 78},${17.3 + padding} L${padding + 114.5},${15 + padding} L${padding + 152.2},${3.8 + padding} L${padding + 152.2},${68.5 + padding} Z`;

    const svg = `
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" width="${viewBoxWidth}px" height="${viewBoxHeight}px">
  <!-- Truck body -->
  <path d="${bodyPath}" fill="white" stroke="${color}" stroke-width="7"/>
  
  <!-- Organization text in body -->
  <text x="${padding + 78}" y="${55 + padding}" fill="${color}" font-family="Arial" font-weight="700" font-size="${orgFontSize}" text-anchor="middle">${DrawStyle.escapeXml(organization)}</text>

  <!-- Formation detail text above body -->
  <text x="${padding + 78}" y="${padding - 5}" fill="${color}" font-family="Arial" font-weight="600" font-size="22" text-anchor="middle">${DrawStyle.escapeXml(formationDetail)}</text>
  
  <!-- Wheels -->
  ${wheelsHtml}
</svg>`.trim();

    return this.asDataImageSvg(svg);
  }

  public static getLeaderSignSvg(signature: Sign): string {
    const color = signature.color ?? '#0000FF';
    const organization = signature.organization ?? '';
    const signId = signature.id;

    // Use larger viewBox with padding to prevent clipping
    const padding = 20;
    const viewBoxWidth = 156 + padding * 2;
    const viewBoxHeight = 156 + padding * 2;

    // Center coordinates
    const centerX = 78 + padding;
    const circleY = 129 + padding;
    const circleRadius = 37;

    // Pole dimensions
    const poleX = centerX;
    const poleTop = padding;
    const poleBottom = circleY - circleRadius;
    const poleWidth = 8;
    const barWidth = 32;
    const barHeight = 8;

    // Generate the horizontal bar(s) at top
    let barsHtml = `<rect x="${poleX}" y="${poleTop}" width="${barWidth}" height="${barHeight}" fill="${color}"/>`;
    if (signId === 84) {
      // Second bar for platoon leader
      barsHtml += `<rect x="${poleX}" y="${poleTop + 22}" width="${barWidth}" height="${barHeight}" fill="${color}"/>`;
    }
    if (signId === 40) {
      // Third bar for head of operations
      barsHtml += `<rect x="${poleX}" y="${poleTop + 22}" width="${barWidth}" height="${barHeight}" fill="${color}"/>`;
      barsHtml += `<rect x="${poleX}" y="${poleTop + 44}" width="${barWidth}" height="${barHeight}" fill="${color}"/>`;
    }

    // Calculate font size for organization text based on length
    let orgFontSize = 40;
    if (organization.length > 1) {
      orgFontSize = Math.max(20, 40 - (organization.length - 1) * 8);
    }

    const svg = `
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" width="${viewBoxWidth}px" height="${viewBoxHeight}px">
  <!-- Vertical pole -->
  <rect x="${poleX - poleWidth/2}" y="${poleTop}" width="${poleWidth}" height="${poleBottom - poleTop}" fill="${color}"/>
  
  <!-- Horizontal bar(s) at top -->
  ${barsHtml}
  
  <!-- Circle with white fill -->
  <circle cx="${centerX}" cy="${circleY}" r="${circleRadius}" fill="white" stroke="${color}" stroke-width="9"/>
  
  <!-- Organization text inside circle -->
  <text x="${centerX}" y="${circleY + 8}" fill="${color}" font-family="Arial" font-weight="700" font-size="${orgFontSize}" text-anchor="middle">${DrawStyle.escapeXml(organization)}</text>
</svg>`.trim();

    return this.asDataImageSvg(svg);
  }

  public static getFormationSvg(signature: Sign): string {
    const color = signature.color ?? '#0000FF';
    const hierarchyLevel = signature.hierarchyLevel ?? HierarchyLevel.TRUPP;
    const organization = signature.organization ?? '';
    const formationDetail = signature.formationDetail ?? '';
    const additionalInfo = signature.additionalInfo ?? '';
    const formationNumber = signature.formationNumber ?? '';
    const formationLocation = signature.formationLocation ?? '';

    // Use larger viewBox with padding to prevent clipping
    const padding = 40;
    const radius = 78;
    const viewBoxSize = (radius * 2) + padding * 2;
    const circleCenter = radius + padding; // Center of the main circle, offset by padding

    // Generate hierarchy indicator (dots or bars)
    let hierarchyIndicator = '';
    const dotRadius = 8;
    const dotY = 15 + padding;
    const dotSpacing = 25;

    switch (hierarchyLevel) {
      case HierarchyLevel.TRUPP: // 1 dot
        hierarchyIndicator = `<circle cx="${circleCenter}" cy="${dotY}" r="${dotRadius}" fill="${color}"/>`;
        break;
      case HierarchyLevel.GRUPPE: // 2 dots
        hierarchyIndicator = `
          <circle cx="${circleCenter - dotSpacing/2}" cy="${dotY}" r="${dotRadius}" fill="${color}"/>
          <circle cx="${circleCenter + dotSpacing/2}" cy="${dotY}" r="${dotRadius}" fill="${color}"/>`;
        break;
      case HierarchyLevel.ZUG: // 3 dots
        hierarchyIndicator = `
          <circle cx="${circleCenter - dotSpacing}" cy="${dotY}" r="${dotRadius}" fill="${color}"/>
          <circle cx="${circleCenter}" cy="${dotY}" r="${dotRadius}" fill="${color}"/>
          <circle cx="${circleCenter + dotSpacing}" cy="${dotY}" r="${dotRadius}" fill="${color}"/>`;
        break;
      case HierarchyLevel.KOMPANIE: // cross
        hierarchyIndicator = `
          <rect x="${circleCenter - 3}" y="${padding - 5}" width="6" height="40" fill="${color}"/>
          <rect x="${circleCenter - 15}" y="${12 + padding}" width="30" height="6" fill="${color}"/>`;
        break;
      case HierarchyLevel.BATAILLON: // cross with two lines
        hierarchyIndicator = `
          <rect x="${circleCenter - 3}" y="${padding - 5}" width="6" height="40" fill="${color}"/>
          <rect x="${circleCenter - 15}" y="${18 + padding}" width="30" height="6" fill="${color}"/>
          <rect x="${circleCenter - 15}" y="${8 + padding}" width="30" height="6" fill="${color}"/>`;
        break;
      default:
        hierarchyIndicator = `<circle cx="${circleCenter}" cy="${dotY}" r="${dotRadius}" fill="${color}"/>`;
    }

    // Calculate font size for organization text based on length
    let orgFontSize = 28;
    if (organization.length > 3) {
      orgFontSize = Math.max(16, 28 - (organization.length - 3) * 4);
    }

    // Bottom text (number and location)
    let bottomText = '';
    if (formationNumber || formationLocation) {
      const bottomY1 = 150 + padding;
      const bottomY2 = 170 + padding;
      if (formationNumber && formationLocation) {
        bottomText = `
          <text x="${circleCenter}" y="${bottomY1}" fill="${color}" font-family="Arial" font-weight="600" font-size="22" text-anchor="middle">${DrawStyle.escapeXml(formationNumber)}</text>
          <text x="${circleCenter}" y="${bottomY2}" fill="${color}" font-family="Arial" font-weight="600" font-size="22" text-anchor="middle">${DrawStyle.escapeXml(formationLocation)}</text>`;
      } else if (formationNumber) {
        bottomText = `<text x="${circleCenter}" y="${bottomY1}" fill="${color}" font-family="Arial" font-weight="600" font-size="22" text-anchor="middle">${DrawStyle.escapeXml(formationNumber)}</text>`;
      } else {
        bottomText = `<text x="${circleCenter}" y="${bottomY1}" fill="${color}" font-family="Arial" font-weight="600" font-size="22" text-anchor="middle">${DrawStyle.escapeXml(formationLocation)}</text>`;
      }
    }

    const svg = `
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${viewBoxSize}px" height="${viewBoxSize}px">
  <!-- Hierarchy indicator (dots or bars) -->
  ${hierarchyIndicator}
  
  <!-- Main circle with white fill -->
  <circle cx="${circleCenter}" cy="${78 + padding}" r="40" fill="white" stroke="${color}" stroke-width="8"/>
  
  <!-- Organization text inside circle -->
  <text x="${circleCenter}" y="${85 + padding}" fill="${color}" font-family="Arial" font-weight="700" font-size="${orgFontSize}" text-anchor="middle">${DrawStyle.escapeXml(organization)}</text>

  <!-- Left text (formation detail) -->
  <text x="${25 + padding}" y="${85 + padding}" fill="${color}" font-family="Arial" font-weight="600" font-size="22" text-anchor="end">${DrawStyle.escapeXml(formationDetail)}</text>

  <!-- Right text (additional info) -->
  <text x="${131 + padding}" y="${85 + padding}" fill="${color}" font-family="Arial" font-weight="600" font-size="22" text-anchor="start">${DrawStyle.escapeXml(additionalInfo)}</text>
  
  <!-- Bottom text -->
  ${bottomText}
</svg>`.trim();

    return this.asDataImageSvg(svg);
  }

  private static truncateForSvg(value: string, maxLength = 16): string {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
  }

  public static getResourceSvg(signature: Sign): string {
    const color = signature.color ?? '#0000FF';
    const resourceItems = signature.resourceItems ?? [];

    // Use larger viewBox with padding to prevent clipping
    const padding = 20;
    const boxWidth = 156;
    const boxHeight = 100;
    const viewBoxWidth = boxWidth + padding * 2;
    const viewBoxHeight = boxHeight + padding * 2;
    const centerX = viewBoxWidth / 2;

    const distinctArticleNumbers = new Set(resourceItems.map((item) => item.articleNumber));
    const totalQuantity = resourceItems.reduce((sum, item) => sum + item.quantity, 0);

    let titleLine: string;
    let quantityLine = '';
    if (distinctArticleNumbers.size <= 1) {
      const articleName = resourceItems[0]?.name ?? signature.label ?? '';
      titleLine = DrawStyle.truncateForSvg(articleName);
      if (totalQuantity > 1) {
        quantityLine = `×${totalQuantity}`;
      }
    } else {
      titleLine = DrawStyle.truncateForSvg(signature.label || 'Mittel');
      quantityLine = `${distinctArticleNumbers.size} Artikel`;
    }

    const titleY = quantityLine ? viewBoxHeight / 2 - 6 : viewBoxHeight / 2 + 7;

    const svg = `
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" width="${viewBoxWidth}px" height="${viewBoxHeight}px">
  <!-- Rounded resource box -->
  <rect x="${padding}" y="${padding}" width="${boxWidth}" height="${boxHeight}" rx="14" ry="14" fill="white" stroke="${color}" stroke-width="7"/>

  <!-- Article name -->
  <text x="${centerX}" y="${titleY}" fill="${color}" font-family="Arial" font-weight="700" font-size="22" text-anchor="middle">${DrawStyle.escapeXml(titleLine)}</text>

  <!-- Quantity / article count -->
  ${quantityLine ? `<text x="${centerX}" y="${viewBoxHeight / 2 + 20}" fill="${color}" font-family="Arial" font-weight="600" font-size="20" text-anchor="middle">${DrawStyle.escapeXml(quantityLine)}</text>` : ''}
</svg>`.trim();

    return this.asDataImageSvg(svg);
  }

  private static calculateCacheHashForSymbol(
    signature: Sign,
    feature: FeatureLike,
    resolution: number,
    selected: boolean,
    highlighted: boolean,
    hidden: boolean,
    showNames?: boolean,
  ): string {
    feature = DrawStyle.getSubFeature(feature);
    return Md5.hashStr(
      JSON.stringify({
        resolution,
        selected,
        highlighted,
        hidden,
        showNames,
        rotation: signature.rotation,
        label: signature.label,
        labelShow: signature.labelShow,
        signatureColor: signature.color,
        signatureSrc: signature.src,
        type: feature?.getGeometry()?.getType(),
        hideIcon: signature.hideIcon,
        iconsOffset: signature.iconsOffset,
        iconSize: signature.iconSize,
        iconOpacity: signature.iconOpacity,
        zindex: this.getZIndex(feature),
        affectedPersons: signature.affectedPersons,
        hazardCode: signature.hazardCode,
        unNumber: signature.unNumber,
        hierarchyLevel: signature.hierarchyLevel,
        organization: signature.organization,
        formationDetail: signature.formationDetail,
        additionalInfo: signature.additionalInfo,
        formationNumber: signature.formationNumber,
        formationLocation: signature.formationLocation,
        resourceItems: signature.resourceItems,
      }),
    ).toString();
  }

  private static calculateCacheHashForVector(
    signature: Sign,
    feature: FeatureLike,
    resolution: number,
    selected: boolean,
    highlighted: boolean,
    editMode: boolean,
  ): string {
    feature = DrawStyle.getSubFeature(feature);
    let relevantCoordinates: any[] | null = null;
    if (feature?.getGeometry()?.getType() === 'LineString' && signature.arrow && signature.arrow !== 'none') {
      const coordinates = (feature?.getGeometry() as LineString)?.getCoordinates();
      relevantCoordinates = [
        coordinates[Math.max(0, coordinates.length - 1)],
        coordinates[Math.max(0, coordinates.length - 2)],
      ];
    }

    return Md5.hashStr(
      JSON.stringify({
        resolution,
        selected,
        highlighted,
        editMode,
        color: signature.color,
        protected: signature.protected,
        opacity: signature.fillOpacity,
        lineStyle: signature.style,
        type: feature?.getGeometry()?.getType(),
        strokeWidth: signature.strokeWidth,
        zindex: this.getZIndex(feature),
        coordinates: relevantCoordinates,
        arrow: signature.arrow,
        fillStyle: signature.fillStyle ? signature.fillStyle.name : null,
        fillStyleSize: signature.fillStyle ? signature.fillStyle.size : null,
        fillStyleAngle: signature.fillStyle ? signature.fillStyle.angle : null,
        fillStyleSpacing: signature.fillStyle ? signature.fillStyle.spacing : null,
        reportNumber: signature.reportNumber,
        id: feature.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID),
      }),
    ).toString();
  }

  public static getIconCoordinates(feature: FeatureLike, resolution: number) {
    feature = DrawStyle.getSubFeature(feature);
    const signature = feature.get('sig');
    const symbolAnchorCoordinate = getFirstCoordinate(feature);
    const offsetX = signature.iconsOffset && signature.iconsOffset !== undefined ? signature.iconsOffset.x : 0.1;
    const offsetY = signature.iconsOffset && signature.iconsOffset !== undefined ? signature.iconsOffset.y : 0.1;
    const resolutionFactor = (resolution / 10) * DrawStyle.globalScaleFactor;
    const symbolCoordinate = [
      symbolAnchorCoordinate[0] - offsetX * resolutionFactor,
      symbolAnchorCoordinate[1] - offsetY * resolutionFactor,
    ];
    return [symbolAnchorCoordinate, symbolCoordinate];
  }

  private static getEndIconCoordinates(feature: FeatureLike, resolution: number) {
    feature = DrawStyle.getSubFeature(feature);
    const signature = feature.get('sig');
    const symbolAnchorCoordinate = getLastCoordinate(feature);
    const offsetX = signature.iconsOffset ?
      (signature.iconsOffset.endHasDifferentOffset && signature.iconsOffset.endX !== undefined ?
      signature.iconsOffset.endX : signature.iconsOffset.x) : 0.1;
    const offsetY = signature.iconsOffset ?
      (signature.iconsOffset.endHasDifferentOffset && signature.iconsOffset.endY !== undefined ?
      signature.iconsOffset.endY : signature.iconsOffset.y) : 0.1;
    const resolutionFactor = (resolution / 10) * DrawStyle.globalScaleFactor;
    const symbolCoordinate = [
      symbolAnchorCoordinate[0] - offsetX * resolutionFactor,
      symbolAnchorCoordinate[1] - offsetY * resolutionFactor,
    ];
    return [symbolAnchorCoordinate, symbolCoordinate];
  }

  private static createLineToIcon(feature: FeatureLike, resolution: number, isEndIcon = false): LineString {
    feature = DrawStyle.getSubFeature(feature);
    const iconCoordinates =
      isEndIcon ?
        DrawStyle.getEndIconCoordinates(feature, resolution)
      : DrawStyle.getIconCoordinates(feature, resolution);
    const symbolAnchorCoordinate = iconCoordinates[0];
    const symbolCoordinate = iconCoordinates[1];
    return new LineString([
      symbolCoordinate,
      [
        (symbolCoordinate[0] + symbolAnchorCoordinate[0] * 2) / 3,
        (symbolCoordinate[1] + symbolAnchorCoordinate[1]) / 2,
      ],
      symbolAnchorCoordinate,
    ]);
  }

  private static getColorFill(color: string): Fill {
    let result = this.colorFill[color];
    if (!result) {
      result = this.colorFill[color] = new Fill({ color });
    }
    return result;
  }

  private static showIcon(signature: Sign): boolean {
    return !signature.hideIcon && Boolean(signature.src);
  }

  private static createDefaultStroke(scale: number, color: string, dashed = false, opacity = 1): Stroke {
    const strokeWidth = scale * 10;
    const stroke = new Stroke({
      color: DrawStyle.colorFunction(color, opacity),
      width: strokeWidth,
    });
    if (dashed) {
      stroke.setLineDash([strokeWidth * 2, strokeWidth * 2]);
      stroke.setLineDashOffset(strokeWidth * 2);
    }
    return stroke;
  }

  private static getSubFeature(feature: FeatureLike): FeatureLike {
    const subfeature = feature.get('features');
    if (subfeature && subfeature.length === 1) {
      return subfeature[0];
    }
    return feature;
  }

  private static getIconStyle(
    feature: FeatureLike,
    resolution: number,
    signature: Sign,
    selected: boolean,
    scale: number,
    showNames?: boolean,
  ): Style[] {
    feature = DrawStyle.getSubFeature(feature);
    const zIndex = selected ? Infinity : this.getZIndex(feature);
    const highlighted = feature.get('highlighted');
    const hidden = feature.get('hidden');
    const symbolCacheHash = DrawStyle.calculateCacheHashForSymbol(
      signature,
      feature,
      resolution,
      selected,
      highlighted,
      hidden,
      showNames,
    );
    let iconStyles = this.symbolStyleCache[symbolCacheHash];
    if (!iconStyles && signature.src && feature.getGeometry()) {
      iconStyles = this.symbolStyleCache[symbolCacheHash] = [];
      const showIcon = this.showIcon(signature);
      const highlightedIcon = highlighted && Boolean(signature.src);
      const dashedStroke = this.createDefaultStroke(scale, signature.color ?? '#535353', true, signature.iconOpacity);
      const iconRadius = scale * 250 * (signature.iconSize ?? 1);
      const notificationIconRadius = iconRadius / 4;
      const highlightStroke = selected || highlightedIcon ? DrawStyle.getHighlightStroke(feature, scale) : null;
      if ((showIcon || signature.type === 'Point') && (selected || highlightedIcon)) {
        // Highlight the stroke to the icon
        iconStyles.push(
          new Style({
            stroke: highlightStroke ?? undefined,
            geometry(feature) {
              return DrawStyle.createLineToIcon(feature, resolution);
            },
            zIndex,
          }),
        );

        const highlightCircle = new Circle({
          radius: iconRadius,
          stroke: highlightStroke ?? undefined,
        });

        iconStyles.push(
          new Style({
            image: highlightCircle,
            geometry: (feature) => new Point(DrawStyle.getIconCoordinates(feature, resolution)[1]),
            zIndex,
          }),
        );
        if (signature.type === 'LineString') {
          iconStyles.push(
            new Style({
              image: highlightCircle,
              geometry: (feature) => new Point(DrawStyle.getEndIconCoordinates(feature, resolution)[1]),
              zIndex,
            }),
          );
          iconStyles.push(
            new Style({
              stroke: highlightStroke ?? undefined,
              geometry(feature) {
                return DrawStyle.createLineToIcon(feature, resolution, true);
              },
              zIndex,
            }),
          );
        }
      }

      if (showIcon || (signature.type === 'Point' && (selected || highlightedIcon))) {
        // Draw a dashed line to the icon
        iconStyles.push(
          new Style({
            stroke: dashedStroke,
            opacity: signature.iconOpacity ?? 1,
            geometry(feature: FeatureLike) {
              return DrawStyle.createLineToIcon(feature, resolution);
            },
            zIndex,
          } as any),
        );

        // Draw a circle behind the icon
        const backgroundCircle = new Circle({
          radius: iconRadius,
          fill: this.getColorFill(`rgba(255, 255, 255, ${signature.iconOpacity})`),
          stroke: dashedStroke,
        });
        iconStyles.push(
          new Style({
            image: backgroundCircle,
            geometry(feature) {
              return new Point(DrawStyle.getIconCoordinates(feature, resolution)[1]);
            },
            zIndex,
          }),
        );

        if (signature.affectedPersons) {
          const notificationIcon = new Style({
            image: new Circle({
              radius: notificationIconRadius,
              fill: this.getColorFill('#3f51b5'),
            }),
            text: new Text({
              font: `${notificationIconRadius}px sans-serif`,
              fill: new Fill({
                color: '#fff',
              }),
              text: signature.affectedPersons > 99 ? '99+' : signature.affectedPersons.toString(),
            }),
            geometry(feature) {
              // Calculate the coordinates of the point on the circumference in the top-right quadrant
              const x = (Math.sqrt(2) * iconRadius * resolution) / 2;
              const y = (Math.sqrt(2) * iconRadius * resolution) / 2;
              const coordinates = DrawStyle.getIconCoordinates(feature, resolution)[1];
              const point = new Point(coordinates);
              point.translate(x, y);
              return point;
            },
            zIndex,
          });

          iconStyles.push(notificationIcon);
        }

        let iconLabel;
        let iconTextScale: any;

        if (signature.labelShow && (showNames ?? true)) {
          iconTextScale = DrawStyle.scale(resolution, DrawStyle.textScaleFactor, 0.4);

          iconLabel = new Text({
            text: signature.label,
            font: '20px sans-serif',
            scale: iconTextScale,
            fill: this.getColorFill(signature.color ?? '#535353'),
            backgroundFill: DrawStyle.getColorFill(`rgba(255, 255, 255, ${signature.iconOpacity})`),
            padding: Array(4).fill(20 * scale),
          });

          iconStyles.push(
            new Style({
              text: iconLabel,
              geometry(feature) {
                const deltaY = iconRadius * resolution + iconTextScale * 20 * resolution;
                const coordinates = DrawStyle.getIconCoordinates(feature, resolution)[1];
                return new Point([coordinates[0], coordinates[1] - deltaY]);
              },
              zIndex,
            }),
          );
        }

        const icon = new Icon({
          anchor: [0.5, 0.5],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          scale: scale * 2 * (signature.iconSize ?? 1),
          rotation: signature.rotation !== undefined ? (signature.rotation * Math.PI) / 180 : 0,
          // rotationWithView: false,
          src: this.getSignatureURI(signature),
          img: undefined,
          // imgSize: scaledSize ? [naturalDim, naturalDim] : undefined,
          opacity: showIcon && !hidden ? 1 : 0.5,
        });

        // Draw the icon
        iconStyles.push(
          new Style({
            image: icon,
            geometry(feature) {
              return new Point(DrawStyle.getIconCoordinates(feature, resolution)[1]);
            },
            zIndex,
          }),
        );

        if (signature.type === 'LineString') {
          iconStyles.push(
            new Style({
              image: backgroundCircle,
              geometry(feature) {
                return new Point(DrawStyle.getEndIconCoordinates(feature, resolution)[1]);
              },
              zIndex,
            }),
          );
          iconStyles.push(
            new Style({
              stroke: dashedStroke,
              opacity: signature.iconOpacity ?? 1,
              geometry(feature: FeatureLike) {
                return DrawStyle.createLineToIcon(feature, resolution, true);
              },
              zIndex,
            } as any),
          );
          iconStyles.push(
            new Style({
              image: icon,
              geometry(feature) {
                return new Point(DrawStyle.getEndIconCoordinates(feature, resolution)[1]);
              },
              zIndex,
            }),
          );

          if (signature.labelShow && (showNames ?? true)) {
            iconStyles.push(
              new Style({
                text: iconLabel,
                geometry(feature) {
                  const coordinates = DrawStyle.getEndIconCoordinates(feature, resolution)[1];
                  return new Point([coordinates[0], coordinates[1] - 35 / iconTextScale]);
                },
                zIndex,
              }),
            );
          }
        }
      }
    }
    return iconStyles;
  }

  private static getZIndex(feature: FeatureLike): number {
    feature = DrawStyle.getSubFeature(feature);
    return feature.get('sig')?.zindex ? feature.get('sig')?.zindex : 0;
  }

  private static getAreaFill(color: string, scale: number, fillStyle: FillStyle | undefined) {
    if (fillStyle?.name && fillStyle.name !== 'filled') {
      return new FillPattern({
        color,
        pattern: fillStyle.name,
        ratio: 1,
        offset: 0,
        scale: scale * 10,
        size: fillStyle.size,
        spacing: fillStyle.spacing,
        angle: fillStyle.angle,
      });
    } else {
      return this.getColorFill(color);
    }
  }

  private static getVectorStyles(
    feature: FeatureLike,
    resolution: number,
    signature: Sign,
    selected: boolean,
    scale: number,
    editMode: boolean,
  ): Style[] {
    feature = DrawStyle.getSubFeature(feature);
    const highlighted = feature.get('highlighted');
    const vectorCacheHash = DrawStyle.calculateCacheHashForVector(
      signature,
      feature,
      resolution,
      selected,
      highlighted,
      editMode,
    );
    let vectorStyle = this.vectorStyleCache[vectorCacheHash];
    if (!vectorStyle) {
      vectorStyle = this.vectorStyleCache[vectorCacheHash] = [];
      const zIndex = this.getZIndex(feature);
      if (selected || highlighted) {
        const highlightStyle = this.getHighlightLineWhenSelectedStyle(feature, scale, selected, highlighted);
        if (highlightStyle) {
          highlightStyle.setZIndex(zIndex - 1);
          vectorStyle.push(highlightStyle);
        }
      }
      vectorStyle.push(
        new Style({
          geometry: feature.getGeometry() as Geometry,
          stroke: new Stroke({
            color: DrawStyle.colorFunction(signature.color, 1.0),
            width: this.calculateStrokeWidth(scale, signature),
            lineDash: DrawStyle.getDash(signature.style, resolution),
            lineDashOffset: DrawStyle.getDashOffset(signature.style, resolution),
          }),
          fill: this.getAreaFill(
            DrawStyle.colorFunction(signature.color, signature.fillOpacity),
            scale,
            signature.fillStyle,
          ),
          zIndex,
        }),
      );

      if (feature.getGeometry()?.getType() === 'LineString' && signature.arrow && signature.arrow !== 'none') {
        const coordinates = (feature.getGeometry() as LineString)?.getCoordinates();
        const lastCoordinate = coordinates[Math.max(0, coordinates.length - 1)];
        const secondLastCoordinate = coordinates[Math.max(0, coordinates.length - 2)];
        const reverse = lastCoordinate[0] - secondLastCoordinate[0] > 0;
        const diffX = lastCoordinate[0] - secondLastCoordinate[0];
        const diffY = lastCoordinate[1] - secondLastCoordinate[1];
        let finalAngle = Math.atan(diffY / diffX);
        finalAngle = reverse ? -finalAngle : Math.PI - finalAngle;
        vectorStyle.push(
          new Style({
            geometry: new Point(lastCoordinate),
            image: new Icon({
              src: `assets/img/arrow_${signature.arrow}.svg`,
              anchorXUnits: 'fraction',
              anchorYUnits: 'fraction',
              anchor: [1, 0.5],
              rotation: finalAngle,
              // rotationWithView: false,
              scale: scale * 0.4,
              color: DrawStyle.colorFunction(signature.color, 1.0),
            }),
            zIndex,
          }),
        );
      }

      if (selected && editMode && !signature.protected) {
        const highlightedPointsStyle = this.getHighlightPointsWhenSelectedStyle(feature, scale, selected);
        if (highlightedPointsStyle) {
          vectorStyle.push(highlightedPointsStyle);
        }
      }
    }
    return vectorStyle;
  }

  private static calculateStrokeWidth(scale: number, signature: Sign): number {
    return scale * 20 * (signature.strokeWidth ?? 1);
  }

  private static getHighlightStroke(feature: FeatureLike, scale: number): Stroke {
    feature = DrawStyle.getSubFeature(feature);
    return new Stroke({
      color: '#fff22b',
      width: this.calculateStrokeWidth(scale, feature.get('sig')) + scale * 30,
    });
  }

  private static getHighlightLineWhenSelectedStyle(
    feature: FeatureLike,
    scale: number,
    selected: boolean,
    highlighted: boolean,
  ): Style | null {
    feature = DrawStyle.getSubFeature(feature);
    if (selected || highlighted) {
      // skipcq: JS-0047
      switch (feature.getGeometry()?.getType()) {
        case 'Polygon':
        case 'MultiPolygon':
        case 'LineString':
        case 'Circle':
          return new Style({
            geometry: feature.getGeometry() as Geometry,
            stroke: DrawStyle.getHighlightStroke(feature, scale),
          });
        default:
          return null;
      }
    }
    return null;
  }

  private static getHighlightPointsWhenSelectedStyle(
    feature: FeatureLike,
    scale: number,
    selected: boolean,
  ): Style | null {
    if (selected) {
      let coordinatesFunction: any = null;
      switch (feature.getGeometry()?.getType()) {
        case 'Polygon':
        case 'MultiPolygon':
          coordinatesFunction = function (feature: FeatureLike) {
            const coordinates: any[] = [];
            for (const c of (feature.getGeometry() as MultiPolygon).getCoordinates()) {
              c.forEach((coord: any) => coordinates.push(coord));
            }
            return coordinates;
          };
          break;
        case 'LineString':
          coordinatesFunction = function (feature: FeatureLike) {
            return (feature.getGeometry() as LineString).getCoordinates();
          };
          break;
        default:
          coordinatesFunction = null;
      }
      if (coordinatesFunction) {
        return new Style({
          image: new Circle({
            radius: scale * 20,
            fill: new Fill({
              color: 'orange',
            }),
          }),
          geometry(feature) {
            feature = DrawStyle.getSubFeature(feature);
            return new MultiPoint(coordinatesFunction(feature));
          },
          zIndex: selected ? Infinity : this.getZIndex(feature),
        });
      }
    }
    return null;
  }

  private static colorFunction = function (signatureColor: string | undefined, alpha = 1) {
    if (signatureColor) {
      let hexAlpha = Math.floor(255 * (alpha !== undefined ? alpha : 1)).toString(16);
      if (hexAlpha.length === 1) {
        hexAlpha = `0${hexAlpha}`;
      }
      return signatureColor + hexAlpha;
    }
    return `rgba(121, 153, 242, ${alpha !== undefined ? alpha : '1'})`;
  };
}
