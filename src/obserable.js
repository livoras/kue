var _ = require("./util.js")

function ObserableAttr(attr) {
  var that = this
  this.value = attr
  this.watchers = []
  function getOrSet(attr) {
    if (arguments.length === 0) {
      return that.value
    }
    that.value = attr
    that.notify()
  }
  getOrSet.$$ = that
  return getOrSet
}

ObserableAttr.prototype.notify = function() {
  var that = this
  _.each(this.watchers, function(watcher) {
    watcher(that.value, that)
  })
}

ObserableAttr.prototype.watch = function(fn) {
  this.watchers.push(fn)
}

function ObserableArray(arr) {
  
}

function obserable(obj) {
  if (!_.isArray(obj)) {
    return new ObserableAttr(obj)
  } else {
    return new ObserableArray(obj)
  }
}

module.exports = obserable
