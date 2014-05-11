apiTest.config.line =
    ctor: Line
    name: 'line'
    parent: 'layer'
    options: [
        'margin'
        'width'
        'height'
        'x'
        'y'
        'clipEdge'
        'color'
        'interpolate'
        'defined'
        'isArea'
        'duration'
    ]
    submodels:
        scatter: nv.models.scatter
    dispatch: true
    optionsFunc: true
    events: [
        'elementClick'
        'elementMouseover'
        'elementMouseout'
        'renderEnd'
    ]

apiTest.run 'line'