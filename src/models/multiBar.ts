(<any>nv.models).multiBar = function () {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = { top: 0, right: 0, bottom: 0, left: 0 }
        , width = 960
        , height = 500
        , x = d3.scale.ordinal()
        , y = d3.scale.linear()
        , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
        , getX = function (d, _i) { return d.x }
        , getY = function (d, _i) { return d.y }
        , forceY = [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
        , clipEdge = true
        , stacked = false
        , showValues = false
        , valueFormat = d3.format(',.1f')
        , valueStyle = (_d, _i) => 'fill: #333; stroke: rgba(0,0,0,0)'
        , stackOffset = 'zero' // options include 'silhouette', 'wiggle', 'expand', 'zero', or a custom function
        , color = nv.utils.defaultColor()
        , hideable: any = false
        , barColor = null // adding the ability to set the color for each rather than the whole group
        , disabled // used in conjunction with barColor to communicate from multiBarHorizontalChart what series are disabled
        , duration = 500
        , xDomain
        , yDomain
        , xRange
        , yRange
        , groupSpacing = 0.1
        , fillOpacity = 0.75
        , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove', 'renderEnd')
        ;

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var x0, y0 //used to store previous scales
        , renderWatch: any = nv.utils.renderWatch(dispatch, duration);

    var last_datalength = 0;

    function prepareData(data: any[]): number {
        var nonStackableCount = 0;

        if (hideable && data.length) {
            hideable = [{
                values: data[0].values.map(function (d) {
                    return {
                        x: d.x,
                        y: 0,
                        series: d.series,
                        size: 0.01
                    };
                }
                )
            }];
        }

        if (stacked) {
            var parsed: any = d3.layout.stack()
                .offset(stackOffset)
                .values(function (d: any) { return d.values })
                .y(getY)
                (!data.length && hideable ? hideable : data);

            parsed.forEach(function (series, i) {
                // if series is non-stackable, use un-parsed data
                if (series.nonStackable) {
                    data[i].nonStackableSeries = nonStackableCount++;
                    parsed[i] = data[i];
                } else {
                    // don't stack this seires on top of the nonStackable seriees
                    if (i > 0 && parsed[i - 1].nonStackable) {
                        parsed[i].values.map(function (d, j) {
                            d.y0 -= parsed[i - 1].values[j].y;
                            d.y1 = d.y0 + d.y;
                        });
                    }
                }
            });
            data = parsed;
        }
        //add series index and key to each data point for reference
        data.forEach(function (series, i) {
            series.values.forEach(function (point) {
                point.series = i;
                point.key = series.key;
            });
        });

        // HACK for negative value stacking
        if (stacked && data.length > 0) {
            data[0].values.map(function (_d, i) {
                var posBase = 0, negBase = 0;
                data.map(function (d, idx) {
                    if (!data[idx].nonStackable) {
                        var f = d.values[i]
                        f.size = Math.abs(f.y);
                        if (f.y < 0) {
                            f.y1 = negBase;
                            negBase = negBase - f.size;
                        } else {
                            f.y1 = f.size + posBase;
                            posBase = posBase + f.size;
                        }
                    }

                });
            });
        }
        return nonStackableCount;
    }

    /**
     * Remap and flatten the data for use in calculating the scales' domains
     */
    function scaleData(data: any[], availableWidth: number, availableHeight: number) {
        var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
            data.map(function (d, idx) {
                return d.values.map(function (d, i) {
                    return { x: getX(d, i), y: getY(d, i), y0: d.y0, y1: d.y1, idx: idx }
                })
            });

        x.domain(xDomain || d3.merge(seriesData).map(function (d: any) { return d.x }))
            .rangeBands(xRange || [0, availableWidth], groupSpacing);

        y.domain(yDomain || d3.extent(d3.merge(seriesData).map(function (d: any) {
            var domain = d.y;
            // increase the domain range if this series is stackable
            if (stacked && !data[d.idx].nonStackable) {
                if (d.y > 0) {
                    domain = d.y1
                } else {
                    domain = d.y1 + d.y
                }
            }
            return domain;
        }).concat(forceY)))
            .range(yRange || [availableHeight, 0]);

        // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
        const xd1 = +x.domain()[0];
        const xd2 = +x.domain()[1];
        if (xd1 === xd2)
            xd1 ?
                x.domain(<any>[xd1 - xd1 * 0.01, xd2 + xd2 * 0.01])
                : x.domain(<any>[-1, 1]);

        if (y.domain()[0] === y.domain()[1])
            y.domain()[0] ?
                y.domain([y.domain()[0] + y.domain()[0] * 0.01, y.domain()[1] - y.domain()[1] * 0.01])
                : y.domain([-1, 1]);
    }

    function createContainer(data: any[], selection, availableWidth: number, availableHeight: number): d3.selection.Update<any> {
        const container = d3.select(selection);
        nv.utils.initSVG(container);
        var wrap = container.selectAll('g.nv-wrap.nv-multibar').data([data]);
        var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-multibar');
        var gEnter = wrapEnter.append('g');
        var g = wrap.select('g');

        gEnter.append('g').attr('class', 'nv-groups');
        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        wrap.select('#nv-edge-clip-' + id + ' rect')
            .attr('width', availableWidth)
            .attr('height', availableHeight);

        g.attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');
        return wrap;
    }

    function createGroups(data: any[], wrap: d3.selection.Update<any>): d3.selection.Update<any> {
        var groups = wrap.select('.nv-groups').selectAll('.nv-group')
            .data((d) => { return d }, (_d, i) => { return <any>i });

        groups.enter().append('g')
            .style('stroke-opacity', 1e-6)
            .style('fill-opacity', 1e-6);

        var exitTransition = renderWatch
            .transition(groups.exit().selectAll('g.nv-bar'), 'multibarExit', Math.min(100, duration))
            .attr('y', function (d, _i, _j) {
                var yVal = y0(0) || 0;
                if (stacked) {
                    if (data[d.series] && !data[d.series].nonStackable) {
                        yVal = y0(d.y0);
                    }
                }
                return yVal;
            })
            .attr('height', 0)
            .remove();
        if (exitTransition.delay)
            exitTransition.delay(function (_d, i) {
                var delay = i * (duration / (last_datalength + 1)) - i;
                return delay;
            });
        groups
            .attr('class', function (_d, i) { return 'nv-group nv-series-' + i })
            .classed('hover', function (d: any) { return d.hover })
            .style('fill', function (d, i) { return color(d, i) })
            .style('stroke', function (d, i) { return color(d, i) });
        groups
            .style('stroke-opacity', 1)
            .style('fill-opacity', fillOpacity);

        return groups;
    }

    function createBars(data: any[], groups: d3.selection.Update<any>): d3.selection.Update<any> {
        var bars: d3.selection.Update<any> = null;
        var barsEnter: d3.Selection<any> = null;
        bars = groups.selectAll('g.nv-bar')
            .data(function (d) { return (hideable && !data.length) ? hideable.values : d.values });
        bars.exit().remove();

        barsEnter = bars.enter().append('g')
            .attr('class', function (d, i) { return getY(d, i) < 0 ? 'nv-bar negative' : 'nv-bar positive' })
            .attr('transform', function (d, i) { return 'translate(' + x(getX(d, i)) + ',0)'; })

        barsEnter.append('rect')
            .attr('class', function (d, i) { return getY(d, i) < 0 ? 'nv-bar negative' : 'nv-bar positive' })
            .attr('width', function (_d, _i, j) { return x.rangeBand() / (stacked && !data[j].nonStackable ? 1 : data.length) })
            .attr('height', 0)

        barsEnter.append('text');

        bars
            .style('fill', function (d, i, j) { return color(d, j, i); })
            .style('stroke', function (d, i, j) { return color(d, j, i); });

        if (barColor) {
            if (!disabled) {
                disabled = data.map(function () { return true });
            }
            bars
                .style('fill', function (d, i, j) { return d3.rgb(barColor(d, i)).darker(disabled.map(function (_, i) { return i }).filter(function (_, i) { return !disabled[i] })[j]).toString(); })
                .style('stroke', function (d, i, j) { return d3.rgb(barColor(d, i)).darker(disabled.map(function (_, i) { return i }).filter(function (_, i) { return !disabled[i] })[j]).toString(); });
        }
        return bars;
    }

    function registerBarsEvents(data: any[], bars: d3.selection.Update<any>) {
        bars
            .on('mouseover', function (d, i, j) {
                d3.select(this).classed('hover', true);
                dispatch.elementMouseover({
                    data: d,
                    index: i,
                    series: data[j],
                    color: d3.select(this).style("fill")
                });
            })
            .on('mouseout', function (d, i, j) {
                d3.select(this).classed('hover', false);
                dispatch.elementMouseout({
                    data: d,
                    index: i,
                    series: data[j],
                    color: d3.select(this).style("fill")
                });
            })
            .on('mousemove', function (d, i, j) {
                dispatch.elementMousemove({
                    data: d,
                    index: i,
                    series: data[j],
                    color: d3.select(this).style("fill")
                });
            })
            .on('click', function (d, i, j) {
                var element = this;
                dispatch.elementClick({
                    data: d,
                    index: i,
                    series: data[j],
                    color: d3.select(this).style("fill"),
                    event: d3.event,
                    element: element
                });
                (<any>d3.event).stopPropagation();
            })
            .on('dblclick', function (d, i, j) {
                dispatch.elementDblClick({
                    data: d,
                    index: i,
                    series: data[j],
                    color: d3.select(this).style("fill")
                });
                (<any>d3.event).stopPropagation();
            });
    }

    function getStackedChartFns(data: any[], nonStackableCount: number) {
        return {
            xFn: function (d, _i, j) {
                var width = 0;
                if (data[j].nonStackable) {
                    width = d.series * x.rangeBand() / data.length;
                    if (data.length !== nonStackableCount) {
                        width = data[j].nonStackableSeries * x.rangeBand() / (nonStackableCount * 2);
                    }
                }
                return width;
            },
            yFn: function (d, i, j) {
                var yVal = 0;
                // if stackable, stack it on top of the previous series
                if (!data[j].nonStackable) {
                    yVal = y(d.y1);
                } else {
                    if (getY(d, i) < 0) {
                        yVal = y(0);
                    } else {
                        if (y(0) - y(getY(d, i)) < -1) {
                            yVal = y(0) - 1;
                        } else {
                            yVal = y(getY(d, i)) || 0;
                        }
                    }
                }
                return yVal;
            },

            widthFn: function (_d, _i, j) {
                if (!data[j].nonStackable) {
                    return x.rangeBand();
                } else {
                    // if all series are nonStacable, take the full width
                    var width = (x.rangeBand() / nonStackableCount);
                    // otherwise, nonStackable graph will be only taking the half-width
                    // of the x rangeBand
                    if (data.length !== nonStackableCount) {
                        width = x.rangeBand() / (nonStackableCount * 2);
                    }
                    return width;
                }
            },

            heightFn: function (d, i, j) {
                if (!data[j].nonStackable) {
                    return Math.max(Math.abs(y(d.y + d.y0) - y(d.y0)), 0);
                } else {
                    return Math.max(Math.abs(y(getY(d, i)) - y(0)), 0) || 0;
                }
            }
        }
    }

    function getGroupedChartFns(data: any[]) {
        return {
            xFn: function (d, _i) {
                return d.series * x.rangeBand() / data.length;
            },
            yFn: function (d, i) {
                return getY(d, i) < 0 ?
                    y(0) :
                    y(0) - y(getY(d, i)) < 1 ?
                        y(0) - 1 :
                        y(getY(d, i)) || 0;
            },
            widthFn: (_d, _i, _j) => x.rangeBand() / data.length,
            heightFn: function (d, i) {
                return Math.max(Math.abs(y(getY(d, i)) - y(0)), 1) || 0;
            }
        }
    }

    function chart(selection) {
        renderWatch.reset();
        selection.each(function (data) {
            const availableWidth = width - margin.left - margin.right;
            const availableHeight = height - margin.top - margin.bottom;

            const nonStackableCount = prepareData(data);
            scaleData(data, availableWidth, availableHeight);

            x0 = x0 || x;
            y0 = y0 || y;

            const container = createContainer(data, this, availableWidth, availableHeight);
            const groups = createGroups(data, container);
            const bars = createBars(data, groups);
            registerBarsEvents(data, bars);

            var barSelection: d3.selection.Update<any> =
                (<any>bars).watchTransition(renderWatch, 'multibar', Math.min(250, duration))
                    .delay(function (_, i) {
                        return i * duration / data[0].values.length;
                    });

            let xFn: (d, i, j) => number = null;
            let yFn: (d, i, j) => number = null;
            let widthFn: (d, i, j) => number = null;
            let heightFn: (d, i, j) => number = null;
            if (stacked) {
                ({ xFn, yFn, widthFn, heightFn } = getStackedChartFns(data, nonStackableCount));
            } else {
                ({ xFn, yFn, widthFn, heightFn } = getGroupedChartFns(data));
            }

            barSelection
                    .select('rect')
                    .attr('x', xFn)
                    .attr('y', yFn)
                    .attr('width', widthFn)
                    .attr('height', heightFn);

            bars.attr('transform', function (d, i) { return 'translate(' + x(getX(d, i)) + ',0)'; });

            if (showValues) {
                bars.select('text')
                    .attr('text-anchor', 'middle')
                    .attr('y', (d, i, j) => {
                        return stacked ? yFn(d, i, j) + heightFn(d, i, j) / 2 : yFn(d, i, j);
                    })
                    .attr('dy', () => {
                        return stacked ? 4 : -5
                    })
                    .attr('style', (d, i) => valueStyle(d, i))
                    .text((d, i, _j) => {
                        return valueFormat(getY(d, i));
                    });

                bars.watchTransition(renderWatch, 'multibar')
                    .select('text')
                    .attr('x', (d, i, j) => xFn(d, i, j) + widthFn(d, i, j) / 2);
            } else {
                bars.selectAll('text').text('');
            }

            //store old scales for use in transitions on update
            x0 = x.copy();
            y0 = y.copy();

            // keep track of the last data value length for transition calculations
            if (data[0] && data[0].values) {
                last_datalength = data[0].values.length;
            }

        });

        renderWatch.renderEnd('multibar immediate');

        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    (<any>chart).dispatch = dispatch;

    (<any>chart).options = nv.utils.optionsFunc.bind(chart);

    (<any>chart)._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width: { get: function () { return width; }, set: function (_) { width = _; } },
        height: { get: function () { return height; }, set: function (_) { height = _; } },
        x: { get: function () { return getX; }, set: function (_) { getX = _; } },
        y: { get: function () { return getY; }, set: function (_) { getY = _; } },
        xScale: { get: function () { return x; }, set: function (_) { x = _; } },
        yScale: { get: function () { return y; }, set: function (_) { y = _; } },
        xDomain: { get: function () { return xDomain; }, set: function (_) { xDomain = _; } },
        yDomain: { get: function () { return yDomain; }, set: function (_) { yDomain = _; } },
        xRange: { get: function () { return xRange; }, set: function (_) { xRange = _; } },
        yRange: { get: function () { return yRange; }, set: function (_) { yRange = _; } },
        forceY: { get: function () { return forceY; }, set: function (_) { forceY = _; } },
        stacked: { get: function () { return stacked; }, set: function (_) { stacked = _; } },
        showValues: { get: function () { return showValues; }, set: function (_) { showValues = _; } },
        valueFormat:    {get: function(){return valueFormat;}, set: function(_){valueFormat=_;}},
        valueStyle:    {get: function(){return valueStyle;}, set: function(_){valueStyle=_;}},
        stackOffset: { get: function () { return stackOffset; }, set: function (_) { stackOffset = _; } },
        clipEdge: { get: function () { return clipEdge; }, set: function (_) { clipEdge = _; } },
        disabled: { get: function () { return disabled; }, set: function (_) { disabled = _; } },
        id: { get: function () { return id; }, set: function (_) { id = _; } },
        hideable: { get: function () { return hideable; }, set: function (_) { hideable = _; } },
        groupSpacing: { get: function () { return groupSpacing; }, set: function (_) { groupSpacing = _; } },
        fillOpacity: { get: function () { return fillOpacity; }, set: function (_) { fillOpacity = _; } },

        // options that require extra logic in the setter
        margin: {
            get: function () { return margin; }, set: function (_) {
                margin.top = _.top !== undefined ? _.top : margin.top;
                margin.right = _.right !== undefined ? _.right : margin.right;
                margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
                margin.left = _.left !== undefined ? _.left : margin.left;
            }
        },
        duration: {
            get: function () { return duration; }, set: function (_) {
                duration = _;
                renderWatch.reset(duration);
            }
        },
        color: {
            get: function () { return color; }, set: function (_) {
                color = nv.utils.getColor(_);
            }
        },
        barColor: {
            get: function () { return barColor; }, set: function (_) {
                barColor = _ ? nv.utils.getColor(_) : null;
            }
        }
    });

    nv.utils.initOptions(chart);

    return chart;
};
