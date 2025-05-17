// File: src/lib/domUtils.ts

/**
 * @module domUtils
 * Contains utility functions for working with DOM properties and attributes,
 * particularly within React components.
 */

// --- Comprehensive List of Valid React DOM Attributes (HTML & SVG) ---
// Based on React's known props, MDN, and common usage. Uses camelCase where React expects it.
// NOTE: This list requires maintenance. For a more robust solution, consider using a library
// like `@react-aria/utils`'s `filterDOMProps`.
const validReactAttributeNames: Set<string> = new Set([
    // React Specific
    'children', 'dangerouslySetInnerHTML', 'key', 'ref', 'suppressContentEditableWarning', 'suppressHydrationWarning',
  
    // Standard HTML Global Attributes
    'accessKey', 'className', 'contentEditable', 'contextMenu', 'dir', 'draggable', 'hidden', 'id', 'lang', 'nonce', 'placeholder', 'slot', 'spellCheck', 'style', 'tabIndex', 'title', 'translate',
  
    // Common HTML Attributes (incl. some deprecated but potentially used)
    'accept', 'acceptCharset', 'action', 'allowFullScreen', 'allowTransparency', 'alt', 'as', 'async', 'autoComplete', 'autoFocus', 'autoPlay', 'capture', 'cellPadding', 'cellSpacing', 'challenge', 'charSet', 'checked', 'cite', 'classID', 'cols', 'colSpan', 'content', 'controls', 'coords', 'crossOrigin', 'data', // Note: 'data' attribute itself, distinct from 'data-*'
    'dateTime', 'default', 'defer', 'disabled', 'download', 'encType', 'form', 'formAction', 'formEncType', 'formMethod', 'formNoValidate', 'formTarget', 'frameBorder', 'headers', 'height', 'high', 'href', 'hrefLang', 'htmlFor', 'httpEquiv', 'icon', 'inputMode', 'integrity', 'is', 'keyParams', 'keyType', 'kind', 'label', 'list', 'loop', 'low', 'manifest', 'marginHeight', 'marginWidth', 'max', 'maxLength', 'media', 'mediaGroup', 'method', 'min', 'minLength', 'multiple', 'muted', 'name', 'noValidate', 'open', 'optimum', 'pattern', 'ping', 'playsInline', 'poster', 'preload', 'profile', 'radioGroup', 'readOnly', 'referrerPolicy', 'rel', 'required', 'reversed', 'role', // ARIA role is technically separate but often used like an attribute
    'rows', 'rowSpan', 'sandbox', 'scope', 'scoped', 'scrolling', 'seamless', 'selected', 'shape', 'size', 'sizes', 'span', 'src', 'srcDoc', 'srcLang', 'srcSet', 'start', 'step', 'summary', 'target', 'type', 'useMap', 'value', 'width', 'wmode', 'wrap',
  
    // Event Handlers (While technically JS props, they are often passed and valid on DOM elements)
    // It's debatable whether a strict 'attribute' picker should include these.
    // Including common ones for pragmatic use in components.
    'onAbort', 'onAnimationEnd', 'onAnimationIteration', 'onAnimationStart', 'onAuxClick', 'onBeforeInput', 'onBlur', 'onCanPlay', 'onCanPlayThrough', 'onChange', 'onClick', 'onCompositionEnd', 'onCompositionStart', 'onCompositionUpdate', 'onContextMenu', 'onCopy', 'onCut', 'onDoubleClick', 'onDrag', 'onDragEnd', 'onDragEnter', 'onDragExit', 'onDragLeave', 'onDragOver', 'onDragStart', 'onDrop', 'onDurationChange', 'onEmptied', 'onEncrypted', 'onEnded', 'onError', 'onFocus', 'onGotPointerCapture', 'onInput', 'onInvalid', 'onKeyDown', 'onKeyPress', 'onKeyUp', 'onLoad', 'onLoadedData', 'onLoadedMetadata', 'onLoadStart', 'onLostPointerCapture', 'onMouseDown', 'onMouseEnter', 'onMouseLeave', 'onMouseMove', 'onMouseOut', 'onMouseOver', 'onMouseUp', 'onPaste', 'onPause', 'onPlay', 'onPlaying', 'onPointerCancel', 'onPointerDown', 'onPointerEnter', 'onPointerLeave', 'onPointerMove', 'onPointerOut', 'onPointerOver', 'onPointerUp', 'onProgress', 'onRateChange', 'onReset', 'onResize', 'onScroll', 'onSeeked', 'onSeeking', 'onSelect', 'onStalled', 'onSubmit', 'onSuspend', 'onTimeUpdate', 'onTouchCancel', 'onTouchEnd', 'onTouchMove', 'onTouchStart', 'onTransitionEnd', 'onVolumeChange', 'onWaiting', 'onWheel',
  
    // Common SVG Attributes (camelCase)
    'accentHeight', 'accumulate', 'additive', 'alignmentBaseline', 'allowReorder', 'alphabetic', 'amplitude', 'arabicForm', 'ascent', 'attributeName', 'attributeType', 'autoReverse', 'azimuth', 'baseFrequency', 'baselineShift', 'baseProfile', 'bbox', 'begin', 'bias', 'by', 'calcMode', 'capHeight', 'clip', 'clipPath', 'clipPathUnits', 'clipRule', 'colorInterpolation', 'colorInterpolationFilters', 'colorProfile', 'colorRendering', 'contentScriptType', 'contentStyleType', 'cursor', 'cx', 'cy', 'd', 'decelerate', 'descent', 'diffuseConstant', 'direction', 'display', 'divisor', 'dominantBaseline', 'dur', 'dx', 'dy', 'edgeMode', 'elevation', 'enableBackground', 'end', 'exponent', 'externalResourcesRequired', 'fill', 'fillOpacity', 'fillRule', 'filter', 'filterRes', 'filterUnits', 'floodColor', 'floodOpacity', 'focusable', 'fontFamily', 'fontSize', 'fontSizeAdjust', 'fontStretch', 'fontStyle', 'fontVariant', 'fontWeight', 'format', 'from', 'fx', 'fy', 'g1', 'g2', 'glyphName', 'glyphOrientationHorizontal', 'glyphOrientationVertical', 'glyphRef', 'gradientTransform', 'gradientUnits', 'hanging', 'horizAdvX', 'horizOriginX', 'href', // SVG href is often namespaced, but React uses href
    'ideographic', 'imageRendering', 'in2', 'in', 'intercept', 'k1', 'k2', 'k3', 'k4', 'k', 'kernelMatrix', 'kernelUnitLength', 'kerning', 'keyPoints', 'keySplines', 'keyTimes', 'lengthAdjust', 'letterSpacing', 'lightingColor', 'limitingConeAngle', 'local', 'markerEnd', 'markerHeight', 'markerMid', 'markerStart', 'markerUnits', 'markerWidth', 'mask', 'maskContentUnits', 'maskUnits', 'mathematical', 'mode', 'numOctaves', 'offset', 'opacity', 'operator', 'order', 'orient', 'orientation', 'origin', 'overflow', 'overlinePosition', 'overlineThickness', 'paintOrder', 'panose1', 'pathLength', 'patternContentUnits', 'patternTransform', 'patternUnits', 'pointerEvents', 'points', 'pointsAtX', 'pointsAtY', 'pointsAtZ', 'preserveAlpha', 'preserveAspectRatio', 'primitiveUnits', 'r', 'radius', 'refX', 'refY', 'renderingIntent', 'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures', 'restart', 'result', 'rotate', 'rx', 'ry', 'scale', 'seed', 'shapeRendering', 'slope', 'spacing', 'specularConstant', 'specularExponent', 'speed', 'spreadMethod', 'startOffset', 'stdDeviation', 'stemh', 'stemv', 'stitchTiles', 'stopColor', 'stopOpacity', 'strikethroughPosition', 'strikethroughThickness', 'string', 'stroke', 'strokeDasharray', 'strokeDashoffset', 'strokeLinecap', 'strokeLinejoin', 'strokeMiterlimit', 'strokeOpacity', 'strokeWidth', 'surfaceScale', 'systemLanguage', 'tableValues', 'targetX', 'targetY', 'textAnchor', 'textDecoration', 'textLength', 'textRendering', 'to', 'transform', 'u1', 'u2', 'underlinePosition', 'underlineThickness', 'unicode', 'unicodeBidi', 'unicodeRange', 'unitsPerEm', 'vAlphabetic', 'vHanging', 'vIdeographic', 'vMathematical', 'values', 'vectorEffect', 'version', 'vertAdvY', 'vertOriginX', 'vertOriginY', 'viewBox', 'viewTarget', 'visibility', 'widths', 'wordSpacing', 'writingMode', 'x1', 'x2', 'x', 'xChannelSelector', 'xHeight', 'xlinkActuate', 'xlinkArcrole', 'xlinkHref', // Namespaced attrs often simplified in React
    'xlinkRole', 'xlinkShow', 'xlinkTitle', 'xlinkType', 'xmlns', 'xmlnsXlink', // xmlns attributes
    'xmlBase', 'xmlLang', 'xmlSpace', 'y1', 'y2', 'y', 'yChannelSelector', 'z', 'zoomAndPan',
  ]);
  
  /**
   * Filters a props object, returning only valid HTML/SVG attributes,
   * aria-* attributes, and data-* attributes that React recognizes on DOM elements.
   * Helps prevent "unknown prop" warnings when spreading {...restProps}.
   *
   * @param props - The component props object.
   * @returns An object containing only the valid DOM props.
   *
   * @example
   * const MyComponent = ({ customProp, isActive, ...rest }) => {
   *   const domProps = pickHTMLAttributes(rest);
   *   return <div {...domProps}>...</div>;
   * }
   *
   * @caveats This utility uses a manually maintained list of valid attributes.
   * It might not be exhaustive. For maximum robustness, consider using a
   * library like `@react-aria/utils`'s `filterDOMProps`.
   */
  export const pickHTMLAttributes = (props: Record<string, any>): Record<string, any> => {
    const safeProps: Record<string, any> = {};
  
    if (!props) {
      return safeProps;
    }
  
    for (const key in props) {
      // Use hasOwnProperty check to avoid iterating over prototype properties
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        const lowerKey = key.toLowerCase(); // Check prefixes in lowercase
  
        // Check for data-* and aria-* attributes first (case-insensitive prefix check)
        if (lowerKey.startsWith('data-') || lowerKey.startsWith('aria-')) {
          safeProps[key] = props[key];
        }
        // Check against the known list of valid React DOM/SVG attributes (case-sensitive check using the original key)
        else if (validReactAttributeNames.has(key)) {
          safeProps[key] = props[key];
        }
      }
    }
  
    return safeProps;
  };