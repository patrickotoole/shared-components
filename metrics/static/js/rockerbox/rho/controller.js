var RB = RB || {}
RB.rho = RB.rho || {}

RB.rho.controller = (function(controller) {

  var rho = RB.rho;

  var URL = window.location.pathname + window.location.search
  var addParam = function(u,p) { 
    return u.indexOf("?") >= 0 ? u + "&" + p : u + "?" + p 
  }
  URL = addParam(URL,"format=json")

  controller.init = function(){
    d3.json(URL, function(dd){
      rho.data.build(dd) 
      controller.render(dd)
    });  
  }

  controller.render = function(dd) {

    var kvs = dd.length == 0 ? false : ["seller","tag","size"].map(function(x){
      var values = Object.keys(dd.reduce(function(p,c){p[c[x]] = true;return p},{}))
      return {"key": x,"values": values}
    })
    
    var data = rho.data.CRS.groups.date.all();
    rho.ui.build(d3.select("#filterable"),kvs,data)  

  }

  controller.select = function(x) {

    var key = d3.select(this.parentElement).datum().key
    var data = d3.selectAll(this.selectedOptions).data()

    rho.data.CRS.dimensions[key].filterFunction(function(x){
      return data.indexOf(x) > -1 || data.length == 0
    })

    controller.render([])
  }  

  return controller
})(RB.rho.controller || {})
