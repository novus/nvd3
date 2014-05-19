apiTest.config.discreteBar =
  ctor: DiscreteBar
  name: 'discreteBar'
  parent: 'layer'
  options: [
    'x'
    'y'
    'margin'
    'width'
    'height'
    'xScale'
    'yScale'
    'xDomain'
    'yDomain'
    'xRange'
    'yRange'
    'forceY'
    'id'
    'showValues'
    'valueFormat'
    'rectClass'
    'color'
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

apiTest.run 'discreteBar'
