(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var config = {}

config.openTag = "{"
config.closeTag = "}"

module.exports = config
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
var exports = {}

var EXP_REG = new RegExp("\\" + config.openTag + "[\\S\\s]+?" + "\\" + config.closeTag, 'g')
var REMOVE_REG = new RegExp("\\" + config.openTag + "|" + "\\" + config.closeTag, 'g')

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
 * @return {Array<Object>}
 *               - rawExp {String}         e.g "{firstName() + lastName()}"
 *               - exp {String}            e.g "firstName() + lastName()"
 *               - tokens {Array<String>}  e.g ["firstName", "lastName"]
 */
exports.parse = function(text) {
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

module.exports = exports
},{"./config":1,"./util":4}],4:[function(require,module,exports){
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


},{}],5:[function(require,module,exports){
//require("./specs/sample.js")
require("./specs/util.js")
require("./specs/dom-test.js")
require("./specs/obserable.js")
require("./specs/parser.js")

},{"./specs/dom-test.js":6,"./specs/obserable.js":7,"./specs/parser.js":8,"./specs/util.js":9}],6:[function(require,module,exports){
describe("Test DOM", function() {
  function compileNode(node) {
    //console.log(node.nodeType);
    if (node.nodeType === 1) {
      var children = node.childNodes;
      for(var i = 0, len = children.length; i < len; i++) {
        var el = children[i]
        compileNode(el)
      }
    } if (node.nodeType === 3) {
      //console.log(node.innerHTML);
      //compileNode(node)
    }
  }
  it("should iterate all dom nodes", function() {
    //var tpl = require("../fixtures/tpl.html");
    var tpl = "<div id='main'>{name}<ul><li k-repeat='todos'>{name}</li></ul></div>"
    var dom = document.createElement("div")
    dom.innerHTML = tpl;
    compileNode(dom)
  })
})

},{}],7:[function(require,module,exports){
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
},{"../../src/obserable.js":2}],8:[function(require,module,exports){
var parser = require("../../src/parser")

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
})
},{"../../src/parser":3}],9:[function(require,module,exports){
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

  it("Test jQuery and DOM", function() {
    var $body = $(document.body)
    $body.html("Kue")
    $body.html().should.be.equal("Kue")
  })
})
},{"../../src/util.js":4}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvb2JzZXJhYmxlLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9wYXJzZXIuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL3V0aWwuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvdGVzdC9mYWtlX2QzMzUwOWFkLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3Rlc3Qvc3BlY3MvZG9tLXRlc3QuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvdGVzdC9zcGVjcy9vYnNlcmFibGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvdGVzdC9zcGVjcy9wYXJzZXIuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvdGVzdC9zcGVjcy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29uZmlnID0ge31cblxuY29uZmlnLm9wZW5UYWcgPSBcIntcIlxuY29uZmlnLmNsb3NlVGFnID0gXCJ9XCJcblxubW9kdWxlLmV4cG9ydHMgPSBjb25maWciLCJ2YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWwuanNcIilcblxuZnVuY3Rpb24gT2JzZXJhYmxlS2V5KGF0dHIpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIHRoaXMudmFsdWUgPSBhdHRyXG4gIHRoaXMud2F0Y2hlcnMgPSBbXVxuICBmdW5jdGlvbiBnZXRPclNldChhdHRyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGF0LnZhbHVlXG4gICAgfVxuICAgIHRoYXQudmFsdWUgPSBhdHRyXG4gICAgdGhhdC5ub3RpZnkoKVxuICB9XG4gIGdldE9yU2V0LiQkID0gdGhhdFxuICByZXR1cm4gZ2V0T3JTZXRcbn1cblxuT2JzZXJhYmxlS2V5LnByb3RvdHlwZS5ub3RpZnkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIF8uZWFjaCh0aGlzLndhdGNoZXJzLCBmdW5jdGlvbih3YXRjaGVyKSB7XG4gICAgd2F0Y2hlcih0aGF0LnZhbHVlLCB0aGF0KVxuICB9KVxufVxuXG5PYnNlcmFibGVLZXkucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24oZm4pIHtcbiAgdGhpcy53YXRjaGVycy5wdXNoKGZuKVxufVxuXG5mdW5jdGlvbiBPYnNlcmFibGVBcnJheShhcnIpIHtcbiAgXG59XG5cbmZ1bmN0aW9uIG9ic2VyYWJsZShvYmopIHtcbiAgaWYgKCFfLmlzQXJyYXkob2JqKSkge1xuICAgIHJldHVybiBuZXcgT2JzZXJhYmxlS2V5KG9iailcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IE9ic2VyYWJsZUFycmF5KG9iailcbiAgfVxufVxuXG5vYnNlcmFibGUuT2JzZXJhYmxlS2V5ID0gT2JzZXJhYmxlS2V5XG5vYnNlcmFibGUuT2JzZXJhYmxlQXJyYXkgPSBPYnNlcmFibGVBcnJheVxuXG5tb2R1bGUuZXhwb3J0cyA9IG9ic2VyYWJsZVxuIiwidmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ1wiKVxudmFyIF8gPSByZXF1aXJlKFwiLi91dGlsXCIpXG52YXIgZXhwb3J0cyA9IHt9XG5cbnZhciBFWFBfUkVHID0gbmV3IFJlZ0V4cChcIlxcXFxcIiArIGNvbmZpZy5vcGVuVGFnICsgXCJbXFxcXFNcXFxcc10rP1wiICsgXCJcXFxcXCIgKyBjb25maWcuY2xvc2VUYWcsICdnJylcbnZhciBSRU1PVkVfUkVHID0gbmV3IFJlZ0V4cChcIlxcXFxcIiArIGNvbmZpZy5vcGVuVGFnICsgXCJ8XCIgKyBcIlxcXFxcIiArIGNvbmZpZy5jbG9zZVRhZywgJ2cnKVxuXG5leHBvcnRzLmdldFJhd0V4cHMgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHZhciByZXN1bHRzID0gdGV4dC5tYXRjaChFWFBfUkVHKSB8fCBbXVxuICByZXR1cm4gcmVzdWx0c1xufVxuXG5leHBvcnRzLmdldEV4cEZyb21SYXdFeHAgPSBmdW5jdGlvbihyYXdFeHApIHtcbiAgcmV0dXJuIHJhd0V4cC5yZXBsYWNlKFJFTU9WRV9SRUcsIFwiXCIpXG59XG5cbi8qKiBcbiAqIFN0ZWFsIGZyb20gVnVlLmpzOiBcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS95eXg5OTA4MDMvdnVlL2Jsb2IvZGV2L3NyYy9wYXJzZXJzL2V4cHJlc3Npb24uanNcbiAqL1xudmFyIEtFWVdPUkRfUkVHID0gL1tfXFx3XVtfJFxcd1xcZF0rL2dcbnZhciBpZ25vcmVLZXl3b3JkcyA9XG4gICdNYXRoLERhdGUsdGhpcyx0cnVlLGZhbHNlLG51bGwsdW5kZWZpbmVkLEluZmluaXR5LE5hTiwnICtcbiAgJ2lzTmFOLGlzRmluaXRlLGRlY29kZVVSSSxkZWNvZGVVUklDb21wb25lbnQsZW5jb2RlVVJJLCcgK1xuICAnZW5jb2RlVVJJQ29tcG9uZW50LHBhcnNlSW50LHBhcnNlRmxvYXQnXG52YXIgSUdOT1JFX0tFWVdPUkRTX1JFRyA9IFxuICBuZXcgUmVnRXhwKCdeKCcgKyBpZ25vcmVLZXl3b3Jkcy5yZXBsYWNlKC8sL2csICdcXFxcYnwnKSArICdcXFxcYiknKVxuXG4vKipcbiAqIFBhcnNlIHRleHQgYW5kIHJldHVybiBleHByZXNzaW9ucy5cbiAqIEByZXR1cm4ge0FycmF5PE9iamVjdD59XG4gKiAgICAgICAgICAgICAgIC0gcmF3RXhwIHtTdHJpbmd9ICAgICAgICAgZS5nIFwie2ZpcnN0TmFtZSgpICsgbGFzdE5hbWUoKX1cIlxuICogICAgICAgICAgICAgICAtIGV4cCB7U3RyaW5nfSAgICAgICAgICAgIGUuZyBcImZpcnN0TmFtZSgpICsgbGFzdE5hbWUoKVwiXG4gKiAgICAgICAgICAgICAgIC0gdG9rZW5zIHtBcnJheTxTdHJpbmc+fSAgZS5nIFtcImZpcnN0TmFtZVwiLCBcImxhc3ROYW1lXCJdXG4gKi9cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHZhciByYXdFeHBzID0gZXhwb3J0cy5nZXRSYXdFeHBzKHRleHQpXG4gIHZhciBleHByZXNzaW9ucyA9IFtdXG4gIF8uZWFjaChyYXdFeHBzLCBmdW5jdGlvbihyYXdFeHApIHtcbiAgICB2YXIgZXhwID0gZXhwb3J0cy5nZXRFeHBGcm9tUmF3RXhwKHJhd0V4cClcbiAgICB2YXIgY2FuZGlkYXRlcyA9IGV4cC5tYXRjaChLRVlXT1JEX1JFRykgfHwgW11cbiAgICB2YXIgdG9rZW5zID0gW11cbiAgICBfLmVhY2goY2FuZGlkYXRlcywgZnVuY3Rpb24oY2FuZGlkYXRlKSB7XG4gICAgICBpZiAoSUdOT1JFX0tFWVdPUkRTX1JFRy50ZXN0KGNhbmRpZGF0ZSkpIHJldHVyblxuICAgICAgdG9rZW5zLnB1c2goY2FuZGlkYXRlKVxuICAgIH0pXG4gICAgdmFyIGV4cHJlc3Npb24gPSB7XG4gICAgICByYXdFeHA6IHJhd0V4cCxcbiAgICAgIGV4cDogZXhwLFxuICAgICAgdG9rZW5zOnRva2VucyBcbiAgICB9XG4gICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uKVxuICB9KVxuICByZXR1cm4gZXhwcmVzc2lvbnMgXG59XG5cbmV4cG9ydHMuZXhlYyA9IGZ1bmN0aW9uKGV4cHJlc3Npb24sIHZtKSB7XG4gIHZhciBhcmdzID0gW11cbiAgdmFyIHRva2VucyA9IGV4cHJlc3Npb24udG9rZW5zXG4gIF8uZWFjaCh0b2tlbnMsIGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgYXJncy5wdXNoKHZtW3Rva2VuXSlcbiAgfSlcbiAgdmFyIGV4cCA9IFwicmV0dXJuIFwiICsgZXhwcmVzc2lvbi5leHAgKyBcIjtcIlxuICByZXR1cm4gKG5ldyBGdW5jdGlvbih0b2tlbnMsIGV4cCkpLmFwcGx5KHZtLCBhcmdzKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMiLCJleHBvcnRzLm1hcCA9IGZ1bmN0aW9uKGFyciwgZm4pIHtcbiAgdmFyIHJlc3VsdHMgPSBbXVxuICBmb3IodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuO2kgKyspIHtcbiAgICByZXN1bHRzLnB1c2goZm4oYXJyW2ldKSlcbiAgfVxuICByZXR1cm4gcmVzdWx0c1xufVxuXG5leHBvcnRzLmlzQXJyYXkgPSBmdW5jdGlvbihhcnIpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09PSAnW29iamVjdCBBcnJheV0nXG59XG5cbmV4cG9ydHMuZWFjaCA9IGZ1bmN0aW9uKGFyciwgZm4pIHtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGZuKGFycltpXSlcbiAgfVxufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gb2JqID09PSB2b2lkIDY2Njtcbn07XG5cbi8qKlxuICogQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAsIGlzRXJyb3IuXG4gKiBzdGVhbCBmcm9tIHVuZGVyc2NvcmU6IGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL2RvY3MvdW5kZXJzY29yZS5odG1sXG4gKi9cbmV4cG9ydHMuZWFjaChbJ0FyZ3VtZW50cycsICdGdW5jdGlvbicsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnLCAnUmVnRXhwJywgJ0Vycm9yJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgZXhwb3J0c1snaXMnICsgbmFtZV0gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gIH07XG59KTtcblxuIiwiLy9yZXF1aXJlKFwiLi9zcGVjcy9zYW1wbGUuanNcIilcbnJlcXVpcmUoXCIuL3NwZWNzL3V0aWwuanNcIilcbnJlcXVpcmUoXCIuL3NwZWNzL2RvbS10ZXN0LmpzXCIpXG5yZXF1aXJlKFwiLi9zcGVjcy9vYnNlcmFibGUuanNcIilcbnJlcXVpcmUoXCIuL3NwZWNzL3BhcnNlci5qc1wiKVxuIiwiZGVzY3JpYmUoXCJUZXN0IERPTVwiLCBmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gY29tcGlsZU5vZGUobm9kZSkge1xuICAgIC8vY29uc29sZS5sb2cobm9kZS5ub2RlVHlwZSk7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGROb2RlcztcbiAgICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBlbCA9IGNoaWxkcmVuW2ldXG4gICAgICAgIGNvbXBpbGVOb2RlKGVsKVxuICAgICAgfVxuICAgIH0gaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgIC8vY29uc29sZS5sb2cobm9kZS5pbm5lckhUTUwpO1xuICAgICAgLy9jb21waWxlTm9kZShub2RlKVxuICAgIH1cbiAgfVxuICBpdChcInNob3VsZCBpdGVyYXRlIGFsbCBkb20gbm9kZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgLy92YXIgdHBsID0gcmVxdWlyZShcIi4uL2ZpeHR1cmVzL3RwbC5odG1sXCIpO1xuICAgIHZhciB0cGwgPSBcIjxkaXYgaWQ9J21haW4nPntuYW1lfTx1bD48bGkgay1yZXBlYXQ9J3RvZG9zJz57bmFtZX08L2xpPjwvdWw+PC9kaXY+XCJcbiAgICB2YXIgZG9tID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgIGRvbS5pbm5lckhUTUwgPSB0cGw7XG4gICAgY29tcGlsZU5vZGUoZG9tKVxuICB9KVxufSlcbiIsInZhciBvYnNlcmFibGUgPSByZXF1aXJlKFwiLi4vLi4vc3JjL29ic2VyYWJsZS5qc1wiKVxuXG5kZXNjcmliZShcIlRlc3Qgb2JzZXJhYmxlXCIsIGZ1bmN0aW9uKCkge1xuICBkZXNjcmliZShcIlRlc3Qgb2JzZXJhYmxlIHN0cmluZyBhdHRyaWJ1dGVcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGF0dHIgPSBudWxsO1xuXG4gICAgYmVmb3JlKGZ1bmN0aW9uKCkge1xuICAgICAgYXR0ciA9IG9ic2VyYWJsZShcImkgbG92ZSB5b3VcIilcbiAgICB9KVxuXG4gICAgaXQoXCJJbml0aWFsaXppbmcgZGVmYXVsdCB2YWx1ZSBhbmQgZ2V0IGl0LlwiLCBmdW5jdGlvbigpIHtcbiAgICAgIGF0dHIoKS5zaG91bGQuYmUuZXF1YWwoXCJpIGxvdmUgeW91XCIpXG4gICAgfSlcblxuICAgIGl0KFwiV2F0Y2hlciBmdW5jdGlvbiBzaG91bGQgYmUgaW52b2tlZCB3aGVuIHZhbHVlIGlzIGNoYW5nZWQuXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHdhdGNoZXIgPSBzaW5vbi5zcHkoKVxuICAgICAgYXR0ci4kJC53YXRjaCh3YXRjaGVyKVxuICAgICAgdmFyIHZhbCA9IFwiaSBsb3ZlIHlvdSwgdG9vXCJcbiAgICAgIGF0dHIodmFsKVxuICAgICAgd2F0Y2hlci5zaG91bGQuaGF2ZS5iZWVuLmNhbGxlZFdpdGgodmFsLCBhdHRyLiQkKVxuICAgICAgd2F0Y2hlci5zaG91bGQuaGF2ZS5iZWVuLmNhbGxlZE9uY2VcbiAgICAgIGF0dHIoKS5zaG91bGQuYmUuZXF1YWwoXCJpIGxvdmUgeW91LCB0b29cIilcbiAgICB9KVxuXG4gIH0pXG59KSIsInZhciBwYXJzZXIgPSByZXF1aXJlKFwiLi4vLi4vc3JjL3BhcnNlclwiKVxuXG5kZXNjcmliZShcIlRlc3QgcGFyc2VyXCIsIGZ1bmN0aW9uKCkge1xuICBpdChcIkdldCByYXcgZXhwcmVzc2lvbnMgZnJvbSB0ZXh0LlwiLCBmdW5jdGlvbigpIHtcbiAgICBwYXJzZXIuZ2V0UmF3RXhwcyhcIntmaXJzdE5hbWUgKyBsYXN0TmFtZX0gaXMgbXkge25hbWV9XCIpXG4gICAgICAgICAgLnNob3VsZC5iZS5kZWVwLmVxdWFsKFtcIntmaXJzdE5hbWUgKyBsYXN0TmFtZX1cIiwgXCJ7bmFtZX1cIl0pXG4gIH0pXG4gIGl0KFwiR2V0IGV4cHJlc3Npb24gb2JqZWN0cyBmcm9tIHRleHQuXCIsIGZ1bmN0aW9uKCkge1xuICAgIHBhcnNlci5wYXJzZShcIntuYW1lKCkgPT09IHRydWUgPyBnb29kKCk6IGJhZCgpfVwiKVxuICAgICAgICAgIC5zaG91bGQuYmUuZGVlcC5lcXVhbChbe1xuICAgICAgICAgICAgcmF3RXhwOiBcIntuYW1lKCkgPT09IHRydWUgPyBnb29kKCk6IGJhZCgpfVwiLFxuICAgICAgICAgICAgZXhwOiBcIm5hbWUoKSA9PT0gdHJ1ZSA/IGdvb2QoKTogYmFkKClcIixcbiAgICAgICAgICAgIHRva2VuczogW1wibmFtZVwiLCBcImdvb2RcIiwgXCJiYWRcIl1cbiAgICAgICAgICB9XSlcbiAgICBwYXJzZXIucGFyc2UoXCJUb2RheSB0b3RhbENvdW50IGlzIHtwYXJzZUZsb2F0KHRvdGFsQ291bnQoKSl9LCB7bmFtZX0gc2hvdWxkIG1ha2UgaXQuXCIpXG4gICAgICAgICAgLnNob3VsZC5iZS5kZWVwLmVxdWFsKFt7XG4gICAgICAgICAgICByYXdFeHA6IFwie3BhcnNlRmxvYXQodG90YWxDb3VudCgpKX1cIixcbiAgICAgICAgICAgIGV4cDogXCJwYXJzZUZsb2F0KHRvdGFsQ291bnQoKSlcIixcbiAgICAgICAgICAgIHRva2VuczogW1widG90YWxDb3VudFwiXVxuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgIHJhd0V4cDogXCJ7bmFtZX1cIixcbiAgICAgICAgICAgIGV4cDogXCJuYW1lXCIsXG4gICAgICAgICAgICB0b2tlbnM6IFtcIm5hbWVcIl1cbiAgICAgICAgICB9XSlcbiAgfSlcbiAgaXQoXCJFeGVjdXRlIGFuIGV4cHJlc3Npb24uXCIsIGZ1bmN0aW9uKCkge1xuICAgIHBhcnNlci5leGVjKHtcbiAgICAgIGV4cDogXCJ0aGlzLmx1Y3kgKyBuYW1lKCkgKyAxXCIsXG4gICAgICB0b2tlbnM6IFtcIm5hbWVcIl1cbiAgICB9LCB7XG4gICAgICBuYW1lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFwiSmVycnkhXCJcbiAgICAgIH0sXG4gICAgICBsdWN5OiBcImdvb2RcIlxuICAgIH0pLnNob3VsZC5iZS5lcXVhbChcImdvb2RKZXJyeSExXCIpXG4gIH0pXG59KSIsIl8gPSByZXF1aXJlKFwiLi4vLi4vc3JjL3V0aWwuanNcIilcblxuZGVzY3JpYmUoXCJUZXN0IHV0aWxzIGZ1bmN0aW9uc1wiLCBmdW5jdGlvbigpIHtcbiAgaXQoXCJtYXBcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyciA9IFsxLCAyLCAzLCA0XVxuICAgIHZhciBuZXdBcnIgPSBfLm1hcChhcnIsIGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIHZhbCAqIDJcbiAgICB9KVxuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IGFyci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgYXJyW2ldID0gYXJyW2ldICogMlxuICAgIH1cbiAgICBhcnIuc2hvdWxkLmJlLmRlZXAuZXF1YWwobmV3QXJyKVxuICB9KVxuXG4gIGl0KFwiVGVzdCBqUXVlcnkgYW5kIERPTVwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgJGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpXG4gICAgJGJvZHkuaHRtbChcIkt1ZVwiKVxuICAgICRib2R5Lmh0bWwoKS5zaG91bGQuYmUuZXF1YWwoXCJLdWVcIilcbiAgfSlcbn0pIl19
