apiTest.config.bulletChart =
  ctor: BulletChart
  name: 'bulletChart'
  parent: 'chart'
  options: [
    'orient',
    'tooltipContent',
    'ranges',
    'markers',
    'measures',
    'width',
    'height',
    'margin',
    'tickFormat',
    'tooltips',
    'noData'
  ]
  overrides: [
    'tooltips'
  ]
  submodels:
    bullet: nv.models.bullet
    legend: nv.models.legend
    xAxis: nv.models.axis
    yAxis: nv.models.axis
    #state: nv.utils.state()
  inheritedInstance:
    bullet: [
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

apiTest.run 'bulletChart'
