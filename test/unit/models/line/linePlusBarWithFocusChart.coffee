apiTest.config.linePlusBarWithFocusChart =
  ctor: LinePlusBarWithFocusChart
  name: 'linePlusBarWithFocusChart'
  parent: 'chart'
  options: [
    'x',
    'y',
    'margin',
    'width',
    'height',
    'color',
    'showLegend',
    'brushExtent',
    'finderHeight',
    'yScale'
  ]
  overrides: [
    'tooltips'
  ]
  submodels:
    legend: nv.models.legend
    lines: nv.models.line
    lines2: nv.models.line
    bars: nv.models.historicalBar
    bars2: nv.models.historicalBar
    xAxis: nv.models.axis
    x2Axis: nv.models.axis
    y1Axis: nv.models.axis
    y2Axis: nv.models.axis
    y3Axis: nv.models.axis
    y4Axis: nv.models.axis
  inheritedInstance:
    lines: [
      'defined',
      'size',
      'clipVoronoi',
      'interpolate'
    ]
  dispatch: true
  optionsFunc: true
  events: [
    'tooltipShow'
    'tooltipHide'
    'stateChange'
    'changeState'
    'renderEnd'
  ]

apiTest.run 'linePlusBarWithFocusChart'
