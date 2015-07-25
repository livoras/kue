(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var config = {}

config.prefix = "{"
config.suffix = "}"

module.exports = config
},{}],2:[function(require,module,exports){
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

},{"./util.js":4}],3:[function(require,module,exports){
var config = require("./config")
var _ = require("./util")
var exports = {}

exports.getExps = function(text) {
  var EXP_REG = new RegExp("\\" + config.prefix + "[\\S\\s]+?" + "\\" + config.suffix, 'g')
  var REMOVE_REG = new RegExp("\\" + config.prefix + "|" + "\\" + config.suffix, 'g')
  var results = text.match(EXP_REG)
  if (!results) return []
  var exps = []
  _.each(results, function(rawExp) {
    exps.push(rawExp.replace(REMOVE_REG, ""))
  })
  return exps
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
      attr().should.be.equal("i love you, too")
    })
    
  })
})
},{"../../src/obserable.js":2}],8:[function(require,module,exports){
var parser = require("../../src/parser")

describe("Test parser", function() {
  it("Get expressions from text", function() {
    parser.getExps("{firstName + lastName} is my {name}")
          .should.be.deep.equal(["firstName + lastName", "name"])
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvb2JzZXJhYmxlLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9wYXJzZXIuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL3V0aWwuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvdGVzdC9mYWtlXzgxNWQwYzdhLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3Rlc3Qvc3BlY3MvZG9tLXRlc3QuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvdGVzdC9zcGVjcy9vYnNlcmFibGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvdGVzdC9zcGVjcy9wYXJzZXIuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvdGVzdC9zcGVjcy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGNvbmZpZyA9IHt9XG5cbmNvbmZpZy5wcmVmaXggPSBcIntcIlxuY29uZmlnLnN1ZmZpeCA9IFwifVwiXG5cbm1vZHVsZS5leHBvcnRzID0gY29uZmlnIiwidmFyIF8gPSByZXF1aXJlKFwiLi91dGlsLmpzXCIpXG5cbmZ1bmN0aW9uIE9ic2VyYWJsZUF0dHIoYXR0cikge1xuICB2YXIgdGhhdCA9IHRoaXNcbiAgdGhpcy52YWx1ZSA9IGF0dHJcbiAgdGhpcy53YXRjaGVycyA9IFtdXG4gIGZ1bmN0aW9uIGdldE9yU2V0KGF0dHIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoYXQudmFsdWVcbiAgICB9XG4gICAgdGhhdC52YWx1ZSA9IGF0dHJcbiAgICB0aGF0Lm5vdGlmeSgpXG4gIH1cbiAgZ2V0T3JTZXQuJCQgPSB0aGF0XG4gIHJldHVybiBnZXRPclNldFxufVxuXG5PYnNlcmFibGVBdHRyLnByb3RvdHlwZS5ub3RpZnkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIF8uZWFjaCh0aGlzLndhdGNoZXJzLCBmdW5jdGlvbih3YXRjaGVyKSB7XG4gICAgd2F0Y2hlcih0aGF0LnZhbHVlLCB0aGF0KVxuICB9KVxufVxuXG5PYnNlcmFibGVBdHRyLnByb3RvdHlwZS53YXRjaCA9IGZ1bmN0aW9uKGZuKSB7XG4gIHRoaXMud2F0Y2hlcnMucHVzaChmbilcbn1cblxuZnVuY3Rpb24gT2JzZXJhYmxlQXJyYXkoYXJyKSB7XG4gIFxufVxuXG5mdW5jdGlvbiBvYnNlcmFibGUob2JqKSB7XG4gIGlmICghXy5pc0FycmF5KG9iaikpIHtcbiAgICByZXR1cm4gbmV3IE9ic2VyYWJsZUF0dHIob2JqKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgT2JzZXJhYmxlQXJyYXkob2JqKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gb2JzZXJhYmxlXG4iLCJ2YXIgY29uZmlnID0gcmVxdWlyZShcIi4vY29uZmlnXCIpXG52YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWxcIilcbnZhciBleHBvcnRzID0ge31cblxuZXhwb3J0cy5nZXRFeHBzID0gZnVuY3Rpb24odGV4dCkge1xuICB2YXIgRVhQX1JFRyA9IG5ldyBSZWdFeHAoXCJcXFxcXCIgKyBjb25maWcucHJlZml4ICsgXCJbXFxcXFNcXFxcc10rP1wiICsgXCJcXFxcXCIgKyBjb25maWcuc3VmZml4LCAnZycpXG4gIHZhciBSRU1PVkVfUkVHID0gbmV3IFJlZ0V4cChcIlxcXFxcIiArIGNvbmZpZy5wcmVmaXggKyBcInxcIiArIFwiXFxcXFwiICsgY29uZmlnLnN1ZmZpeCwgJ2cnKVxuICB2YXIgcmVzdWx0cyA9IHRleHQubWF0Y2goRVhQX1JFRylcbiAgaWYgKCFyZXN1bHRzKSByZXR1cm4gW11cbiAgdmFyIGV4cHMgPSBbXVxuICBfLmVhY2gocmVzdWx0cywgZnVuY3Rpb24ocmF3RXhwKSB7XG4gICAgZXhwcy5wdXNoKHJhd0V4cC5yZXBsYWNlKFJFTU9WRV9SRUcsIFwiXCIpKVxuICB9KVxuICByZXR1cm4gZXhwc1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMiLCJleHBvcnRzLm1hcCA9IGZ1bmN0aW9uKGFyciwgZm4pIHtcbiAgdmFyIHJlc3VsdHMgPSBbXVxuICBmb3IodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuO2kgKyspIHtcbiAgICByZXN1bHRzLnB1c2goZm4oYXJyW2ldKSlcbiAgfVxuICByZXR1cm4gcmVzdWx0c1xufVxuXG5leHBvcnRzLmlzQXJyYXkgPSBmdW5jdGlvbihhcnIpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09PSAnW29iamVjdCBBcnJheV0nXG59XG5cbmV4cG9ydHMuZWFjaCA9IGZ1bmN0aW9uKGFyciwgZm4pIHtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGZuKGFycltpXSlcbiAgfVxufSIsIi8vcmVxdWlyZShcIi4vc3BlY3Mvc2FtcGxlLmpzXCIpXG5yZXF1aXJlKFwiLi9zcGVjcy91dGlsLmpzXCIpXG5yZXF1aXJlKFwiLi9zcGVjcy9kb20tdGVzdC5qc1wiKVxucmVxdWlyZShcIi4vc3BlY3Mvb2JzZXJhYmxlLmpzXCIpXG5yZXF1aXJlKFwiLi9zcGVjcy9wYXJzZXIuanNcIilcbiIsImRlc2NyaWJlKFwiVGVzdCBET01cIiwgZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIGNvbXBpbGVOb2RlKG5vZGUpIHtcbiAgICAvL2NvbnNvbGUubG9nKG5vZGUubm9kZVR5cGUpO1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkTm9kZXM7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgZWwgPSBjaGlsZHJlbltpXVxuICAgICAgICBjb21waWxlTm9kZShlbClcbiAgICAgIH1cbiAgICB9IGlmIChub2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAvL2NvbnNvbGUubG9nKG5vZGUuaW5uZXJIVE1MKTtcbiAgICAgIC8vY29tcGlsZU5vZGUobm9kZSlcbiAgICB9XG4gIH1cbiAgaXQoXCJzaG91bGQgaXRlcmF0ZSBhbGwgZG9tIG5vZGVzXCIsIGZ1bmN0aW9uKCkge1xuICAgIC8vdmFyIHRwbCA9IHJlcXVpcmUoXCIuLi9maXh0dXJlcy90cGwuaHRtbFwiKTtcbiAgICB2YXIgdHBsID0gXCI8ZGl2IGlkPSdtYWluJz57bmFtZX08dWw+PGxpIGstcmVwZWF0PSd0b2Rvcyc+e25hbWV9PC9saT48L3VsPjwvZGl2PlwiXG4gICAgdmFyIGRvbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICBkb20uaW5uZXJIVE1MID0gdHBsO1xuICAgIGNvbXBpbGVOb2RlKGRvbSlcbiAgfSlcbn0pXG4iLCJ2YXIgb2JzZXJhYmxlID0gcmVxdWlyZShcIi4uLy4uL3NyYy9vYnNlcmFibGUuanNcIilcblxuZGVzY3JpYmUoXCJUZXN0IG9ic2VyYWJsZVwiLCBmdW5jdGlvbigpIHtcbiAgZGVzY3JpYmUoXCJUZXN0IG9ic2VyYWJsZSBzdHJpbmcgYXR0cmlidXRlXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBhdHRyID0gbnVsbDtcblxuICAgIGJlZm9yZShmdW5jdGlvbigpIHtcbiAgICAgIGF0dHIgPSBvYnNlcmFibGUoXCJpIGxvdmUgeW91XCIpXG4gICAgfSlcblxuICAgIGl0KFwiSW5pdGlhbGl6aW5nIGRlZmF1bHQgdmFsdWUgYW5kIGdldCBpdC5cIiwgZnVuY3Rpb24oKSB7XG4gICAgICBhdHRyKCkuc2hvdWxkLmJlLmVxdWFsKFwiaSBsb3ZlIHlvdVwiKVxuICAgIH0pXG5cbiAgICBpdChcIldhdGNoZXIgZnVuY3Rpb24gc2hvdWxkIGJlIGludm9rZWQgd2hlbiB2YWx1ZSBpcyBjaGFuZ2VkLlwiLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3YXRjaGVyID0gc2lub24uc3B5KClcbiAgICAgIGF0dHIuJCQud2F0Y2god2F0Y2hlcilcbiAgICAgIHZhciB2YWwgPSBcImkgbG92ZSB5b3UsIHRvb1wiXG4gICAgICBhdHRyKHZhbClcbiAgICAgIHdhdGNoZXIuc2hvdWxkLmhhdmUuYmVlbi5jYWxsZWRXaXRoKHZhbCwgYXR0ci4kJClcbiAgICAgIGF0dHIoKS5zaG91bGQuYmUuZXF1YWwoXCJpIGxvdmUgeW91LCB0b29cIilcbiAgICB9KVxuICAgIFxuICB9KVxufSkiLCJ2YXIgcGFyc2VyID0gcmVxdWlyZShcIi4uLy4uL3NyYy9wYXJzZXJcIilcblxuZGVzY3JpYmUoXCJUZXN0IHBhcnNlclwiLCBmdW5jdGlvbigpIHtcbiAgaXQoXCJHZXQgZXhwcmVzc2lvbnMgZnJvbSB0ZXh0XCIsIGZ1bmN0aW9uKCkge1xuICAgIHBhcnNlci5nZXRFeHBzKFwie2ZpcnN0TmFtZSArIGxhc3ROYW1lfSBpcyBteSB7bmFtZX1cIilcbiAgICAgICAgICAuc2hvdWxkLmJlLmRlZXAuZXF1YWwoW1wiZmlyc3ROYW1lICsgbGFzdE5hbWVcIiwgXCJuYW1lXCJdKVxuICB9KVxufSkiLCJfID0gcmVxdWlyZShcIi4uLy4uL3NyYy91dGlsLmpzXCIpXG5cbmRlc2NyaWJlKFwiVGVzdCB1dGlscyBmdW5jdGlvbnNcIiwgZnVuY3Rpb24oKSB7XG4gIGl0KFwibWFwXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcnIgPSBbMSwgMiwgMywgNF1cbiAgICB2YXIgbmV3QXJyID0gXy5tYXAoYXJyLCBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiB2YWwgKiAyXG4gICAgfSlcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFycltpXSA9IGFycltpXSAqIDJcbiAgICB9XG4gICAgYXJyLnNob3VsZC5iZS5kZWVwLmVxdWFsKG5ld0FycilcbiAgfSlcblxuICBpdChcIlRlc3QgalF1ZXJ5IGFuZCBET01cIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyICRib2R5ID0gJChkb2N1bWVudC5ib2R5KVxuICAgICRib2R5Lmh0bWwoXCJLdWVcIilcbiAgICAkYm9keS5odG1sKCkuc2hvdWxkLmJlLmVxdWFsKFwiS3VlXCIpXG4gIH0pXG59KSJdfQ==
