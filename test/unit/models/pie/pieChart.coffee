apiTest.config.pieChart =
  ctor: PieChart
  name: 'pieChart'
  parent: 'chart'
  options: [
    'margin',
    'width',
    'height',
    'color',
    'tooltips',
    'tooltipContent',
    'showLegend',
    'duration',
    'noData',
    'state'
  ]
  overrides: [
    'tooltips'
  ]
  submodels:
    pie: nv.models.pie
    legend: nv.models.legend
    #state: nv.utils.state
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
