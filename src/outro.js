  if (typeof define === "function" && define.amd) {
    define(nv);
  } else if (typeof module === "object" && module.exports) {
    module.exports = nv;
  } else {
    this.nv = nv;
  }
})();
