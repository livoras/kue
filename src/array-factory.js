var objectPath = require("./object-path")
var _ = require("./util")

function ArrayFactory(arr, path, scope) {
  this.arr = arr
  this.scope = scope
  this.path = path
}

var pro = ArrayFactory.prototype

_.each([
  "replace",
  "pop",
  "push",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse"
], function(method) {
  pro[method] = function() {
    var result = this.arr[method].apply(this.arr, arguments)
    this.scope.$root.broadcast(objectPath.makeArrayEvent(method, this.path), arguments)
    return result
  }
})

module.exports = ArrayFactory
