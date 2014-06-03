apiTest.config.lineWithFocusChart =
  ctor: LineWithFocusChart
  name: 'lineWithFocusChart'
  parent: 'chart'
  options: [
    'margin',
    'width',
    'height',
    'height2',
    'color',
    'showLegend',
    'tooltips',
    'noData',
    'tooltipContent',
    'brushExtent',
    'transitionDuration',
    'duration',
    'x',
    'y',
    'margin',
    'margin2',
    'interpolate',
    'xTickFormat',
    'yTickFormat'
  ]
  overrides: [
    'tooltips'
  ]
  submodels:
    legend: nv.models.legend
    lines: nv.models.line
    lines2: nv.models.line
    xAxis: nv.models.axis
    yAxis: nv.models.axis
    x2Axis: nv.models.axis
    y2Axis: nv.models.axis
  inheritedInstance:
    lines: [
      'isArea',
      'size',
      'xDomain',
      'yDomain',
      'xRange',
      'yRange',
      'forceX',
      'forceY',
      'interactive',
      'clipEdge',
      'clipVoronoi',
      'id'
    ]
  dispatch: true
  optionsFunc: true
  events: [
    'tooltipShow'
    'tooltipHide'
    'stateChange'
    'changeState'
    'renderEnd'
    'brush'
  ]

apiTest.run 'lineWithFocusChart'
