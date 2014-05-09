apiTest.config.distribution =
    ctor: Distribution
    name: 'distribution'
    parent: 'layer'
    options: [
        'margin'
        'width'
        'axis'
        'size'
        'getData'
        'scale'
        'color'
        'duration'
    ]
    dispatch: true
    optionsFunc: true
    events: [
        'renderEnd'
    ]

apiTest.run 'distribution'