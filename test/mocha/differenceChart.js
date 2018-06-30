(function () {
  'use strict';

  var clean = void 0,
      benv = void 0,
      _sinon = void 0,
      ChartFactory = void 0,
      snapshot = void 0,
      _should = void 0,
      moment = void 0;
  if (typeof require !== 'undefined') {
    clean = require('clean-html').clean;
    benv = require('benv');
    _sinon = require('sinon');
    _should = require('chai').should();
    require('coffee-script/register');
    ChartFactory = require('./test-utils.coffee');
    snapshot = require('snap-shot');
    moment = require('moment');
  } else {
    ChartFactory = window.ChartBuilder;
    _sinon = window.sinon;
    _should = window.should;
    moment = window.moment;
  }

  describe('NVD3', function () {
    return describe('Difference Chart', function () {
      var options = {
        x: function x(d) {
          return d.x;
        },
        y: function y(d) {
          return d.y;
        },

        focusMargin: { top: 0, right: 60, bottom: 0, left: 20 },
        margin: { top: 30, right: 20, bottom: 50, left: 75 },
        noData: 'No Data Available',
        duration: 0
      };
      // Predicted > Actual
      var testData = [{
        key: 'Actual Data',
        type: 'actual',
        values: [{ x: 123, y: 10 }, { x: 124, y: 20 }]
      }, {
        key: 'Predicted Data',
        type: 'expected',
        values: [{ x: 123, y: 15 }, { x: 124, y: 25 }]
      }];

      var sampleDataWithDates = [{
        key: 'Actual Data',
        type: 'actual',
        values: [{ x: new Date('2016-01-01T02:00:00+1100'), y: 10 }, { x: new Date('2016-01-01T02:15:00+1100'), y: 30 }, { x: new Date('2016-01-01T02:20:00+1100'), y: 40 }, { x: new Date('2016-01-01T02:30:00+1100'), y: 20 }, { x: new Date('2016-01-01T02:45:00+1100'), y: 50 }, { x: new Date('2016-01-01T03:00:00+1100'), y: 60 }]
      }, {
        key: 'Predicted Data',
        type: 'expected',
        values: [{ x: new Date('2016-01-01T02:00:00+1100'), y: 15 }, { x: new Date('2016-01-01T02:15:00+1100'), y: 35 }, { x: new Date('2016-01-01T02:20:00+1100'), y: 45 }, { x: new Date('2016-01-01T02:30:00+1100'), y: 25 }, { x: new Date('2016-01-01T02:45:00+1100'), y: 75 }, { x: new Date('2016-01-01T03:00:00+1100'), y: 65 }]
      }];

      var builder = null;
      var sandbox = void 0;

      function setupBenv(done) {
        if (typeof require === 'undefined') {
          done();
          return;
        }
        benv.setup(function () {
          benv.expose({
            $: benv.require('zepto'),
            d3: benv.require('d3'),
            nv: benv.require('../../src/core.js')
          });
          benv.require('../../src/dom.js');
          benv.require('../../src/utils.js');
          benv.require('../../src/interactiveLayer.js');
          benv.require('../../src/tooltip.js');
          benv.require('../../src/models/differenceChart.js');
          benv.require('../../src/models/line.js');
          benv.require('../../src/models/scatter.js');
          benv.require('../../src/models/axis.js');
          benv.require('../../src/models/legend.js');
          benv.require('../../src/models/focus.js');
          benv.require('../../src/models/historicalBar.js');
          benv.require('../../src/models/multiChart.js');
          benv.require('../../src/models/multiBar.js');
          benv.require('../../src/models/stackedArea.js');
          done();
        });
      }

      before(function (done) {
        sandbox = _sinon.sandbox.create();
        setupBenv(done);
      });

      beforeEach(function () {
        options.color = nv.utils.defaultColor();
        builder = new ChartFactory(nv.models.differenceChart());
        builder.build(options, testData);
      });

      afterEach(function () {
        builder.teardown();
        sandbox.restore();
      });

      after(function () {
        if (typeof benv === 'undefined') {
          return;
        }
        benv.teardown(true);
      });

      it('y-domain should be the maximum and minimum y values on the graph', function () {
        var someData = [{
          key: 'Predicted Data minus Actual Data (Predicted > Actual)',
          type: 'area',
          values: [{ x: 123, y0: 10, y1: 15 }, { x: 124, y0: 20, y1: 25 }],
          yAxis: 1,
          color: 'rgba(44,160,44,.9)',
          processed: true
        }, {
          key: 'Predicted Data minus Actual Data (Predicted < Actual)',
          type: 'area',
          values: [{ x: 123, y0: 10, y1: 10 }, { x: 124, y0: 20, y1: 20 }],
          yAxis: 1,
          color: 'rgba(234,39,40,.9)',
          processed: true
        }, {
          key: 'Actual Data',
          type: 'line',
          values: [{ x: 123, y: 10 }, { x: 124, y: 20 }],
          yAxis: 1,
          color: '#666666',
          processed: true,
          strokeWidth: 1
        }, {
          key: 'Predicted Data',
          type: 'line',
          values: [{ x: 123, y: 15 }, { x: 124, y: 25 }],
          yAxis: 1,
          color: '#aec7e8',
          processed: true,
          strokeWidth: 1
        }];
        builder.model.processData(someData);
        builder.model.multiChart.yDomain1().should.deep.equal([10, 25]);
      });

      describe('should be able to handle empty date', function () {
        it('clears chart objects for empty data', function () {
          builder.updateData([]);

          var groups = builder.$('g');
          groups.length.should.equal(0, 'removes chart components');
          builder.$('.nv-noData').length.should.equal(1);
        });

        it('clears chart objects if all of the datasets are disabled', function () {
          var disabledData = testData.map(function (dataset) {
            var processedData = Object.assign({}, dataset);
            processedData.disabled = true;
            return processedData;
          });

          builder.updateData(disabledData);

          var groups = builder.$('g');
          groups.length.should.equal(0, 'removes chart components');
          builder.$('.nv-noData').length.should.equal(1);
        });

        it('clears chart objects for undefined data', function () {
          builder.updateData(null);

          var groups = builder.$('g');
          groups.length.should.equal(0, 'removes chart components');
          builder.$('.nv-noData').length.should.equal(1);
        });

        it('clears chart components if chart has no values', function () {
          var dataWithNoValues = testData.map(function (dataset) {
            var modifiedDataset = Object.assign({}, dataset);
            modifiedDataset.values = [];
            return modifiedDataset;
          });

          builder.updateData(dataWithNoValues);
          var groups = builder.$('g');
          groups.length.should.equal(0, 'removes chart components');
          builder.$('.nv-noData').length.should.equal(1);
        });

        it('should clear no data artefacts if data is supplied', function () {
          // set up no data
          builder.updateData([]);
          builder.updateData(testData);
          builder.$('.nv-noData').length.should.equal(0);
        });
      });

      it('api check', function () {
        _should.exist(builder.model.options, 'options exposed');
        return function () {
          var result = [];
          for (var opt in options) {
            result.push(_should.exist(builder.model[opt](), opt + ' can be called'));
          }
          return result;
        }();
      });

      describe('Processing Data', function () {
        it('should does not process data if series toggled off', function () {
          builder.model.showPredictedLine(false);
<<<<<<< HEAD
          var expectedData = [{
            key: 'Predicted Data minus Actual Data (Predicted > Actual)',
            type: 'area',
            values: [{ x: 123, y0: 10, y1: 15 }, { x: 124, y0: 20, y1: 25 }],
            yAxis: 1,
            color: 'rgba(44,160,44,.9)',
            processed: true,
            noHighlightSeries: true
          },
          {
            key: 'Predicted Data minus Actual Data (Predicted < Actual)',
            type: 'area',
            values: [{ x: 123, y0: 10, y1: 10 }, { x: 124, y0: 20, y1: 20 }],
            yAxis: 1,
            color: 'rgba(234,39,40,.9)',
            processed: true,
            noHighlightSeries: true
          },
          {
            key: 'Actual Data',
            type: 'line',
            values: [{ x: 123, y: 10 }, { x: 124, y: 20 }],
            yAxis: 1,
            color: '#666666',
            processed: true,
            strokeWidth: 1
          }];
=======
          var expectedData = [
            {
              key: 'Predicted Data minus Actual Data (Predicted > Actual)',
              type: 'area',
              values: [{ x: '123', y0: 10, y1: 15 }, { x: '124', y0: 20, y1: 25 }],
              yAxis: 1,
              color: 'rgba(44,160,44,.9)',
              processed: true,
              noHighlightSeries: true
            },
            {
              key: 'Predicted Data minus Actual Data (Predicted < Actual)',
              type: 'area',
              values: [{ x: '123', y0: 10, y1: 10 }, { x: '124', y0: 20, y1: 20 }],
              yAxis: 1,
              color: 'rgba(234,39,40,.9)',
              processed: true,
              noHighlightSeries: true
            },
            {
              key: 'Actual Data',
              type: 'line',
              values: [{ x: '123', y: 10 }, { x: '124', y: 20 }],
              yAxis: 1,
              color: '#666666',
              processed: true,
              strokeWidth: 1
            }
          ];
          var actualData = builder.model.processData(testData);
          JSON.stringify(actualData).should.equal(JSON.stringify(expectedData));
        });

        it('correctly processes data when Predicted > Actual', () => {
          var expectedData = [
            {
              key: 'Predicted Data minus Actual Data (Predicted > Actual)',
              type: 'area',
              values: [{ x: '123', y0: 10, y1: 15 }, { x: '124', y0: 20, y1: 25 }],
              yAxis: 1,
              color: 'rgba(44,160,44,.9)',
              processed: true,
              noHighlightSeries: true
            },
            {
              key: 'Predicted Data minus Actual Data (Predicted < Actual)',
              type: 'area',
              values: [{ x: '123', y0: 10, y1: 10 }, { x: '124', y0: 20, y1: 20 }],
              yAxis: 1,
              color: 'rgba(234,39,40,.9)',
              processed: true,
              noHighlightSeries: true
            },
            {
              key: 'Actual Data',
              type: 'line',
              values: [{ x: '123', y: 10 }, { x: '124', y: 20 }],
              yAxis: 1,
              color: '#666666',
              processed: true,
              strokeWidth: 1
            },
            {
              key: 'Predicted Data',
              type: 'line',
              values: [{ x: '123', y: 15 }, { x: '124', y: 25 }],
              yAxis: 1,
              color: '#aec7e8',
              processed: true,
              strokeWidth: 1
            }
          ];
          var actualData = builder.model.processData(testData);
          JSON.stringify(actualData).should.equal(JSON.stringify(expectedData));
        });

        it('correctly processes data when Predicted < Actual', function () {
          //Predicted < Actual
          var testData2 = [
            {
              key: 'Actual Data',
              type: 'actual',
              values: [{ x: '123', y: 15 }, { x: '124', y: 25 }]
            },
            {
              key: 'Predicted Data',
              type: 'expected',
              values: [{ x: '123', y: 10 }, { x: '124', y: 20 }]
            }
          ];
          var expectedData = [
            {
              key: 'Predicted Data minus Actual Data (Predicted > Actual)',
              type: 'area',
              values: [{ x: '123', y0: 15, y1: 15 }, { x: '124', y0: 25, y1: 25 }],
              yAxis: 1,
              color: 'rgba(44,160,44,.9)',
              processed: true,
              noHighlightSeries: true
            },
            {
              key: 'Predicted Data minus Actual Data (Predicted < Actual)',
              type: 'area',
              values: [{ x: '123', y0: 15, y1: 10 }, { x: '124', y0: 25, y1: 20 }],
              yAxis: 1,
              color: 'rgba(234,39,40,.9)',
              processed: true,
              noHighlightSeries: true
            },
            {
              key: 'Actual Data',
              type: 'line',
              values: [{ x: '123', y: 15 }, { x: '124', y: 25 }],
              yAxis: 1,
              color: '#666666',
              processed: true,
              strokeWidth: 1
            },
            {
              key: 'Predicted Data',
              type: 'line',
              values: [{ x: '123', y: 10 }, { x: '124', y: 20 }],
              yAxis: 1,
              color: '#aec7e8',
              processed: true,
              strokeWidth: 1
            }
          ];
          var actualData = builder.model.processData(testData2);
          JSON.stringify(actualData).should.equal(JSON.stringify(expectedData));
        });

        it('correctly processes data when Predicted = Actual', () => {
          var equalTestData = [
            {
              key: 'Actual Data',
              type: 'actual',
              values: [{ x: '123', y: 15 }, { x: '124', y: 25 }]
            },
            {
              key: 'Predicted Data',
              type: 'expected',
              values: [{ x: '123', y: 15 }, { x: '124', y: 25 }]
            }
          ];

          var expectedData = [
            {
              key: 'Predicted Data minus Actual Data (Predicted > Actual)',
              type: 'area',
              values: [{ x: '123', y0: 15, y1: 15 }, { x: '124', y0: 25, y1: 25 }],
              yAxis: 1,
              color: 'rgba(44,160,44,.9)',
              processed: true,
              noHighlightSeries: true
            },
            {
              key: 'Predicted Data minus Actual Data (Predicted < Actual)',
              type: 'area',
              values: [{ x: '123', y0: 15, y1: 15 }, { x: '124', y0: 25, y1: 25 }],
              yAxis: 1,
              color: 'rgba(234,39,40,.9)',
              processed: true,
              noHighlightSeries: true
            },
            {
              key: 'Actual Data',
              type: 'line',
              values: [{ x: '123', y: 15 }, { x: '124', y: 25 }],
              yAxis: 1,
              color: '#666666',
              processed: true,
              strokeWidth: 1
            },
            {
              key: 'Predicted Data',
              type: 'line',
              values: [{ x: '123', y: 15 }, { x: '124', y: 25 }],
              yAxis: 1,
              color: '#aec7e8',
              processed: true,
              strokeWidth: 1
            }
          ];
          var actualData = builder.model.processData(equalTestData);
          JSON.stringify(actualData).should.equal(JSON.stringify(expectedData));
        });

        it('removes any predicted data points that are not found in predicted data', () => {
          const unevenTestData = [
            {
              key: 'Actual Data',
              type: 'actual',
              values: [{ x: '123', y: 15 }, { x: '124', y: 25 }]
            },
            {
              key: 'Predicted Data',
              type: 'expected',
              values: [{ x: '123', y: 15 }, { x: 125, y: 25 }]
            }
          ];
          const expectedData = [
            {
              key: 'Predicted Data minus Actual Data (Predicted > Actual)',
              type: 'area',
              values: [{ x: '123', y0: 15, y1: 15 }, { x: '124', y0: 25, y1: 25 }],
              yAxis: 1,
              color: 'rgba(44,160,44,.9)',
              processed: true,
              noHighlightSeries: true
            },
            {
              key: 'Predicted Data minus Actual Data (Predicted < Actual)',
              type: 'area',
              values: [{ x: '123', y0: 15, y1: 15 }, { x: '124', y0: 25, y1: 25 }],
              yAxis: 1,
              color: 'rgba(234,39,40,.9)',
              processed: true,
              noHighlightSeries: true
            },
            {
              key: 'Actual Data',
              type: 'line',
              values: [{ x: '123', y: 15 }, { x: '124', y: 25 }],
              yAxis: 1,
              color: '#666666',
              processed: true,
              strokeWidth: 1
            },
            {
              key: 'Predicted Data',
              type: 'line',
              values: [{ x: '123', y: 15 }, { x: '124' }],
              yAxis: 1,
              color: '#aec7e8',
              processed: true,
              strokeWidth: 1
            }
          ];

          const actualData = builder.model.processData(unevenTestData);
          JSON.stringify(actualData).should.equal(JSON.stringify(expectedData));
        });

        it('respects any processing done in x accessor', () => {
          const unevenTestData = [
            {
              key: 'Actual Data',
              type: 'actual',
              values: [{ x: '123', y: 15 }, { x: '124', y: 25 }]
            },
            {
              key: 'Predicted Data',
              type: 'expected',
              values: [{ x: '123', y: 15 }, { x: 125, y: 25 }]
            }
          ];
          builder.model.x((d) => parseInt(d.x));
          const expectedData = [
            {
              key: 'Predicted Data minus Actual Data (Predicted > Actual)',
              type: 'area',
              values: [{ x: 123, y0: 15, y1: 15 }, { x: 124, y0: 25, y1: 25 }],
              yAxis: 1,
              color: 'rgba(44,160,44,.9)',
              processed: true,
              noHighlightSeries: true
            },
            {
              key: 'Predicted Data minus Actual Data (Predicted < Actual)',
              type: 'area',
              values: [{ x: 123, y0: 15, y1: 15 }, { x: 124, y0: 25, y1: 25 }],
              yAxis: 1,
              color: 'rgba(234,39,40,.9)',
              processed: true,
              noHighlightSeries: true
            },
            {
              key: 'Actual Data',
              type: 'line',
              values: [{ x: 123, y: 15 }, { x: 124, y: 25 }],
              yAxis: 1,
              color: '#666666',
              processed: true,
              strokeWidth: 1
            },
            {
              key: 'Predicted Data',
              type: 'line',
              values: [{ x: 123, y: 15 }, { x: 124 }],
              yAxis: 1,
              color: '#aec7e8',
              processed: true,
              strokeWidth: 1
            }
          ];

          const actualData = builder.model.processData(unevenTestData);
          JSON.stringify(actualData).should.equal(JSON.stringify(expectedData));
        });
      });

      it('should render the chart', function () {
        var wrap = builder.$('.multiChart');
        return _should.exist(wrap[0]);
      });

      it('should clear chart objects for no data', function () {
        builder = new ChartFactory(nv.models.differenceChart());
        builder.buildover(options, testData, []);

        var groups = builder.$('g');
        groups.length.should.equal(0, 'removes chart components');
      });

      it('has correct structure', function () {
        var cssClasses = ['.multiChart', '.multiChart .nv-interactive', '.multiChart .nv-x.nv-axis', '.nv-focus'];
        cssClasses.forEach(function (cssClass) {
          _should.exist(builder.$('' + cssClass)[0]);
        });
      });

      describe('default values', function () {
        it('default chart width should be null', function () {
          var defaultWidth = builder.model.width();
          _should.equal(defaultWidth, null);
        });

        it('default chart height should be null', function () {
          var defaultHeight = builder.model.height();
          _should.equal(defaultHeight, null);
        });

        it('default value for showPredictedLine should be true', function () {
          var defaultValue = builder.model.showPredictedLine();
          defaultValue.should.be.true;
        });
      });

      describe('setters', function () {
        it('can override chart focusMargin', function () {
          builder.model.focusMargin({ right: 75 });
          builder.model.focusMargin().right.should.equal(75);

          builder.model.focusMargin({ bottom: 7 });
          builder.model.focusMargin().bottom.should.equal(7);
        });

        it('can override chart Margin', function () {
          builder.model.margin({ right: 75 });
          builder.model.margin().right.should.equal(75);

          builder.model.margin({ bottom: 7 });
          builder.model.margin().bottom.should.equal(7);
        });

        it('can override chart interpolation', function () {
          builder.model.interpolate('basis');

          return builder.model.interpolate().should.equal('basis');
        });

        it('can override chart strokeWidth', function () {
          builder.model.strokeWidth(3);

          return builder.model.strokeWidth().should.equal(3);
        });

        it('can override chart keyForActualLessThanPredicted', function () {
          builder.model.keyForActualLessThanPredicted('blah');

          return builder.model.keyForActualLessThanPredicted().should.equal('blah');
        });

        it('can override chart keyForActualGreaterThanPredicted', function () {
          builder.model.keyForActualGreaterThanPredicted('yoo');

          return builder.model.keyForActualGreaterThanPredicted().should.equal('yoo');
        });

        it('can override axis ticks', function () {
          builder.model.xAxis.ticks(34);
          builder.model.yAxis.ticks(56);
          builder.model.xAxis.ticks().should.equal(34);
          return builder.model.yAxis.ticks().should.equal(56);
        });

        it('can override chart height', function () {
          builder.model.height(340);
          builder.model.update();
          var xAxis = builder.$('.multiChart .nv-x.nv-axis');
          xAxis[0].getAttribute('transform').should.equal('translate(0,110)');
        });

        it('can override chart width', function () {
          builder.model.width(340);
          builder.model.update();

          var legendWrap = builder.$('.legendWrap');
          legendWrap[0].getAttribute('transform').should.equal('translate(122.5,-30)');
        });

        it('can override xAccessor', function () {
          builder.model.x(888);
          builder.model.x().should.equal(888);
        });

        it('can override yAccessor', function () {
          builder.model.y(999);
          builder.model.y().should.equal(999);
        });

        describe('xScale', function () {
          it('defaults to d3.time.scale()', function () {
            var defaultXScale = builder.model.multiChart.xAxis.scale();
            defaultXScale.domain.toString().indexOf('Date').should.not.equal(-1);
          });

          it('can override xScale', function () {
            builder.model.xScale(999);
            builder.model.xScale().should.equal(999);
          });
        });

        describe('tickFormat', function () {
          it('can override tickFormat', function () {
            builder.model.tickFormat(999);
            builder.model.tickFormat().should.equal(999);
          });
        });
      });

      describe('tooltip - ', function () {
        var testCases = [{
          name: 'If no point data supplied, should use value (first param) ',
          payloadForPointData: { key: 'blah' },
          expectedResult: '10'
        }, {
          name: 'If equal point data supplied, should use value (first param) ',
          payloadForPointData: {
            key: 'keyForActualLessThanPredicted',
            data: { y0: '5', y1: '5' }
          },
          expectedResult: '-'
        }, {
          name: 'If different point data supplied, should use value (first param) ',
          payloadForPointData: {
            key: 'keyForActualLessThanPredicted',
            data: { y0: '25', y1: '20' }
          },
          expectedResult: 5
        }];

        testCases.forEach(function (testCase) {
          it(testCase.name, function () {
            builder.model.keyForActualLessThanPredicted('keyForActualLessThanPredicted');
            var valueFormatter = builder.model.multiChart.interactiveLayer.tooltip.valueFormatter();
            valueFormatter('10', '3', testCase.payloadForPointData).should.deep.equal(testCase.expectedResult);
          });
        });
      });

      describe('yAxis', function () {
        var yForMultiChartFunc = void 0;
        beforeEach(function () {
          var yForMultiChartSpy = sandbox.spy(builder.model.multiChart, 'y');
          builder.model.update();

          yForMultiChartFunc = yForMultiChartSpy.args[0][0];
        });

        it('yAxis for multi chart should return y0 if y0 is defined', function () {
          yForMultiChartFunc({
            y0: 'blah'
          }).should.equal('blah');
        });

        it('yAxis for multi chart should return y if y0 is not defined', function () {
          yForMultiChartFunc({
            y: 'boo'
          }).should.equal('boo');
        });
      });

      describe('areaY1', function () {
        it('should use the scatter yScale to calculate the value using d.display.y', function () {
          var fakeYScale = sandbox.spy(d3.scale.linear());
          builder.model.multiChart.stack1.scatter.yScale(fakeYScale);
          builder.model.update();

          builder.model.multiChart.stack1.areaY1()({
            display: {
              y: 'jabbathehutt'
            }
          });
          fakeYScale.args[fakeYScale.args.length - 1][0].should.equal('jabbathehutt');
        });
      });

      describe('x axis', function () {
        it('should use a multi time formatter to format x axis ticks by default', function () {
          var testDataForXAxis = [{
            testDatum: new Date('2017-01-03T09:15:00'),
            expectedValue: '09:15'
          }, {
            testDatum: new Date('2017-01-03T09:00:00'),
            expectedValue: '09 AM'
          }, {
            testDatum: new Date('2017-01-03T00:00:00'),
            expectedValue: 'Tue 03'
          }, {
            testDatum: new Date('2017-04-02T00:00:00'),
            expectedValue: 'Apr 02'
          }, {
            testDatum: new Date('2000-05-01T00:00:00'),
            expectedValue: 'May'
          }, {
            testDatum: new Date('2000-01-01T00:00:00'),
            expectedValue: '2000'
          }];

          testDataForXAxis.forEach(function (testDataset) {
            builder.model.multiChart.xAxis.tickFormat()(testDataset.testDatum).should.equal(testDataset.expectedValue);
          });
        });

        it('has default range value', function () {
          builder.model.multiChart.xAxis.range()[1].should.be.above(0);
        });

        it('sets up x domain based on the extent of the dataset x values', function () {
          var processedData = [{
            key: 'Predicted Data minus Actual Data (Predicted > Actual)',
            type: 'area',
            values: [{ x: new Date('2016-01-03T09:00'), y0: 10, y1: 15 }, { x: new Date('2016-01-03T09:30'), y0: 20, y1: 25 }],
            yAxis: 1,
            color: 'rgba(44,160,44,.9)',
            processed: true
          }, {
            key: 'Predicted Data minus Actual Data (Predicted < Actual)',
            type: 'area',
            values: [{ x: new Date('2016-01-03T09:00'), y0: 10, y1: 10 }, { x: new Date('2016-01-03T09:30'), y0: 20, y1: 20 }],
            yAxis: 1,
            color: 'rgba(234,39,40,.9)',
            processed: true
          }, {
            key: 'Actual Data',
            type: 'line',
            values: [{ x: new Date('2016-01-03T09:00'), y: 10 }, { x: new Date('2016-01-03T09:30'), y: 20 }],
            yAxis: 1,
            color: '#666666',
            processed: true,
            strokeWidth: 1
          }, {
            key: 'Predicted Data',
            type: 'line',
            values: [{ x: new Date('2016-01-03T09:00'), y: 15 }, { x: new Date('2016-01-03T09:30'), y: 25 }],
            yAxis: 1,
            color: '#aec7e8',
            processed: true,
            strokeWidth: 1
          }];
          builder.updateData(processedData);
          var expectedDomain = [new Date('2016-01-03T09:00'), new Date('2016-01-03T09:30')];
          builder.model.multiChart.xAxis.domain().should.be.deep.equal(expectedDomain);
        });
      });

      describe('margin', function () {
        it('by default, should be { top: 30, right: 20, bottom: 50, left: 75 }', function () {
          var defaultMargin = builder.model.margin();
          var expectedMargin = { top: 30, right: 20, bottom: 50, left: 75 };
          defaultMargin.should.deep.equal(expectedMargin);
        });

        describe('if not all margin components passed, should use previous config', function () {
          var testCases = [{
            testData: { top: 10 },
            expectedMargin: { top: 10, right: 20, bottom: 50, left: 75 }
          }, {
            testData: {},
            expectedMargin: { top: 30, right: 20, bottom: 50, left: 75 }
          }, {
            testData: { left: 10 },
            expectedMargin: { top: 30, right: 20, bottom: 50, left: 10 }
          }, {
            testData: { right: 10 },
            expectedMargin: { top: 30, right: 10, bottom: 50, left: 75 }
          }, {
            testData: { bottom: 10 },
            expectedMargin: { top: 30, right: 20, bottom: 10, left: 75 }
          }, {
            testData: { left: 10 },
            expectedMargin: { top: 30, right: 20, bottom: 50, left: 10 }
          }, {
            testData: { top: 10, left: 20 },
            expectedMargin: { top: 10, right: 20, bottom: 50, left: 20 }
          }];

          testCases.forEach(function (testCase) {
            it('updating margin with ' + JSON.stringify(testCase.testData) + ' should result in margin of ' + JSON.stringify(testCase.expectedMargin), function () {
              builder.model.margin(testCase.testData);
              builder.model.margin().should.deep.equal(testCase.expectedMargin);
            });
          });
        });

        it('updating the margin should change the chart', function () {
          builder.model.margin({ top: 150 });
          builder.model.update();

          var yAxisTransform = builder.$('.nv-axisMaxMin-y')[0].getAttribute('transform');
          yAxisTransform.should.equal('translate(0,400)');
        });
      });

      it('x-axis labels should rotate as specified', function () {
        builder.model.focus.xAxis.rotateLabels(60);
        builder.model.focus.xAxis.rotateLabels().should.be.equal(60);
      });

      it('after the user brushes, the x axis domain should be equal to the brush extent', function () {
        var expectedDomain = [new Date('2016-01-01T01:00:00+1100'), new Date('2016-01-01T03:30:00+1100')];
        builder.model.focus.dispatch.onBrush(expectedDomain);
        var newDomain = builder.model.multiChart.xAxis.domain();
        newDomain.should.be.deep.equal(expectedDomain);
      });

      it('after the user brushes, the chart should only contain values within the brush extent', () => {
        builder.model.x((d) => new Date(d.x));
        builder.updateData(sampleDataWithDates);
        var newBrushExtent = [new Date('2016-01-01T02:15:00+1100'), new Date('2016-01-01T02:45:00+1100')];

        builder.model.focus.dispatch.onBrush(newBrushExtent);

        var dataFromChart = d3.select(builder.model.container).datum();
        dataFromChart[0].values.forEach(function (value) {
          value.x.should.be.at.least(newBrushExtent[0]).and.be.at.most(newBrushExtent[1]);
        });
      });

      describe('focusMargin', function () {
        it('by default, should be { left: 0, right: 0, top: 10, bottom: 20 }', function () {
          var defaultMargin = builder.model.focusMargin();
          var expectedMargin = {
            left: 20,
            right: 60,
            top: 0,
            bottom: 0
          };
          defaultMargin.should.deep.equal(expectedMargin);
        });

        describe('if not all margin components passed, should use previous config', function () {
          var testCases = [{
            testData: { top: 20 },
            expectedMargin: { top: 20, right: 60, bottom: 0, left: 20 }
          }, {
            testData: {},
            expectedMargin: { top: 0, right: 60, bottom: 0, left: 20 }
          }, {
            testData: { left: 10 },
            expectedMargin: { top: 0, right: 60, bottom: 0, left: 10 }
          }, {
            testData: { right: 10 },
            expectedMargin: { top: 0, right: 10, bottom: 0, left: 20 }
          }, {
            testData: { bottom: 10 },
            expectedMargin: { top: 0, right: 60, bottom: 10, left: 20 }
          }, {
            testData: { top: 10, left: 20 },
            expectedMargin: { top: 10, right: 60, bottom: 0, left: 20 }
          }];

          testCases.forEach(function (testCase) {
            it('updating focus margin with ' + JSON.stringify(testCase.testData) + ' should result in margin of ' + JSON.stringify(testCase.expectedMargin), function () {
              builder.model.focusMargin(testCase.testData);
              builder.model.focusMargin().should.deep.equal(testCase.expectedMargin);
            });
          });
        });

        it('updating the focus margin should change the chart', function () {
          builder.model.focusMargin({ bottom: 10 });
          builder.model.update();
          var xAxisTransform = builder.$('.nv-focus .nv-axis')[0].getAttribute('transform');
          xAxisTransform.should.equal('translate(0,60)');
        });
      });

      if (typeof require !== 'undefined') {
        var pretty = function pretty(html) {
          var result = void 0;
          clean(html, function (out) {
            result = out;
          });

          return result.replace(/nv-edge-clip-[\d]*/g, '').replace(/nv-chart-[\d]*/g, '').replace(/id="[^"]*"/g, '').replace(/clip-path="[^"]*"/g, '').replace(/d="[^"]*"/g, '').replace(/class="[^"]*"/g, '').replace(/transform="[^"]*"/g, '');
        };

        describe('Snapshot', function () {
          it('should match expected snapshot', function () {
            builder.updateData(sampleDataWithDates);
            var svgData = pretty(builder.svg.innerHTML);
            snapshot(svgData);
          });
        });
      }
    });
  });
})();
