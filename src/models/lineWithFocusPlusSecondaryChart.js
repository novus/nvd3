nv.models.lineWithFocusPlusSecondaryChart = function() {
  'use strict';
  /*
  * Public Variables with Default Settings
  */

  const lines = nv.models.line();
  const primaryXAxis = nv.models.axis();
  const y1Axis = nv.models.axis();
  const y2Axis = nv.models.axis();
  const legend = nv.models.legend();
  const legendSecondary = nv.models.legend();
  const viewFinder = nv.models.focus(nv.models.line());
  const tooltip = nv.models.tooltip();

  let secondaryChartType = 'line';
  let secondaryChart = nv.models[secondaryChartType]();
  let margin = {
    top: 30,
    right: 30,
    bottom: 20,
    left: 60
  };
  let focusMargin = {
    top: 10,
    right: 0,
    bottom: 20,
    left: 0
  };
  let marginSecondary = { top: 40, right: 40, bottom: 40, left: 0 };

  let width = null;
  let height = null;
  let secondaryChartHeight = 150;
  let getX = function(d) {
    return d.x;
  };
  let getY = function(d) {
    return d.y;
  };
  let color = nv.utils.defaultColor();
  let showLegend = true;
  let focusEnable = true;
  let focusHeight = 50;
  let brushExtent = null;
  let x, y1, y2, g;
  let noData = null;
  let dispatch = d3.dispatch('brush', 'stateChange', 'changeState');
  let transitionDuration = 0;
  let state = nv.utils.state();

  lines.clipEdge(true);
  primaryXAxis.orient('bottom').tickPadding(5);
  y1Axis.orient('left');
  y2Axis.orient('left');

  tooltip.headerEnabled(true).headerFormatter((d, i) => {
    return primaryXAxis.tickFormat()(d, i);
  });

  /*
   * Private Variables
   */

  function chart(selection) {
    selection.each(function(data) {
      const container = d3.select(this);
      nv.utils.initSVG(container);
      const availableWidth = nv.utils.availableWidth(width, container, margin);

      chart.container = this;

      // Display No Data message if there's nothing to show.
      if (handleNoData(data, container)) {
        return chart;
      }

      const {
        seriesPrimary,
        seriesSecondary,
        dataPrimary,
        dataSecondary
      } = processData(container.datum());

      let availableHeight1 = nv.utils.availableHeight(
        height,
        container,
        margin
      ) -
        (focusEnable ? focusHeight : 0) -
        (seriesSecondary.length
          ? secondaryChartHeight + marginSecondary.top + marginSecondary.bottom
          : 0);

      setupScales(seriesPrimary, seriesSecondary);
      setupContainers(container, container.datum(), seriesSecondary);
      renderCharts(dataPrimary, dataSecondary);
      setupAxes(seriesPrimary, seriesSecondary, dataPrimary, dataSecondary);
      setUpBrush(dataPrimary, seriesSecondary);
      addEventListeners();

      /*
       * Event Handling/Dispatching (in chart's scope)
       *------------------------------------------------------------
       */
      function addEventListeners() {
        legend.dispatch.on('stateChange', (newState) => {
          const dataPrimary = data.filter((dataset) => !dataset.secondary);

          for (let key in newState) {
            // remap state using series key instead of series index because
            // the series index is just for the primary data but full dataset
            // includes secondary data
            const remappedState = newState[key].reduce(
              (result, value, seriesIndex) => {
                const newKey = dataPrimary[seriesIndex].key;
                result[newKey] = value;
                return result;
              },
              {}
            );
            state[key] = remappedState;
          }

          dispatch.stateChange(state);
          chart.update();
        });

        legendSecondary.dispatch.on('stateChange', (newState) => {
          const dataSecondary = data.filter((dataset) => dataset.secondary);

          for (let key in newState) {
            // remap state using series key instead of series index because
            // the series index is just for the secondary data but full dataset
            // includes primary data
            const remappedState = newState[key].reduce(
              (result, value, seriesIndex) => {
                const newKey = dataSecondary[seriesIndex].key;
                result[newKey] = value;
                return result;
              },
              {}
            );
            state[key] = remappedState;
          }
          dispatch.stateChange(state);
          chart.update();
        });

        // Update chart from a state object passed to event handler
        dispatch.on('stateChange', (e) => {
          if (typeof e.disabled !== 'undefined') {
            data.forEach((series) => {
              series.disabled = e.disabled[series.key];
            });
            state.disabled = e.disabled;
          }

          chart.update();
        });
      }

      function handleNoData(data, container) {
        if (
          !data ||
          !data.length ||
          !data.filter((d) => {
            return d.values.length;
          }).length
        ) {
          nv.utils.noData(chart, container);
          return true;
        } else {
          container.selectAll('.nv-noData').remove();
        }
      }

      function processData(data) {
        const dataSecondaryWithDisabled = data
          .filter((d) => d.secondary)
          .map((dataset, i) => {
            dataset.color = dataset.color || color(dataset, i);
            return dataset;
          });
        const dataSecondary = dataSecondaryWithDisabled.filter(
          (d) => !d.disabled
        );
        const dataPrimaryWithDisabled = data
          .filter((d) => !d.secondary)
          .map((dataset, i) => {
            dataset.color = dataset.color || color(dataset, i);
            return dataset;
          });
        const dataPrimary = dataPrimaryWithDisabled.filter((d) => !d.disabled);

        const seriesPrimary = dataPrimary.map((d) => {
          return d.values.map((d, i) => {
            return {
              x: getX(d, i),
              y: getY(d, i)
            };
          });
        });

        const seriesSecondary = dataSecondary.map((d) => {
          return d.values.map((d, i) => {
            return {
              x: getX(d, i),
              y: getY(d, i)
            };
          });
        });

        return {
          seriesPrimary,
          seriesSecondary,
          dataPrimary,
          dataSecondary
        };
      }

      function renderCharts(dataPrimary, dataSecondary) {
        if (seriesSecondary.length) {
          secondaryChart
            .width(availableWidth)
            .height(secondaryChartHeight)
            .color(
              dataSecondary.map((d) => {
                return d.color;
              })
            );

          g
            .select('.nv-secondary .nv-secondaryChartWrap')
            .datum(dataSecondary)
            .transition(0)
            .duration(transitionDuration)
            .call(secondaryChart);
        } else {
          g.selectAll('.nv-secondary *').remove();
        }

        lines.width(availableWidth).height(availableHeight1);

        viewFinder.height(focusHeight).width(availableWidth);

        // Update Main (Focus) Bars and Lines
        g
          .select('.nv-primary .nv-linesWrap')
          .datum(dataPrimary)
          .transition(0)
          .duration(transitionDuration)
          .call(lines);
      }

      function setupContainers(container, data, seriesSecondary) {
        const wrap = container.selectAll('g').data([data]);

        wrap.exit().remove();

        let gEnter = wrap
          .enter()
          .append('g')
          .attr('class', 'nvd3 nv-wrap nv-lineWithFocusPlusSecondary')
          .append('g');

        if (!gEnter[0][0]) {
          // update
          gEnter = wrap
            .append('g')
            .attr('class', 'nvd3 nv-wrap nv-lineWithFocusPlusSecondary')
            .append('g');
        }

        g = wrap.select('g').attr('class', 'component-wrapper');

        // this is the secondary chart
        const secondaryChartWrapper = gEnter
          .append('g')
          .attr('class', 'nv-secondary')
          .attr(
            'transform',
            `translate(${marginSecondary.left}, ${marginSecondary.top})`
          );
        secondaryChartWrapper.append('g').attr('class', 'nv-y1 nv-y nv-axis');
        secondaryChartWrapper
          .append('g')
          .attr('class', 'nv-secondaryChartWrap');

        // this is the main chart
        const primaryChartY = seriesSecondary.length
          ? secondaryChartHeight + marginSecondary.top + marginSecondary.bottom
          : 0;
        const primaryChart = gEnter.append('g').attr('class', 'nv-primary');
        primaryChart.append('g').attr('class', 'nv-y2 nv-y nv-axis');
        primaryChart.append('g').attr('class', 'nv-x nv-axis');
        primaryChart.append('g').attr('class', 'nv-linesWrap');
        primaryChart.attr('transform', 'translate(0, ' + primaryChartY + ')');

        primaryChart.append('g').attr('class', 'nv-interactive');
        // This adds a nice semi-transparent layer between main and secondary chart
        primaryChart
          .append('rect')
          .attr('class', 'primary-legend-background')
          .attr('fill', 'rgba(255,255,255,0.9)')
          .attr(
            'transform',
            'translate(' +
              -1 * margin.left +
              ', ' +
              -0.8 * marginSecondary.bottom +
              ')'
          )
          .attr('width', '100%')
          .attr('height', 0.5 * marginSecondary.bottom);

        // This adds a nice semi-transparent layer between top and secondary chart
        primaryChart
          .append('rect')
          .attr('class', 'secondary-legend-background')
          .attr('fill', 'rgba(255,255,255,0.9)')
          .attr(
            'transform',
            'translate(' +
              (margin.left + margin.right) +
              ', ' +
              -1.025 *
                (margin.top +
                  secondaryChartHeight +
                  marginSecondary.top +
                  marginSecondary.bottom) +
              ')'
          )
          .attr('width', '100%')
          .attr('height', 1 * marginSecondary.top);

        primaryChart.append('g').attr('class', 'nv-legendWrap secondary');

        // Add the legend after the semi-transparent layer
        gEnter.append('g').attr('class', 'nv-legendWrap primary');

        if (focusEnable) {
          gEnter.append('g').attr('class', 'nv-context');
        }

        wrap.attr(
          'transform',
          'translate(' + margin.left + ',' + margin.top + ')'
        );

        /*
         * Legend
         */
        if (!showLegend) {
          g.select('.nv-legendWrap').selectAll('*').remove();
        } else {
          renderLegend(data, seriesSecondary);
        }
      }

      function setUpBrush(dataPrimary, seriesSecondary) {
        if (!focusEnable) {
          g.selectAll('.nv-context *').remove();
          return;
        }

        viewFinder.width(availableWidth);
        viewFinder.margin(focusMargin);
        viewFinder.xAxis.tickFormat(primaryXAxis.tickFormat());
        viewFinder.xAxis.rotateLabels(0);
        viewFinder.brushExtent(brushExtent);

        const viewFinderY = availableHeight1 +
          margin.bottom +
          focusMargin.top +
          (seriesSecondary.length
            ? secondaryChartHeight +
                marginSecondary.top +
                marginSecondary.bottom
            : 0);
        container
          .select('.nv-context')
          .style('display', 'initial')
          .attr('transform', 'translate(0,' + viewFinderY + ')')
          .datum(dataPrimary)
          .call(viewFinder);

        viewFinder.dispatch.on('onBrush', onBrush);
      }

      function setupAxes(
        seriesPrimary,
        seriesSecondary,
        dataPrimary,
        dataSecondary
      ) {
        primaryXAxis
          .scale(x)
          ._ticks(nv.utils.calcTicksX(availableWidth / 100, data))
          .tickSize(-height, 0)
          .showMaxMin(false);

        g
          .select('.nv-primary .nv-x.nv-axis')
          .attr(
            'transform',
            'translate(0,' + (y2.range()[0] + focusMargin.top) + ')'
          );

        // Calculate opacity of the axis
        const secondaryChartOpacity = dataSecondary.length ? 1 : 0;
        const linesOpacity = dataPrimary.length ? 1 : 0;

        const y1Opacity = secondaryChartOpacity;
        const y2Opacity = linesOpacity;

        const fullExtent = d3.extent(
          d3.merge(
            container.datum().map((dataset) => dataset.values.map((d) => getX(d)))
          )
        );
        const currentExtent = viewFinder.brush.empty() || !focusEnable
          ? fullExtent
          : viewFinder.brush.extent() || brushExtent;

        if (currentExtent) {
          primaryXAxis.domain([
            Math.ceil(currentExtent[0]),
            Math.floor(currentExtent[1])
          ]);
        }

        g
          .select('.nv-primary .nv-x.nv-axis')
          .transition()
          .duration(transitionDuration)
          .call(primaryXAxis);

        y1
          .domain(d3.extent(d3.merge(seriesSecondary), (d) => d.y))
          .range([secondaryChartHeight, 0]);
        y2
          .domain(d3.extent(d3.merge(seriesPrimary), (d) => d.y))
          .range([availableHeight1, 0]);

        // Setup and Update Main (Focus) Y Axes
        y1Axis
          .scale(y1)
          ._ticks(nv.utils.calcTicksY(availableHeight1 / 100, data))
          .tickSize(-availableWidth, 0)
          .rotateLabels(45);

        y2Axis
          .scale(y2)
          ._ticks(nv.utils.calcTicksY(availableHeight1 / 100, data))
          .tickSize(-availableWidth, 0);

        g
          .select('.nv-secondary .nv-y1.nv-axis')
          .style('opacity', y1Opacity)
          .transition()
          .duration(transitionDuration)
          .call(y1Axis);

        g
          .select('.nv-primary .nv-y2.nv-axis')
          .style('opacity', y2Opacity)
          .transition()
          .duration(transitionDuration)
          .call(y2Axis);
      }

      function setupScales(seriesPrimary, seriesSecondary) {
        x = secondaryChart.xScale();

        // select the scales and series based on the position of the yAxis
        y1 = secondaryChart.yScale();
        y2 = lines.yScale();

        const currentExtent = d3.extent(
          d3.merge(seriesPrimary.concat(seriesSecondary)),
          getX
        );
        x
          .domain([Math.ceil(currentExtent[0]), Math.floor(currentExtent[1])])
          .range([0, availableWidth]);
      }

      function renderLegend(data, seriesSecondary) {
        const legendWidth = availableWidth / 2;
        const legendXPosition = legend.align() ? legendWidth : 0;

        legend.width(legendWidth);
        legendSecondary.width(legendWidth);

        legendSecondary.color(secondaryChart.color());

        g
          .select('.nv-legendWrap.primary')
          .datum(data.filter((series) => !series.secondary))
          .call(legend);

        if (seriesSecondary.length) {
          g
            .select('.nv-legendWrap.secondary')
            .datum(dataSecondary)
            .call(legendSecondary);

          g
            .select('.nv-legendWrap.secondary')
            .attr(
              'transform',
              'translate(' +
                legendXPosition +
                ',' +
                -1 *
                  (margin.top +
                    marginSecondary.bottom +
                    marginSecondary.top +
                    secondaryChartHeight) +
                ')'
            );
        }

        const primaryLegendY = seriesSecondary.length
          ? secondaryChartHeight +
              marginSecondary.top +
              marginSecondary.bottom -
              margin.top
          : -margin.top;

        g
          .select('.nv-legendWrap.primary')
          .attr(
            'transform',
            'translate(' + legendXPosition + ',' + primaryLegendY + ')'
          );
      }

      /**
       * Host page will call this function when they've modified the properties
       * of the chart or changed the data. If the chart type of the secondary
       * dataset changes (e.g. from line to bar), we remove the old secondary
       * chart and replace it with a new chart.
       */
      chart.update = function() {
        const {
          dataSecondary,
          dataPrimary,
          seriesPrimary,
          seriesSecondary
        } = processData(container.datum());

        g.selectAll('.nv-primary .nv-linesWrap *').remove();
        g.selectAll('.nv-secondary .nv-secondaryChartWrap *').remove();
        g.select('.nv-secondaryChartWrap').datum(dataSecondary);
        g.select('.nv-linesWrap').datum(dataPrimary);

        // change chart type if required
        if (
          dataSecondary.length &&
          dataSecondary[0].chart_type !== secondaryChartType
        ) {
          secondaryChartType = dataSecondary[0].chart_type || 'line';
          secondaryChart = nv.models[secondaryChartType]();
          secondaryChart.x(getX);
          secondaryChart.y(getY);

          addSecondaryChartEventListeners(dataSecondary);
        }
        if (brushExtent) {
          updateChartData(
            brushExtent,
            dataPrimary,
            dataSecondary,
            seriesPrimary,
            seriesSecondary
          );
        }
        container.call(chart);
        onBrush();
      };

      /**
       * Triggered when the user brushes the context chart
       * See https://github.com/d3/d3-brush for details on brushing
       */
      function onBrush() {
        const {
          seriesPrimary,
          seriesSecondary,
          dataPrimary,
          dataSecondary
        } = processData(container.datum());
        brushExtent = viewFinder.brush.empty()
          ? null
          : viewFinder.brushExtent();
        const extent = viewFinder.brush.empty() || !focusEnable
          ? primaryXAxis.domain()
          : viewFinder.brush.extent();
        dispatch.brush({
          extent: extent
        });

        setupAxes(seriesPrimary, seriesSecondary, dataPrimary, dataSecondary);
        updateChartData(
          extent,
          dataPrimary,
          dataSecondary,
          seriesPrimary,
          seriesSecondary
        );
      }

      function updateChartData(currentExtent, dataPrimary, dataSecondary) {
        const secondaryDataWithinBrushExtent = dataSecondary.map((d) => {
          return {
            key: d.key,
            values: d.values.filter((d, i) => {
              return secondaryChart.x()(d, i) >= currentExtent[0] &&
                secondaryChart.x()(d, i) <= currentExtent[1];
            })
          };
        });
        const focusSecondaryChartWrap = g
          .select('.nv-secondary .nv-secondaryChartWrap')
          .datum(secondaryDataWithinBrushExtent);

        const primaryDataWithinBrushExtent = !dataPrimary.length
          ? [
            {
              values: []
            }
          ]
          : dataPrimary.map((d) => {
            const restrictedDataset = Object.assign({}, d);
            restrictedDataset.values = d.values.filter((d, i) => {
              return lines.x()(d, i) >= new Date(currentExtent[0]) &&
                  lines.x()(d, i) <= new Date(currentExtent[1]);
            });
            return restrictedDataset;
          });
        const focusLinesWrap = g
          .select('.nv-primary .nv-linesWrap')
          .datum(primaryDataWithinBrushExtent);

        // Update Main (Focus) Bars and Lines
        focusSecondaryChartWrap
          .transition()
          .duration(transitionDuration)
          .call(secondaryChart);

        focusLinesWrap.transition().duration(transitionDuration).call(lines);
        primaryXAxis.domain([
          Math.ceil(currentExtent[0]),
          Math.floor(currentExtent[1])
        ]);
      }

      setupAxes(seriesPrimary, seriesSecondary, dataPrimary, dataSecondary);
    });

    return chart;
  }

  /*
   * Event Handling/Dispatching (out of chart's scope)
   */
  lines.dispatch.on('elementMouseover.tooltip', (evt) => {
    tooltip
      .duration(0)
      .valueFormatter((d, i) => {
        return y2Axis.tickFormat()(d, i);
      })
      .data(evt)
      .hidden(false);
  });

  lines.dispatch.on('elementMouseout.tooltip', () => {
    tooltip.hidden(true);
  });

  function addSecondaryChartEventListeners() {
    secondaryChart.dispatch.on('elementMouseover.tooltip', (evt) => {
      const secondaryDataSet = d3
        .select(chart.container)
        .data()[0]
        .filter((dataset) => dataset.secondary)[0];

      const tooltipEvent = Object.assign({}, evt);
      tooltipEvent.value = chart.x()(tooltipEvent.data || tooltipEvent.point);
      tooltipEvent['series'] = {
        value: chart.y()(tooltipEvent.data || tooltipEvent.point),
        color: tooltipEvent.color,
        key: secondaryDataSet.key
      };

      tooltip
        .duration(0)
        .valueFormatter((d, i) => {
          return y1Axis.tickFormat()(d, i);
        })
        .data(tooltipEvent)
        .hidden(false);
    });

    secondaryChart.dispatch.on('elementMouseout.tooltip', () => {
      tooltip.hidden(true);
    });
  }

  addSecondaryChartEventListeners();

  /*
  * Expose Public Variables
  */

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.legendSecondary = legendSecondary;
  chart.lines = lines;
  chart.secondaryChart = secondaryChart;
  chart.primaryXAxis = primaryXAxis;
  chart.y1Axis = y1Axis;
  chart.y2Axis = y2Axis;
  chart.tooltip = tooltip;
  chart.state = state;
  chart.focus = viewFinder;
  chart.update = () => {
    d3.select(chart.container).call(chart);
  };

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart._options = Object.create(
    {},
    {
      // simple options, just get/set the necessary values
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

      secondaryHeight: {
        get: function() {
          return secondaryChartHeight;
        },
        set: function(_) {
          secondaryChartHeight = _;
        }
      },

      showLegend: {
        get: function() {
          return showLegend;
        },
        set: function(_) {
          showLegend = _;
        }
      },

      brushExtent: {
        get: function() {
          return brushExtent;
        },
        set: function(_) {
          brushExtent = _;
        }
      },

      noData: {
        get: function() {
          return noData;
        },
        set: function(_) {
          noData = _;
        }
      },

      focusEnable: {
        get: function() {
          return focusEnable;
        },
        set: function(_) {
          focusEnable = _;
        }
      },

      focusHeight: {
        get: function() {
          return focusHeight;
        },
        set: function(_) {
          focusHeight = _;
        }
      },

      // options that require extra logic in the setter
      interpolateLine: {
        get: function() {
          return lines.interpolate();
        },
        set: function(_) {
          lines.interpolate(_);
          viewFinder.interpolate(_);
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
      },

      focusMargin: {
        get: function() {
          return focusMargin;
        },
        set: function(_) {
          focusMargin.top = _.top !== undefined ? _.top : focusMargin.top;
          focusMargin.right = _.right !== undefined
            ? _.right
            : focusMargin.right;
          focusMargin.bottom = _.bottom !== undefined
            ? _.bottom
            : focusMargin.bottom;
          focusMargin.left = _.left !== undefined ? _.left : focusMargin.left;
        }
      },

      marginSecondary: {
        get: function() {
          return marginSecondary;
        },
        set: function(_) {
          marginSecondary.top = _.top !== undefined
            ? _.top
            : marginSecondary.top;
          marginSecondary.right = _.right !== undefined
            ? _.right
            : marginSecondary.right;
          marginSecondary.bottom = _.bottom !== undefined
            ? _.bottom
            : marginSecondary.bottom;
          marginSecondary.left = _.left !== undefined
            ? _.left
            : marginSecondary.left;
        }
      },

      duration: {
        get: function() {
          return transitionDuration;
        },
        set: function(_) {
          transitionDuration = _;
        }
      },

      color: {
        get: function() {
          return color;
        },
        set: function(_) {
          color = nv.utils.getColor(_);
          legend.color(color);
        }
      },

      x: {
        get: function() {
          return getX;
        },
        set: function(_) {
          getX = _;
          lines.x(_);
          viewFinder.x(_);
          secondaryChart.x(_);
        }
      },

      y: {
        get: function() {
          return getY;
        },
        set: function(_) {
          getY = _;
          lines.y(_);
          viewFinder.y(_);
          secondaryChart.y(_);
        }
      }
    }
  );

  nv.utils.inheritOptions(chart, lines);
  nv.utils.initOptions(chart);

  return chart;
};
