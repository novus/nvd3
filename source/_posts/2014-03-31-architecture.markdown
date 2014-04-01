---
layout: post
title: Architecture
date: 2014-03-31 20:10:20 -0400
author: David Souther
email: davidsouther@gmail.com
comments: true
categories:
---

The first iteration of NVD3 dealt with complexity by copypasta code. This refactor aims to replace that copypasta with a sensible, object oriented design. Looking closely at the NVD3 codebase, there are some concepts that are easily abstractable. The first of these is the Layer - a thing to perform some DOM drawing on. The Layer manages the fundamental aspects of drawing a chart, especially the [drawing lifecycle][draw_life]. On top of a Layer are the several visualization pieces, like [Pie][pie_code] and [Line][line_code], as well as the concept of a [Chart]. A chart is a composite object, managing the underlying visualization(s), the axes, the legend, and other common features.

## Extension Mechanism

Because NVD3 targets modern web browsers, we use a variation of the `Object.create` pattern. An NVD3 constructor has a superclass, and a collection of private internal properties. This collection is stored in `Layer.options`, but allows getters and setters to be created automatically. Restricting external access to the `options` object allows significant flexibility in overriding specific chart functionalities.

To ease development, we've introduced an `nv.utils.create(ctor, parent, privates)` ([code][create_line]). This takes two constructor functions, links the prototype of the `ctor` to the `parent`, and creates a getter/setter method on the ctor prototype for each of the keys in `privates`. From this point, after instantiating the ctor class, all private internal data will be stored in its `options` key, while all access should come through the combined getter/setter methods. Client code can then override the default behavior by assigning a different function to ctor prorotype. Calling super methods should happen using `Function.prototype.apply()`.

Because the nv model functions return a callable function, we have also introduced `nv.utils.rebindp` ([code][rebindp_line]), which behaves similarly to `d3.rebind`, but calls functions on the source prototype, rather than the source itself.

## Object Composition

Beyond extending and subclassing, Object Composition provides an excellent approach for achieving custom behaviors in similar charts. The Pie Chart labels have a `labelLayout` ([code][pie_labelLayout_link]) property, which takes an object that knows the rules for laying out labels in a pie chart. Using Object Composition for specialized activities within the inheritance pattern will go a long ways towards creating extensible, maintainable, testable code.

Using these few primitives, we can build a very successful system. This new architecture should make NVD3 a solid library for charting requirements far into the future of front end development.

[draw_life]: http://nvd3.org/blog/2014/03/nvd3-chart-drawing-lifecycle/
[pie_code]: https://github.com/DavidSouther/nvd3/blob/canvas/src/models/pie/
[line_code]: https://github.com/DavidSouther/nvd3/blob/canvas/src/models/line/
[create_line]: https://github.com/DavidSouther/nvd3/blob/canvas/src/utils.js#L327-L343
[rebindp_line]: https://github.com/DavidSouther/nvd3/blob/canvas/src/utils.js#L301-L325
[pie_labelLayout_link]: https://github.com/DavidSouther/nvd3/blob/canvas/src/models/pie/pie.js#L1-L24
