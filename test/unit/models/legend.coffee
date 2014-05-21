apiTest.config.legend =
    ctor: Legend
    name: 'legend'
    parent: 'layer'
    options: [
        'margin'
        'width'
        'height'
        'key'
        'color'
        'align'
        'rightAlign'
        'updateState'
        'radioButtonMode'
    ]
    dispatch: true
    optionsFunc: true
    events: [
      'legendClick'
      'legendDblclick'
      'legendMouseover'
      'legendMouseout'
    ]

apiTest.run 'legend'