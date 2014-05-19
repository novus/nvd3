apiTest.config.linePlusBarChart =
  ctor: LinePlusBarChart
  name: 'linePlusBarChart'
  parent: 'chart'
  options: [
    'x',
    'margin',
    'width',
    'height',
    'color',
    'showLegend',
    'tooltips',
    'tooltipContent',
    'state',
    'defaultState',
    'noData',
    'showXAxis',
    'showYAxis',
    'rightAlignYAxis',
    'reduceXTicks'
  ]
  overrides: [
    'tooltips'
  ]
  submodels:
    lines: nv.models.line
    bars: nv.models.historicalBar
    legend: nv.models.legend
    xAxis: nv.models.axis
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
    historicalBar: [
      'forceY'
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

apiTest.run 'linePlusBarChart'
