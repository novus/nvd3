apiTest.config.historicalBarChart =
  ctor: HistoricalBarChart
  name: 'historicalBarChart'
  parent: 'chart'
  options: [
    'margin'
    'width'
    'height'
    'color'
    'showLegend'
    'state'
    'defaultState'
    'transitionDuration'
  ]
  overrides: [
    'tooltips'
  ]
  submodels:
    historicalBar: nv.models.historicalBar
    legend: nv.models.legend
    xAxis: nv.models.axis
    yAxis: nv.models.axis
  inheritedInstance:
    historicalBar: [
      'defined'
      'isArea'
      'x'
      'y'
      'size'
      'xScale'
      'yScale'
      'xDomain'
      'yDomain'
      'xRange'
      'yRange'
      'forceX'
      'forceY'
      'interactive'
      'clipEdge'
      'clipVoronoi'
      'id'
      'interpolate'
      'highlightPoint'
      'clearHighlights'
      'interactive'
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

apiTest.run 'historicalBarChart'
