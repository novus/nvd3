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
                    spy = sinon.spy config.parent.prototype, prop
                    instance[prop]()
                    spy.called.should.be.false
                    config.parent.prototype[prop].restore()
            else
                it "calls #{parent.name}.prototype.#{prop}", ->
                    spy = sinon.spy config.parent.prototype, prop
                    instance[prop]()
                    spy.calledOnce.should.be.true
                    config.parent.prototype[prop].restore()


checkInstanceProp = (instance, source, props)->
    props.forEach (prop)->
        it "#{prop}", ->
            should.exist instance[prop]

