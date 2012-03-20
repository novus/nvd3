var nv = {version: "0.0.1"};

window.nv = nv;

nv.models = {};
nv.graphs = [];
nv.log = {};

nv.dispatch = d3.dispatch("render_start", "render_end");


// ********************************************
//  Public Helper functions, not part of NV

window.log = function(obj) {
  if ((typeof(window.console) === "object")
    && (typeof(window.console.log) === "function"))
      console.log.apply(console, arguments);

  return obj;
};




// ********************************************
//  Public Core NV functions

nv.dispatch.on("render_start", function(e) {
  nv.log.startTime = +new Date;
  //log('start', nv.log.startTime);
});

nv.dispatch.on("render_end", function(e) {
  nv.log.endTime = +new Date;
  nv.log.totalTime = nv.log.endTime - nv.log.startTime;
  //log('end', nv.log.endTime);
  log('total', nv.log.totalTime);
});


// ********************************************
//  Public Core NV functions

nv.render = function render(stepSize) {
  var step = stepSize || 1; // number of graphs to generate in each timout loop

  render.active = true;
  nv.dispatch.render_start();

  setTimeout(function(){
    var chart;

    for (var i = 0; i < step && (graph = render.queue[i]); i++) {
      chart = graph.generate();
      if (typeof graph.callback === 'function') graph.callback(chart);
      nv.graphs.push(chart);
    }

    render.queue.splice(0, i);

    if (render.queue.length > 0) setTimeout(arguments.callee, 0);
    else { 
      nv.render.active = false;
      nv.dispatch.render_end();
    }
  }, 0);
};
nv.render.queue = [];


nv.addGraph = function(obj) {
  if (typeof arguments[0] === "function")
    obj = {generate: arguments[0], callback: arguments[1]};

  nv.render.queue.push(obj);

  if (!nv.render.active) nv.render();
};


nv.strip = function(s) {
  return s.replace(/(\s|&)/g,'');
}

