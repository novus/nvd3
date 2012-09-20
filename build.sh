#!/bin/bash
COMPRESSOR=`which yui-compressor`
cat src/intro.js src/core.js src/tooltip.js src/utils.js src/models/*.js src/outro.js > nv.d3.js
if [ -e $COMPRESSOR ]; then
  $COMPRESSOR --type js -o nv.d3.min.js nv.d3.js
fi
