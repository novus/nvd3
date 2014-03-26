var MultiBarPrivates = {
    x0 : 0 //used to store previous scales
    , y0 : 0 //used to store previous scales
    , renderWatch : nv.utils.renderWatch(this.dispatch, this.duration_)
};

/**
 * A MultiBar
 */
function MultiBar(options){
    options = nv.utils.extend({}, options, MultiBarPrivates, {
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        width: 500,
        height: 500,
        chartClass: 'multibar'
    });

    this.getX = function(d) { return d.x };
    this.getY = function(d) { return d.y };
    this.forceY = [0]; // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
    this.clipEdge = true;
    this.stacked = false;
    this.stackOffset = 'zero'; // options include 'silhouette', 'wiggle', 'expand', 'zero', or a custom function
    this.hideable = false;
    this.barColor = null; // adding the ability to set the color for each rather than the whole group
    this.disabled; // used in conjunction with barColor to communicate from multiBarHorizontalChart what series are disabled
    this.duration_ = 1000;
    this.xDomain;
    this.yDomain;
    this.xRange;
    this.yRange;
    this.groupSpacing = 0.1;

    var dispatchArray = [ 'chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'renderEnd' ];
    Chart.call(this, options, dispatchArray);
}

nv.utils.create(MultiBar, Layer, MultiBarPrivates);

MultiBar.prototype.wrap_ = function(data){

    this.renderWatch.reset();

    Layer.setRoot(this);

    var availableWidth = Layer.available.width,
        availableHeight = Layer.available.height;

    // This function defines the requirements for render complete
    var endFn = function(d, i) {
        return d.series === data.length - 1 && i === data[0].values.length - 1;
    };

    if(this.hideable && data.length)
        this.hideable = [{
            values: data[0].values.map(function(d) {
                    return {
                        x: d.x,
                        y: 0,
                        series: d.series,
                        size: 0.01
                    };}
            )}];

    if (this.stacked)
        data = d3.layout.stack()
            .offset(this.stackOffset)
            .values(function(d){ return d.values })
            .y(this.getY)
            (!data.length && this.hideable ? this.hideable : data);

    //add series index to each data point for reference
    data.forEach(function(series, i) {
        series.values.forEach(function(point) {
            point.series = i;
        });
    });

    //------------------------------------------------------------
    // HACK for negative value stacking
    if (this.stacked)
        data[0].values.map(function(d,i) {
            var posBase = 0, negBase = 0;
            data.map(function(d) {
                var f = d.values[i];
                f.size = Math.abs(f.y);
                if ( f.y < 0 )  {
                    f.y1 = negBase;
                    negBase = negBase - f.size;
                } else {
                    f.y1 = f.size + posBase;
                    posBase = posBase + f.size;
                }
            });
        });

    //------------------------------------------------------------
    // Setup Scales

    // remap and flatten the data for use in calculating the scales' domains
    var seriesData = (this.xDomain && this.yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
        data.map(function(d) {
            return d.values.map(function(d,i) {
                return { x: this.getX(d,i), y: this.getY(d,i), y0: d.y0, y1: d.y1 }
            }.bind(this))
        }.bind(this));

    this.x.domain(this.xDomain || d3.merge(seriesData).map(function(d) { return d.x }))
        .rangeBands(this.xRange || [0, availableWidth], this.groupSpacing);

    //y.domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y + (stacked ? d.y1 : 0) }).concat(forceY)))
    this.y.domain(
            this.yDomain || d3.extent(d3.merge(seriesData)
                .map(function(d) { return this.stacked ? (d.y > 0 ? d.y1 : d.y1 + d.y ) : d.y}.bind(this))
                .concat(this.forceY)))
        .range(this.yRange || [availableHeight, 0]);

    // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
    if (this.x.domain()[0] === this.x.domain()[1])
        this.x.domain()[0] ?
            this.x.domain([this.x.domain()[0] - this.x.domain()[0] * 0.01, this.x.domain()[1] + this.x.domain()[1] * 0.01])
            : this.x.domain([-1,1]);

    if (this.y.domain()[0] === this.y.domain()[1])
        this.y.domain()[0] ?
            this.y.domain([this.y.domain()[0] + this.y.domain()[0] * 0.01, this.y.domain()[1] - this.y.domain()[1] * 0.01])
            : this.y.domain([-1,1]);

    this.x0 = this.x0 || this.x;
    this.y0 = this.y0 || this.y;

    //------------------------------------------------------------

    //------------------------------------------------------------
    // Setup containers and skeleton of chart

    Layer.wrapChart(data);
    Layer.gEnter.append('g').attr('class', 'nv-groups');

    //------------------------------------------------------------

    Layer.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + this.id)
        .append('rect');
    Layer.wrap.select('#nv-edge-clip-' + this.id + ' rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

    Layer.g.attr('clip-path', this.clipEdge ? 'url(#nv-edge-clip-' + this.id + ')' : '');

    var groups = Layer.wrap.select('.nv-groups').selectAll('.nv-group')
        .data(function(d) { return d }, function(d,i) { return i });
    groups.enter().append('g')
        .style('stroke-opacity', 1e-6)
        .style('fill-opacity', 1e-6);

    var exitTransition = renderWatch
        .transition(groups.exit().selectAll('rect.nv-bar'), 'multibarExit', Math.min(250, this.duration_))
        .attr('y', function(d) { return this.stacked ? this.y0(d.y0) : this.y0(0)}.bind(this))
        .attr('height', 0)
        .remove();
    if (exitTransition.delay)
        exitTransition.delay(function(d,i) {
            return i * this.duration_ / data[0].values.length;
        }.bind(this));

    groups
        .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
        .classed('hover', function(d) { return d.hover })
        .style('fill', function(d,i){ return color(d, i) })
        .style('stroke', function(d,i){ return color(d, i) });
    groups
        .style('stroke-opacity', 1)
        .style('fill-opacity', 0.75);

    var bars = groups.selectAll('rect.nv-bar')
        .data(function(d) { return (this.hideable && !data.length) ? this.hideable.values : d.values}.bind(this));

    bars.exit().remove();

    var barsEnter = bars.enter().append('rect')
        .attr('class', function(d,i) { return this.getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive'}.bind(this))
        .attr('x', function(d,i,j) { return this.stacked ? 0 : (j * x.rangeBand() / data.length )}.bind(this))
        .attr('y', function(d) { return this.y0(this.stacked ? d.y0 : 0)}.bind(this))
        .attr('height', 0)
        .attr('width', this.x.rangeBand() / (this.stacked ? 1 : data.length) )
        .attr('transform', function(d,i) { return 'translate(' + this.x(this.getX(d,i)) + ',0)';}.bind(this));

    function _onMouseEventObject(d,i){
        return {
            value     : this.getY(d,i),
            point     : d,
            series    : data[d.series],
            pos       : [this.x(this.getX(d,i)) + (this.x.rangeBand() * (this.stacked ? data.length / 2 : d.series + .5) / data.length), this.y(this.getY(d,i) + (this.stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
            pointIndex: i,
            seriesIndex: d.series,
            e         : d3.event
        }
    }
    bars
        .style('fill', function(d,i,j){ return color(d, j, i);  })
        .style('stroke', function(d,i,j){ return color(d, j, i); })
        .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            dispatch.elementMouseover( _onMouseEventObject(d,i).bind(this) );
        })
        .on('mouseout', function(d,i) {
            d3.select(this).classed('hover', false);
            dispatch.elementMouseout( _onMouseEventObject(d,i).bind(this) );
        })
        .on('click', function(d,i) {
            dispatch.elementClick( _onMouseEventObject(d,i).bind(this) );
            d3.event.stopPropagation();
        })
        .on('dblclick', function(d,i) {
            dispatch.elementDblClick( _onMouseEventObject(d,i).bind(this) );
            d3.event.stopPropagation();
        });
    bars
        .attr('class', function(d,i) { return this.getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive'}.bind(this))
        .transition()
        .attr('transform', function(d,i) { return 'translate(' + this.x(this.getX(d,i)) + ',0)'; }.bind(this));

    function _colorBar(d,i,j) {
        return d3.rgb(this.barColor(d,i))
            .darker(
                disabled.map(function(d,i) { return i })
                    .filter(function(d,i){ return !this.disabled[i]}.bind(this))[j]
            )
            .toString()
    }

    if (this.barColor) {
        if (!this.disabled)
            this.disabled = data.map(function() { return true });
        bars
            .style('fill', _colorBar.bind(this))
            .style('stroke', _colorBar.bind(this));
    }
    var barSelection =
        bars.watchTransition(this.renderWatch, 'multibar', Math.min(250, this.duration_))
            .delay(function(d,i) {
                return i * duration / data[0].values.length;
            });
    if (this.stacked)
        barSelection
            .attr('y', function(d) {
                return this.y((this.stacked ? d.y1 : 0));
            }.bind(this))
            .attr('height', function(d) {
                return Math.max(Math.abs(this.y(d.y + (this.stacked ? d.y0 : 0)) - this.y((this.stacked ? d.y0 : 0))),1);
            }.bind(this))
            .attr('x', function(d) {
                return this.stacked ? 0 : (d.series * x.rangeBand() / data.length )
            }.bind(this))
            .attr('width', this.x.rangeBand() / (this.stacked ? 1 : data.length) );
    else
        barSelection
            .attr('x', function(d) {
                return d.series * x.rangeBand() / data.length
            })
            .attr('width', x.rangeBand() / data.length)
            .attr('y', function(d,i) {
                return this.getY(d,i) < 0 ?
                    this.y(0) :
                    this.y(0) - this.y(this.getY(d,i)) < 1 ?
                        this.y(0) - 1 :
                        this.y(this.getY(d,i)) || 0;
            }.bind(this))
            .attr('height', function(d,i) {
                return Math.max(Math.abs(this.y(this.getY(d,i)) - y(0)),1) || 0;
            }.bind(this));

    //store old scales for use in transitions on update
    this.x0 = this.x.copy();
    this.y0 = this.y.copy();

    this.renderWatch.renderEnd('multibar immediate');
};

MultiBar.prototype.xScale = function(_) {
    if (!arguments.length) return this.x;
    this.x = _;
    return this;
};

MultiBar.prototype.yScale = function(_) {
    if (!arguments.length) return this.y;
    this.y = _;
    return this;
};

MultiBar.prototype.xDomain = function(_) {
    if (!arguments.length) return this.xDomain;
    this.xDomain = _;
    return this;
};

MultiBar.prototype.yDomain = function(_) {
    if (!arguments.length) return this.yDomain;
    this.yDomain = _;
    return this;
};

MultiBar.prototype.xRange = function(_) {
    if (!arguments.length) return this.xRange;
    this.xRange = _;
    return this;
};

MultiBar.prototype.yRange = function(_) {
    if (!arguments.length) return this.yRange;
    this.yRange = _;
    return this;
};

MultiBar.prototype.forceY = function(_) {
    if (!arguments.length) return this.forceY;
    this.forceY = _;
    return this;
};

MultiBar.prototype.stacked = function(_) {
    if (!arguments.length) return this.stacked;
    this.stacked = _;
    return this;
};

MultiBar.prototype.stackOffset = function(_) {
    if (!arguments.length) return this.stackOffset;
    this.stackOffset = _;
    return this;
};

MultiBar.prototype.clipEdge = function(_) {
    if (!arguments.length) return this.clipEdge;
    this.clipEdge = _;
    return this;
};

MultiBar.prototype.color = function(_) {
    if (!arguments.length) return this.color;
    this.color = nv.utils.getColor(_);
    return this;
};

MultiBar.prototype.barColor = function(_) {
    if (!arguments.length) return this.barColor;
    this.barColor = nv.utils.getColor(_);
    return this;
};

MultiBar.prototype.disabled = function(_) {
    if (!arguments.length) return this.disabled;
    this.disabled = _;
    return this;
};

MultiBar.prototype.hideable = function(_) {
    if (!arguments.length) return this.hideable;
    this.hideable = _;
    return this;
};

MultiBar.prototype.groupSpacing = function(_) {
    if (!arguments.length) return this.groupSpacing;
    this.groupSpacing = _;
    return this;
};

MultiBar.prototype.duration = function(_) {
    if (!arguments.length) return this.duration_;
    this.duration_ = _;
    this.renderWatch.reset(this.duration_);
    return this;
};

MultiBar.prototype.delay = function(_) {
    nv.deprecated('multiBar.delay');
    return this.duration(_);
};

/**
 * The multiBar model returns a function wrapping an instance of a MultiBar.
 */
nv.models.multiBar = function () {
    "use strict";

    var multiBar = new MultiBar();

    function chart(selection) {
        multiBar.render(selection);
        return chart;
    }

    chart.dispatch = multiBar.dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, multiBar, MultiBar.prototype, 'x', 'y', 'margin', 'width', 'height', 'xScale', 'yScale',
        'xScale', 'yScale', 'xRange', 'yRange', 'forceY', 'stacked', 'stackOffset', 'clipEdge', 'color', 'barColor',
        'disabled', 'id', 'hideable', 'groupSpacing', 'duration',
        'delay'// deprecated
    );

    return chart;
};
