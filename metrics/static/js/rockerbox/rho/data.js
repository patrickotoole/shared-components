var RB = RB || {}
RB.rho = RB.rho || {}

RB.rho.data = (function(data){

  var group = {
    add: function(p, v){
      var total_ecp = p.imps*p.ecp || 0, total_eap = p.imps*p.eap || 0;
 
      p.imps += v.imps
      p.ecp = (total_ecp + v.imps*v.ecp)/p.imps
      p.eap = (total_eap + v.imps*v.eap)/p.imps 
 
      return p
    },
    reduce: function(p, v){
      var total_ecp = p.imps*p.ecp || 0, total_eap = p.imps*p.eap || 0;
 
      p.imps -= v.imps
      p.ecp = (total_ecp - v.imps*v.ecp)/p.imps
      p.eap = (total_eap - v.imps*v.eap)/p.imps 
       
      return p
    },
    init: function(){ return { imps:0, ecp:0, eap:0 } }
  }

  var buildCrossfilter = function(dd) {

    var crs = crossfilter(dd)

    var dimensions = {
      seller: crs.dimension(function(d){return d.seller}),
      tag: crs.dimension(function(d){return d.tag}),
      size: crs.dimension(function(d){return d.size}),
      domain: crs.dimension(function(d){return d.domain}),
      date: crs.dimension(function(d){return d.timestamp})
    }

    var groups = {
      sellers: dimensions.seller.group()
        .order(function(d){return d.imps})
        .reduce(group.add,group.reduce,group.init),
      tags: dimensions.tag.group()
        .order(function(d){return d.imps})
        .reduce(group.add,group.reduce,group.init),
      sizes: dimensions.size.group()
        .order(function(d){return d.imps})
        .reduce(group.add,group.reduce,group.init),
      domain: dimensions.domain.group()
        .order(function(d){return d.imps})
        .reduce(group.add,group.reduce,group.init),
      date: dimensions.date.group()
        .order(function(d){return d.imps})
        .reduce(group.add,group.reduce,group.init),  
    }

    return {
      dimensions: dimensions,
      groups: groups
    }
  }

  data.build = function(dd) {
    data.CRS = buildCrossfilter(dd)
    return data.CRS
  }


  return data
})(RB.rho.data || {})
