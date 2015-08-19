var _ = require("../util")
var $ = require("../dom")
var common = require("../common")
var components = common.components
var objectPath = require("../object-path")

module.exports = {
  bind: function(ele, attr, component, dir) {
    _.nextTick(function() {
      var placeholder = document.createComment("repeat " + dir)
      var $ele = $(ele)
      $ele.before(placeholder)
      $ele.remove()
      $ele.removeAttr(attr.name)

      var frag = $.frag()
      var tpl = getTplFromElement(ele)
      var TempComp = common.component({template: tpl})
      var states = component.scope.getObjectByPath(dir)
      _.each(states, function(state, i) {
        var newComponent = new TempComp({state: state}, {
          currentPath: objectPath.join([dir, i]),
          parent: component,
          extra: {$index: i}
        })
        frag.appendChild(newComponent.el)
      })
      $(placeholder).before(frag)
    })
  },
  update: function(ele, attr, component, dir) {
    console.log(dir)
  }
}

function getTplFromElement(ele) {
    var div = $.ele("div")
    div.appendChild(ele)
    return div.innerHTML
}
