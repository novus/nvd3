---
layout: post
title: NVD3 Chart Drawing Lifecycle
date: 2014-03-31 20:10:20 -0400
author: David Souther
email: davidsouther@gmail.com
comments: true
categories:
---

Externally, the flow of an NVD3 application remains consistent. A user of the library will call the appropriate `nv.models` method, which will return a chart method that has getters and setters bound, and can be used as the argument to `d3.selection().call()`. Internally, the massive closure-bound scoping solutions are being replaced with a chart model object, an instance of a constructor function that can be configured as needed, and that can be extended to create new behaviors. The superclass of the chart model objects, `Layer`, also manages drawing the visualization through its lifecycle.

## Lifecycle Methodology

Drawing a chart begins with a call to the chart model. This is a function that has a reference to a chart model object, that can be prototypically extended to add and compose behaviors of a chart. The chart model object itself extends from either Chart or Layer - though Chart itself extends from Layer. Layer is the root of the object hierarchy, and is an object that manages information about a viewing layer. Typically, this will be an SVG `<g>`, though could as easily be a `<div>` or `<span>`. A Layer has `size.height`, `size.width`, `margins`, available height and width (total height / width minus margins).

A Layer and its subclasses act as a template. A layer would be instantiated once, configured, and passed a selection to render on. The nv.models functions instantiate a corresponding Layer subclass, pass method calls to the underlying instance, and provide an interface to use with `d3.selection.call()`. This can be short-circuited by instantiating a Layer subclass and passing a selection to its render method directly.

The Layer goes through a lifecycle on each render call. Each of the methods here should be overridden and called by a subclass to extend and provide an appropriate behavior. These methods are largely extractions of copypasta already present in the NVD3 codebase.

```javascript
render(selection)
    setRoot(domNode) // With a DOM element, determine the correct sizing constraints.
    wrapper(data, [classList]) // Attach hooks onto the DOM element for future manipulation.
        Chart#buildLegend
        Chart#buildAxes
    noData(data) // A chance to short-circuit the heavy chart drawing by displaying a "No Data" message.
        hasData(data) // Determine if the data is usable for drawing.
    draw(data) // Perform the actual drawing code,
        Chart#writeLegend(data) // The Chart also manages legends and axes.
        Chart#plotAxes(data)
    attachEvents() // Hook up to any dispatches
update() // Call the render method using the last selection.
```

### render(*selection*)

This takes some d3 selection, and iterates the selection applying the chart's drawing mechanism and settings to each element of the selection (usually only one). This method should probably not be overridden.

### setRoot(*domNode*)

This performs the basic calculations for sizing a Layer in its container. When this is called, it will use the parent's inner sizes to determine its size, so if the parent has not expanded, it may result in odd behaviors. Another method that probably won't need to be overridden.

### wrapper(*data, [classList]*)

The wrapper function attaches a variety of class hooks into the DOM for the layer. These hooks are used throughout the chart's code, and some are attached specially to the Layer instance.

 Property | Class | Usage
----------|-------|-------
**Layer** |       |
wrap      |`'nv-wrap ' + wrapClass` | A `<g>` selection bound to the `data` for the chart.
wrapEnter |`'nvd3 nv-wrap ' + chartClass` | The [entered][d3_enter] selection of `wrap`.
defsEnter |       | A convenient place to hook SVG Defs (filters, etc).
gEnter    |       | A `<g>` child of `wrap`.
**Chart** |       |
axis.x    | `'nv-x nv-axis'` | A `<g>` child of `wrap` that is reserved for the x axis.
axis.y    | `'nv-y nv-axis'` | A `<g>` child of `wrap` that is reserved for the y axis.
legend    | `'nv-legendWrap'` | A `<g>` child of `wrap` that is reserved for the legend.
**Other** |       |
          | `classList[n]` | One of several `<g>` children of `wrap` that provide convenient hook points for extended classes.

To access any of the classed `<g>` layers, select that class on the wrap object - `this.wrap.select('classPoint')`.

#### Chart::buildLegend()

Perform any additional Legend DOM preparations.

#### Chart::buildAxes()

Perform any additional Axes DOM preparations.

### noData(*data*)

Short-circuit convenience method to show a "No Data Available" message in the chart.

#### hasData(*data*)

Convenience method to determine if the data object is sufficient for the chart. This could be overwridden.

### draw(*data*)

The magic! This method MUST be overridden on Layer to do anything useful, and should use the hooks created in `wrapper` to create the visualization. For a complete example, see `Pie::Draw`([code][pie_draw])

#### Chart::writeLegend(*data*)

Create the legend for the Chart.

#### Chart::plotAxes(*data*)

Create the axes for the chart.

### attachEvents()

Utility hook to attach events on create components and the dispatch. This should be overwridden, but be sure to call the super method, as often the visualization being extended will have events it needs to attach to.

## Rewrite

This lifecycle is what seems to work very well for the nvd3 approach, and for the broader reusable d3 charting concept. As we move forward with refactoring NVD3 to this style, we will strive to be as backwards compatible as possible - if a chart used to work and breaks, that is a bug in the refactor! Please, let us know. Otherwise, stay tuned!

[pie_draw]: https://github.com/DavidSouther/nvd3/blob/canvas/src/models/pie/pie.js#L70-L113
