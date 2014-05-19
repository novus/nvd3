should = chai.should()

apiTest = apiTest || {}

apiTest.models.chart = (instance, overrides=[])->
    options = [
        'showXAxis'
        'showYAxis'
        'rightAlignYAxis'
        'reduceXTicks'
        'noData'
        #'update'
        'tooltips'
        'tooltipContent'
    ]

    describe 'Inherited API', ->
        apiTest.models.layer instance, overrides

    describe 'Chart API', ->
        checkProperties
            instance: instance
            properties: options
            overrides: overrides
            parent: Chart

describe 'Chart Model', ->
    apiTest.models.chart(new Chart())


