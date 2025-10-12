(function (window) {
  'use strict';

  const BASE_LAYOUT_OPTIONS = {
    name: 'cose',
    animate: false,
    fit: true,
    padding: 80,
    nodeDimensionsIncludeLabels: true,
    randomize: false,
    componentSpacing: 160,
    nodeRepulsion: 900000,
    idealEdgeLength: 220,
    edgeElasticity: 150,
    gravity: 80,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.2
  };

  const BASE_STYLE_DEFINITIONS = [
    {
      selector: 'node',
      style: {
        'shape': 'round-rectangle',
        'background-color': '#ffffff',
        'border-width': 2,
        'border-color': '#3f83f8',
        'padding': '12px',
        'width': 'label',
        'height': 'label',
        'label': 'data(name)',
        'color': '#1f2937',
        'font-size': '16px',
        'font-weight': '600',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': 140,
        'shadow-blur': 18,
        'shadow-color': 'rgba(63, 131, 248, 0.25)',
        'shadow-opacity': 1
      }
    },
    {
      selector: 'edge',
      style: {
        'curve-style': 'unbundled-bezier',
        'control-point-distance': 80,
        'control-point-weight': 0.2,
        'width': 2.5,
        'line-color': '#6b7280',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#6b7280',
        'arrow-scale': 1.2,
        'content': 'data(weight)',
        'font-size': '12px',
        'color': '#1f2937',
        'text-rotation': 'autorotate',
        'text-margin-y': '-16px',
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.85,
        'text-background-padding': '4px',
        'text-background-shape': 'roundrectangle',
        'text-wrap': 'wrap',
        'text-max-width': 160,
        'min-zoomed-font-size': 8
      }
    }
  ];

  let overlayCy = null;
  let isSVGVisible = true;

  function cloneStyleDefinitions() {
    return BASE_STYLE_DEFINITIONS.map((definition) => ({
      selector: definition.selector,
      style: Object.assign({}, definition.style)
    }));
  }

  function getLayoutOptions(overrides) {
    return Object.assign({}, BASE_LAYOUT_OPTIONS, overrides || {});
  }

  function applyNodePositions(cy, nodePositions) {
    if (!cy || !nodePositions) {
      return;
    }

    cy.nodes().forEach((node) => {
      const position = nodePositions[node.id()];
      if (position) {
        node.position({ x: position.x, y: position.y });
      }
    });
    cy.fit(undefined, 60);
  }

  function alignLayers(svgLayer, sfgLayer) {
    if (!svgLayer || !sfgLayer) {
      return;
    }

    const svgBounds = svgLayer.getBoundingClientRect();
    const sfgBounds = sfgLayer.getBoundingClientRect();

    if (svgBounds.width === 0 || svgBounds.height === 0) {
      return;
    }

    const scaleX = sfgBounds.width / svgBounds.width;
    const scaleY = sfgBounds.height / svgBounds.height;
    const offsetX = sfgBounds.left - svgBounds.left;
    const offsetY = sfgBounds.top - svgBounds.top;

    svgLayer.style.transformOrigin = 'top left';
    svgLayer.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scaleX}, ${scaleY})`;
    svgLayer.style.opacity = 0.5;
  }

  function getOverlayLayout(nodePositions) {
    if (nodePositions) {
      return {
        name: 'preset',
        fit: true,
        positions: (node) => {
          const position = nodePositions[node.id()];
          return position ? { x: position.x, y: position.y } : undefined;
        },
        padding: 80
      };
    }

    return getLayoutOptions({ animate: false });
  }

  function buildOverlayGraph(elements, nodePositions) {
    const container = document.getElementById('sfg-layer');
    if (!container) {
      return null;
    }

    if (overlayCy) {
      overlayCy.destroy();
      overlayCy = null;
    }

    overlayCy = cytoscape({
      container,
      elements,
      style: cloneStyleDefinitions(),
      layout: getOverlayLayout(nodePositions),
      userZoomingEnabled: false,
      boxSelectionEnabled: false,
      autounselectify: false,
      wheelSensitivity: 0.2,
      pixelRatio: 1
    });

    if (nodePositions) {
      applyNodePositions(overlayCy, nodePositions);
    } else {
      overlayCy.one('layoutstop', () => {
        overlayCy.fit(undefined, 60);
      });
    }

    overlayCy.resize();
    return overlayCy;
  }

  function ensureViewBox(svgElement) {
    if (!svgElement) {
      return;
    }

    try {
      const boundingBox = svgElement.getBBox();
      if (boundingBox.width && boundingBox.height) {
        const viewBoxValue = `${boundingBox.x} ${boundingBox.y} ${boundingBox.width} ${boundingBox.height}`;
        svgElement.setAttribute('viewBox', viewBoxValue);
      }
    } catch (error) {
      console.warn('Unable to compute SVG bounding box for overlay alignment.', error);
    }
  }

  function renderOverlay({ svgMarkup, elements, nodePositions }) {
    const svgLayer = document.getElementById('svg-layer');

    if (svgLayer) {
      svgLayer.innerHTML = svgMarkup || '';
      const svgElement = svgLayer.querySelector('svg');
      ensureViewBox(svgElement);
    }

    buildOverlayGraph(elements, nodePositions);

    window.requestAnimationFrame(() => {
      alignLayers(svgLayer, document.getElementById('sfg-layer'));
    });
  }

  function toggleSVG() {
    const svgLayer = document.getElementById('svg-layer');
    if (!svgLayer) {
      return;
    }

    if (isSVGVisible) {
      svgLayer.style.display = 'none';
    } else {
      svgLayer.style.display = 'block';
    }

    isSVGVisible = !isSVGVisible;
  }

  window.sfgOverlay = {
    render: renderOverlay,
    toggle: toggleSVG,
    toggleSVG,
    alignLayers,
    getLayoutOptions,
    getBaseStyles: cloneStyleDefinitions,
    getOverlayInstance: () => overlayCy
  };

  window.toggleSVG = toggleSVG;
})(window);
