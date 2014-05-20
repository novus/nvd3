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
    'noData'
  ]
  submodels:
    sparkline: nv.models.sparkline
    #state: nv.utils.state()
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
