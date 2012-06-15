JS_FILES = \
	src/intro.js \
	src/core.js \
	src/tooltip.js \
	src/utils.js \
	src/models/axis.js \
	src/models/bar.js \
	src/models/historicalBar.js \
	src/models/bullet.js \
	src/models/cumulativeLine.js \
	src/models/discreteBar.js \
	src/models/discreteBarChart.js \
	src/models/discreteBarWithAxes.js \
	src/models/legend.js \
	src/models/line.js \
	src/models/lineChart.js \
	src/models/linePlusBar.js \
	src/models/lineWithFocus.js \
	src/models/lineWithLegend.js \
	src/models/multiBar.js \
	src/models/multiBarChart.js \
	src/models/multiBarWithLegend.js \
	src/models/multiBarHorizontal.js \
	src/models/multiBarHorizontalChart.js \
	src/models/multiBarHorizontalWithLegend.js \
	src/models/pie.js \
	src/models/scatter.js \
	src/models/scatterWithLegend.js \
	src/models/sparkline.js \
	src/models/sparklinePlus.js \
	src/models/stackedArea.js \
	src/models/stackedAreaWithLegend.js \
	src/models/stackedAreaChart.js \
	src/charts/cumulativeLineChart.js \
	src/charts/lineChart.js \
	src/charts/lineChartDaily.js \
	src/charts/stackedAreaChart.js \
	src/outro.js

JS_COMPILER = \
	uglifyjs

all: nv.d3.js nv.d3.min.js
nv.d3.js: $(JS_FILES)
nv.d3.min.js: $(JS_FILES)

nv.d3.js: Makefile
	rm -f $@
	cat $(filter %.js,$^) >> $@

%.min.js:: Makefile
	rm -f $@
	cat $(filter %.js,$^) | $(JS_COMPILER) >> $@

clean:
	rm -rf nv.d3.js nv.d3.min.js


