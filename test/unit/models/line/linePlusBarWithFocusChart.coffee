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
    'tooltips',
    'tooltipContent',
    'noData',
    'brushExtent',
    'finderHeight',
    'yScale'
  ]
  overrides: [
    'tooltips'
  ]
  submodels:
    lines: nv.models.line
    lines2: nv.models.line
    bars: nv.models.historicalBar
    bars2: nv.models.historicalBar
    legend: nv.models.legend
    xAxis: nv.models.axis
    x2Axis: nv.models.axis
    y3Axis: nv.models.axis
    y4Axis: nv.models.axis
    y1Axis: nv.models.axis
    y2Axis: nv.models.axis
    #state: nv.utils.state
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

apiTest.run.only 'linePlusBarWithFocusChart'
