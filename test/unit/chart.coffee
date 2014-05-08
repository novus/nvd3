should = chai.should()

apiTest = apiTest || {}

apiTest.chart = (instance, overrides=[])->
    props = [
        'showXAxis'
        'showYAxis'
        'rightAlignYAxis'
        'reduceXTicks'
        'staggerLabels'
        'rotateLabels'
        'noData'
    ]

    overrides = [
        'wrapper'
        'draw'
        'attachEvents'
    ]

    describe 'Inherited API', ->
        console.log 'CALLING FROM CHART'
        apiTest.layer(new Chart(), overrides)

    checkProperties
            instance: instance
            properties: props
            overrides: overrides
            parent: Chart

describe 'Chart Model', ->
    apiTest.chart(new Chart())


