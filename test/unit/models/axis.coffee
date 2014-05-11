apiTest.config.axis =
    ctor: Axis
    name: 'axis'
    parent: 'layer'
    options: [
        'margin'
        'width'
        'ticks'
        'height'
        'axisLabel'
        'showMaxMin'
        'highlightZero'
        'scale'
        'rotateYLabel'
        'rotateLabels'
        'staggerLabels'
        'axisLabelDistance'
        'duration'
    ]
    submodels:
        axis: d3.svg.axis
    inheritedInstance:
        axis: [
            'orient'
            'tickValues'
            'tickSubdivide'
            'tickSize'
            'tickPadding'
            'tickFormat'
        ]
        scale: [
            'domain'
            'range'
            'rangeBand'
            'rangeBands'
        ]
    dispatch: true
    optionsFunc: true
    events: [
        'renderEnd'
    ]

apiTest.run 'axis'
