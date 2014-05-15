should = chai.should()

apiTest = apiTest || {}

apiTest.models.layer = (instance, overrides=[], ignoreList=[])->
    describe 'Testing Layer API', ->
        ignore = (a, b)->
            if b not in ignoreList
                a.concat(b)
            else
                a

        ###
        These are the foundational options for every layer.
        These are the only ones that are guaranteed
        to be exposed as the API.
        ###
        options = [
            #'size'
            'height'
            'width'
            'margin'
        ].reduce ignore, []

        checkProperties
            instance: instance
            properties: options
            overrides: overrides
            parent: Layer

describe 'Layer Model', ->
    apiTest.models.layer(new Layer())



