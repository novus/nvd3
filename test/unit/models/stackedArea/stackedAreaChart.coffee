apiTest.config.stackedAreaChart =
  ctor: StackedAreaChart
  name: 'stackedAreaChart'
  parent: 'chart'
  options: [
    'margin'
    'width'
    'height'
    'state'
    'defaultState'
    'noData'
    'showControls'
    'showLegend'
    'showXAxis'
    'showYAxis'
    'tooltip'
    'tooltips'
    'color'
    'rightAlignYAxis'
    'useInteractiveGuideline'
    'tooltipContent'
    'transitionDuration'
    'controlsData'
    'controlLabels'
    'duration'
    'setTickFormat'
  ]
  overrides: [
    'tooltips'
  ]
  submodels:
    stacked: nv.models.stackedArea
    interactiveLayer: nv.interactiveGuideline
    legend: nv.models.legend
    controls: nv.models.legend
    xAxis: nv.models.axis
    yAxis: nv.models.axis
    #state: nv.utils.state
  inheritedInstance:
    stacked: [
      'x'
      'y'
      'size'
      'xScale'
      'yScale'
      'xDomain'
      'yDomain'
      'xRange'
      'yRange'
      'sizeDomain'
      'interactive'
      'useVoronoi'
      'offset'
      'order'
      'style'
      'clipEdge'
      'forceX'
      'forceY'
      'forceSize'
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

apiTest.run 'stackedAreaChart'
