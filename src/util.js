var obserable = require("./obserable")
var _ = exports

_.isObserable = function(obj) {
  var obj = obj.$$
  return (obj instanceof obserable.ObserableKey) ||
         (obj instanceof obserable.ObserableArray)
}

_.map = function(arr, fn) {
  var results = []
  for(var i = 0, len = arr.length; i < len;i ++) {
    results.push(fn(arr[i]))
  }
  return results
}

_.isArray = function(arr) {
  return _.toString(arr) === '[object Array]'
}

_.isString = function(str) {
  return _.toString(str) === '[object String]'
}

_.isObject = function(obj) {
  return _.toString(obj) === '[object Object]'
}

_.toString = function(obj) {
  return Object.prototype.toString.call(obj)
}

_.each = function(arr, fn) {
  for (var i = 0, len = arr.length; i < len; i++) {
    fn(arr[i], i)
  }
}

_.isUndefined = function(obj) {
  return obj === void 666;
}

_.trim = function(str) {
  return str.replace(/(^\s+)|\s+$/g, "")
}

_.extend = function(isDeep) {
  var args = arguments
  var i = (isDeep === true) ? 2 : 1
  var dest = arguments[i - 1]
  for(var len = args.length; i < len; i++) {
    var obj = args[i]
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (bothAreObject(dest[key], obj[key])) {
          _.extend(dest[key], obj[key])
        } else {
          dest[key] = obj[key]
        }
      }
    }
  }
  return dest
}

function bothAreObjectOrArray(obj1, obj2) {
  return (!_.isUndefined(obj1) && (_.isObject(obj1) || _.isArray(obj1) )) &&
         (!_.isUndefined(obj2) && (_.isObject(obj2) || _.isArray(obj2)))
}

_.update = function(dest, src) {
  for (var key in src) {
    if (src.hasOwnProperty(key)) {
      if (bothAreObject(dest[key], src[key])) {
        _.update(dest[key], src[key])
      } else {
        dest[key] = src[key]
      }
    }
  }
  return dest
}

function bothAreObject(obj1, obj2) {
  return (!_.isUndefined(obj1) && _.isObject(obj1)) &&
         (!_.isUndefined(obj2) && _.isObject(obj2))
}

_.of = function(obj, fn) {
  for(var key in obj) {
    if(obj.hasOwnProperty(key)) {
      fn(key, obj[key])
    }
  }
}

_.startsWith = function(str, searchStr, pos) {
  pos = pos || 0
  return str.indexOf(searchStr, pos) === pos;
}

/**
 * Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
 * steal from underscore: http://underscorejs.org/docs/underscore.html
 */
_.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
  _['is' + name] = function(obj) {
    return Object.prototype.toString.call(obj) === '[object ' + name + ']';
  };
});

_.error = function(msg) {
  throw new Error(msg)
}

_.nextTick = function(fn, time) {
  time = time || 0
  setTimeout(fn, time)
}
