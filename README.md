# Novus/nvd3 fork for normalized stacked bar charts

This fork of NVD3 1.1.15-beta implements a new mode for multiBarChart called "stacked normalized". It displays bars in stacked format
but normalized values from 0-100%.

## Modified files:
* models/multiBarChart.js
* models/multiBar.js
* test/multiBarChartTest.html (added new chart 8)

## Examples:
* examples/multiBarChartNorm.html

## Notes/Limitations:
For backward compatibility reasons to old multiCharts the new feature is only enabled if "allowNormalized" is passed to the chart
during construction.
The current version technically works (meaning it does not crash) with negative values but the output is mainly crap.
In order to keep modifications as small as possible the chart function in multiBar.js now internally works on a deep copy of the
original data. Normalization will then modify the actual values of that copied data to to 0.0-1.0 domain. All other logic and access 
to variables did not need modification.
The chart.state() function in multiBarChart.js will now always dispatch a changeState event if a new state is passed in.