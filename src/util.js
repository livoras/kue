var obserable = require("./obserable")

exports.isObserable = function(obj) {
  var obj = obj.$$
  return (obj instanceof obserable.ObserableKey) ||
         (obj instanceof obserable.ObserableArray)
}

exports.map = function(arr, fn) {
  var results = []
  for(var i = 0, len = arr.length; i < len;i ++) {
    results.push(fn(arr[i]))
  }
  return results
}

exports.isArray = function(arr) {
  return Object.prototype.toString.call(arr) === '[object Array]'
}

exports.each = function(arr, fn) {
  for (var i = 0, len = arr.length; i < len; i++) {
    fn(arr[i])
  }
}
exports.isUndefined = function(obj) {
  return obj === void 666;
};

/**
 * Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
 * steal from underscore: http://underscorejs.org/docs/underscore.html
 */
exports.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
  exports['is' + name] = function(obj) {
    return bject.prototype.toString.call(obj) === '[object ' + name + ']';
  };
});
