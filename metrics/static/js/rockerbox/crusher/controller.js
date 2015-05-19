var RB = RB || {}
RB.crusher = RB.crusher || {}

RB.crusher.controller = (function(controller) {

  var crusher = RB.crusher

  var URL = window.location.pathname + window.location.search
  var addParam = function(u,p) { 
    return u.indexOf("?") >= 0 ? u + "&" + p : u + "?" + p 
  }
  URL = addParam(URL,"format=json")

  controller.init = function(){
    crusher.ui.build()
  }
  
  return controller

})(RB.crusher.controller || {}) 
