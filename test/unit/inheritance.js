// Generated by CoffeeScript 1.7.1
(function() {
  var should, test;

  should = chai.should();

  test = describe;

  test('Boilerplate', function() {
    describe('A single boilerplate instance', function() {
      var instance;
      instance = null;
      beforeEach(function() {
        return instance = nv.models.boilerplate();
      });
      it('should exists', function() {
        return instance.should.exists;
      });
      it('has default properties', function() {
        assert.deepEqual(instance.margin(), {
          top: 1,
          right: 2,
          bottom: 3,
          left: 4
        });
        instance.width().should.equal(5);
        return instance.height().should.equal(6);
      });
      return it('changes properties correctly', function() {
        instance.margin({
          top: 7,
          right: 8,
          bottom: 9,
          left: 10
        });
        instance.width(11);
        instance.height(12);
        assert.deepEqual(instance.margin(), {
          top: 7,
          right: 8,
          bottom: 9,
          left: 10
        });
        instance.width().should.equal(11);
        return instance.height().should.equal(12);
      });
    });
    describe('Two boilerplate instances', function() {
      var first, second;
      first = null;
      second = null;
      beforeEach(function() {
        first = nv.models.boilerplate();
        return second = nv.models.boilerplate();
      });
      return describe("scales", function() {
        it('set by default correctly', function() {
          assert.deepEqual(first.xAxis.scale().domain(), [0, 1]);
          return assert.deepEqual(second.xAxis.scale().domain(), [0, 1]);
        });
        return it('are not overridden after applying a new values to one of the instances', function() {
          first.xAxis.scale().domain([-10, 10]);
          assert.notDeepEqual(second.xAxis.scale().domain(), [-10, 10]);
          return assert.deepEqual(second.xAxis.scale().domain(), [0, 1]);
        });
      });
    });
    describe('Two axis models', function() {
      var first, second;
      first = null;
      second = null;
      beforeEach(function() {
        first = nv.models.axis();
        return second = nv.models.axis();
      });
      return it("should not override each other", function() {
        first.scale().domain([-10, 10]);
        assert.notDeepEqual(second.scale().domain(), [-10, 10]);
        return assert.deepEqual(second.scale().domain(), [0, 1]);
      });
    });
    return describe("Two lineChart instances", function() {
      var first, second;
      first = null;
      second = null;
      beforeEach(function() {
        first = nv.models.lineChart();
        return second = nv.models.lineChart();
      });
      return describe("scales", function() {
        return it('are not overridden after applying a new values to one of the instances', function() {
          first.xAxis.scale().domain([-10, 10]);
          assert.notDeepEqual(second.xAxis.scale().domain(), [-10, 10]);
          return assert.deepEqual(second.xAxis.scale().domain(), [0, 1]);
        });
      });
    });
  });

}).call(this);
