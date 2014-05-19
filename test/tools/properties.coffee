should = chai.should()

###

config:
    instance:       Instance to test
    properties:     Properties to test against instance
    parent:         Parent of instance, from which prototypes are inherited
    overrides:      Properties expected to be overridden by instance

###

checkProperties = (config)->
    config.overrides = config.overrides || []
    parent = config.parent
    config.properties.forEach (prop)->
        describe "#{prop}", ->
            instance = null
            beforeEach ->
                instance = config.instance
            it 'exists', ->
                should.exist instance[prop]
            if prop in config.overrides
                it "DOES NOT call #{parent.name}.prototype.#{prop}", ->
                    spy = sinon.spy parent.prototype, prop
                    instance[prop]()
                    spy.called.should.be.false
                    parent.prototype[prop].restore()
            else
                it "calls #{parent.name}.prototype.#{prop}", ->
                    spy = sinon.spy parent.prototype, prop
                    instance[prop]()
                    spy.calledOnce.should.be.true
                    parent.prototype[prop].restore()


checkInstanceProp = (instance, source, props)->
    props.forEach (prop)->
        it "#{prop}", ->
            should.exist instance[prop]

checkDispatch = (model, events=[])->
    describe 'dispatch', ->
        it 'exists', ->
            instance = model()
            should.exist instance.dispatch

        if events.length isnt 0
            describe 'Events', ->
                instance = null
                beforeEach -> instance = model()
                events.forEach (event)->
                    it "#{event}", ->
                        should.exist instance.dispatch[event]

checkOptionsFunc = (model)->
    describe 'options', ->
        it 'exists', ->
            instance = model()
            should.exist instance.options
        it 'calls nv.utils.optionFunc', ->
            spy = sinon.spy nv.utils, 'optionsFunc'
            instance = model()
            instance.options()
            spy.calledOnce.should.be.true
            nv.utils.optionsFunc.restore()

checkForDuck = (instance, model)->
    it 'exposes correct submodel API', ->
        modelAPI = [key for key of model]
        instanceAPI = [key for key of instance]
        instanceAPI.should.deep.equal modelAPI









