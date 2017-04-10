/* globals chai, ChartBuilder, sinon */
let benv, _sinon, ChartFactory, snapshot, _should, moment;
if (typeof require !== 'undefined') {
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
  moment = function (dateString) {
    return new Date(dateString);
  }
}

describe('NVD3', () => describe.only('Difference Chart', () => {
  const options = {
    x(d) {
      return d.x;
    },
    y(d) {
      return d.y;
    },
    focusMargin: { top: 0, right: 60, bottom: 0, left: 20 },
    margin: { top: 30, right: 20, bottom: 50, left: 75 },
    noData: 'No Data Available',
    duration: 0
  };
  // Predicted > Actual
  const testData = [
    {
      key: 'Actual Data',
      type: 'actual',
      values: [{ x: 123, y: 10 }, { x: 124, y: 20 }]
    },
    {
      key: 'Predicted Data',
      type: 'expected',
      values: [{ x: 123, y: 15 }, { x: 124, y: 25 }]
    }
  ];

  let builder = null;
  let sandbox;

  function setupBenv(done) {
    if (typeof require === 'undefined') {
      done();
      return;
    }
    benv.setup(() => {
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

  before((done) => {
    sandbox = _sinon.sandbox.create();
    setupBenv(done);
  });

  beforeEach(() => {
    options.color = nv.utils.defaultColor();
    builder = new ChartFactory(nv.models.differenceChart());
    builder.build(options, testData);
  });

  afterEach(() => {
    builder.teardown();
    sandbox.restore();
  });

  after(() => {
    if (typeof benv === 'undefined') {
      return;
    }
    benv.teardown(true);
  });

  it('verfying yExtent', () => {
    const processedData = [
      {
        key: 'Predicted Data minus Actual Data (Predicted > Actual)',
        type: 'area',
        values: [{ x: 123, y0: 10, y1: 15 }, { x: 124, y0: 20, y1: 25 }],
        yAxis: 1,
        color: 'rgba(44,160,44,.9)',
        processed: true
      },
      {
        key: 'Predicted Data minus Actual Data (Predicted < Actual)',
        type: 'area',
        values: [{ x: 123, y0: 10, y1: 10 }, { x: 124, y0: 20, y1: 20 }],
        yAxis: 1,
        color: 'rgba(214,39,40,.9)',
        processed: true
      },
      {
        key: 'Actual Data',
        type: 'line',
        values: [{ x: 123, y: 10 }, { x: 124, y: 20 }],
        yAxis: 1,
        color: '#666666',
        processed: true,
        strokeWidth: 1
      },
      {
        key: 'Predicted Data',
        type: 'line',
        values: [{ x: 123, y: 15 }, { x: 124, y: 25 }],
        yAxis: 1,
        color: '#aec7e8',
        processed: true,
        strokeWidth: 1
      }
    ];
    builder.model.multiChart.yDomain1().should.deep.equal([10, 25]);
  });

  describe('no data handling', () => {
    it('clears chart objects for empty data', () => {
      builder.updateData([]);

      let groups = builder.$('g');
      groups.length.should.equal(0, 'removes chart components');
      builder.$('.nv-noData').length.should.equal(1);
    });

    it('clears chart objects for undefined data', () => {
      builder.updateData(null);

      let groups = builder.$('g');
      groups.length.should.equal(0, 'removes chart components');
      builder.$('.nv-noData').length.should.equal(1);
    });

    it('clears chart components if chart has no values', () => {
      const dataWithNoValues = testData.map((dataset) => {
        const modifiedDataset = Object.assign({}, dataset);
        modifiedDataset.values = [];
        return modifiedDataset;
      });

      builder.updateData(dataWithNoValues);
      let groups = builder.$('g');
      groups.length.should.equal(0, 'removes chart components');
      builder.$('.nv-noData').length.should.equal(1);
    });

    it('should clear no data artefacts if data is supplied', () => {
      // set up no data
      builder.updateData([]);
      builder.updateData(testData);
      debugger;
      builder.$('.nv-noData').length.should.equal(0);
    });

  });

  it('api check', () => {
    _should.exist(builder.model.options, 'options exposed');
    return (() => {
      let result = [];
      for (let opt in options) {
        result.push(_should.exist(builder.model[opt](), `${opt} can be called`));
      }
      return result;
    })();
  });

  describe('processing Data', () => {
    it('does not process data if series toggled off', () => {
      builder.model.showPredictedLine(false);
      const expectedData = [
        {
          key: 'Predicted Data minus Actual Data (Predicted > Actual)',
          type: 'area',
          values: [{ x: 123, y0: 10, y1: 15 }, { x: 124, y0: 20, y1: 25 }],
          yAxis: 1,
          color: 'rgba(44,160,44,.9)',
          processed: true
        },
        {
          key: 'Predicted Data minus Actual Data (Predicted < Actual)',
          type: 'area',
          values: [{ x: 123, y0: 10, y1: 10 }, { x: 124, y0: 20, y1: 20 }],
          yAxis: 1,
          color: 'rgba(214,39,40,.9)',
          processed: true
        },
        {
          key: 'Actual Data',
          type: 'line',
          values: [{ x: 123, y: 10 }, { x: 124, y: 20 }],
          yAxis: 1,
          color: '#666666',
          processed: true,
          strokeWidth: 1
        }
      ];
      const actualData = builder.model.processData(testData);
      JSON.stringify(actualData).should.equal(JSON.stringify(expectedData));
    });

    it('correctly processes data case Predicted > Actual', () => {
      const expectedData = [
        {
          key: 'Predicted Data minus Actual Data (Predicted > Actual)',
          type: 'area',
          values: [{ x: 123, y0: 10, y1: 15 }, { x: 124, y0: 20, y1: 25 }],
          yAxis: 1,
          color: 'rgba(44,160,44,.9)',
          processed: true
        },
        {
          key: 'Predicted Data minus Actual Data (Predicted < Actual)',
          type: 'area',
          values: [{ x: 123, y0: 10, y1: 10 }, { x: 124, y0: 20, y1: 20 }],
          yAxis: 1,
          color: 'rgba(214,39,40,.9)',
          processed: true
        },
        {
          key: 'Actual Data',
          type: 'line',
          values: [{ x: 123, y: 10 }, { x: 124, y: 20 }],
          yAxis: 1,
          color: '#666666',
          processed: true,
          strokeWidth: 1
        },
        {
          key: 'Predicted Data',
          type: 'line',
          values: [{ x: 123, y: 15 }, { x: 124, y: 25 }],
          yAxis: 1,
          color: '#aec7e8',
          processed: true,
          strokeWidth: 1
        }
      ];
      const actualData = builder.model.processData(testData);
      JSON.stringify(actualData).should.equal(JSON.stringify(expectedData));
    });

    it('correctly processes data case Predicted < Actual', () => {
      //Predicted < Actual
      const testData2 = [
        {
          key: 'Actual Data',
          type: 'actual',
          values: [{ x: 123, y: 15 }, { x: 124, y: 25 }]
        },
        {
          key: 'Predicted Data',
          type: 'expected',
          values: [{ x: 123, y: 10 }, { x: 124, y: 20 }]
        }
      ];
      const expectedData = [
        {
          key: 'Predicted Data minus Actual Data (Predicted > Actual)',
          type: 'area',
          values: [{ x: 123, y0: 15, y1: 15 }, { x: 124, y0: 25, y1: 25 }],
          yAxis: 1,
          color: 'rgba(44,160,44,.9)',
          processed: true
        },
        {
          key: 'Predicted Data minus Actual Data (Predicted < Actual)',
          type: 'area',
          values: [{ x: 123, y0: 15, y1: 10 }, { x: 124, y0: 25, y1: 20 }],
          yAxis: 1,
          color: 'rgba(214,39,40,.9)',
          processed: true
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
          values: [{ x: 123, y: 10 }, { x: 124, y: 20 }],
          yAxis: 1,
          color: '#aec7e8',
          processed: true,
          strokeWidth: 1
        }
      ];
      const actualData = builder.model.processData(testData2);
      JSON.stringify(actualData).should.equal(JSON.stringify(expectedData));
    });

    it('correctly processes data case Predicted = Actual', () => {
      //equal testData
      const equal_testData = [
        {
          key: 'Actual Data',
          type: 'actual',
          values: [{ x: 123, y: 15 }, { x: 124, y: 25 }]
        },
        {
          key: 'Predicted Data',
          type: 'expected',
          values: [{ x: 123, y: 15 }, { x: 124, y: 25 }]
        }
      ];

      const expectedData = [
        {
          key: 'Predicted Data minus Actual Data (Predicted > Actual)',
          type: 'area',
          values: [{ x: 123, y0: 15, y1: 15 }, { x: 124, y0: 25, y1: 25 }],
          yAxis: 1,
          color: 'rgba(44,160,44,.9)',
          processed: true
        },
        {
          key: 'Predicted Data minus Actual Data (Predicted < Actual)',
          type: 'area',
          values: [{ x: 123, y0: 15, y1: 15 }, { x: 124, y0: 25, y1: 25 }],
          yAxis: 1,
          color: 'rgba(214,39,40,.9)',
          processed: true
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
          values: [{ x: 123, y: 15 }, { x: 124, y: 25 }],
          yAxis: 1,
          color: '#aec7e8',
          processed: true,
          strokeWidth: 1
        }
      ];
      const actualData = builder.model.processData(equal_testData);
      JSON.stringify(actualData).should.equal(JSON.stringify(expectedData));
    });

    it('correctly gives error for uneven data sets', () => {
      //Uneven testData
      const uneven_testData = [
        {
          key: 'Actual Data',
          type: 'actual',
          values: [{ x: 123, y: 15 }, { x: 124, y: 25 }]
        }
      ];

      const actualData = builder.model.processData(uneven_testData);
      JSON.stringify(actualData).should.equal('[]');
    });

    it('returns if predictedData is missing', () => {
      //Uneven testData
      const missing_PredictedData = [
        {
          key: 'Actual Data',
          type: 'actual',
          values: [{ x: 123, y: 15 }, { x: 124, y: 25 }]
        },
        {
          key: 'Predicted Data',
          type: 'expected',
          values: []
        }
      ];

      const expectedData = [
        {
          key: 'Predicted Data minus Actual Data (Predicted > Actual)',
          type: 'area',
          values: [],
          yAxis: 1,
          color: 'rgba(44,160,44,.9)',
          processed: true
        },
        {
          key: 'Predicted Data minus Actual Data (Predicted < Actual)',
          type: 'area',
          values: [],
          yAxis: 1,
          color: 'rgba(214,39,40,.9)',
          processed: true
        },
        {
          key: 'Actual Data',
          type: 'line',
          values: [],
          yAxis: 1,
          color: '#666666',
          processed: true,
          strokeWidth: 1
        },
        {
          key: 'Predicted Data',
          type: 'line',
          values: [],
          yAxis: 1,
          color: '#aec7e8',
          processed: true,
          strokeWidth: 1
        }
      ];
      const actualData = builder.model.processData(missing_PredictedData);
      JSON.stringify(actualData).should.equal(JSON.stringify(expectedData));
    });
  });

  it('renders', () => {
    let wrap = builder.$('.multiChart');
    return _should.exist(wrap[0]);
  });

  it('clears chart objects for no data', () => {
    builder = new ChartFactory(nv.models.differenceChart());
    builder.buildover(options, testData, []);

    let groups = builder.$('g');
    groups.length.should.equal(0, 'removes chart components');
  });

  it('has correct structure', () => {
    let cssClasses = [
      '.multiChart',
      '.multiChart .nv-interactive',
      '.multiChart .nv-x.nv-axis',
      '.nv-focus'
    ];
    cssClasses.forEach((cssClass) => {
      _should.exist(builder.$(`${cssClass}`)[0]);
    });
  });

  describe('default values', () => {
    it('has default chart width', () => {
      default_width = builder.model.width();
      _should.equal(default_width, null);
    });

    it('has default chart height', () => {
      default_height = builder.model.height();
      _should.equal(default_height, null);
    });

    it('has showPredictedLine default as false', () => {
      default_value = builder.model.showPredictedLine();
      default_value.should.be.true;
    });
  });

  describe('setters', () => {
    it('can override chart focusMargin', () => {
      builder.model.focusMargin({ right: 75 });
      builder.model.focusMargin().right.should.equal(75);

      builder.model.focusMargin({ bottom: 7 });
      builder.model.focusMargin().bottom.should.equal(7);
    });

    it('can override chart Margin', () => {
      builder.model.margin({ right: 75 });
      builder.model.margin().right.should.equal(75);

      builder.model.margin({ bottom: 7 });
      builder.model.margin().bottom.should.equal(7);
    });

    it('can override chart interpolation', () => {
      builder.model.interpolate('basis');

      return builder.model.interpolate().should.equal('basis');
    });

    it('can override chart strokeWidth', () => {
      builder.model.strokeWidth(3);

      return builder.model.strokeWidth().should.equal(3);
    });

    it('can override chart keyForActualLessThanPredicted', () => {
      builder.model.keyForActualLessThanPredicted('blah');

      return builder.model.keyForActualLessThanPredicted().should.equal('blah');
    });

    it('can override chart keyForActualGreaterThanPredicted', () => {
      builder.model.keyForActualGreaterThanPredicted('yoo');

      return builder.model
        .keyForActualGreaterThanPredicted()
        .should.equal('yoo');
    });

    it('can override axis ticks', () => {
      builder.model.xAxis.ticks(34);
      builder.model.yAxis.ticks(56);
      builder.model.update();
      builder.model.xAxis.ticks().should.equal(34);
      return builder.model.yAxis.ticks().should.equal(56);
    });

    it('can override chart height', () => {
      builder.model.height(340);
      builder.model.update();
      const xAxis = builder.$('.multiChart .nv-x.nv-axis');
      xAxis[0].getAttribute('transform').should.equal('translate(0,260)');
    });

    it('can override chart width', () => {
      builder.model.width(340);
      builder.model.update();

      const legendWrap = builder.$('.legendWrap');
      legendWrap[0]
        .getAttribute('transform')
        .should.equal('translate(122.5,-30)');
    });

    it('can override xAccessor', () => {
      builder.model.x(888);
      builder.model.x().should.equal(888);
    });

    it('can override yAccessor', () => {
      builder.model.y(999);
      builder.model.y().should.equal(999);
    });
  });

  describe('tooltip - ', () => {
    it('can correctly format tooltip case 1 - no data', () => {
      const valueFormatter = builder.model.multiChart.interactiveLayer.tooltip.valueFormatter();
      return valueFormatter('10', '3', { key: 'blah' }).should.equal('10');
    });

    it('can correctly format tooltip case 2 - equal y data', () => {
      builder.model.keyForActualLessThanPredicted(
        'keyForActualLessThanPredicted'
      );

      const valueFormatter = builder.model.multiChart.interactiveLayer.tooltip.valueFormatter();
      return valueFormatter('10', '3', {
        key: 'keyForActualLessThanPredicted',
        data: { y0: '5', y1: '5' }
      }).should.equal('-');
    });

    it('can correctly format tooltip case 3 - distinct y data', () => {
      builder.model.keyForActualLessThanPredicted(
        'keyForActualLessThanPredicted'
      );

      const valueFormatter = builder.model.multiChart.interactiveLayer.tooltip.valueFormatter();
      valueFormatter('70', '3', {
        key: 'keyForActualLessThanPredicted',
        data: { y0: '25', y1: '20' }
      }).should.equal(5);
    });
  });

  describe('yAxis', () => {
    let yForMultiChartFunc;
    beforeEach(() => {
      const yForMultiChartSpy = sandbox.spy(builder.model.multiChart, 'y');
      builder.model.update();

      yForMultiChartFunc = yForMultiChartSpy.args[0][0];
    });

    it('yAxis for multi chart should return y0 if y0 is defined', () => {
      yForMultiChartFunc({
        y0: 'blah'
      }).should.equal('blah');
    });

    it('yAxis for multi chart should return ', () => {
      yForMultiChartFunc({
        y: 'boo'
      }).should.equal('boo');
    });
  });

  describe('areaY1', () => {
    it(
      'should use the scattery yScale to calculate the value using d.display.y',
      () => {
        const fakeYScale = sandbox.spy(d3.scale.linear());
        builder.model.multiChart.stack1.scatter.yScale(fakeYScale);
        builder.model.update();

        builder.model.multiChart.stack1.areaY1()({
          display: {
            y: 'jabbathehutt'
          }
        });
        fakeYScale.args[fakeYScale.args.length - 1][0].should.equal(
          'jabbathehutt'
        );
      }
    );
  });

  describe('x axis', () => {
    it('should use a multi time formatter to format x axis ticks', () => {
      const testDataForXAxis = [
        {
          testDatum: moment('2017-01-03T09:15:00').toDate(),
          expectedValue: '09:15'
        },
        {
          testDatum: moment('2017-01-03T09:00:00').toDate(),
          expectedValue: '09 AM'
        },
        {
          testDatum: moment('2017-01-03T00:00:00').toDate(),
          expectedValue: 'Tue 03'
        },
        {
          //d.getDate() != 1
          testDatum: moment('2017-04-02T00:00:00').toDate(),
          expectedValue: 'Apr 02'
        },
        {
          testDatum: moment('2000-05-01T00:00:00').toDate(),
          expectedValue: 'May'
        },
        {
          testDatum: moment('2000-01-01T00:00:00').toDate(),
          expectedValue: '2000'
        }
      ];

      testDataForXAxis.forEach((testDataset) => {
        builder.model.multiChart.xAxis
          .tickFormat()(testDataset.testDatum)
          .should.equal(testDataset.expectedValue);
      });
    });

    it('has default range value', () => {
      builder.model.multiChart.xAxis.range()[1].should.be.equal(-95);
    });

    it('sets up x domain based on the extent of the dataset x values', () => {
      const processedData = [
        {
          key: 'Predicted Data minus Actual Data (Predicted > Actual)',
          type: 'area',
          values: [
            { x: new Date('2016-01-03T09:00'), y0: 10, y1: 15 },
            { x: new Date('2016-01-03T09:30'), y0: 20, y1: 25 }
          ],
          yAxis: 1,
          color: 'rgba(44,160,44,.9)',
          processed: true
        },
        {
          key: 'Predicted Data minus Actual Data (Predicted < Actual)',
          type: 'area',
          values: [
            { x: new Date('2016-01-03T09:00'), y0: 10, y1: 10 },
            { x: new Date('2016-01-03T09:30'), y0: 20, y1: 20 }
          ],
          yAxis: 1,
          color: 'rgba(214,39,40,.9)',
          processed: true
        },
        {
          key: 'Actual Data',
          type: 'line',
          values: [
            { x: new Date('2016-01-03T09:00'), y: 10 },
            { x: new Date('2016-01-03T09:30'), y: 20 }
          ],
          yAxis: 1,
          color: '#666666',
          processed: true,
          strokeWidth: 1
        },
        {
          key: 'Predicted Data',
          type: 'line',
          values: [
            { x: new Date('2016-01-03T09:00'), y: 15 },
            { x: new Date('2016-01-03T09:30'), y: 25 }
          ],
          yAxis: 1,
          color: '#aec7e8',
          processed: true,
          strokeWidth: 1
        }
      ];
      builder.updateData(processedData);
      const expectedDomain = [
        new Date('2016-01-03T09:00'),
        new Date('2016-01-03T09:30')
      ];
      builder.model.multiChart.xAxis
        .domain()
        .should.be.deep.equal(expectedDomain);
    });
  });

  describe('margin', () => {
    it(
      'by default, should be { top: 30, right: 20, bottom: 50, left: 75 }',
      () => {
        const defaultMargin = builder.model.margin();
        const expectedMargin = { top: 30, right: 20, bottom: 50, left: 75 };
        defaultMargin.should.deep.equal(expectedMargin);
      }
    );

    describe(
      'if not all margin components passed, should use previous config',
      () => {
        const testCases = [
          {
            testData: { top: 10 },
            expectedMargin: { top: 10, right: 20, bottom: 50, left: 75 }
          },
          {
            testData: {},
            expectedMargin: { top: 30, right: 20, bottom: 50, left: 75 }
          },
          {
            testData: { left: 10 },
            expectedMargin: { top: 30, right: 20, bottom: 50, left: 10 }
          },
          {
            testData: { right: 10 },
            expectedMargin: { top: 30, right: 10, bottom: 50, left: 75 }
          },
          {
            testData: { bottom: 10 },
            expectedMargin: { top: 30, right: 20, bottom: 10, left: 75 }
          },
          {
            testData: { left: 10 },
            expectedMargin: { top: 30, right: 20, bottom: 50, left: 10 }
          },
          {
            testData: { top: 10, left: 20 },
            expectedMargin: { top: 10, right: 20, bottom: 50, left: 20 }
          }
        ];

        testCases.forEach((testCase) => {
          it(
            `updating margin with ${JSON.stringify(testCase.testData)} should result in margin of ${JSON.stringify(testCase.expectedMargin)}`,
            () => {
              builder.model.margin(testCase.testData);
              builder.model.margin().should.deep.equal(testCase.expectedMargin);
            }
          );
        });
      }
    );

    //  it('updating the margin should change the chart', () => {
    //    builder.model.margin({ top: 150 });
    //    builder.model.update();
    //
    //    const yAxisTransform = builder.$('.nv-secondary .nv-axisMaxMin-y')[0].getAttribute('transform');
    //    yAxisTransform.should.equal('translate(0,150)');
    //  });
  });

  it(
    'after the user brushes, the x axis domain should be equal to the brush extent',
    () => {
      const expectedDomain = [
        new Date('2016-01-01T01:00:00+1100'),
        new Date('2016-01-01T03:30:00+1100')
      ];
      builder.model.focus.dispatch.onBrush(expectedDomain);
      const newDomain = builder.model.multiChart.xAxis.domain();
      newDomain.should.be.deep.equal(expectedDomain);
    }
  );

  it(
    'after the user brushes, the chart should only contain values within the brush extent',
    () => {
      const sampledata = [
        {
          key: 'Actual Data',
          type: 'actual',
          values: [
            { x: new Date('2016-01-01T02:00:00+1100'), y: 10 },
            { x: new Date('2016-01-01T02:15:00+1100'), y: 30 },
            { x: new Date('2016-01-01T02:20:00+1100'), y: 40 },
            { x: new Date('2016-01-01T02:30:00+1100'), y: 20 },
            { x: new Date('2016-01-01T02:45:00+1100'), y: 50 },
            { x: new Date('2016-01-01T03:00:00+1100'), y: 60 }
          ]
        },
        {
          key: 'Predicted Data',
          type: 'expected',
          values: [
            { x: new Date('2016-01-01T02:00:00+1100'), y: 15 },
            { x: new Date('2016-01-01T02:15:00+1100'), y: 35 },
            { x: new Date('2016-01-01T02:20:00+1100'), y: 45 },
            { x: new Date('2016-01-01T02:30:00+1100'), y: 25 },
            { x: new Date('2016-01-01T02:45:00+1100'), y: 75 },
            { x: new Date('2016-01-01T03:00:00+1100'), y: 65 }
          ]
        }
      ];
      processedData = builder.updateData(sampledata);
      const newBrushExtent = [
        new Date('2016-01-01T02:15:00+1100'),
        new Date('2016-01-01T02:45:00+1100')
      ];

      builder.model.focus.dispatch.onBrush(newBrushExtent);

      const dataFromChart = d3.select(builder.model.container).datum();
      dataFromChart[0].values.forEach((value) => {
        value.x.should.be.at.least(newBrushExtent[0]).and.be.at.most(newBrushExtent[1])
      });
    }
  );

  describe('focusMargin', () => {
    it(
      'by default, should be { left: 0, right: 0, top: 10, bottom: 20 }',
      () => {
        const defaultMargin = builder.model.focusMargin();
        const expectedMargin = {
          left: 20,
          right: 60,
          top: 0,
          bottom: 0
        };
        defaultMargin.should.deep.equal(expectedMargin);
      }
    );

    describe(
      'if not all margin components passed, should use previous config',
      () => {
        const testCases = [
          {
            testData: { top: 20 },
            expectedMargin: { top: 20, right: 60, bottom: 0, left: 20 }
          },
          {
            testData: {},
            expectedMargin: { top: 0, right: 60, bottom: 0, left: 20 }
          },
          {
            testData: { left: 10 },
            expectedMargin: { top: 0, right: 60, bottom: 0, left: 10 }
          },
          {
            testData: { right: 10 },
            expectedMargin: { top: 0, right: 10, bottom: 0, left: 20 }
          },
          {
            testData: { bottom: 10 },
            expectedMargin: { top: 0, right: 60, bottom: 10, left: 20 }
          },
          {
            testData: { top: 10, left: 20 },
            expectedMargin: { top: 10, right: 60, bottom: 0, left: 20 }
          }
        ];

        testCases.forEach((testCase) => {
          it(
            `updating focus margin with ${JSON.stringify(testCase.testData)} should result in margin of ${JSON.stringify(testCase.expectedMargin)}`,
            () => {
              builder.model.focusMargin(testCase.testData);
              builder.model
                .focusMargin()
                .should.deep.equal(testCase.expectedMargin);
            }
          );
        });
      }
    );

    // it('updating the focus margin should change the chart', () => {
    //   builder.model.focusMargin({ bottom: 10 });
    //   builder.model.update();
    //
    //   const xAxisTransform = builder.$('.nv-context .nv-axis')[0].getAttribute('transform');
    //   xAxisTransform.should.equal('translate(0,40)');
    // });
  });
}));
