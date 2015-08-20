var objectPath = require("./object-path")

function ArrayFactory(arr, path, scope) {
  this.arr = arr
  this.scope = scope
  this.path = path
}

var pro = ArrayFactory.prototype

pro.sort = function() {

}

pro.push = function() {
  // body...
}

pro.pop = function() {
  var result = this.arr.pop()
  this.scope.broadcast(objectPath.makeArrayEvent("pop", this.path))
  return result
}

pro.shift = function() {
  // body...
}

pro.unshift = function() {
  // body...
}

pro.reverse = function() {
  // body...
}

pro.splice = function() {
  // body...
}

module.exports = ArrayFactory
