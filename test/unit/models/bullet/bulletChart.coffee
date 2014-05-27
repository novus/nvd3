apiTest.config.bulletChart =
  ctor: BulletChart
  name: 'bulletChart'
  parent: 'chart'
  options: [
    'orient',
    'ranges',
    'markers',
    'measures',
    'width',
    'height',
    'margin',
    'tickFormat',
  ]
  overrides: [
    'tooltips'
    'showXAxis'
    'showYAxis'
  ]
  submodels:
    bullet: nv.models.bullet
    legend: nv.models.legend
    xAxis: nv.models.axis
    yAxis: nv.models.axis
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
