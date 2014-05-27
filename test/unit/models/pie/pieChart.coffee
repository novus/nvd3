apiTest.config.pieChart =
  ctor: PieChart
  name: 'pieChart'
  parent: 'chart'
  options: [
    'margin',
    'width',
    'height',
    'color',
    'showLegend',
    'duration',
    'state'
  ]
  overrides: [
    'tooltips'
    'showXAxis'
    'showYAxis'
  ]
  submodels:
    pie: nv.models.pie
    legend: nv.models.legend
  inheritedInstance:
    pie: [
      'valueFormat',
      'x',
      'y',
      'description',
      'id',
      'showLabels',
      'pieLabelsOutside',
      'labelType',
      'labelThreshold',
      'labelSunbeamLayout',
      'labelLayout',
      'labelFormat'
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

apiTest.run 'pieChart'
