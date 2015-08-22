var $ = require("../dom")
var _ = require("../util")

module.exports = {
  bind: function(ele, attr, component, dir) {
    var FUNCTION_CALL_REG = /([\S\s]+)(\([\S\s]+\))/
    var $ele = $(ele)
    for(var eventName in dir) {
      var extract = dir[eventName].match(FUNCTION_CALL_REG)
      var params = []
      if (extract) {
        var callName = extract[1]
        if (extract[2]) {
          params = extract[2]
            .replace(/[\(\)]/g, "")
            .split(",")
        }
      } else {
        var callName = dir[eventName]
      }
      ;(function(params, eventName, callName) {
      $ele.on(eventName, function(event) {
        var args = getParams(params, component, event)
        component[callName].apply(component, args)
      })
    })(params, eventName, callName)
    }
  }
}

function getParams(params, component, event) {
  if (params.length === 0) return [event]
  var ret = []
  _.each(params, function(param) {
    if (param === "$event") {
      ret.push(event)
    } else {
      ret.push(component.scope.getObjectByPath(_.trim(param)))
    }
  })
  return ret
}
