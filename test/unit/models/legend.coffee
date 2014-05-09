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

apiTest.run 'legend'