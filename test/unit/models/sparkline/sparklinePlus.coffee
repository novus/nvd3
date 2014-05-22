apiTest.config.sparklinePlus =
  ctor: SparklinePlus
  name: 'sparklinePlus'
  parent: 'chart'
  options: [
    'margin',
    'width',
    'height',
    'xTickFormat',
    'yTickFormat',
    'showValue',
    'alignValue',
    'rightAlignValue',
  ]
  submodels:
    sparkline: nv.models.sparkline
  inheritedInstance:
    sparkline: [
      'x',
      'y',
      'xScale',
      'yScale',
      'color'
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

#apiTest.run.only 'sparklinePlus'
