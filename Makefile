JS_FILES = \
	src/intro.js \
	src/core.js \
	src/tooltip.js \
	src/utils.js \
	src/models/axis.js \
	src/models/bar.js \
	src/models/cumulativeLine.js \
	src/models/legend.js \
	src/models/line.js \
	src/models/linePlusBar.js \
	src/models/lineWithFocus.js \
	src/models/lineWithLegend.js \
	src/models/pie.js \
	src/models/scatter.js \
	src/models/scatterWithLegend.js \
	src/models/sparkline.js \
	src/models/stackedArea.js \
	src/models/stackedAreaWithLegend.js \
	src/charts/cumulativeLineChartDaily.js \
	src/charts/lineChart.js \
	src/charts/lineChartDaily.js \
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


