(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var config = exports

config.openTag = "{"
config.closeTag = "}"
config.directivePrefix = "k"

},{}],2:[function(require,module,exports){
var _ = require("./util.js")

function ObserableKey(attr) {
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

ObserableKey.prototype.notify = function() {
  var that = this
  _.each(this.watchers, function(watcher) {
    watcher(that.value, that)
  })
}

ObserableKey.prototype.watch = function(fn) {
  this.watchers.push(fn)
}

function ObserableArray(arr) {
  
}

function obserable(obj) {
  if (!_.isArray(obj)) {
    return new ObserableKey(obj)
  } else {
    return new ObserableArray(obj)
  }
}

obserable.ObserableKey = ObserableKey
obserable.ObserableArray = ObserableArray

module.exports = obserable

},{"./util.js":4}],3:[function(require,module,exports){
var config = require("./config")
var _ = require("./util")

var SPECIAL_CHARS = /(\*\.\?\+\$\^\[\]\(\)\{\}\|\\\/)/g
var openTag, closeTag, EXP_REG, REMOVE_REG

function makeREG() {
  openTag = config.openTag.replace(SPECIAL_CHARS, "\\$1")
  closeTag = config.closeTag.replace(SPECIAL_CHARS, "\\$1")

  EXP_REG = new RegExp(openTag + "[\\S\\s]+?" + closeTag, 'g')
  REMOVE_REG = new RegExp(openTag + "|" + closeTag, 'g')
}

exports.getRawExps = function(text) {
  var results = text.match(EXP_REG) || []
  return results
}

exports.getExpFromRawExp = function(rawExp) {
  return rawExp.replace(REMOVE_REG, "")
}

/** 
 * Steal from Vue.js: 
 * https://github.com/yyx990803/vue/blob/dev/src/parsers/expression.js
 */
var KEYWORD_REG = /[_\w][_$\w\d]+/g
var ignoreKeywords =
  'Math,Date,this,true,false,null,undefined,Infinity,NaN,' +
  'isNaN,isFinite,decodeURI,decodeURIComponent,encodeURI,' +
  'encodeURIComponent,parseInt,parseFloat'
var IGNORE_KEYWORDS_REG = 
  new RegExp('^(' + ignoreKeywords.replace(/,/g, '\\b|') + '\\b)')

/**
 * Parse text and return expressions.
 * @param {String} text
 * @return {Array<Object>}
 *               - rawExp {String}         e.g "{firstName() + lastName()}"
 *               - exp {String}            e.g "firstName() + lastName()"
 *               - tokens {Array<String>}  e.g ["firstName", "lastName"]
 */
exports.parse = function(text) {
  makeREG()
  var rawExps = exports.getRawExps(text)
  var expressions = []
  _.each(rawExps, function(rawExp) {
    var exp = exports.getExpFromRawExp(rawExp)
    var candidates = exp.match(KEYWORD_REG) || []
    var tokens = []
    _.each(candidates, function(candidate) {
      if (IGNORE_KEYWORDS_REG.test(candidate)) return
      tokens.push(candidate)
    })
    var expression = {
      rawExp: rawExp,
      exp: exp,
      tokens:tokens 
    }
    expressions.push(expression)
  })
  return expressions 
}

exports.exec = function(expression, vm) {
  var args = []
  var tokens = expression.tokens
  _.each(tokens, function(token) {
    args.push(vm[token])
  })
  var exp = "return " + expression.exp + ";"
  return (new Function(tokens, exp)).apply(vm, args)
}

makeREG()
},{"./config":1,"./util":4}],4:[function(require,module,exports){
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

},{"./obserable":2}],5:[function(require,module,exports){
//require("./specs/sample.js")
require("./specs/util.js")
//require("./specs/dom-test.js")
require("./specs/obserable.js")
require("./specs/parser.js")

},{"./specs/obserable.js":6,"./specs/parser.js":7,"./specs/util.js":8}],6:[function(require,module,exports){
var obserable = require("../../src/obserable.js")

describe("Test obserable", function() {
  describe("Test obserable string attribute", function() {
    var attr = null;

    before(function() {
      attr = obserable("i love you")
    })

    it("Initializing default value and get it.", function() {
      attr().should.be.equal("i love you")
    })

    it("Watcher function should be invoked when value is changed.", function() {
      var watcher = sinon.spy()
      attr.$$.watch(watcher)
      var val = "i love you, too"
      attr(val)
      watcher.should.have.been.calledWith(val, attr.$$)
      watcher.should.have.been.calledOnce
      attr().should.be.equal("i love you, too")
    })

  })
})
},{"../../src/obserable.js":2}],7:[function(require,module,exports){
var parser = require("../../src/parser")
var config = require("../../src/config")

describe("Test parser", function() {

  it("Get raw expressions from text.", function() {
    parser.getRawExps("{firstName + lastName} is my {name}")
          .should.be.deep.equal(["{firstName + lastName}", "{name}"])
  })
  
  it("Get expression objects from text.", function() {
    parser.parse("{name() === true ? good(): bad()}")
          .should.be.deep.equal([{
            rawExp: "{name() === true ? good(): bad()}",
            exp: "name() === true ? good(): bad()",
            tokens: ["name", "good", "bad"]
          }])
    parser.parse("Today totalCount is {parseFloat(totalCount())}, {name} should make it.")
          .should.be.deep.equal([{
            rawExp: "{parseFloat(totalCount())}",
            exp: "parseFloat(totalCount())",
            tokens: ["totalCount"]
          }, {
            rawExp: "{name}",
            exp: "name",
            tokens: ["name"]
          }])
  })

  it("Execute an expression.", function() {
    parser.exec({
      exp: "this.lucy + name() + 1",
      tokens: ["name"]
    }, {
      name: function() {
        return "Jerry!"
      },
      lucy: "good"
    }).should.be.equal("goodJerry!1")
  })

  it("Parse with custom open and close tag.", function() {
    config.openTag = "{{"
    config.closeTag = "}}"
    parser.parse("{{name() === true ? good(): bad()}}")
          .should.be.deep.equal([{
            rawExp: "{{name() === true ? good(): bad()}}",
            exp: "name() === true ? good(): bad()",
            tokens: ["name", "good", "bad"]
          }])
  })
})
},{"../../src/config":1,"../../src/parser":3}],8:[function(require,module,exports){
_ = require("../../src/util.js")

describe("Test utils functions", function() {
  it("map", function() {
    var arr = [1, 2, 3, 4]
    var newArr = _.map(arr, function(val) {
      return val * 2
    })
    for(var i = 0, len = arr.length; i < len; i++) {
      arr[i] = arr[i] * 2
    }
    arr.should.be.deep.equal(newArr)
  })
})
},{"../../src/util.js":4}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvb2JzZXJhYmxlLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9wYXJzZXIuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL3V0aWwuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvdGVzdC9mYWtlXzlmOThmNzNlLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3Rlc3Qvc3BlY3Mvb2JzZXJhYmxlLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3Rlc3Qvc3BlY3MvcGFyc2VyLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3Rlc3Qvc3BlY3MvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29uZmlnID0gZXhwb3J0c1xuXG5jb25maWcub3BlblRhZyA9IFwie1wiXG5jb25maWcuY2xvc2VUYWcgPSBcIn1cIlxuY29uZmlnLmRpcmVjdGl2ZVByZWZpeCA9IFwia1wiXG4iLCJ2YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWwuanNcIilcblxuZnVuY3Rpb24gT2JzZXJhYmxlS2V5KGF0dHIpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIHRoaXMudmFsdWUgPSBhdHRyXG4gIHRoaXMud2F0Y2hlcnMgPSBbXVxuICBmdW5jdGlvbiBnZXRPclNldChhdHRyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGF0LnZhbHVlXG4gICAgfVxuICAgIHRoYXQudmFsdWUgPSBhdHRyXG4gICAgdGhhdC5ub3RpZnkoKVxuICB9XG4gIGdldE9yU2V0LiQkID0gdGhhdFxuICByZXR1cm4gZ2V0T3JTZXRcbn1cblxuT2JzZXJhYmxlS2V5LnByb3RvdHlwZS5ub3RpZnkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIF8uZWFjaCh0aGlzLndhdGNoZXJzLCBmdW5jdGlvbih3YXRjaGVyKSB7XG4gICAgd2F0Y2hlcih0aGF0LnZhbHVlLCB0aGF0KVxuICB9KVxufVxuXG5PYnNlcmFibGVLZXkucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24oZm4pIHtcbiAgdGhpcy53YXRjaGVycy5wdXNoKGZuKVxufVxuXG5mdW5jdGlvbiBPYnNlcmFibGVBcnJheShhcnIpIHtcbiAgXG59XG5cbmZ1bmN0aW9uIG9ic2VyYWJsZShvYmopIHtcbiAgaWYgKCFfLmlzQXJyYXkob2JqKSkge1xuICAgIHJldHVybiBuZXcgT2JzZXJhYmxlS2V5KG9iailcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IE9ic2VyYWJsZUFycmF5KG9iailcbiAgfVxufVxuXG5vYnNlcmFibGUuT2JzZXJhYmxlS2V5ID0gT2JzZXJhYmxlS2V5XG5vYnNlcmFibGUuT2JzZXJhYmxlQXJyYXkgPSBPYnNlcmFibGVBcnJheVxuXG5tb2R1bGUuZXhwb3J0cyA9IG9ic2VyYWJsZVxuIiwidmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ1wiKVxudmFyIF8gPSByZXF1aXJlKFwiLi91dGlsXCIpXG5cbnZhciBTUEVDSUFMX0NIQVJTID0gLyhcXCpcXC5cXD9cXCtcXCRcXF5cXFtcXF1cXChcXClcXHtcXH1cXHxcXFxcXFwvKS9nXG52YXIgb3BlblRhZywgY2xvc2VUYWcsIEVYUF9SRUcsIFJFTU9WRV9SRUdcblxuZnVuY3Rpb24gbWFrZVJFRygpIHtcbiAgb3BlblRhZyA9IGNvbmZpZy5vcGVuVGFnLnJlcGxhY2UoU1BFQ0lBTF9DSEFSUywgXCJcXFxcJDFcIilcbiAgY2xvc2VUYWcgPSBjb25maWcuY2xvc2VUYWcucmVwbGFjZShTUEVDSUFMX0NIQVJTLCBcIlxcXFwkMVwiKVxuXG4gIEVYUF9SRUcgPSBuZXcgUmVnRXhwKG9wZW5UYWcgKyBcIltcXFxcU1xcXFxzXSs/XCIgKyBjbG9zZVRhZywgJ2cnKVxuICBSRU1PVkVfUkVHID0gbmV3IFJlZ0V4cChvcGVuVGFnICsgXCJ8XCIgKyBjbG9zZVRhZywgJ2cnKVxufVxuXG5leHBvcnRzLmdldFJhd0V4cHMgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHZhciByZXN1bHRzID0gdGV4dC5tYXRjaChFWFBfUkVHKSB8fCBbXVxuICByZXR1cm4gcmVzdWx0c1xufVxuXG5leHBvcnRzLmdldEV4cEZyb21SYXdFeHAgPSBmdW5jdGlvbihyYXdFeHApIHtcbiAgcmV0dXJuIHJhd0V4cC5yZXBsYWNlKFJFTU9WRV9SRUcsIFwiXCIpXG59XG5cbi8qKiBcbiAqIFN0ZWFsIGZyb20gVnVlLmpzOiBcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS95eXg5OTA4MDMvdnVlL2Jsb2IvZGV2L3NyYy9wYXJzZXJzL2V4cHJlc3Npb24uanNcbiAqL1xudmFyIEtFWVdPUkRfUkVHID0gL1tfXFx3XVtfJFxcd1xcZF0rL2dcbnZhciBpZ25vcmVLZXl3b3JkcyA9XG4gICdNYXRoLERhdGUsdGhpcyx0cnVlLGZhbHNlLG51bGwsdW5kZWZpbmVkLEluZmluaXR5LE5hTiwnICtcbiAgJ2lzTmFOLGlzRmluaXRlLGRlY29kZVVSSSxkZWNvZGVVUklDb21wb25lbnQsZW5jb2RlVVJJLCcgK1xuICAnZW5jb2RlVVJJQ29tcG9uZW50LHBhcnNlSW50LHBhcnNlRmxvYXQnXG52YXIgSUdOT1JFX0tFWVdPUkRTX1JFRyA9IFxuICBuZXcgUmVnRXhwKCdeKCcgKyBpZ25vcmVLZXl3b3Jkcy5yZXBsYWNlKC8sL2csICdcXFxcYnwnKSArICdcXFxcYiknKVxuXG4vKipcbiAqIFBhcnNlIHRleHQgYW5kIHJldHVybiBleHByZXNzaW9ucy5cbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtBcnJheTxPYmplY3Q+fVxuICogICAgICAgICAgICAgICAtIHJhd0V4cCB7U3RyaW5nfSAgICAgICAgIGUuZyBcIntmaXJzdE5hbWUoKSArIGxhc3ROYW1lKCl9XCJcbiAqICAgICAgICAgICAgICAgLSBleHAge1N0cmluZ30gICAgICAgICAgICBlLmcgXCJmaXJzdE5hbWUoKSArIGxhc3ROYW1lKClcIlxuICogICAgICAgICAgICAgICAtIHRva2VucyB7QXJyYXk8U3RyaW5nPn0gIGUuZyBbXCJmaXJzdE5hbWVcIiwgXCJsYXN0TmFtZVwiXVxuICovXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24odGV4dCkge1xuICBtYWtlUkVHKClcbiAgdmFyIHJhd0V4cHMgPSBleHBvcnRzLmdldFJhd0V4cHModGV4dClcbiAgdmFyIGV4cHJlc3Npb25zID0gW11cbiAgXy5lYWNoKHJhd0V4cHMsIGZ1bmN0aW9uKHJhd0V4cCkge1xuICAgIHZhciBleHAgPSBleHBvcnRzLmdldEV4cEZyb21SYXdFeHAocmF3RXhwKVxuICAgIHZhciBjYW5kaWRhdGVzID0gZXhwLm1hdGNoKEtFWVdPUkRfUkVHKSB8fCBbXVxuICAgIHZhciB0b2tlbnMgPSBbXVxuICAgIF8uZWFjaChjYW5kaWRhdGVzLCBmdW5jdGlvbihjYW5kaWRhdGUpIHtcbiAgICAgIGlmIChJR05PUkVfS0VZV09SRFNfUkVHLnRlc3QoY2FuZGlkYXRlKSkgcmV0dXJuXG4gICAgICB0b2tlbnMucHVzaChjYW5kaWRhdGUpXG4gICAgfSlcbiAgICB2YXIgZXhwcmVzc2lvbiA9IHtcbiAgICAgIHJhd0V4cDogcmF3RXhwLFxuICAgICAgZXhwOiBleHAsXG4gICAgICB0b2tlbnM6dG9rZW5zIFxuICAgIH1cbiAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb24pXG4gIH0pXG4gIHJldHVybiBleHByZXNzaW9ucyBcbn1cblxuZXhwb3J0cy5leGVjID0gZnVuY3Rpb24oZXhwcmVzc2lvbiwgdm0pIHtcbiAgdmFyIGFyZ3MgPSBbXVxuICB2YXIgdG9rZW5zID0gZXhwcmVzc2lvbi50b2tlbnNcbiAgXy5lYWNoKHRva2VucywgZnVuY3Rpb24odG9rZW4pIHtcbiAgICBhcmdzLnB1c2godm1bdG9rZW5dKVxuICB9KVxuICB2YXIgZXhwID0gXCJyZXR1cm4gXCIgKyBleHByZXNzaW9uLmV4cCArIFwiO1wiXG4gIHJldHVybiAobmV3IEZ1bmN0aW9uKHRva2VucywgZXhwKSkuYXBwbHkodm0sIGFyZ3MpXG59XG5cbm1ha2VSRUcoKSIsInZhciBvYnNlcmFibGUgPSByZXF1aXJlKFwiLi9vYnNlcmFibGVcIilcblxuZXhwb3J0cy5pc09ic2VyYWJsZSA9IGZ1bmN0aW9uKG9iaikge1xuICB2YXIgb2JqID0gb2JqLiQkXG4gIHJldHVybiAob2JqIGluc3RhbmNlb2Ygb2JzZXJhYmxlLk9ic2VyYWJsZUtleSkgfHxcbiAgICAgICAgIChvYmogaW5zdGFuY2VvZiBvYnNlcmFibGUuT2JzZXJhYmxlQXJyYXkpXG59XG5cbmV4cG9ydHMubWFwID0gZnVuY3Rpb24oYXJyLCBmbikge1xuICB2YXIgcmVzdWx0cyA9IFtdXG4gIGZvcih2YXIgaSA9IDAsIGxlbiA9IGFyci5sZW5ndGg7IGkgPCBsZW47aSArKykge1xuICAgIHJlc3VsdHMucHVzaChmbihhcnJbaV0pKVxuICB9XG4gIHJldHVybiByZXN1bHRzXG59XG5cbmV4cG9ydHMuaXNBcnJheSA9IGZ1bmN0aW9uKGFycikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycikgPT09ICdbb2JqZWN0IEFycmF5XSdcbn1cblxuZXhwb3J0cy5lYWNoID0gZnVuY3Rpb24oYXJyLCBmbikge1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXJyLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgZm4oYXJyW2ldKVxuICB9XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBvYmogPT09IHZvaWQgNjY2O1xufTtcblxuLyoqXG4gKiBBZGQgc29tZSBpc1R5cGUgbWV0aG9kczogaXNBcmd1bWVudHMsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNEYXRlLCBpc1JlZ0V4cCwgaXNFcnJvci5cbiAqIHN0ZWFsIGZyb20gdW5kZXJzY29yZTogaHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvZG9jcy91bmRlcnNjb3JlLmh0bWxcbiAqL1xuZXhwb3J0cy5lYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnLCAnRXJyb3InXSwgZnVuY3Rpb24obmFtZSkge1xuICBleHBvcnRzWydpcycgKyBuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBiamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCAnICsgbmFtZSArICddJztcbiAgfTtcbn0pO1xuIiwiLy9yZXF1aXJlKFwiLi9zcGVjcy9zYW1wbGUuanNcIilcbnJlcXVpcmUoXCIuL3NwZWNzL3V0aWwuanNcIilcbi8vcmVxdWlyZShcIi4vc3BlY3MvZG9tLXRlc3QuanNcIilcbnJlcXVpcmUoXCIuL3NwZWNzL29ic2VyYWJsZS5qc1wiKVxucmVxdWlyZShcIi4vc3BlY3MvcGFyc2VyLmpzXCIpXG4iLCJ2YXIgb2JzZXJhYmxlID0gcmVxdWlyZShcIi4uLy4uL3NyYy9vYnNlcmFibGUuanNcIilcblxuZGVzY3JpYmUoXCJUZXN0IG9ic2VyYWJsZVwiLCBmdW5jdGlvbigpIHtcbiAgZGVzY3JpYmUoXCJUZXN0IG9ic2VyYWJsZSBzdHJpbmcgYXR0cmlidXRlXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBhdHRyID0gbnVsbDtcblxuICAgIGJlZm9yZShmdW5jdGlvbigpIHtcbiAgICAgIGF0dHIgPSBvYnNlcmFibGUoXCJpIGxvdmUgeW91XCIpXG4gICAgfSlcblxuICAgIGl0KFwiSW5pdGlhbGl6aW5nIGRlZmF1bHQgdmFsdWUgYW5kIGdldCBpdC5cIiwgZnVuY3Rpb24oKSB7XG4gICAgICBhdHRyKCkuc2hvdWxkLmJlLmVxdWFsKFwiaSBsb3ZlIHlvdVwiKVxuICAgIH0pXG5cbiAgICBpdChcIldhdGNoZXIgZnVuY3Rpb24gc2hvdWxkIGJlIGludm9rZWQgd2hlbiB2YWx1ZSBpcyBjaGFuZ2VkLlwiLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3YXRjaGVyID0gc2lub24uc3B5KClcbiAgICAgIGF0dHIuJCQud2F0Y2god2F0Y2hlcilcbiAgICAgIHZhciB2YWwgPSBcImkgbG92ZSB5b3UsIHRvb1wiXG4gICAgICBhdHRyKHZhbClcbiAgICAgIHdhdGNoZXIuc2hvdWxkLmhhdmUuYmVlbi5jYWxsZWRXaXRoKHZhbCwgYXR0ci4kJClcbiAgICAgIHdhdGNoZXIuc2hvdWxkLmhhdmUuYmVlbi5jYWxsZWRPbmNlXG4gICAgICBhdHRyKCkuc2hvdWxkLmJlLmVxdWFsKFwiaSBsb3ZlIHlvdSwgdG9vXCIpXG4gICAgfSlcblxuICB9KVxufSkiLCJ2YXIgcGFyc2VyID0gcmVxdWlyZShcIi4uLy4uL3NyYy9wYXJzZXJcIilcbnZhciBjb25maWcgPSByZXF1aXJlKFwiLi4vLi4vc3JjL2NvbmZpZ1wiKVxuXG5kZXNjcmliZShcIlRlc3QgcGFyc2VyXCIsIGZ1bmN0aW9uKCkge1xuXG4gIGl0KFwiR2V0IHJhdyBleHByZXNzaW9ucyBmcm9tIHRleHQuXCIsIGZ1bmN0aW9uKCkge1xuICAgIHBhcnNlci5nZXRSYXdFeHBzKFwie2ZpcnN0TmFtZSArIGxhc3ROYW1lfSBpcyBteSB7bmFtZX1cIilcbiAgICAgICAgICAuc2hvdWxkLmJlLmRlZXAuZXF1YWwoW1wie2ZpcnN0TmFtZSArIGxhc3ROYW1lfVwiLCBcIntuYW1lfVwiXSlcbiAgfSlcbiAgXG4gIGl0KFwiR2V0IGV4cHJlc3Npb24gb2JqZWN0cyBmcm9tIHRleHQuXCIsIGZ1bmN0aW9uKCkge1xuICAgIHBhcnNlci5wYXJzZShcIntuYW1lKCkgPT09IHRydWUgPyBnb29kKCk6IGJhZCgpfVwiKVxuICAgICAgICAgIC5zaG91bGQuYmUuZGVlcC5lcXVhbChbe1xuICAgICAgICAgICAgcmF3RXhwOiBcIntuYW1lKCkgPT09IHRydWUgPyBnb29kKCk6IGJhZCgpfVwiLFxuICAgICAgICAgICAgZXhwOiBcIm5hbWUoKSA9PT0gdHJ1ZSA/IGdvb2QoKTogYmFkKClcIixcbiAgICAgICAgICAgIHRva2VuczogW1wibmFtZVwiLCBcImdvb2RcIiwgXCJiYWRcIl1cbiAgICAgICAgICB9XSlcbiAgICBwYXJzZXIucGFyc2UoXCJUb2RheSB0b3RhbENvdW50IGlzIHtwYXJzZUZsb2F0KHRvdGFsQ291bnQoKSl9LCB7bmFtZX0gc2hvdWxkIG1ha2UgaXQuXCIpXG4gICAgICAgICAgLnNob3VsZC5iZS5kZWVwLmVxdWFsKFt7XG4gICAgICAgICAgICByYXdFeHA6IFwie3BhcnNlRmxvYXQodG90YWxDb3VudCgpKX1cIixcbiAgICAgICAgICAgIGV4cDogXCJwYXJzZUZsb2F0KHRvdGFsQ291bnQoKSlcIixcbiAgICAgICAgICAgIHRva2VuczogW1widG90YWxDb3VudFwiXVxuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgIHJhd0V4cDogXCJ7bmFtZX1cIixcbiAgICAgICAgICAgIGV4cDogXCJuYW1lXCIsXG4gICAgICAgICAgICB0b2tlbnM6IFtcIm5hbWVcIl1cbiAgICAgICAgICB9XSlcbiAgfSlcblxuICBpdChcIkV4ZWN1dGUgYW4gZXhwcmVzc2lvbi5cIiwgZnVuY3Rpb24oKSB7XG4gICAgcGFyc2VyLmV4ZWMoe1xuICAgICAgZXhwOiBcInRoaXMubHVjeSArIG5hbWUoKSArIDFcIixcbiAgICAgIHRva2VuczogW1wibmFtZVwiXVxuICAgIH0sIHtcbiAgICAgIG5hbWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gXCJKZXJyeSFcIlxuICAgICAgfSxcbiAgICAgIGx1Y3k6IFwiZ29vZFwiXG4gICAgfSkuc2hvdWxkLmJlLmVxdWFsKFwiZ29vZEplcnJ5ITFcIilcbiAgfSlcblxuICBpdChcIlBhcnNlIHdpdGggY3VzdG9tIG9wZW4gYW5kIGNsb3NlIHRhZy5cIiwgZnVuY3Rpb24oKSB7XG4gICAgY29uZmlnLm9wZW5UYWcgPSBcInt7XCJcbiAgICBjb25maWcuY2xvc2VUYWcgPSBcIn19XCJcbiAgICBwYXJzZXIucGFyc2UoXCJ7e25hbWUoKSA9PT0gdHJ1ZSA/IGdvb2QoKTogYmFkKCl9fVwiKVxuICAgICAgICAgIC5zaG91bGQuYmUuZGVlcC5lcXVhbChbe1xuICAgICAgICAgICAgcmF3RXhwOiBcInt7bmFtZSgpID09PSB0cnVlID8gZ29vZCgpOiBiYWQoKX19XCIsXG4gICAgICAgICAgICBleHA6IFwibmFtZSgpID09PSB0cnVlID8gZ29vZCgpOiBiYWQoKVwiLFxuICAgICAgICAgICAgdG9rZW5zOiBbXCJuYW1lXCIsIFwiZ29vZFwiLCBcImJhZFwiXVxuICAgICAgICAgIH1dKVxuICB9KVxufSkiLCJfID0gcmVxdWlyZShcIi4uLy4uL3NyYy91dGlsLmpzXCIpXG5cbmRlc2NyaWJlKFwiVGVzdCB1dGlscyBmdW5jdGlvbnNcIiwgZnVuY3Rpb24oKSB7XG4gIGl0KFwibWFwXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcnIgPSBbMSwgMiwgMywgNF1cbiAgICB2YXIgbmV3QXJyID0gXy5tYXAoYXJyLCBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiB2YWwgKiAyXG4gICAgfSlcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFycltpXSA9IGFycltpXSAqIDJcbiAgICB9XG4gICAgYXJyLnNob3VsZC5iZS5kZWVwLmVxdWFsKG5ld0FycilcbiAgfSlcbn0pIl19
