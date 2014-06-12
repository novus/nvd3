should = chai.should()

test = describe

test 'Boilerplate', ->
  describe 'A single boilerplate instance', ->
    instance = null
    beforeEach ->
      instance = nv.models.boilerplate()
    it 'should exists', ->
      instance.should.exists
    it 'has default properties', ->
      assert.deepEqual instance.margin(), {top: 1, right: 2, bottom: 3, left: 4}
      instance.width().should.equal 5
      instance.height().should.equal 6
    it 'changes properties correctly', ->
      instance.margin {top: 7, right: 8, bottom: 9, left: 10}
      instance.width 11
      instance.height 12
      assert.deepEqual instance.margin(), {top: 7, right: 8, bottom: 9, left: 10}
      instance.width().should.equal 11
      instance.height().should.equal 12

  describe 'Two boilerplate instances', ->
    first = null
    second = null
    beforeEach ->
      first = nv.models.boilerplate()
      second = nv.models.boilerplate()
    describe "scales", ->
      it 'set by default correctly', ->
        assert.deepEqual first.xAxis.scale().domain(), [0,1]
        assert.deepEqual second.xAxis.scale().domain(), [0,1]
      it 'are not overridden after applying a new values to one of the instances', ->
        first.xAxis.scale().domain([-10, 10])
        assert.notDeepEqual second.xAxis.scale().domain(), [-10,10]
        assert.deepEqual second.xAxis.scale().domain(), [0,1]

  describe 'Two axis models', ->
    first = null
    second = null
    beforeEach ->
      first = nv.models.axis()
      second = nv.models.axis()
    it "should not override each other", ->
        first.scale().domain([-10, 10])
        assert.notDeepEqual second.scale().domain(), [-10, 10]
        assert.deepEqual second.scale().domain(), [0, 1]

  describe "Two lineChart instances", ->
    first = null
    second = null
    beforeEach ->
      first = nv.models.lineChart()
      second = nv.models.lineChart()
    describe "scales", ->
      it 'are not overridden after applying a new values to one of the instances', ->
        first.xAxis.scale().domain([-10, 10])
        assert.notDeepEqual second.xAxis.scale().domain(), [-10,10]
        assert.deepEqual second.xAxis.scale().domain(), [0,1]
