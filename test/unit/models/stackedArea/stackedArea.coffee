apiTest.config.stackedArea =
  ctor: StackedArea
  name: 'stackedArea'
  parent: 'layer'
  options: [
    'margin',
    'width',
    'height',
    'clipEdge',
    'offset',
    'order',
    'color',
    'style',
    'interpolate'
  ]
  dispatch: true
  optionsFunc: true
  submodels:
    scatter: nv.models.scatter
  inheritedInstance:
    scatter: [
      'x',
      'y',
      'interactive',
      'size',
      'xScale',
      'yScale',
      'zScale',
      'xDomain',
      'yDomain',
      'xRange',
      'yRange',
      'sizeDomain',
      'forceX',
      'forceY',
      'forceSize',
      'clipVoronoi',
      'useVoronoi',
      'clipRadius',
      'highlightPoint',
      'clearHighlights'
    ]
  events: [
    'chartClick'
    'elementClick'
    'elementDblClick'
    'elementMouseover'
    'elementMouseout'
    'renderEnd'
  ]

apiTest.run 'stackedArea'
