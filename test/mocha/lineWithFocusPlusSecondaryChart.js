let clean, benv, _sinon, ChartFactory, snapshot, _should;
if (typeof require !== 'undefined') {
  clean = require('clean-html').clean;
  benv = require('benv');
  _sinon = require('sinon');
  _should = require('chai').should();
  require('coffee-script/register');
  ChartFactory = require('./test-utils.coffee');
  snapshot = require('snap-shot');
} else {
  ChartFactory = window.ChartBuilder;
  _sinon = window.sinon;
  _should = window.should;
}

describe('NVD3', () =>
  describe('lineWithFocusPlusSecondary Chart', () => {
    let options;

    let builder = null;
    let sandbox;
    let currentData;

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
        benv.require('../../src/models/lineWithFocusPlusSecondaryChart.js');
        benv.require('../../src/models/line.js');
        benv.require('../../src/models/scatter.js');
        benv.require('../../src/models/axis.js');
        benv.require('../../src/models/legend.js');
        benv.require('../../src/models/focus.js');
        benv.require('../../src/models/historicalBar.js');
        done();
      });
    }

    before((done) => {
      sandbox = _sinon.sandbox.create();
      setupBenv(done);
    });

    beforeEach(() => {
      builder = new ChartFactory(nv.models.lineWithFocusPlusSecondaryChart());

      options = {
        margin: { top: 30, right: 20, bottom: 50, left: 75 },
        color: nv.utils.defaultColor(),
        noData: 'No Data Available',
        duration: 0
      };
      currentData = testData();
      builder.build(options, currentData);
    });

    afterEach(() => {
      builder.teardown();
      sandbox.restore();

      document.body.innerHTML = '';
    });

    after(() => {
      if (typeof benv === 'undefined') {
        return;
      }
      benv.teardown(true);
    });

    it('api check', () => {
      _should.exist(builder.model.options, 'options exposed');
      for (let opt in options) {
        _should.exist(builder.model[opt](), `${opt} can be called`);
      }
    });

    it('renders', () => {
      let wrap = builder.$('g.nvd3.nv-lineWithFocusPlusSecondary');
      _should.exist(wrap[0]);
    });

    describe('no data handling', () => {
      it('clears chart objects for empty data', () => {
        builder.buildover(options, testData(), []);

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

      it('has an update function even if data is null', () => {
        builder.updateData(null);
        (typeof builder.model.update).should.equal('function');
      });

      it('clears chart components if chart has no values', () => {
        const dataWithNoValues = testData().map((dataset) => {
          dataset.values = [];
          return dataset;
        });

        builder.updateData(dataWithNoValues);
        let groups = builder.$('g');
        groups.length.should.equal(0, 'removes chart components');
        builder.$('.nv-noData').length.should.equal(1);
      });

      it('should clear no data artefacts if data is supplied', () => {
        // set up no data
        builder.updateData([]);
        builder.updateData(testData());
        builder.$('.nv-noData').length.should.equal(0);
      });

      describe('given that there is no secondary data', () => {
        beforeEach(() => {
          const dataWithNoSecondaryData = testData().map((dataset) => {
            if (dataset.secondary) {
              dataset.disabled = true;
            }
            return dataset;
          });
          builder.updateData(dataWithNoSecondaryData);
        });

        it('clears secondary chart for empty data', () => {
          let groups = builder.$('.nv-secondary .nv-y1');
          groups.length.should.equal(0, 'removes secondary chart');
        });

        it('should not show no data for secondary chart if empty data', () => {
          builder.$('.nv-secondary .nv-noData').length.should.equal(0);
        });

        it('should increase the height of the primary chart to compensate', () => {
          builder.$('.nv-primary')[0].getAttribute('transform').should.equal('translate(0, 0)');
          builder.$('.nv-primary .nv-axis.nv-x')[0].getAttribute('transform').should.equal('translate(0,280)');
          const availableWidth = nv.utils.availableWidth(
            builder.model.width(),
            d3.select(builder.model.container),
            builder.model.margin()
          );
          const expectedX = availableWidth / 2;
          builder.$('.nv-legendWrap.primary')[0].getAttribute('transform').should.equal(`translate(${expectedX},-30)`);
        });
      });
    });

    describe('color', () => {
      describe('for secondary chart', () => {
        it('should use the color from the dataset if specified', () => {
          const dataWithColors = testData().map((dataset) => {
            dataset.secondary = true;
            dataset.color = 'red';
            return dataset;
          });
          builder.updateData(dataWithColors);
          const actualColor = builder.model.secondaryChart.color();
          actualColor(dataWithColors[0]).should.equal('red');
        });

        it('should use the color function for the whole chart', () => {
          builder.model.color(() => 'blue');
          const dataWithColors = testData().map((dataset) => {
            dataset.secondary = true;
            return dataset;
          });
          builder.updateData(dataWithColors);
          const actualColor = builder.model.secondaryChart.color();
          actualColor(dataWithColors[0]).should.equal('blue');
        });
      });

      describe('for primary chart', () => {
        it('should use the color from the dataset if specified', () => {
          const dataWithColors = testData().map((dataset) => {
            dataset.secondary = false;
            dataset.color = 'red';
            return dataset;
          });
          builder.updateData(dataWithColors);
          const actualColor = builder.model.lines.color();
          actualColor(dataWithColors[0]).should.equal('red');
        });

        it('should use the color function for the whole chart', () => {
          builder.model.color(() => 'blue');
          const dataWithColors = testData().map((dataset) => {
            dataset.secondary = false;
            return dataset;
          });
          builder.updateData(dataWithColors);
          const actualColor = builder.model.lines.color();
          actualColor(dataWithColors[0]).should.equal('blue');
        });
      });

      describe('for viewfinder', () => {
        it('should use the color from the primary dataset if specified', () => {
          const dataWithColors = testData().map((dataset) => {
            dataset.secondary = false;
            dataset.color = 'red';
            return dataset;
          });
          builder.updateData(dataWithColors);
          const actualColor = builder.model.focus.color();
          actualColor(dataWithColors[0]).should.equal('red');
        });

        it('should use the color function for the whole chart', () => {
          builder.model.color(() => 'blue');
          const dataWithColors = testData().map((dataset) => {
            dataset.secondary = false;
            return dataset;
          });
          builder.updateData(dataWithColors);
          const actualColor = builder.model.focus.color();
          actualColor(dataWithColors[0]).should.equal('blue');
        });
      });
    });

    it('has correct structure', () => {
      let cssClasses = [
        '.nv-x.nv-axis',
        '.nv-legendWrap',
        '.nv-y.nv-axis',
        '.nv-secondary .nv-line',
        '.nv-primary',
        '.nv-context'
      ];
      cssClasses.forEach((cssClass) => {
        _should.exist(
          builder.$(`g.nvd3.nv-lineWithFocusPlusSecondary ${cssClass}`)[0]
        );
      });
    });

    describe('has a default update function even if no data supplied', () => {
      let testBuilder;

      beforeEach(() => {
        testBuilder = new ChartFactory(nv.models.lineWithFocusPlusSecondaryChart());
        testBuilder.build(options, null);
      });

      it('which should be defined', () => {
        (typeof testBuilder.model.update).should.equal('function');
      });

      it('which should call the chart if invoked', () => {
        testBuilder.$('.nv-noData')[0].remove();
        testBuilder.$('.nv-noData').length.should.equal(0);
        testBuilder.model.update();
        testBuilder.$('.nv-noData').length.should.equal(1);
      });
    });

    it('can override axis ticks', () => {
      builder.model.primaryXAxis.ticks(34);
      builder.model.y1Axis.ticks(56);
      builder.model.update();
      builder.model.primaryXAxis.ticks().should.equal(34);
      builder.model.y1Axis.ticks().should.equal(56);
    });

    it('can override tickFormat', () => {
      builder.model.primaryXAxis.tickFormat((d) => {
        return d.x * 5;
      });
      builder.model.update();
      builder.model.focus.xAxis
        .tickFormat()({
          x: 5
        })
        .should.equal(25);
    });

    it('can change secondary chart type', () => {
      d3.select(builder.svg).datum(testDataWithBar());
      builder.model.update();
      let cssClasses = ['.nv-secondary .nv-bars'];
      cssClasses.forEach((cssClass) => {
        _should.exist(
          builder.$(`g.nvd3.nv-lineWithFocusPlusSecondary ${cssClass}`)[0]
        );
      });
    });

    it('if secondary data chart type is not set, use line by default', () => {
      d3.select(builder.svg).datum(testDataWithBar());
      builder.model.update();
      const dataWithoutChartType = testDataWithBar().map((dataset) => {
        const updatedDataset = Object.assign({}, dataset);
        delete updatedDataset.chart_type;
        return updatedDataset;
      });
      d3.select(builder.svg).datum(dataWithoutChartType);
      builder.model.update();
      let cssClasses = ['.nv-secondary .nv-line'];
      cssClasses.forEach((cssClass) => {
        _should.exist(
          builder.$(`g.nvd3.nv-lineWithFocusPlusSecondary ${cssClass}`)[0]
        );
      });
    });

    it('returns x value from x accessor by default', () => {
      const fakeDatum = {
        blah: 123,
        foo: 1235,
        x: 'BINGBING!'
      };

      builder.model.x()(fakeDatum).should.equal(fakeDatum.x);
    });

    it('returns y value from y accessor by default', () => {
      const fakeDatum = {
        blah: 123,
        foo: 1235,
        y: 'BINGBING!'
      };

      builder.model.y()(fakeDatum).should.equal(fakeDatum.y);
    });

    describe('chart legend', () => {
      it('should disable the correct series', () => {
        builder.model.legend.dispatch.stateChange({
          disabled: [true]
        });

        const newData = d3.select(builder.svg).datum();
        newData[1].disabled.should.equal(true);
      });

      it('should do nothing if disabled is undefined in the event', () => {
        builder.model.legend.dispatch.stateChange({});

        const newData = d3.select(builder.svg).datum();
        Object.keys(newData[1]).indexOf('disabled').should.equal(-1);
      });

      it('legend should be 50% of available width', () => {
        const expectedWidth = nv.utils.availableWidth(
          null,
          d3.select(builder.model.container),
          builder.model.margin()
        );
        builder.model.legend.width().should.equal(expectedWidth / 2);
      });

      describe('Legend position', () => {
        it('given that legend.align() is true, primary legend should be on the far right', () => {
          const availableWidth = nv.utils.availableWidth(
            builder.model.width(),
            d3.select(builder.model.container),
            builder.model.margin()
          );
          const expectedX = availableWidth / 2;
          const expectedY = -1 * builder.model.margin().top +
            builder.model.secondaryHeight() +
            builder.model.marginSecondary().top +
            builder.model.marginSecondary().bottom;
          const actualTransform = builder
            .$('.nv-legendWrap.primary')[0]
            .getAttribute('transform');

          actualTransform.should.equal(`translate(${expectedX},${expectedY})`);
        });

        it('given that legend.align() is false, primary legend should be on the legend', () => {
          builder.model.legend.align(false);
          builder.model.update();
          const expectedX = 0;
          const expectedY = -1 *
            (builder.model.margin().top +
              builder.model.secondaryHeight() +
              builder.model.marginSecondary().top +
              builder.model.marginSecondary().bottom);
          const actualTransform = builder
            .$('.nv-legendWrap.secondary')[0]
            .getAttribute('transform');

          actualTransform.should.equal(`translate(${expectedX},${expectedY})`);
        });
      });

      it('should render if showLegend is true (default)', () => {
        builder.$('.nv-legendWrap').length.should.equal(2);
        builder.$('.nv-legendWrap')[0].childNodes.length.should.equal(1);
      });

      it('should not render if showLegend is false', () => {
        builder.model.showLegend(false);
        builder.model.update();
        builder.$('.nv-legendWrap')[0].childNodes.length.should.equal(0);
      });

      it('should render if showLegend is true', () => {
        builder.model.showLegend(true);
        builder.model.update();

        builder.$('.nv-legendWrap').length.should.equal(2);
        builder.$('.nv-legendWrap')[0].childNodes.length.should.equal(1);
      });
    });

    describe('chart secondary legend', () => {
      it('should disable the correct series', () => {
        builder.model.legendSecondary.dispatch.stateChange({
          disabled: [true]
        });

        const newData = d3.select(builder.svg).datum();
        newData[0].disabled.should.equal(true);
      });
    });

    describe('chart tooltip', () => {
      it('should hide when user mouses out of primary chart', () => {
        builder.model.tooltip.hidden(false);
        builder.model.lines.dispatch.elementMouseout();
        builder.model.tooltip.hidden().should.equal(true);
      });

      it('should hide when user mouses out of secondary chart', () => {
        builder.model.tooltip.hidden(false);
        builder.model.secondaryChart.dispatch.elementMouseout();
        builder.model.tooltip.hidden().should.equal(true);
      });

      describe('header formatter', () => {
        it('should use tick format from xAxis', () => {
          builder.model.primaryXAxis.tickFormat((d) => {
            return d.blah;
          });
          const actualValue = builder.model.tooltip.headerFormatter()({
            blah: '123'
          });
          actualValue.should.equal('123');
        });
      });

      describe('when brush extent is changed', () => {
        it('should update the xDomain of the secondary chart', () => {
          builder.model.focus.brushExtent([1,300]).update();
          builder.model.secondaryChart.xDomain().should.deep.equal([1,300]);
        });
      });

      describe('secondary chart value formatter', () => {
        it('should use the tickFormat of the secondary chart y axis', () => {
          const fakeFormatter = sandbox.stub().returns('BLAH!');
          builder.model.y1Axis.tickFormat(fakeFormatter);

          builder.model.secondaryChart.dispatch['elementMouseover']({
            data: 'blah',
            point: {
              x: 1
            }
          });
          fakeFormatter.callCount.should.equal(1);
        });
      });

      describe('primary chart value formatter', () => {
        it('should use the tickFormat of the primary chart y axis', () => {
          const fakeFormatter = sandbox.stub().returns('BLAH!');
          builder.model.y2Axis.tickFormat(fakeFormatter);

          builder.model.lines.dispatch['elementMouseover']({
            point: { x: 56, y: 0.18, series: 0, color: '#2ca02c' },
            series: {
              key: 'Stream2',
              values: [
                { x: 50, y: 0.15, series: 0 },
                { x: 51, y: 0.11, series: 0 },
                { x: 52, y: 0.18, series: 0 },
                { x: 53, y: 0.14, series: 0 },
                { x: 54, y: 0.15, series: 0 },
                { x: 55, y: 0.18, series: 0 },
                { x: 56, y: 0.18, series: 0, color: '#2ca02c' },
                { x: 57, y: 0.14, series: 0 },
                { x: 58, y: 0.11, series: 0 },
                { x: 59, y: 0.18, series: 0 },
                { x: 60, y: 0.13, series: 0 },
                { x: 61, y: 0.16, series: 0 },
                { x: 62, y: 0.18, series: 0 },
                { x: 63, y: 0.14, series: 0 },
                { x: 64, y: 0.18, series: 0 },
                { x: 65, y: 0.17, series: 0 },
                { x: 66, y: 0.14, series: 0 },
                { x: 67, y: 0.17, series: 0 },
                { x: 68, y: 0.14, series: 0 },
                { x: 69, y: 0.17, series: 0 },
                { x: 70, y: 0.17, series: 0 }
              ]
            },
            pos: { left: 446.09999999999997, top: 469 },
            relativePos: [386.09999999999997, 0],
            seriesIndex: 0,
            pointIndex: 6,
            event: { isTrusted: true },
            element: {
              __data__: {
                data: [
                  [353.92504407454084, -10.000000000116415],
                  [353.9251355335378, 105.39975591302046],
                  [371.7569854789534, 119.87247901320166],
                  [482.62502493867646, 86.12889152121224],
                  [482.6250428648132, -10]
                ],
                series: 0,
                point: 6
              }
            }
          });

          fakeFormatter.callCount.should.equal(1);
        });
      });
    });

    describe('accessors', () => {
      describe('showLegend', () => {
        it('by default, showLegend should be true', () => {
          builder.model.showLegend().should.equal(true);
          builder.$('.nv-legendWrap')[0].childNodes.length.should.equal(1);
        });

        it('should hide legend if showLegend called with false', () => {
          builder.model.showLegend(false);
          builder.model.update();

          builder.$('.nv-legendWrap')[0].childNodes.length.should.equal(0);
        });
      });

      describe('brushExtent', () => {
        it('default brushExtent should be null', () => {
          _should.not.exist(builder.model.brushExtent());
        });

        it('if set brush extent, secondary chart should only show that data', () => {
          builder.model.brushExtent([3, 4]);
          builder.model.update();
          builder.model.primaryXAxis.domain().should.deep.equal([3, 4]);
        });

        it('if set brush extent, accessor should return set brushExtent', () => {
          builder.model.brushExtent([3, 4]);
          builder.model.brushExtent().should.deep.equal([3, 4]);
        });

        describe('changes x axis domain', () => {
          it('if the brush is empty, x axis domain should be full extent of dataset', () => {
            const expectedDomain = d3.extent(
              d3.merge(currentData.map((dataset) => dataset.values.map((d) => d.x)))
            );
            builder.model.primaryXAxis
              .domain()
              .should.deep.equal(expectedDomain);
          });

          it('if focus is disabled, x axis domain should be full extent of dataset', () => {
            builder.model.focusEnable(false).update();
            const expectedDomain = d3.extent(
              d3.merge(currentData.map((dataset) => dataset.values.map((d) => d.x)))
            );
            builder.model.primaryXAxis
              .domain()
              .should.deep.equal(expectedDomain);
          });

          it('if the brush is not empty, x axis domain should be full extent of dataset', () => {
            builder.model.brushExtent([1.312, 3.065]).update();
            const expectedDomain = [2, 3];
            builder.model.primaryXAxis
              .domain()
              .should.deep.equal(expectedDomain);
          });

          it('if focus is disabled, x axis domain should be full extent of dataset', () => {
            const dataWithDecimalXValues = testData().map((dataset) => {
              dataset.values = dataset.values.map((datum) => {
                datum.x += 0.05;
                return datum;
              });
              return dataset;
            });
            builder.updateData(dataWithDecimalXValues);
            const expectedDomain = d3.extent(
              d3.merge(
                dataWithDecimalXValues.map((dataset) =>
                  dataset.values.map((d) => d.x))
              )
            );
            builder.model.primaryXAxis
              .domain()
              .should.deep.equal([
                Math.ceil(expectedDomain[0]),
                Math.floor(expectedDomain[1])
              ]);
          });
        });
      });

      describe('focusEnable', () => {
        it('default focusEnable should be true', () => {
          builder.model.focusEnable().should.equal(true);
        });

        it('if focusEnable is true, show the viewfinder', () => {
          builder.$('.nv-context')[0].childNodes.length.should.equal(1);
        });

        it('if focusEnable is false, don\'t render the viewfinder', () => {
          builder.$(
            '.component-wrapper'
          ).innerHTML += '<span class="nv-context"><div>BLAH</div></span>';
          builder.model.focusEnable(false);
          builder.model.update();
          builder.$('.nv-context').length.should.equal(0);
          builder.$('.nv-context *').length.should.equal(0);
        });

        it('if focusEnable is false and then changed back to true, render the viewfinder', () => {
          builder.model.focusEnable(false);
          builder.model.update();

          builder.model.focusEnable(true);
          builder.model.update();
          builder.$('.nv-context')[0].childNodes.length.should.equal(1);
        });

        it('focus chart should be positioned at the bottom of the chart', () => {
          builder.model
            .marginSecondary({
              top: 80,
              bottom: 30
            })
            .height(150)
            .secondaryHeight(200)
            .update();
          const actualTransform = builder
            .$('.nv-context')[0]
            .getAttribute('transform');
          const expectedResult = 'translate(0,80)';
          actualTransform.should.equal(expectedResult);
        });
      });

      describe('focusHeight', () => {
        it('by default, use 50px', () => {
          const focusHeight = builder.model.focusHeight();
          focusHeight.should.equal(50);
        });

        it('focusHeight should update height of focus viewfinder', () => {
          builder.model.focusHeight(250);
          builder.model.update();
          const actualTransform = builder
            .$('.nv-context .nv-x.nv-axis.nvd3-svg')[0]
            .getAttribute('transform');
          actualTransform.should.equal('translate(0,220)');
        });
      });

      describe('interpolateLine', () => {
        it('by default, should be linear', () => {
          const interpolateLine = builder.model.interpolateLine();
          interpolateLine.should.equal('linear');
        });

        it('if interpolateLine changed to step-before, ', () => {
          builder.model.interpolateLine('step-before');
          builder.model.lines.interpolate().should.equal('step-before');
        });
      });

      describe('x', () => {
        it('by default, should return x property', () => {
          builder.model.x()({ x: 'blah', y: 'foo' }).should.equal('blah');
        });

        it('when a new x accessor is set, it should be set on primary chart line, focus chart line and secondary chart', () => {
          builder.model.x((datum) => datum.whatever);
          builder.model.x()({ x: 'blah', whatever: 'foo' }).should.equal('foo');
          builder.model.lines
            .x()({ x: 'blah', whatever: 'foo' })
            .should.equal('foo');
          builder.model.secondaryChart
            .x()({ x: 'blah', whatever: 'foo' })
            .should.equal('foo');
        });

        it('should be used when setting x domain', () => {
          const dataWithDifferentXProperty = testData().map((dataset) => {
            dataset.values = dataset.values.map((datum) => {
              datum.xProp = datum.x;
              delete datum.x;
              return datum;
            });
            return dataset;
          });
          builder.model.x((d) => d.xProp);
          const expectedDomain = d3.extent(
            d3.merge(
              dataWithDifferentXProperty.map((dataset) =>
                dataset.values.map((d) => d.xProp))
            )
          );
          builder.updateData(dataWithDifferentXProperty);
          builder.model.primaryXAxis.domain().should.deep.equal(expectedDomain);
        });
      });

      describe('y', () => {
        it('by default, should return y property', () => {
          builder.model.y()({ x: 'blah', y: 'foo' }).should.equal('foo');
        });

        it('when a new y accessor is set, it should be set on primary chart line, focus chart line and secondary chart', () => {
          builder.model.y((datum) => datum.whatever);
          builder.model.y()({ x: 'blah', whatever: 'foo' }).should.equal('foo');
          builder.model.lines
            .y()({ x: 'blah', whatever: 'foo' })
            .should.equal('foo');
          builder.model.secondaryChart
            .y()({ x: 'blah', whatever: 'foo' })
            .should.equal('foo');
        });

        it('should be used when setting y domain', () => {
          const dataWithDifferentYProperty = testData().map((dataset) => {
            dataset.values = dataset.values.map((datum) => {
              datum.yProp = +datum.y;
              delete datum.y;
              return datum;
            });
            return dataset;
          });
          builder.model.y((d) => d.yProp);
          const expectedPrimaryYDomain = d3.extent(
            d3.merge(
              dataWithDifferentYProperty.filter((dataset) => !dataset.secondary).map((dataset) =>
                dataset.values.map((d) => d.yProp))
            )
          );
          const expectedSecondaryYDomain = d3.extent(
            d3.merge(
              dataWithDifferentYProperty.filter((dataset) => dataset.secondary).map((dataset) =>
                dataset.values.map((d) => d.yProp))
            )
          );
          builder.model.update();
          builder.updateData(dataWithDifferentYProperty);
          builder.model.y1Axis.domain().should.deep.equal(expectedSecondaryYDomain);
          builder.model.y2Axis.domain().should.deep.equal(expectedPrimaryYDomain);
        });
      });

      describe('margin', () => {
        it('by default, should be { top: 30, right: 20, bottom: 50, left: 75 }', () => {
          const defaultMargin = builder.model.margin();
          const expectedMargin = { top: 30, right: 20, bottom: 50, left: 75 };
          defaultMargin.should.deep.equal(expectedMargin);
        });

        describe('if not all margin components passed, should use previous config', () => {
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
            it(`updating margin with ${JSON.stringify(testCase.testData)} should result in margin of ${JSON.stringify(testCase.expectedMargin)}`, () => {
              builder.model.margin(testCase.testData);
              builder.model.margin().should.deep.equal(testCase.expectedMargin);
            });
          });
        });

        it('updating the margin should change the chart', () => {
          builder.model.margin({ top: 150 });
          builder.model.update();

          const yAxisTransform = builder
            .$('.nv-secondary .nv-axisMaxMin-y')[0]
            .getAttribute('transform');
          yAxisTransform.should.equal('translate(0,150)');
        });
      });

      describe('focusMargin', () => {
        it('by default, should be { left: 0, right: 0, top: 10, bottom: 20 }', () => {
          const defaultMargin = builder.model.focusMargin();
          const expectedMargin = {
            left: 0,
            right: 0,
            top: 10,
            bottom: 20
          };
          defaultMargin.should.deep.equal(expectedMargin);
        });

        describe('if not all margin components passed, should use previous config', () => {
          const testCases = [
            {
              testData: { top: 20 },
              expectedMargin: { top: 20, right: 0, bottom: 20, left: 0 }
            },
            {
              testData: {},
              expectedMargin: { top: 10, right: 0, bottom: 20, left: 0 }
            },
            {
              testData: { left: 10 },
              expectedMargin: { top: 10, right: 0, bottom: 20, left: 10 }
            },
            {
              testData: { right: 10 },
              expectedMargin: { top: 10, right: 10, bottom: 20, left: 0 }
            },
            {
              testData: { bottom: 10 },
              expectedMargin: { top: 10, right: 0, bottom: 10, left: 0 }
            },
            {
              testData: { left: 10 },
              expectedMargin: { top: 10, right: 0, bottom: 20, left: 10 }
            },
            {
              testData: { top: 10, left: 20 },
              expectedMargin: { top: 10, right: 0, bottom: 20, left: 20 }
            }
          ];

          testCases.forEach((testCase) => {
            it(`updating focus margin with ${JSON.stringify(testCase.testData)} should result in margin of ${JSON.stringify(testCase.expectedMargin)}`, () => {
              builder.model.focusMargin(testCase.testData);
              JSON.stringify(builder.model.focusMargin()).should.equal(
                JSON.stringify(testCase.expectedMargin)
              );
            });
          });
        });

        it('updating the focus margin should change the chart', () => {
          builder.model.focusMargin({ bottom: 0 });
          builder.model.update();

          const xAxisTransform = builder
            .$('.nv-context .nv-axis')[0]
            .getAttribute('transform');
          xAxisTransform.should.equal('translate(0,40)');
        });
      });

      describe('marginSecondary', () => {
        it('by default, should be { top: 40, right: 40, bottom: 40, left: 0 }', () => {
          const defaultMargin = builder.model.marginSecondary();
          const expectedMargin = { top: 40, right: 40, bottom: 40, left: 0 };
          defaultMargin.should.deep.equal(expectedMargin);
        });

        describe('if not all margin components passed, should use previous config', () => {
          const testCases = [
            {
              testData: { top: 10 },
              expectedMargin: { top: 10, right: 40, bottom: 40, left: 0 }
            },
            {
              testData: {},
              expectedMargin: { top: 40, right: 40, bottom: 40, left: 0 }
            },
            {
              testData: { left: 10 },
              expectedMargin: { top: 40, right: 40, bottom: 40, left: 10 }
            },
            {
              testData: { right: 10 },
              expectedMargin: { top: 40, right: 10, bottom: 40, left: 0 }
            },
            {
              testData: { bottom: 10 },
              expectedMargin: { top: 40, right: 40, bottom: 10, left: 0 }
            },
            {
              testData: { left: 10 },
              expectedMargin: { top: 40, right: 40, bottom: 40, left: 10 }
            },
            {
              testData: { top: 10, left: 20 },
              expectedMargin: { top: 10, right: 40, bottom: 40, left: 20 }
            }
          ];

          testCases.forEach((testCase) => {
            it(`updating secondary margin with ${JSON.stringify(testCase.testData)} should result in margin of ${JSON.stringify(testCase.expectedMargin)}`, () => {
              builder.model.marginSecondary(testCase.testData);
              builder.model
                .marginSecondary()
                .should.deep.equal(testCase.expectedMargin);
            });
          });
        });

        it('updating the secondary margin should change the chart', () => {
          builder.model.marginSecondary({ top: 150 });
          builder.model.update();

          const yAxisTransform = builder
            .$('.nv-secondary .nv-axisMaxMin-y')[0]
            .getAttribute('transform');
          yAxisTransform.should.equal('translate(0,150)');
        });
      });

      describe('width', () => {
        it('by default, use width of container minus margin', () => {
          const width = builder.model.width();
          _should.not.exist(width);

          const expectedWidth = nv.utils.availableWidth(
            null,
            d3.select(builder.model.container),
            builder.model.margin()
          );
          builder
            .$('.nv-axisMax-x')[0]
            .getAttribute('transform')
            .should.equal(`translate(${expectedWidth},0)`);
        });

        it('width should update width of chart', () => {
          builder.model.width(250);
          builder.model.update();

          const expectedWidth = nv.utils.availableWidth(
            250,
            d3.select(builder.model.container),
            builder.model.margin()
          );
          builder
            .$('.nv-axisMax-x')[0]
            .getAttribute('transform')
            .should.equal(`translate(${expectedWidth},0)`);
        });

        it('should return width if set', () => {
          builder.model.width(1230);
          builder.model.width().should.equal(1230);
        });
      });

      describe('height', () => {
        it('by default, use height of container minus margin', () => {
          const height = builder.model.height();
          _should.not.exist(height);

          const expectedHeight = nv.utils.availableHeight(
            null,
            d3.select(builder.model.container),
            builder.model.margin()
          ) + 10;
          builder
            .$('.nv-context')[0]
            .getAttribute('transform')
            .should.equal(`translate(0,${expectedHeight})`);
        });

        it('if focus disabled, height of line chart should be higher', () => {
          builder.model.focusEnable(false).update();

          const expectedHeight = nv.utils.availableHeight(
            builder.model.height(),
            d3.select(builder.model.container),
            builder.model.margin()
          ) -
            (builder.model.secondaryHeight() +
              builder.model.marginSecondary().top +
              builder.model.marginSecondary().bottom) +
            10;

          builder
            .$('.nv-primary .nv-x.nv-axis')[0]
            .getAttribute('transform')
            .should.equal(`translate(0,${expectedHeight})`);
        });

        it('height should update height of chart', () => {
          builder.model.height(550);
          builder.model.update();

          const expectedHeight = nv.utils.availableHeight(
            550,
            d3.select(builder.model.container),
            builder.model.margin()
          ) -
            builder.model.focusHeight() +
            (builder.model.margin().bottom + 10);
          builder
            .$('.nv-context')[0]
            .getAttribute('transform')
            .should.equal(`translate(0,${expectedHeight})`);
        });

        it('after height is set, height accessor should return the set height', () => {
          builder.model.height(350);
          builder.model.height().should.equal(350);
        });
      });

      describe('primaryChart', () => {
        it('should be below secondary chart', () => {
          const actualTransform = builder
            .$('.nv-primary')[0]
            .getAttribute('transform');
          const expectedResult = builder.model.secondaryHeight() +
            builder.model.margin().top +
            builder.model.margin().bottom;
          actualTransform.should.equal(`translate(0, ${expectedResult})`);
        });
      });

      describe('chart wrap', () => {
        it('should be positioned correctly', () => {
          const actualTransform = builder
            .$('.nv-wrap.nvd3.nv-lineWithFocusPlusSecondary')[0]
            .getAttribute('transform');
          const expectedTransform = `translate(${builder.model.margin().left},${builder.model.margin().top})`;
          actualTransform.should.equal(expectedTransform);
        });
      });

      describe('legend backgrounds', () => {
        describe('primary chart legend background', () => {
          it('should exist', () => {
            builder.$('.primary-legend-background').length.should.equal(1);
          });

          it('should be positioned correctly', () => {
            const actualTransform = builder
              .$('.primary-legend-background')[0]
              .getAttribute('transform');
            const expectedTransform = `translate(-${builder.model.margin().left}, ${-0.8 * builder.model.marginSecondary().bottom})`;
            actualTransform.should.equal(expectedTransform);
          });

          it('should have height equal to half of the secondary height', () => {
            const actualHeight = builder
              .$('.primary-legend-background')[0]
              .getAttribute('height');
            const expectedHeight = builder.model.marginSecondary().bottom * 0.5;
            actualHeight.should.equal(`${expectedHeight}`);
          });
        });

        describe('secondary chart legend background', () => {
          it('should exist', () => {
            builder.$('.secondary-legend-background').length.should.equal(1);
          });

          it('should be positioned correctly', () => {
            const actualTransform = builder
              .$('.secondary-legend-background')[0]
              .getAttribute('transform');
            const expectedTransformTop = -1.025 *
              (builder.model.margin().top +
                builder.model.secondaryHeight() +
                builder.model.marginSecondary().top +
                builder.model.marginSecondary().bottom);
            const expectedTransformLeft = builder.model.margin().left +
              builder.model.margin().right;
            const expectedTransform = `translate(${expectedTransformLeft}, ${expectedTransformTop})`;
            actualTransform.should.equal(expectedTransform);
          });

          it('should have height equal to the secondary height', () => {
            const actualHeight = builder
              .$('.secondary-legend-background')[0]
              .getAttribute('height');
            const expectedHeight = builder.model.marginSecondary().top;
            actualHeight.should.equal(`${expectedHeight}`);
          });
        });
      });

      describe('secondaryHeight', () => {
        it('by default, use 150', () => {
          builder.model.height(800).update();
          const height = builder.model.secondaryHeight();
          height.should.equal(150);
          builder
            .$('.nv-secondary .nv-axisMin-y')[0]
            .getAttribute('transform')
            .should.equal('translate(0,150)');
        });

        it('can override secondary chart height', () => {
          builder.model.secondaryHeight(340);
          builder.model.update();

          const primaryChart = builder.$('.primary.nv-legendWrap');
          primaryChart[0]
            .getAttribute('transform')
            .should.equal('translate(432.5,390)');
        });
      });
    });

    describe('Primary chart dataset', () => {
      it('Should be empty if all of the primary datasets are disabled', () => {
        const disabledData = testData().map((dataset) => {
          if (!dataset.secondary) {
            dataset.disabled = true;
          }
          return dataset;
        });

        builder.build(options, disabledData);
        builder.model.brushExtent([1,2]).update();
        d3
          .select(builder.$('.nv-primary .nv-linesWrap'))[0][0][0]
          .__data__.should.deep.equal([
            {
              values: []
            }
          ]);
      });

      it('If brush extent changes, only the primary datapoints within the brush extent should remain', () => {
        const newExtent = [1, 3];
        builder.model.brushExtent(newExtent).update();
        const currentData = d3.select(builder.svg).datum();
        const restrictedDatasets = currentData
          .filter((dataset) => !dataset.secondary)
          .map((dataset) => {
            const newDataset = Object.assign({}, dataset);
            newDataset.values = dataset.values.filter(
              (datapoint) =>
                datapoint.x >= newExtent[0] && datapoint.x <= newExtent[1]
            );
            return newDataset;
          });

        d3
          .select(builder.$('.nv-primary .nv-linesWrap'))[0][0][0]
          .__data__.should.deep.equal(restrictedDatasets);
      });
    });

    describe('Secondary chart dataset', () => {
      it('Should be empty if all of the secondary datasets are disabled', () => {
        const disabledData = testData().map((dataset) => {
          if (dataset.secondary) {
            dataset.disabled = true;
          }
          return dataset;
        });

        builder.updateData(disabledData);
        (typeof d3.selectAll(
          builder.$('.nv-secondary .nv-secondaryChartWrap *')
        )[0][0]).should.equal('undefined');
      });

      it('If brush extent changes, only the secondary datapoints within the brush extent should remain', () => {
        const newExtent = [1, 3];
        builder.model.brushExtent(newExtent).update();
        const currentData = d3.select(builder.svg).datum();
        const restrictedDatasets = currentData
          .filter((dataset) => dataset.secondary)
          .map((dataset) => {
            const newDataset = {
              key: dataset.key
            };
            newDataset.values = dataset.values.filter(
              (datapoint) =>
                datapoint.x >= newExtent[0] && datapoint.x <= newExtent[1]
            );
            return newDataset;
          });

        d3
          .select(builder.$('.nv-secondary .nv-secondaryChartWrap'))[0][0][0]
          .__data__.should.deep.equal(restrictedDatasets);
      });
    });

    describe('X axis', () => {
      it('should have the correct number of ticks given the test dataset', () => {
        builder.model.primaryXAxis._ticks().should.equal(4);
      });

      it('should have the correct tick height', () => {
        builder.model.height(467).update();
        builder.model.primaryXAxis.tickSize().should.equal(-467);
      });
    });

    describe('Y axis opacity', () => {
      it('Opacity of y-Axis of secondary chart should be 1 if there is data for the secondary chart', () => {
        const y1Opacity = d3
          .select(builder.svg)
          .select('.nv-secondary .nv-y1.nv-axis')
          .style('opacity');
        y1Opacity.should.equal('1');
      });

      it('Opacity of y-Axis of primary chart should be 1 if there is data for the secondary chart', () => {
        const y2Opacity = d3
          .select(builder.svg)
          .select('.nv-primary .nv-y2.nv-axis')
          .style('opacity');
        y2Opacity.should.equal('1');
      });

      it('Opacity of y-Axis of primary chart should be 0 if there is data for the primary chart', () => {
        const allPrimaryDataDisabled = testData().map((dataset) => {
          if (!dataset.secondary) {
            dataset.disabled = true;
          }
          return dataset;
        });
        d3.select(builder.svg).datum(allPrimaryDataDisabled);
        builder.model.update();
        const y2Opacity = d3
          .select(builder.svg)
          .select('.nv-primary .nv-y2.nv-axis')
          .style('opacity');
        y2Opacity.should.equal('0');
      });
    });

    if (typeof require !== 'undefined') {
      const pretty = (html) => {
        let result;
        clean(html, (out) => {
          result = out;
        });

        return result
          .replace(/nv-edge-clip-[\d]*/g, '')
          .replace(/nv-chart-[\d]*/g, '')
          .replace(/id="[^"]*"/g, '')
          .replace(/clip-path="[^"]*"/g, '')
          .replace(/d="[^"]*"/g, '')
          .replace(/class="[^"]*"/g, '')
          .replace(/transform="[^"]*"/g, '');
      };

      describe('Snapshot', () => {
        it('should match expected snapshot', () => {
          const stableData = [
            {
              key: 'Stream0',
              area: false,
              values: [
                { x: 0, y: '0.19' },
                { x: 1, y: '0.19' },
                { x: 2, y: '0.15' },
                { x: 3, y: '0.11' }
              ],
              secondary: true,
              chart_type: 'line'
            },
            {
              key: 'Stream1',
              area: true,
              values: [
                { x: 0, y: '0.16' },
                { x: 1, y: '0.19' },
                { x: 2, y: '0.18' },
                { x: 3, y: '0.13' }
              ],
              secondary: false,
              chart_type: 'line'
            },
            {
              key: 'Stream2',
              area: false,
              values: [
                { x: 0, y: '0.15' },
                { x: 1, y: '0.18' },
                { x: 2, y: '0.13' },
                { x: 3, y: '0.15' }
              ],
              secondary: false,
              chart_type: 'line'
            }
          ];
          builder.updateData(stableData);
          const svgData = pretty(builder.svg.innerHTML);
          snapshot(svgData, true);
        });
      });
    }
  }));

function testDataWithBar() {
  return testData().map((data, i) => {
    return Object.assign({}, data, {
      chart_type: i === 0 ? 'historicalBar' : ''
    });
  });
}

function testData() {
  return stream_layers(3, 5, 0.1).map((data, i) => {
    return {
      key: 'Stream' + i,
      area: i === 1,
      values: data.map((datum) => {
        return Object.assign({}, datum, { y: datum.y.toFixed(2) });
      }),
      secondary: i === 0 ? true : false,
      chart_type: 'line'
    };
  });
}

/* Inspired by Lee Byron's test data generator. */
function stream_layers(n, m, o) {
  if (arguments.length < 3) o = 0;
  function bump(a) {
    var x = 1 / (0.1 + Math.random()),
      y = 2 * Math.random() - 0.5,
      z = 10 / (0.1 + Math.random());
    for (var i = 0; i < m; i++) {
      var w = (i / m - y) * z;
      a[i] += x * Math.exp(-w * w);
    }
  }
  return d3.range(n).map(() => {
    var a = [], i;
    for (i = 0; i < m; i++)
      a[i] = o + o * Math.random();
    for (i = 0; i < 5; i++)
      bump(a);
    return a.map(stream_index);
  });
}

function stream_index(d, i) {
  return { x: i, y: Math.max(0, d) };
}
