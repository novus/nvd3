var nv = {
  version: '0.0.1',
  dev: true //set false when in production
};


window.nv = nv;

nv.models = {}; //stores all the possible models/components
nv.charts = {}; //stores all the ready to use charts
nv.graphs = []; //stores all the graphs currently on the page
nv.log = {}; //stores some statistics and potential error messages

nv.dispatch = d3.dispatch('render_start', 'render_end');


// ********************************************
//  Public Helper functions, not part of NV

window.log = function(obj) {
  if ((typeof(window.console) === 'object')
    && (typeof(window.console.log) === 'function'))
      console.log.apply(console, arguments);

  return obj;
};




// ********************************************
//  Public Core NV functions

nv.dispatch.on('render_start', function(e) {
  nv.log.startTime = +new Date;
});

nv.dispatch.on('render_end', function(e) {
  nv.log.endTime = +new Date;
  nv.log.totalTime = nv.log.endTime - nv.log.startTime;
  if (nv.dev) log('total', nv.log.totalTime); //used for development, to keep track of graph generation times
});


// ********************************************
//  Public Core NV functions

nv.render = function render(step) {
  step = step || 1; // number of graphs to generate in each timout loop

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

    if (render.queue.length) setTimeout(arguments.callee, 0);
    else { 
      nv.render.active = false;
      nv.dispatch.render_end();
    }
  }, 0);
};
nv.render.queue = [];


nv.addGraph = function(obj) {
  if (typeof arguments[0] === 'function')
    obj = {generate: arguments[0], callback: arguments[1]};

  nv.render.queue.push(obj);

  if (!nv.render.active) nv.render();
};



nv.identity = function(d) { return d };


nv.strip = function(s) {
  return s.replace(/(\s|&)/g,'');
}





/* An ugly implementation to get month end axis dates
 * Will hopefully refactor sooner than later
 */

function daysInMonth(month,year) {
  var m = [31,28,31,30,31,30,31,31,30,31,30,31];
  if (month != 2) return m[month - 1];
  if (year%4 != 0) return m[1];
  if (year%100 == 0 && year%400 != 0) return m[1];
  return m[1] + 1;
}


function d3_time_range(floor, step, number) {
  return function(t0, t1, dt) {
    var time = floor(t0), times = [];
    if (time < t0) step(time);
    if (dt > 1) {
      while (time < t1) {
        var date = new Date(+time);
        if (!(number(date) % dt)) times.push(date);
        step(time);
      }
    } else {
      while (time < t1) times.push(new Date(+time)), step(time);
    }
    return times;
  };
}


d3.time.monthEnd = function(date) {
  return new Date(date.getFullYear(), date.getMonth(), 0);
};


d3.time.monthEnds = d3_time_range(d3.time.monthEnd, function(date) {
    date.setUTCDate(date.getUTCDate() + 1);
    date.setDate(daysInMonth(date.getMonth() + 1, date.getFullYear()));
  }, function(date) {
    return date.getMonth();
  }
);



