apiTest.config.historicalBar =
  ctor: HistoricalBar
  name: 'historicalBar'
  parent: 'layer'
  options: [
    'x'
    'y'
    'width'
    'height'
    'margin'
    'xScale'
    'yScale'
    'xDomain'
    'yDomain'
    'xRange'
    'yRange'
    'forceX'
    'forceY'
    'padData'
    'clipEdge'
    'color'
    'id'
    'interactive'
  ]
  dispatch: true
  optionsFunc: true
  events: [
    'chartClick'
    'elementClick'
    'elementDblClick'
    'elementMouseover'
    'elementMouseout'
    'renderEnd'
  ]

apiTest.run 'historicalBar'
