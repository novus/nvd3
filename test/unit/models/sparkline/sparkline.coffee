apiTest.config.sparkline =
  ctor: Sparkline
  name: 'sparkline'
  parent: 'layer'
  options: [
    'margin',
    'width',
    'height',
    'x',
    'y',
    'xScale',
    'yScale',
    'xDomain',
    'yDomain',
    'xRange',
    'yRange',
    'animate',
    'color'
  ]
  dispatch: true
  optionsFunc: true
  events: [
    'elementClick'
    'elementMouseover'
    'elementMouseout'
    'renderEnd'
  ]

apiTest.run 'sparkline'