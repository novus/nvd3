should = chai.should()

apiTest = apiTest || {}

apiTest.layer = (instance, overrides=[])->
    describe 'Testing Layer API', ->
        ###
        These are the foundational options for every layer.
        These are the only ones that are guaranteed
        to be exposed as the API.
        ###
        options = [
            'height'
            'width'
            'margin'
        ]

        checkProperties
            instance: instance
            properties: options
            overrides: overrides
            parent: Layer

describe 'Layer Model', ->
    apiTest.layer(new Layer())



