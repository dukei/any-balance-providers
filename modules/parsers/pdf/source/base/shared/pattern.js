/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals CanvasGraphics, ColorSpace, DeviceRgbCS, error,
           info, isArray, isPDFFunction, isStream, PDFFunction, TODO, Util,
           warn, CachedCanvases */

'use strict';

var PatternType = {
  AXIAL: 2,
  RADIAL: 3
};

var Pattern = (function PatternClosure() {
  // Constructor should define this.getPattern
  function Pattern() {
    error('should not call Pattern constructor');
  }

  Pattern.prototype = {
    // Input: current Canvas context
    // Output: the appropriate fillStyle or strokeStyle
    getPattern: function Pattern_getPattern(ctx) {
      error('Should not call Pattern.getStyle: ' + ctx);
    }
  };

  Pattern.shadingFromIR = function Pattern_shadingFromIR(raw) {
    return Shadings[raw[0]].fromIR(raw);
  };

  Pattern.parseShading = function Pattern_parseShading(shading, matrix, xref,
                                                       res) {

    var dict = isStream(shading) ? shading.dict : shading;
    var type = dict.get('ShadingType');

    switch (type) {
      case PatternType.AXIAL:
      case PatternType.RADIAL:
        // Both radial and axial shadings are handled by RadialAxial shading.
        return new Shadings.RadialAxial(dict, matrix, xref, res);
      default:
        TODO('Unsupported shading type: ' + type);
        return new Shadings.Dummy();
    }
  };
  return Pattern;
})();

var Shadings = {};

// A small number to offset the first/last color stops so we can insert ones to
// support extend.  Number.MIN_VALUE appears to be too small and breaks the
// extend. 1e-7 works in FF but chrome seems to use an even smaller sized number
// internally so we have to go bigger.
Shadings.SMALL_NUMBER = 1e-2;

// Radial and axial shading have very similar implementations
// If needed, the implementations can be broken into two classes
Shadings.RadialAxial = (function RadialAxialClosure() {
  function RadialAxial(dict, matrix, xref, res, ctx) {
    this.matrix = matrix;
    this.coordsArr = dict.get('Coords');
    this.shadingType = dict.get('ShadingType');
    this.type = 'Pattern';
    this.ctx = ctx;
    var cs = dict.get('ColorSpace', 'CS');
    cs = ColorSpace.parse(cs, xref, res);
    this.cs = cs;

    var t0 = 0.0, t1 = 1.0;
    if (dict.has('Domain')) {
      var domainArr = dict.get('Domain');
      t0 = domainArr[0];
      t1 = domainArr[1];
    }

    var extendStart = false, extendEnd = false;
    if (dict.has('Extend')) {
      var extendArr = dict.get('Extend');
      extendStart = extendArr[0];
      extendEnd = extendArr[1];
    }

    if (this.shadingType === PatternType.RADIAL &&
       (!extendStart || !extendEnd)) {
      // Radial gradient only currently works if either circle is fully within
      // the other circle.
      var x1 = this.coordsArr[0];
      var y1 = this.coordsArr[1];
      var r1 = this.coordsArr[2];
      var x2 = this.coordsArr[3];
      var y2 = this.coordsArr[4];
      var r2 = this.coordsArr[5];
      var distance = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
      if (r1 <= r2 + distance &&
          r2 <= r1 + distance) {
        warn('Unsupported radial gradient.');
      }
    }

    this.extendStart = extendStart;
    this.extendEnd = extendEnd;

    var fnObj = dict.get('Function');
    var fn;
    if (isArray(fnObj)) {
      var fnArray = [];
      for (var j = 0, jj = fnObj.length; j < jj; j++) {
        var obj = xref.fetchIfRef(fnObj[j]);
        if (!isPDFFunction(obj)) {
          error('Invalid function');
        }
        fnArray.push(PDFFunction.parse(xref, obj));
      }
      fn = function radialAxialColorFunction(arg) {
        var out = [];
        for (var i = 0, ii = fnArray.length; i < ii; i++) {
          out.push(fnArray[i](arg)[0]);
        }
        return out;
      };
    } else {
      if (!isPDFFunction(fnObj)) {
        error('Invalid function');
      }
      fn = PDFFunction.parse(xref, fnObj);
    }

    // 10 samples seems good enough for now, but probably won't work
    // if there are sharp color changes. Ideally, we would implement
    // the spec faithfully and add lossless optimizations.
    var diff = t1 - t0;
    var step = diff / 10;

    var colorStops = this.colorStops = [];

    // Protect against bad domains so we don't end up in an infinte loop below.
    if (t0 >= t1 || step <= 0) {
      // Acrobat doesn't seem to handle these cases so we'll ignore for
      // now.
      info('Bad shading domain.');
      return;
    }

    for (var i = t0; i <= t1; i += step) {
      var rgbColor = cs.getRgb(fn([i]), 0);
      var cssColor = Util.makeCssRgb(rgbColor);
      colorStops.push([(i - t0) / diff, cssColor]);
    }

    var background = 'transparent';
    if (dict.has('Background')) {
      var rgbColor = cs.getRgb(dict.get('Background'), 0);
      background = Util.makeCssRgb(rgbColor);
    }

    if (!extendStart) {
      // Insert a color stop at the front and offset the first real color stop
      // so it doesn't conflict with the one we insert.
      colorStops.unshift([0, background]);
      colorStops[1][0] += Shadings.SMALL_NUMBER;
    }
    if (!extendEnd) {
      // Same idea as above in extendStart but for the end.
      colorStops[colorStops.length - 1][0] -= Shadings.SMALL_NUMBER;
      colorStops.push([1, background]);
    }

    this.colorStops = colorStops;
  }

  RadialAxial.fromIR = function RadialAxial_fromIR(raw) {
    var type = raw[1];
    var colorStops = raw[2];
    var p0 = raw[3];
    var p1 = raw[4];
    var r0 = raw[5];
    var r1 = raw[6];
    return {
      type: 'Pattern',
      getPattern: function RadialAxial_getPattern(ctx) {
        var grad;
        if (type == PatternType.AXIAL)
          grad = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
        else if (type == PatternType.RADIAL)
          grad = ctx.createRadialGradient(p0[0], p0[1], r0, p1[0], p1[1], r1);

        for (var i = 0, ii = colorStops.length; i < ii; ++i) {
          var c = colorStops[i];
          grad.addColorStop(c[0], c[1]);
        }
        return grad;
      }
    };
  };

  RadialAxial.prototype = {
    getIR: function RadialAxial_getIR() {
      var coordsArr = this.coordsArr;
      var type = this.shadingType;
      if (type == PatternType.AXIAL) {
        var p0 = [coordsArr[0], coordsArr[1]];
        var p1 = [coordsArr[2], coordsArr[3]];
        var r0 = null;
        var r1 = null;
      } else if (type == PatternType.RADIAL) {
        var p0 = [coordsArr[0], coordsArr[1]];
        var p1 = [coordsArr[3], coordsArr[4]];
        var r0 = coordsArr[2];
        var r1 = coordsArr[5];
      } else {
        error('getPattern type unknown: ' + type);
      }

      var matrix = this.matrix;
      if (matrix) {
        p0 = Util.applyTransform(p0, matrix);
        p1 = Util.applyTransform(p1, matrix);
      }

      return ['RadialAxial', type, this.colorStops, p0, p1, r0, r1];
    }
  };

  return RadialAxial;
})();

Shadings.Dummy = (function DummyClosure() {
  function Dummy() {
    this.type = 'Pattern';
  }

  Dummy.fromIR = function Dummy_fromIR() {
    return {
      type: 'Pattern',
      getPattern: function Dummy_fromIR_getPattern() {
        return 'hotpink';
      }
    };
  };

  Dummy.prototype = {
    getIR: function Dummy_getIR() {
      return ['Dummy'];
    }
  };
  return Dummy;
})();

var TilingPattern = (function TilingPatternClosure() {
  var PaintType = {
    COLORED: 1,
    UNCOLORED: 2
  };

  var MAX_PATTERN_SIZE = 3000; // 10in @ 300dpi shall be enough

  function TilingPattern(IR, color, ctx, objs, commonObjs, baseTransform) {
    this.name = IR[1][0].name;
    this.operatorList = IR[2];
    this.matrix = IR[3] || [1, 0, 0, 1, 0, 0];
    this.bbox = IR[4];
    this.xstep = IR[5];
    this.ystep = IR[6];
    this.paintType = IR[7];
    this.tilingType = IR[8];
    this.color = color;
    this.objs = objs;
    this.commonObjs = commonObjs;
    this.baseTransform = baseTransform;
    this.type = 'Pattern';
    this.ctx = ctx;
  }

  TilingPattern.getIR = function TilingPattern_getIR(operatorList, dict, args) {
    var matrix = dict.get('Matrix');
    var bbox = dict.get('BBox');
    var xstep = dict.get('XStep');
    var ystep = dict.get('YStep');
    var paintType = dict.get('PaintType');
    var tilingType = dict.get('TilingType');

    return [
      'TilingPattern', args, operatorList, matrix, bbox, xstep, ystep,
      paintType, tilingType
    ];
  };

  TilingPattern.prototype = {
    createPatternCanvas: function TilinPattern_createPatternCanvas(owner) {
      var operatorList = this.operatorList;
      var bbox = this.bbox;
      var xstep = this.xstep;
      var ystep = this.ystep;
      var paintType = this.paintType;
      var tilingType = this.tilingType;
      var color = this.color;
      var objs = this.objs;
      var commonObjs = this.commonObjs;
      var ctx = this.ctx;

      TODO('TilingType: ' + tilingType);

      var x0 = bbox[0], y0 = bbox[1], x1 = bbox[2], y1 = bbox[3];

      var topLeft = [x0, y0];
      // we want the canvas to be as large as the step size
      var botRight = [x0 + xstep, y0 + ystep];

      var width = botRight[0] - topLeft[0];
      var height = botRight[1] - topLeft[1];

      // Obtain scale from matrix and current transformation matrix.
      var matrixScale = Util.singularValueDecompose2dScale(this.matrix);
      var curMatrixScale = Util.singularValueDecompose2dScale(
                             this.baseTransform);
      var combinedScale = [matrixScale[0] * curMatrixScale[0],
                           matrixScale[1] * curMatrixScale[1]];

      // MAX_PATTERN_SIZE is used to avoid OOM situation.
      // Use width and height values that are as close as possible to the end
      // result when the pattern is used. Too low value makes the pattern look
      // blurry. Too large value makes it look too crispy.
      width = Math.min(Math.ceil(Math.abs(width * combinedScale[0])),
                       MAX_PATTERN_SIZE);

      height = Math.min(Math.ceil(Math.abs(height * combinedScale[1])),
                        MAX_PATTERN_SIZE);

      var tmpCanvas = CachedCanvases.getCanvas('pattern', width, height, true);
      var tmpCtx = tmpCanvas.context;
      var graphics = new CanvasGraphics(tmpCtx, commonObjs, objs);
      graphics.groupLevel = owner.groupLevel;

      this.setFillAndStrokeStyleToContext(tmpCtx, paintType, color);

      this.setScale(width, height, xstep, ystep);
      this.transformToScale(graphics);

      // transform coordinates to pattern space
      var tmpTranslate = [1, 0, 0, 1, -topLeft[0], -topLeft[1]];
      graphics.transform.apply(graphics, tmpTranslate);

      this.clipBbox(graphics, bbox, x0, y0, x1, y1);

      graphics.executeOperatorList(operatorList);
      return tmpCanvas.canvas;
    },

    setScale: function TilingPattern_setScale(width, height, xstep, ystep) {
      this.scale = [width / xstep, height / ystep];
    },

    transformToScale: function TilingPattern_transformToScale(graphics) {
      var scale = this.scale;
      var tmpScale = [scale[0], 0, 0, scale[1], 0, 0];
      graphics.transform.apply(graphics, tmpScale);
    },

    scaleToContext: function TilingPattern_scaleToContext() {
      var scale = this.scale;
      this.ctx.scale(1 / scale[0], 1 / scale[1]);
    },

    clipBbox: function clipBbox(graphics, bbox, x0, y0, x1, y1) {
      if (bbox && isArray(bbox) && 4 == bbox.length) {
        var bboxWidth = x1 - x0;
        var bboxHeight = y1 - y0;
        graphics.rectangle(x0, y0, bboxWidth, bboxHeight);
        graphics.clip();
        graphics.endPath();
      }
    },

    setFillAndStrokeStyleToContext:
      function setFillAndStrokeStyleToContext(context, paintType, color) {
      switch (paintType) {
        case PaintType.COLORED:
          var ctx = this.ctx;
          context.fillStyle = ctx.fillStyle;
          context.strokeStyle = ctx.strokeStyle;
          break;
        case PaintType.UNCOLORED:
          var rgbColor = ColorSpace.singletons.rgb.getRgb(color, 0);
          var cssColor = Util.makeCssRgb(rgbColor);
          context.fillStyle = cssColor;
          context.strokeStyle = cssColor;
          break;
        default:
          error('Unsupported paint type: ' + paintType);
      }
    },

    getPattern: function TilingPattern_getPattern(ctx, owner) {
      var temporaryPatternCanvas = this.createPatternCanvas(owner);

      var ctx = this.ctx;
      ctx.setTransform.apply(ctx, this.baseTransform);
      ctx.transform.apply(ctx, this.matrix);
      this.scaleToContext();

      return ctx.createPattern(temporaryPatternCanvas, 'repeat');
    }
  };

  return TilingPattern;
})();

