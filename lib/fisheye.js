(function() {
  d3.fisheye = function() {
    var radius = 200,
        power = 2,
        k0,
        k1,
        center = [0, 0];

    function fisheye(d) {
      var dx = d.x - center[0],
          dy = d.y - center[1],
          dd = Math.sqrt(dx * dx + dy * dy);
      if (dd >= radius) return {x: d.x, y: d.y, z: 1};
      var k = k0 * (1 - Math.exp(-dd * k1)) / dd * .75 + .25;
      return {x: center[0] + dx * k, y: center[1] + dy * k, z: Math.min(k, 10)};
    }

    function rescale() {
      k0 = Math.exp(power);
      k0 = k0 / (k0 - 1) * radius;
      k1 = power / radius;
      return fisheye;
    }

    fisheye.radius = function(_) {
      if (!arguments.length) return radius;
      radius = +_;
      return rescale();
    };

    fisheye.power = function(_) {
      if (!arguments.length) return power;
      power = +_;
      return rescale();
    };

    fisheye.center = function(_) {
      if (!arguments.length) return center;
      center = _;
      return fisheye;
    };

    return rescale();
  };
})();
