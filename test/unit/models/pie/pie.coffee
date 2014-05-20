apiTest.config.pie =
  ctor: Pie
  name: 'pie'
  parent: 'layer'
  options: [
    'margin',
    'width',
    'height',
    'x',
    'y',
    'description',
    'showLabels',
    'labelSunbeamLayout',
    'pieLabelsOutside',
    'labelType',
    'startAngle',
    'endAngle',
    'id',
    'color',
    'labelThreshold',
    'valueFormat',
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

apiTest.run 'pie'
