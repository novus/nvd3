apiTest.config.bullet =
  ctor: Bullet
  name: 'bullet'
  parent: 'layer'
  options: [
    'ranges',
    'markers',
    'measures',
    'forceX',
    'width',
    'height',
    'margin',
    'tickFormat',
    'orient',
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

apiTest.run 'bullet'