nv.models.differenceChart = function() {
  'use strict';
  let container;
  const multiChart = nv.models.multiChart();
  const focus = nv.models.focus(nv.models.line());
  const dispatch = d3.dispatch();
  // yAccessor for multi chart
  // Not modifiable by end user. They can
  // overload yAccessor which is used during the processData step
  const yForMultiChart = (d) => {
    // check if the data is for an area chart
    // which has y0 and y1 values
    if (isDefined(d.y0)) {
      return d.y0;
    }
    // otherwise assume it's for a line chart
    return d.y;
  };
  const xForMultiChart = (d) => d.x;
  let xAccessor = (d) => d.x;
  let yAccessor = (d) => d.y;
  let duration = 300;
  let keyForActualLessThanPredicted = null;
  let keyForActualGreaterThanPredicted = null;
  let height = null;
  let width = null;
  let margin = { top: 30, right: 10, bottom: 20, left: 70 };
  let focusMargin = { top: 0, right: 60, bottom: 0, left: 20 };
  let showPredictedLine = true;
  let interpolate = 'linear';
  let strokeWidth = 1;

  function chart(selection) {
    selection.each(function(data) {
      container = d3.select(this);
      if (!data) {
        nv.utils.noData(chart, container);
        return chart;
      }
      const processedData = processData(data);
      container.attr('class', 'nv-differenceChart');

      nv.utils.initSVG(container);

      chart.container = this;

      multiChart
        .margin(margin)
        .color(d3.scale.category10().range())
        .y(yForMultiChart)
        .width(width)
        .height(height)
        .interpolate(interpolate)
        .useInteractiveGuideline(true);

      multiChart.interactiveLayer.tooltip.valueFormatter((value, i, datum) => {
        if (
          datum.key === keyForActualGreaterThanPredicted ||
          datum.key === keyForActualLessThanPredicted
        ) {
          const diff = Math.abs(datum.data.y0 - datum.data.y1);
          if (diff === 0) {
            return '-';
          }
          return diff;
        }
        return value;
      });

      multiChart.stack1.areaY1((d) => {
        // if ('callCount' in multiChart.stack1.scatter.yScale)
        return multiChart.stack1.scatter.yScale()(d.display.y);
      });

      multiChart.stack1.transformData((d) => {
        d.display = { y: d.y1, y0: d.y0 };
      });
      const timeFormatter = d3.time.format.multi([
        [
          '%I:%M',
          function(d) {
            return d.getMinutes();
          }
        ],
        [
          '%I %p',
          function(d) {
            return d.getHours();
          }
        ],
        [
          '%a %d',
          function(d) {
            return d.getDay() && d.getDate() != 1;
          }
        ],
        [
          '%b %d',
          function(d) {
            return d.getDate() != 1;
          }
        ],
        [
          '%B',
          function(d) {
            return d.getMonth();
          }
        ],
        [
          '%Y',
          function() {
            return true;
          }
        ]
      ]);
      multiChart.xAxis.scale(d3.time.scale());
      multiChart.xAxis.tickFormat(timeFormatter);
      const allValues = processedData
        .filter((dataset) => !dataset.filtered)
        .map((dataset) => dataset.values);
      const dateExtent = d3.extent(d3.merge(allValues), (d) => {
        return xForMultiChart(d);
      });
      multiChart.xAxis
        .domain(dateExtent)
        .range([0, width - margin.left - margin.right]);

      const yExtent = d3.extent(d3.merge(allValues), (d) => yForMultiChart(d));
      multiChart.yDomain1(yExtent);
      multiChart.yAxis1.tickFormat(d3.format(',.1f'));
      multiChart.yAxis2.tickFormat(d3.format(',.1f'));

      focus.width(width);
      focus.margin(focusMargin);
      focus.xScale(d3.time.scale());
      focus.xAxis.tickFormat(timeFormatter);

      focus.xAxis.rotateLabels(0);

      container
        .append('g')
        .attr('class', 'nv-focusWrap')
        .style('display', 'initial')
        .attr('transform', 'translate(50, 750)')
        .datum(processedData.filter((dataset) => dataset.type === 'line'))
        .call(focus);

      container.datum(processedData).call(multiChart);

      focus.dispatch.on('onBrush', (extent) => {

        const filteredData = processedData.map((datum) => {
          return Object.assign({}, datum, {
            values: datum.values.filter((val) => {

              return val.x >= extent[0] && val.x <= extent[1];
            })
          });
        });

        container.datum(filteredData);

        multiChart.xAxis.domain(extent);

        multiChart.update();
      });

      chart.update = function() {
        container.selectAll('*').remove();
        //   container.select('.multiChart g').remove();
        //   g.select('.nv-secondaryChartWrap').datum(dataSecondary);
        //  g.select('.nv-linesWrap').datum(dataLines);
        // multiChart.update();
        if (duration === 0) {
          container.call(chart);
        } else {
          container.transition().duration(duration).call(chart);
        }
      };

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
    strokeWidth: {
      get: function() {
        return strokeWidth;
      },
      set: function(_) {
        strokeWidth = _;
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
    },
    showPredictedLine: {
      get: function() {
        return showPredictedLine;
      },
      set: function(_) {
        showPredictedLine = _;
      }
    },
    interpolate: {
      get: function() {
        return interpolate;
      },
      set: function(_) {
        interpolate = _;
      }
    },
    focusMargin: {
      get: function() {
        return focusMargin;
      },
      set: function(_) {
        focusMargin.top = _.top !== undefined ? _.top : focusMargin.top;
        focusMargin.right = _.right !== undefined ? _.right : focusMargin.right;
        focusMargin.bottom = _.bottom !== undefined
          ? _.bottom
          : focusMargin.bottom;
        focusMargin.left = _.left !== undefined ? _.left : focusMargin.left;
      }
    },
    margin: {
      get: function() {
        return margin;
      },
      set: function(_) {
        margin.top = _.top !== undefined ? _.top : margin.top;
        margin.right = _.right !== undefined ? _.right : margin.right;
        margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
        margin.left = _.left !== undefined ? _.left : margin.left;
      }
    }
  });

  function processData(data) {
    const clonedData = data.slice(0);
    const allProcessed = clonedData.every((dataset) => dataset.processed);
    const actualData = clonedData.filter((dataSet) => dataSet.type === 'actual');
    const predictedData = clonedData.filter(
      (dataSet) => dataSet.type === 'expected'
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
    //  [1] => 'Loss' (actual over predicted) area
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
        strokeWidth: strokeWidth
      }
    ];

    if (showPredictedLine) {
      processedData[3] = {
        key: predictedData[0].key,
        type: 'line',
        values: [],
        yAxis: 1,
        color: '#aec7e8',
        processed: true,
        strokeWidth: strokeWidth
      };
    }

    actualData[0].values.forEach((d, i) => {
      if (!predictedData[0].values[i]) {
        return;
      }

      const actualUsage = yAccessor(actualData[0].values[i]);
      const predictedUsage = yAccessor(predictedData[0].values[i]);
      const predictedActualDelta = predictedUsage - actualUsage;
      // The below code generates data for the difference chart.
      // We have four series: two for the area (processedData[0] and processedData[1]) charts
      // and two for the line charts ([2] and [3]). The way we achieve difference chart
      // is that for each datapoint, we calculate whether it represents a 'savings'
      // (actual less than predicted) or a 'loss' (actual greater than predicted).
      // The two areas are different colours (e.g. out of the box, a loss is red and a
      // saving is green).
      // If it's a loss, then we add an area datapoint in the loss dataset ranging from actual to predicted
      // (the area represents the magnitude of the loss).
      // At the same time, for the savings dataset, we make the datapoint equivalent to actual usage so that
      // a dot renders rather than a proper area. This basically makes the savings area invisible
      // when there is a loss.
      //
      // The opposite occurs when predicted is greater than savings (a saving).
      if (predictedActualDelta < 0) {
        // actual greater than predicted - this is a loss
        // add area for loss between actualUsage (y0) and predictedUsage(y1)
        processedData[1].values[i] = {
          x: xAccessor(d),
          y0: actualUsage,
          y1: predictedUsage
        };
        // for the saving data series, render a dot (y0 and y1) at actualUsage - need
        // this rather than NaN because otherwise if the next datapoint is a saving,
        // D3 won't be able to link the two areas together
        processedData[0].values[i] = {
          x: xAccessor(d),
          y0: actualUsage,
          y1: actualUsage
        };
      } else {
        processedData[0].values[i] = {
          x: xAccessor(d),
          y0: actualUsage,
          y1: predictedUsage
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
      if (showPredictedLine) {
        processedData[3].values[i] = { x: xAccessor(d), y: predictedUsage };
      }
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
