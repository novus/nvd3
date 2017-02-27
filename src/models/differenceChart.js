nv.models.differenceChart = function() {
  'use strict';

  let container;
  const multiChart = nv.models.multiChart();
  const focus = nv.models.focus(nv.models.line());
  const dispatch = d3.dispatch();
  // yAccessor for multi chart
  // Not modifiable by end user. They can
  // overload yAccessor which is used during the processData step
  const yForMultiChart = d => {
    // check if the data is for an area chart
    // which has y0 and y1 values
    if (isDefined(d.y0)) {
      return d.y0;
    }
    // otherwise assume it's for a line chart
    return d.y;
  };
  let xAccessor = d => d.x;
  let yAccessor = d => d.y;
  let duration = 300;
  let keyForActualLessThanPredicted = null;
  let keyForActualGreaterThanPredicted = null;
  let height = 700;
  let width = 900;

  function chart(selection) {
    selection.each(function(data) {
      const processedData = processData(data);

      container = d3.select(this);
      container
        .attr('class', 'nv-differenceChart');

      nv.utils.initSVG(container);

      if (!processedData.length) {
        nv.utils.noData(chart, container);
        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }

      chart.update = function() {
        if (duration === 0) {
          container.call(chart);
        } else {
          container.transition().duration(duration).call(chart);
        }
      };
      chart.container = this;

      multiChart
        .margin({ top: 30, right: 60, bottom: 50, left: 70 })
        .color(d3.scale.category10().range())
        .y(yForMultiChart)
        .width(width)
        .height(height)
        .interpolate('step-before')
        .useInteractiveGuideline(true);

      multiChart.interactiveLayer.tooltip.valueFormatter((value, i, datum) => {
        if (isNaN(value)) {
          return '-';
        }

        if (
          datum.key === 'Excess Usage (kWh)' ||
            datum.key === 'Energy Savings (kWh)'
        ) {
          return Math.abs(datum.data.y0 - datum.data.y1);
        }
        return value;
      });

      multiChart.stack1.areaY1(function(d) {
        return multiChart.stack1.scatter.yScale()(d.display.y);
      });

      multiChart.stack1.transformData(function(d) {
        d.display = { y: d.y1, y0: d.y0 };
      });

      multiChart.xAxis.tickFormat(function(d) {
        return d3.time.format('%Y-%m-%dT%H:%M:%S')(new Date(d));
      });
      multiChart.yAxis1.tickFormat(d3.format(',.1f'));
      multiChart.yAxis2.tickFormat(d3.format(',.1f'));

      focus.width(width);
      focus.xScale(d3.time.scale());
      focus.xAxis.tickFormat(function(d) {
        return d3.time.format('%Y-%m-%dT%H:%M:%S')(new Date(d));
      });

      focus.xAxis.rotateLabels(45);

      container
        .append('g')
        .style('display', 'initial')
        .attr('transform', 'translate(50, 750)')
        .datum(processedData.filter(dataset => dataset.type === 'line'))
        .call(focus);

      container
        .datum(processedData)
        .call(multiChart);

      focus.dispatch.on('onBrush', extent => {
        const filteredData = processedData.map(datum => {
          return Object.assign({}, datum, {
            values: datum.values.filter(val => {
              return val.x > extent[0] && val.x < extent[1];
            })
          });
        });

        container.datum(filteredData);

        multiChart.update();
      });

      return chart;
    });
  }

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart._options = Object.create({}, {
    width: {
      get: function() {
        return width;
      },
      set: function(_) {
        width = _;
      }
    },
    height: {
      get: function() {
        return height;
      },
      set: function(_) {
        height = _;
      }
    },
    x: {
      get: function() {
        return xAccessor;
      },
      set: function(_) {
        xAccessor = _;
      }
    },
    y: {
      get: function() {
        return yAccessor;
      },
      set: function(_) {
        yAccessor = _;
      }
    },
    keyForActualLessThanPredicted: {
      get: function() {
        return keyForActualLessThanPredicted;
      },
      set: function(_) {
        keyForActualLessThanPredicted = _;
      }
    },
    keyForActualGreaterThanPredicted: {
      get: function() {
        return keyForActualGreaterThanPredicted;
      },
      set: function(_) {
        keyForActualGreaterThanPredicted = _;
      }
    }
  });

  function processData(data) {
    const clonedData = data.slice(0);
    const allProcessed = clonedData.every(dataset => dataset.processed);
    const actualData = clonedData.filter(
      dataSet => dataSet.type === 'actual'
    );
    const predictedData = clonedData.filter(
      dataSet => dataSet.type === 'expected'
    );

    if (allProcessed) {
      return clonedData;
    } else if (!actualData.length || !predictedData.length) {
      return [];
    }

    const defaultKeyForActualLessThanPredicted = `${predictedData[0].key} minus ${actualData[0].key} (Predicted > Actual)`;
    const defaultKeyForActualGreaterThanPredicted = `${predictedData[0].key} minus ${actualData[0].key} (Predicted < Actual)`;
    // processedData is mapped as follows:
    //  [0] => Savings (actual under predicted) area
    //  [1] => "Loss" (actual over predicted) area
    //  [2] => Actual profile
    //  [3] => Predicted profile
    const processedData = [
      {
        key: keyForActualLessThanPredicted ||
          defaultKeyForActualLessThanPredicted,
        type: 'area',
        values: [],
        yAxis: 1,
        color: 'rgba(44,160,44,.9)',
        processed: true
      },
      {
        key: keyForActualGreaterThanPredicted ||
          defaultKeyForActualGreaterThanPredicted,
        type: 'area',
        values: [],
        yAxis: 1,
        color: 'rgba(214,39,40,.9)',
        processed: true
      },
      {
        key: actualData[0].key,
        type: 'line',
        values: [],
        yAxis: 1,
        color: '#666666',
        processed: true,
        strokeWidth: 0.5
      },
      {
        key: predictedData[0].key,
        type: 'line',
        values: [],
        yAxis: 1,
        color: '#aec7e8',
        processed: true,
        strokeWidth: 0.0001
      }
    ];

    actualData[0].values.forEach(function(d, i) {
      if (!predictedData[0].values[i]) {
        return;
      }

      const actualUsage = yAccessor(actualData[0].values[i]);
      const expectedUsage = yAccessor(predictedData[0].values[i]);
      const netSavings = expectedUsage - actualUsage;

      // actual over predicted
      if (netSavings < 0) {
        processedData[1].values[i] = {
          x: xAccessor(d),
          y0: actualUsage,
          y1: expectedUsage
        };
        processedData[0].values[i] = {
          x: xAccessor(d),
          y0: actualUsage,
          y1: actualUsage
        };
        // predicted over actual
      } else if (netSavings >= 0) {
        processedData[0].values[i] = {
          x: xAccessor(d),
          y0: actualUsage,
          y1: expectedUsage
        };
        processedData[1].values[i] = {
          x: xAccessor(d),
          y0: actualUsage,
          y1: actualUsage
        };
      }
      // Set actual
      processedData[2].values[i] = { x: xAccessor(d), y: actualUsage };
      // Set predicted
      processedData[3].values[i] = { x: xAccessor(d), y: expectedUsage };
    });

    return processedData;
  }

  function isDefined(thingToCheck) {
    // NB: void 0 === undefined
    return thingToCheck !== void 0;
  }

  chart.xAxis = multiChart.xAxis;
  chart.yAxis = multiChart.yAxis1;
  chart.multiChart = multiChart;
  chart.focus = focus;
  chart.processData = processData;
  nv.utils.inheritOptions(chart, multiChart);
  nv.utils.initOptions(chart);

  return chart;
};
