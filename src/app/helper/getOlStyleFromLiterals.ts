/* eslint-disable @typescript-eslint/no-explicit-any */
import { Geometry, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from 'ol/geom';
import { Circle, Fill, Icon, RegularShape, Stroke, Style, Text } from 'ol/style';
import { Feature } from 'ol';

function getOlStyleForPoint(options: any, shape: string) {
  if (shape === 'circle') {
    return new Circle(options);
  } else if (shape === 'icon') {
    return new Icon(options);
  } else {
    const shapes = {
      square: {
        points: 4,
        angle: Math.PI / 4,
      },
      triangle: {
        points: 3,
        angle: 0,
      },
      pentagon: {
        points: 5,
        angle: 0,
      },
      star: {
        points: 5,
        angle: 0,
        radius2: options.radius ? options.radius / 2 : undefined,
      },
      cross: {
        points: 4,
        angle: 0,
        radius2: 0,
      },
      hexagon: {
        points: 6,
        angle: 0,
      },
    };
    // deep copy to preserve the original object
    const style = Object.assign({}, shapes[shape], options);
    return new RegularShape(style);
  }
}

function getOlBasicStyles(options: any): any {
  const olStyles = {};
  Object.keys(options).forEach((type) => {
    const style = options[type];
    if (type === 'stroke') {
      olStyles[type] = new Stroke(style);
    } else if (type === 'fill') {
      olStyles[type] = new Fill(style);
    } else if (type === 'text') {
      style.stroke = new Stroke(style.stroke);
      style.fill = new Fill(style.fill);
      if (style.backgroundFill) {
        style.backgroundFill = new Fill(style.backgroundFill);
      }
      if (style.backgroundStroke) {
        style.backgroundStroke = new Stroke(style.backgroundStroke);
      }
      olStyles[type] = new Text(style);
    }
  });
  return olStyles;
}

function getOlStyleFromLiterals(value: any) {
  const olStyles: any = {};
  const { vectorOptions: style, geomType } = value;

  if (geomType === 'point') {
    let olText;
    if (style.label) {
      olText = getOlBasicStyles(style.label).text;
    }
    const basicStyles = getOlBasicStyles(style);
    let olImage = Object.assign({}, style, basicStyles);
    // Necessary for Cesium
    olImage.crossOrigin = 'anonymous';

    delete olImage.label;
    olImage = getOlStyleForPoint(olImage, style.type);
    olStyles.image = olImage;
    olStyles.text = olText;
  } else {
    Object.keys(style).forEach((key) => {
      if (key === 'label') {
        olStyles.text = getOlBasicStyles(style.label).text;
      } else if (['stroke', 'fill', 'image'].indexOf(key) !== -1) {
        olStyles[key] = getOlBasicStyles(style)[key];
      }
    });
  }
  return new Style(olStyles);
}

function getGeomTypeFromGeometry(olGeometry?: Geometry): string | undefined {
  if (olGeometry instanceof Point || olGeometry instanceof MultiPoint) {
    return 'point';
  } else if (olGeometry instanceof LineString || olGeometry instanceof MultiLineString) {
    return 'line';
  } else if (olGeometry instanceof Polygon || olGeometry instanceof MultiPolygon) {
    return 'polygon';
  }
  return undefined;
}

function getLabelProperty(value: any): string | null {
  if (value) {
    return value.property;
  }
  return null;
}

function getLabelTemplate(value: any): string | null {
  if (value) {
    return value.template || '';
  }
  return null;
}

function getStyleSpec(value: any) {
  return {
    olStyle: getOlStyleFromLiterals(value),
    minResolution: getMinResolution(value),
    maxResolution: getMaxResolution(value),
    labelProperty: getLabelProperty(value.vectorOptions.label),
    labelTemplate: getLabelTemplate(value.vectorOptions.label),
    imageRotationProperty: value.rotation,
  };
}

function getMinResolution(value: any): number {
  return value.minResolution || 0;
}

function getMaxResolution(value: any): number {
  return value.maxResolution || Infinity;
}

/**
 * Helper class to transform geoadmin's style description (also called literals) into a full fledged
 * OpenLayers Style instance
 *
 * @class
 * @param properties The output of geoadmin's API style endpoint as a JSON
 */
const OlStyleForPropertyValue = function (this: any, properties: any) {
  this.singleStyle = null;
  this.defaultVal = 'defaultVal';
  this.defaultStyle = new Style();
  this.styles = {
    point: {},
    line: {},
    polygon: {},
  };
  this.type = properties.type;

  this.initialize_(properties);
};

OlStyleForPropertyValue.prototype.initialize_ = function (properties: any) {
  if (this.type === 'unique' || this.type === 'range') {
    this.key = properties.property;
  }
  if (this.type === 'single') {
    this.singleStyle = {
      olStyle: getOlStyleFromLiterals(properties),
      labelProperty: getLabelProperty(properties.vectorOptions.label),
      labelTemplate: getLabelTemplate(properties.vectorOptions.label),
      imageRotationProperty: properties.rotation,
    };
  } else if (this.type === 'unique') {
    for (let i = 0; i < properties.values.length; i++) {
      const value = properties.values[i];
      this.pushOrInitialize_(value.geomType, value.value, getStyleSpec(value));
    }
  } else if (this.type === 'range') {
    for (let i = 0; i < properties.ranges.length; i++) {
      const range = properties.ranges[i];
      const key = range.range.toString();
      this.pushOrInitialize_(range.geomType, key, getStyleSpec(range));
    }
  }
};

OlStyleForPropertyValue.prototype.pushOrInitialize_ = function (geomType: string, key: string, styleSpec: any) {
  // Happens when styling is only resolution dependent (unique type only)
  if (key === undefined) {
    key = this.defaultVal;
  }
  if (!this.styles[geomType][key]) {
    this.styles[geomType][key] = [styleSpec];
  } else {
    this.styles[geomType][key].push(styleSpec);
  }
};

OlStyleForPropertyValue.prototype.findOlStyleInRange_ = function (value: number, geomType: string) {
  let olStyle: any = null;
  Object.keys(this.styles[geomType]).forEach((range) => {
    const limits = range.split(',');
    const min = parseFloat(limits[0].replace(/\s/g, ''));
    const max = parseFloat(limits[1].replace(/\s/g, ''));
    if (!olStyle && value >= min && value < max) {
      olStyle = this.styles[geomType][range];
    }
  });
  return olStyle;
};

OlStyleForPropertyValue.prototype.getOlStyleForResolution_ = function (olStyles: any, resolution: number) {
  for (let i = 0; i < olStyles.length; i++) {
    const style = olStyles[i];
    if (style.minResolution <= resolution && style.maxResolution > resolution) {
      return olStyles[i];
    }
  }
};

OlStyleForPropertyValue.prototype.setOlText_ = function (olStyle: any, labelProperty: any, labelTemplate: any, properties: any) {
  let text: any = null;
  properties = properties || [];
  if (labelProperty) {
    text = properties[labelProperty];
    if (text !== undefined && text !== null) {
      text = text.toString();
    }
  } else if (labelTemplate) {
    text = labelTemplate;
    Object.keys(properties).forEach((prop) => (text = text.replace('${' + prop + '}', properties[prop])));
  }
  if (text) {
    olStyle.getText().setText(text);
  }
  return olStyle;
};

OlStyleForPropertyValue.prototype.setOlRotation_ = function (olStyle: any, imageRotationProperty: any, properties: any) {
  if (imageRotationProperty) {
    const rotation = properties[imageRotationProperty];
    if (rotation) {
      const image = olStyle.getImage();
      if (image) {
        image.setRotation(rotation);
      }
    }
  }
  return olStyle;
};

OlStyleForPropertyValue.prototype.getOlStyle_ = function (feature: Feature, resolution: number, properties: any) {
  // A value can be 0
  const value = properties[this.key] ? properties[this.key] : this.defaultVal;
  const geomType = getGeomTypeFromGeometry(feature.getGeometry());
  if (!geomType) return this.defaultStyle;

  let olStyles = null;
  if (this.type === 'unique') {
    olStyles = this.styles[geomType][value];
  } else if (this.type === 'range') {
    olStyles = this.findOlStyleInRange_(value, geomType);
  }
  if (!olStyles) {
    return this.defaultStyle;
  }
  const styleSpec = this.getOlStyleForResolution_(olStyles, resolution);
  if (styleSpec) {
    const olStyle = this.setOlText_(styleSpec.olStyle, styleSpec.labelProperty, styleSpec.labelTemplate, properties);
    return this.setOlRotation_(olStyle, styleSpec.imageRotationProperty, properties);
  }
  return this.defaultStyle;
};

/**
 * Returns an OpenLayers style for the feature and the current map resolution (as style can be
 * different depending on the zoom level --> resolution)
 *
 * @param {ol.Feature} feature
 * @param {Number} resolution
 * @returns {Style}
 */
OlStyleForPropertyValue.prototype.getFeatureStyle = function (feature: Feature, resolution: number) {
  let properties;
  if (feature) {
    properties = feature.getProperties();
  }
  if (this.type === 'single') {
    const olStyle = this.setOlText_(this.singleStyle.olStyle, this.singleStyle.labelProperty, this.singleStyle.labelTemplate, properties);
    return this.setOlRotation_(olStyle, this.singleStyle.imageRotationProperty, properties);
  } else if (this.type === 'unique') {
    return this.getOlStyle_(feature, resolution, properties);
  } else if (this.type === 'range') {
    return this.getOlStyle_(feature, resolution, properties);
  }
};

export default OlStyleForPropertyValue;
