should = chai.should()

apiTest = apiTest || {}

apiTest.axis = (instance, overrides=[])->
    options = [
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

    axisBind = [
        'orient'
        'tickValues'
        'tickSubdivide'
        'tickSize'
        'tickPadding'
        'tickFormat'
    ]

    scaleBind = [
        'domain'
        'range'
        'rangeBand'
        'rangeBands'
    ]

    describe 'Inherited APIs', ->
        apiTest.layer(instance)

    describe 'Axis API', ->
        checkProperties
            instance: instance
            properties: options.concat(axisBind).concat(scaleBind)
            overrides: overrides
            parent: Axis

describe.only 'Axis Model', ->
    apiTest.axis(nv.models.axis())


