apiTest.config.discreteBarChart =
  ctor: DiscreteBarChart
  name: 'discreteBarChart'
  parent: 'chart'
  options: [
    'margin'
    'width'
    'height'
    'showLegend'
    'staggerLabels'
    'transitionDuration'
    'state'
  ]
  overrides: [
    'tooltips'
  ]
  submodels:
    discreteBar: nv.models.discreteBar
    legend: nv.models.legend
    xAxis: nv.models.axis
    yAxis: nv.models.axis
  inheritedInstance:
    discreteBar: [
      'x'
      'y'
      'color'
      'xDomain'
      'yDomain'
      'xRange'
      'yRange'
      'forceX'
      'forceY'
      'id'
      'showValues'
      'valueFormat'
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

apiTest.run 'discreteBarChart'
