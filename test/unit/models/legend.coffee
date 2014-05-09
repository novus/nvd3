should = chai.should()

apiTest = apiTest || {}

apiTest.legend = (instance, overrides=[])->
    options = [
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

    describe 'Inherited API', ->
        apiTest.layer(instance, [])

    describe 'Legend API', ->
        checkProperties
            instance: instance
            properties: options
            overrides: overrides
            parent: Legend

describe 'Legend Model', ->
    apiTest.legend(nv.models.legend())

    describe 'Instance properties', ->
        checkDispatch nv.models.legend
        checkOptionsFunc nv.models.legend

