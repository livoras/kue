(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./util.js":2}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
//require("./specs/sample.js")
require("./specs/util.js")
require("./specs/dom-test.js")
require("./specs/obserable.js")

},{"./specs/dom-test.js":4,"./specs/obserable.js":5,"./specs/util.js":6}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
var obserable = require("../../src/obserable.js")

describe("Test obserable", function() {
  describe("Test obserable string attribute", function() {
    var attr = null;

    before(function() {
      attr = obserable("i love you")
    })

    it("init default value and get it", function() {
      attr().should.be.equal("i love you")
    })

    it("watcher function should be invoked when attr is changed", function() {
      var watcher = sinon.spy()
      attr.$$.watch(watcher)
      var val = "i love you, too"
      attr(val)
      watcher.should.have.been.calledWith(val, attr.$$)
      attr().should.be.equal("i love you, too")
    })
  })
})
},{"../../src/obserable.js":1}],6:[function(require,module,exports){
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
},{"../../src/util.js":2}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL29ic2VyYWJsZS5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvdXRpbC5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L2Zha2VfMjllMjQ0MGIuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvdGVzdC9zcGVjcy9kb20tdGVzdC5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL29ic2VyYWJsZS5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBfID0gcmVxdWlyZShcIi4vdXRpbC5qc1wiKVxuXG5mdW5jdGlvbiBPYnNlcmFibGVBdHRyKGF0dHIpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIHRoaXMudmFsdWUgPSBhdHRyXG4gIHRoaXMud2F0Y2hlcnMgPSBbXVxuICBmdW5jdGlvbiBnZXRPclNldChhdHRyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGF0LnZhbHVlXG4gICAgfVxuICAgIHRoYXQudmFsdWUgPSBhdHRyXG4gICAgdGhhdC5ub3RpZnkoKVxuICB9XG4gIGdldE9yU2V0LiQkID0gdGhhdFxuICByZXR1cm4gZ2V0T3JTZXRcbn1cblxuT2JzZXJhYmxlQXR0ci5wcm90b3R5cGUubm90aWZ5ID0gZnVuY3Rpb24oKSB7XG4gIHZhciB0aGF0ID0gdGhpc1xuICBfLmVhY2godGhpcy53YXRjaGVycywgZnVuY3Rpb24od2F0Y2hlcikge1xuICAgIHdhdGNoZXIodGhhdC52YWx1ZSwgdGhhdClcbiAgfSlcbn1cblxuT2JzZXJhYmxlQXR0ci5wcm90b3R5cGUud2F0Y2ggPSBmdW5jdGlvbihmbikge1xuICB0aGlzLndhdGNoZXJzLnB1c2goZm4pXG59XG5cbmZ1bmN0aW9uIE9ic2VyYWJsZUFycmF5KGFycikge1xuICBcbn1cblxuZnVuY3Rpb24gb2JzZXJhYmxlKG9iaikge1xuICBpZiAoIV8uaXNBcnJheShvYmopKSB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcmFibGVBdHRyKG9iailcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IE9ic2VyYWJsZUFycmF5KG9iailcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG9ic2VyYWJsZVxuIiwiZXhwb3J0cy5tYXAgPSBmdW5jdGlvbihhcnIsIGZuKSB7XG4gIHZhciByZXN1bHRzID0gW11cbiAgZm9yKHZhciBpID0gMCwgbGVuID0gYXJyLmxlbmd0aDsgaSA8IGxlbjtpICsrKSB7XG4gICAgcmVzdWx0cy5wdXNoKGZuKGFycltpXSkpXG4gIH1cbiAgcmV0dXJuIHJlc3VsdHNcbn1cblxuZXhwb3J0cy5pc0FycmF5ID0gZnVuY3Rpb24oYXJyKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xufVxuXG5leHBvcnRzLmVhY2ggPSBmdW5jdGlvbihhcnIsIGZuKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBmbihhcnJbaV0pXG4gIH1cbn0iLCIvL3JlcXVpcmUoXCIuL3NwZWNzL3NhbXBsZS5qc1wiKVxucmVxdWlyZShcIi4vc3BlY3MvdXRpbC5qc1wiKVxucmVxdWlyZShcIi4vc3BlY3MvZG9tLXRlc3QuanNcIilcbnJlcXVpcmUoXCIuL3NwZWNzL29ic2VyYWJsZS5qc1wiKVxuIiwiZGVzY3JpYmUoXCJUZXN0IERPTVwiLCBmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gY29tcGlsZU5vZGUobm9kZSkge1xuICAgIC8vY29uc29sZS5sb2cobm9kZS5ub2RlVHlwZSk7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGROb2RlcztcbiAgICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBlbCA9IGNoaWxkcmVuW2ldXG4gICAgICAgIGNvbXBpbGVOb2RlKGVsKVxuICAgICAgfVxuICAgIH0gaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgIC8vY29uc29sZS5sb2cobm9kZS5pbm5lckhUTUwpO1xuICAgICAgLy9jb21waWxlTm9kZShub2RlKVxuICAgIH1cbiAgfVxuICBpdChcInNob3VsZCBpdGVyYXRlIGFsbCBkb20gbm9kZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgLy92YXIgdHBsID0gcmVxdWlyZShcIi4uL2ZpeHR1cmVzL3RwbC5odG1sXCIpO1xuICAgIHZhciB0cGwgPSBcIjxkaXYgaWQ9J21haW4nPntuYW1lfTx1bD48bGkgay1yZXBlYXQ9J3RvZG9zJz57bmFtZX08L2xpPjwvdWw+PC9kaXY+XCJcbiAgICB2YXIgZG9tID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgIGRvbS5pbm5lckhUTUwgPSB0cGw7XG4gICAgY29tcGlsZU5vZGUoZG9tKVxuICB9KVxufSlcbiIsInZhciBvYnNlcmFibGUgPSByZXF1aXJlKFwiLi4vLi4vc3JjL29ic2VyYWJsZS5qc1wiKVxuXG5kZXNjcmliZShcIlRlc3Qgb2JzZXJhYmxlXCIsIGZ1bmN0aW9uKCkge1xuICBkZXNjcmliZShcIlRlc3Qgb2JzZXJhYmxlIHN0cmluZyBhdHRyaWJ1dGVcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGF0dHIgPSBudWxsO1xuXG4gICAgYmVmb3JlKGZ1bmN0aW9uKCkge1xuICAgICAgYXR0ciA9IG9ic2VyYWJsZShcImkgbG92ZSB5b3VcIilcbiAgICB9KVxuXG4gICAgaXQoXCJpbml0IGRlZmF1bHQgdmFsdWUgYW5kIGdldCBpdFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIGF0dHIoKS5zaG91bGQuYmUuZXF1YWwoXCJpIGxvdmUgeW91XCIpXG4gICAgfSlcblxuICAgIGl0KFwid2F0Y2hlciBmdW5jdGlvbiBzaG91bGQgYmUgaW52b2tlZCB3aGVuIGF0dHIgaXMgY2hhbmdlZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3YXRjaGVyID0gc2lub24uc3B5KClcbiAgICAgIGF0dHIuJCQud2F0Y2god2F0Y2hlcilcbiAgICAgIHZhciB2YWwgPSBcImkgbG92ZSB5b3UsIHRvb1wiXG4gICAgICBhdHRyKHZhbClcbiAgICAgIHdhdGNoZXIuc2hvdWxkLmhhdmUuYmVlbi5jYWxsZWRXaXRoKHZhbCwgYXR0ci4kJClcbiAgICAgIGF0dHIoKS5zaG91bGQuYmUuZXF1YWwoXCJpIGxvdmUgeW91LCB0b29cIilcbiAgICB9KVxuICB9KVxufSkiLCJfID0gcmVxdWlyZShcIi4uLy4uL3NyYy91dGlsLmpzXCIpXG5cbmRlc2NyaWJlKFwiVGVzdCB1dGlscyBmdW5jdGlvbnNcIiwgZnVuY3Rpb24oKSB7XG4gIGl0KFwibWFwXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcnIgPSBbMSwgMiwgMywgNF1cbiAgICB2YXIgbmV3QXJyID0gXy5tYXAoYXJyLCBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiB2YWwgKiAyXG4gICAgfSlcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFycltpXSA9IGFycltpXSAqIDJcbiAgICB9XG4gICAgYXJyLnNob3VsZC5iZS5kZWVwLmVxdWFsKG5ld0FycilcbiAgfSlcblxuICBpdChcIlRlc3QgalF1ZXJ5IGFuZCBET01cIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyICRib2R5ID0gJChkb2N1bWVudC5ib2R5KVxuICAgICRib2R5Lmh0bWwoXCJLdWVcIilcbiAgICAkYm9keS5odG1sKCkuc2hvdWxkLmJlLmVxdWFsKFwiS3VlXCIpXG4gIH0pXG59KSJdfQ==
