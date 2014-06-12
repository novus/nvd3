var AxisPrivates = {
    axisLabelText: null,
    showMaxMin: true, //TODO: showMaxMin should be disabled on all ordinal scaled axes
    highlightZero: true,
    rotateLabels: 0,
    rotateYLabel: true,
    staggerLabels: false,
    isOrdinal: false,
    ticks: null,
    axisLabelDistance: 12, //The larger this number is, the closer the axis label is to the axis.
    axisRendered: false,
    maxMinRendered: false,
    scale0: null,
    axisLabel: null,
    scale: null,
    duration: 250
};

function Axis(options){
    options = nv.utils.extend({}, options, AxisPrivates, {
        margin : {top: 0, right: 0, bottom: 0, left: 0}
        , width : 75 //only used for tickLabel currently
        , height : 60 //only used for tickLabel currently
        , chartClass: 'axis'
        , wrapClass: 'axis'
    });

    Layer.call(this, options);

    this.axis = d3.svg.axis()
        .orient('bottom')
        .tickFormat(function(d) { return d });

    this.scale(d3.scale.linear());

    this.axis.scale(this.scale());
}

nv.utils.create(Axis, Layer, AxisPrivates);

/**
 * override Layer::wrapper, removed transform/translate
 * @param data
 */
Axis.prototype.wrapper = function(data){
    var gs = [];
    var chartClass = 'nv-' + this.options.chartClass;
    var wrapClass = 'nv-' + this.options.wrapClass;

    this.wrap = this.svg.selectAll('g.nv-wrap.' + wrapClass).data([data]);
    this.wrapEnter = this.wrap.enter().append('g').attr({class: 'nvd3 nv-wrap ' + chartClass });
    this.defsEnter = this.wrapEnter.append('defs');
    this.gEnter = this.wrapEnter.append('g');
    this.g = this.wrap.select('g');

    gs.concat([wrapClass]).forEach(function(g){
        this.gEnter.append('g').attr('class', g);
    }, this);
};

/**
 * @override Layer::draw
 */
Axis.prototype.draw = function(data){

    var that = this,
        axisMaxMin = null,
        xLabelMargin = null,
        scale = this.scale(),
        w = null;

    if (this.ticks() !== null)
        this.axis.ticks(this.ticks());
    else if (this.axis.orient() == 'top' || this.axis.orient() == 'bottom')
        this.axis.ticks(Math.abs(scale.range()[1] - scale.range()[0]) / 100);

    //TODO: consider calculating width/height based on whether or not label is added, for reference in charts using this component
    this.g
        .watchTransition(this.renderWatch, 'axis')
        .call(this.axis);

    this.scale0(this.scale0() || this.axis.scale());

    var fmt = this.axis.tickFormat();
    if (fmt == null)
        fmt = this.scale0().tickFormat();

    var axisLabel = this.g.selectAll('text.nv-axislabel')
        .data([this.axisLabelText() || null]);
    axisLabel.exit().remove();

    switch (this.axis.orient()) {
        case 'top':
            axisLabel.enter().append('text')
                .attr('class', 'nv-axislabel');
            w = (scale.range().length==2)
                ? scale.range()[1]
                : (scale.range()[scale.range().length-1]+(scale.range()[1]-scale.range()[0]));
            axisLabel
                .attr('text-anchor', 'middle')
                .attr('y', 0)
                .attr('x', w/2);
            if (this.showMaxMin()) {
                axisMaxMin = this.wrap.selectAll('g.nv-axisMaxMin')
                    .data(scale.domain());
                axisMaxMin.enter().append('g')
                    .attr('class', 'nv-axisMaxMin')
                    .append('text');
                axisMaxMin.exit().remove();
                axisMaxMin
                    .attr('transform', function(d,i) {
                        return 'translate(' + scale(d) + ',0)'
                    })
                    .select('text')
                    .attr('dy', '-0.5em')
                    .attr('y', -this.axis.tickPadding())
                    .attr('text-anchor', 'middle')
                    .text(function(d,i) {
                        var v = fmt(d);
                        return ('' + v).match('NaN') ? '' : v;
                    });
                axisMaxMin.watchTransition(this.renderWatch, 'min-max top')
                    .attr('transform', function(d,i) {
                        return 'translate(' + scale.range()[i] + ',0)'
                    });
            }
            break;
        case 'bottom':
            xLabelMargin = 36;
            var maxTextWidth = 30;
            var xTicks = this.g.selectAll('g').select("text");
            if (this.rotateLabels()%360) {
                //Calculate the longest xTick width
                xTicks.each(function(d,i){
                    var width = this.getBBox().width;
                    if(width > maxTextWidth) maxTextWidth = width;
                });
                //Convert to radians before calculating sin. Add 30 to margin for healthy padding.
                var sin = Math.abs(Math.sin(this.rotateLabels()*Math.PI/180));
                xLabelMargin = (sin ? sin*maxTextWidth : maxTextWidth)+30;
                //Rotate all xTicks
                xTicks
                    .attr('transform', function(d,i,j) { return 'rotate(' + that.rotateLabels() + ' 0,0)' })
                    .style('text-anchor', that.rotateLabels()%360 > 0 ? 'start' : 'end');
            }
            axisLabel.enter().append('text').attr('class', 'nv-axislabel');
            w = (scale.range().length==2)
                ? scale.range()[1]
                : (scale.range()[scale.range().length-1]+(scale.range()[1]-scale.range()[0]));
            axisLabel
                .attr('text-anchor', 'middle')
                .attr('y', xLabelMargin)
                .attr('x', w/2);
            if (this.showMaxMin()) {
                //if (showMaxMin && !isOrdinal) {
                axisMaxMin = this.wrap.selectAll('g.nv-axisMaxMin')
                    //.data(scale.domain())
                    .data([scale.domain()[0], scale.domain()[scale.domain().length - 1]]);
                axisMaxMin.enter().append('g').attr('class', 'nv-axisMaxMin').append('text');
                axisMaxMin.exit().remove();
                axisMaxMin
                    .attr('transform', function(d,i) {
                        return 'translate(' + (scale(d) + (that.isOrdinal() ? scale.rangeBand() / 2: 0)) + ',0)'
                    })
                    .select('text')
                    .attr('dy', '.71em')
                    .attr('y', this.axis.tickPadding())
                    .attr('transform', function(d,i,j) { return 'rotate(' + that.rotateLabels() + ' 0,0)' })
                    .style('text-anchor',
                        that.rotateLabels() ? (that.rotateLabels()%360 > 0 ? 'start' : 'end') : 'middle'
                    )
                    .text(function(d,i) {
                        var v = fmt(d);
                        return ('' + v).match('NaN') ? '' : v;
                    });
                axisMaxMin.watchTransition(this.renderWatch, 'min-max bottom')
                    .attr('transform', function(d,i) {
                        return 'translate(' + (scale(d) + (that.isOrdinal() ? scale.rangeBand() / 2 : 0)) + ',0)'
                    });
            }
            if (that.staggerLabels())
                xTicks
                    .attr('transform', function(d,i) { return 'translate(0,' + (i % 2 == 0 ? '0' : '12') + ')' });
            break;
        case 'right':
            axisLabel.enter().append('text').attr('class', 'nv-axislabel');
            axisLabel
                .style('text-anchor', this.rotateYLabel() ? 'middle' : 'begin')
                .attr('transform', this.rotateYLabel() ? 'rotate(90)' : '')
                .attr('y', this.rotateYLabel() ? (-Math.max(this.margin().right,this.width()) + 12) : -10) //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
                .attr('x', this.rotateYLabel() ? (scale.range()[0] / 2) : this.axis.tickPadding());
            if (this.showMaxMin()) {
                axisMaxMin = this.wrap.selectAll('g.nv-axisMaxMin')
                    .data(scale.domain());
                axisMaxMin.enter().append('g').attr('class', 'nv-axisMaxMin').append('text')
                    .style('opacity', 0);
                axisMaxMin.exit().remove();
                axisMaxMin
                    .attr('transform', function(d,i) {
                        return 'translate(0,' + scale(d) + ')'
                    })
                    .select('text')
                    .attr('dy', '.32em')
                    .attr('y', 0)
                    .attr('x', this.axis.tickPadding())
                    .style('text-anchor', 'start')
                    .text(function(d,i) {
                        var v = fmt(d);
                        return ('' + v).match('NaN') ? '' : v;
                    });
                axisMaxMin.watchTransition(this.renderWatch, 'min-max right')
                    .attr('transform', function(d,i) {
                        return 'translate(0,' + scale.range()[i] + ')'
                    })
                    .select('text')
                    .style('opacity', 1);
            }
            break;
        case 'left':
            /*
             //For dynamically placing the label. Can be used with dynamically-sized chart axis margins
             var yTicks = g.selectAll('g').select("text");
             yTicks.each(function(d,i){
             var labelPadding = this.getBBox().width + axis.tickPadding() + 16;
             if(labelPadding > width) width = labelPadding;
             });
             */
            axisLabel.enter().append('text').attr('class', 'nv-axislabel');
            axisLabel
                .style('text-anchor', this.rotateYLabel() ? 'middle' : 'end')
                .attr('transform', this.rotateYLabel() ? 'rotate(-90)' : '')
                .attr('y',
                    this.rotateYLabel()
                        ? (-Math.max(this.margin().left,this.width()) + this.axisLabelDistance())
                        : -10
                ) //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
                .attr('x',
                    this.rotateYLabel()
                        ? (-scale.range()[0] / 2)
                        : -this.axis.tickPadding()
                );
            if (this.showMaxMin()) {
                axisMaxMin = this.wrap.selectAll('g.nv-axisMaxMin')
                    .data(scale.domain());
                axisMaxMin.enter().append('g').attr('class', 'nv-axisMaxMin').append('text')
                    .style('opacity', 0);
                axisMaxMin.exit().remove();
                axisMaxMin
                    .attr('transform', function(d,i) {
                        return 'translate(0,' + that.scale0()(d) + ')'
                    })
                    .select('text')
                    .attr('dy', '.32em')
                    .attr('y', 0)
                    .attr('x', -this.axis.tickPadding())
                    .attr('text-anchor', 'end')
                    .text(function(d,i) {
                        var v = fmt(d);
                        return ('' + v).match('NaN') ? '' : v;
                    });
                axisMaxMin.watchTransition(this.renderWatch, 'min-max right')
                    .attr('transform', function(d,i) {
                        return 'translate(0,' + scale.range()[i] + ')'
                    })
                    .select('text')
                    .style('opacity', 1);
            }
            break;
    }

    axisLabel
        .text(function(d) { return d });

    if (this.showMaxMin() && (this.axis.orient() === 'left' || this.axis.orient() === 'right')) {
        //check if max and min overlap other values, if so, hide the values that overlap
        this.g.selectAll('g') // the g's wrapping each tick
            .each(function(d,i) {
                d3.select(this).select('text').attr('opacity', 1);
                if (scale(d) < scale.range()[1] + 10 || scale(d) > scale.range()[0] - 10) { // 10 is assuming text height is 16... if d is 0, leave it!
                    if (d > 1e-10 || d < -1e-10) // accounts for minor floating point errors... though could be problematic if the scale is EXTREMELY SMALL
                        d3.select(this).attr('opacity', 0);
                    d3.select(this).select('text').attr('opacity', 0); // Don't remove the ZERO line!!
                }
            });

        //if Max and Min = 0 only show min, Issue #281
        if (scale.domain()[0] == scale.domain()[1] && scale.domain()[0] == 0)
            this.wrap.selectAll('g.nv-axisMaxMin')
                .style('opacity', function(d,i) { return !i ? 1 : 0 });
    }

    if (this.showMaxMin() && (this.axis.orient() === 'top' || this.axis.orient() === 'bottom')) {
        var maxMinRange = [];
        this.wrap.selectAll('g.nv-axisMaxMin')
            .each(function(d,i) {
                try {
                    if (i) // i== 1, max position
                        maxMinRange.push(scale(d) - this.getBBox().width - 4);  //assuming the max and min labels are as wide as the next tick (with an extra 4 pixels just in case)
                    else // i==0, min position
                        maxMinRange.push(scale(d) + this.getBBox().width + 4)
                } catch (err) {
                    if (i) // i== 1, max position
                        maxMinRange.push(scale(d) - 4);  //assuming the max and min labels are as wide as the next tick (with an extra 4 pixels just in case)
                    else // i==0, min position
                        maxMinRange.push(scale(d) + 4)
                }
            });
        this.g.selectAll('g') // the g's wrapping each tick
            .each(function(d,i) {
                if (scale(d) < maxMinRange[0] || scale(d) > maxMinRange[1]) {
                    if (d > 1e-10 || d < -1e-10) // accounts for minor floating point errors... though could be problematic if the scale is EXTREMELY SMALL
                        d3.select(this).remove();
                    else
                        d3.select(this).select('text').remove(); // Don't remove the ZERO line!!
                }
            });
    }

    //highlight zero line ... Maybe should not be an option and should just be in CSS?
    if (this.highlightZero())
        this.g.selectAll('.tick')
            .filter(function(d) { //this is because sometimes the 0 tick is a very small fraction, TODO: think of cleaner technique
                return !parseFloat(Math.round(d.__data__*100000)/1000000) && (d.__data__ !== undefined)
            })
            .classed('zero', true);

    //store old scales for use in transitions on update
    this.scale0( scale.copy() );
};

Axis.prototype.scale = function(_) {
    if (!arguments.length) return this.options.scale;
    this.options.scale = _;
    this.axis.scale(_);
    this.isOrdinal( typeof this.options.scale.rangeBands === 'function' );
    d3.rebind(this, this.options.scale, 'domain', 'range', 'rangeBand', 'rangeBands');
    return this;
};



/**
 * The axis model returns a function wrapping an instance of a Axis.
 */
nv.models.axis = function() {
    "use strict";

    var axis = new Axis(),
        api = [
            'margin',
            'width',
            'ticks',
            'height',
            'axisLabel',
            'showMaxMin',
            'highlightZero',
            'scale',
            'rotateYLabel',
            'rotateLabels',
            'staggerLabels',
            'axisLabelDistance',
            'duration',
            'domain',
            'range',
            'rangeBand',
            'rangeBands'
        ];

    function chart(selection) {
        axis.render(selection);
        return chart;
    }

    chart.axis = axis.axis;
    chart.dispatch = axis.dispatch;

    d3.rebind(chart, axis.axis,
        'orient',
        'tickValues',
        'tickSubdivide',
        'tickSize',
        'tickPadding',
        'tickFormat'
    );

    d3.rebind(chart, axis.scale(),
        'domain',
        'range',
        'rangeBand',
        'rangeBands'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, axis, Axis.prototype, api);

    return chart;
};

