var RB = RB || {}
RB.rho = RB.rho || {}

RB.rho.data = (function(data){

  var group = {
    add: function(p, v){
      var total_ecp = p.imps*p.ecp || 0, total_eap = p.imps*p.eap || 0;
 
      p.imps += v.imps
      p.ecp = (total_ecp + v.imps*v.ecp)/p.imps || 0
      p.eap = (total_eap + v.imps*v.eap)/p.imps || 0
 
      return p
    },
    reduce: function(p, v){
      var total_ecp = p.imps*p.ecp || 0, total_eap = p.imps*p.eap || 0;
 
      p.imps -= v.imps
      p.ecp = (total_ecp - v.imps*v.ecp)/p.imps || 0
      p.eap = (total_eap - v.imps*v.eap)/p.imps || 0
       
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
      date: crs.dimension(function(d){return d.timestamp}),
      seller_tag_size: crs.dimension(function(d){ return [d.seller,d.tag,d.size,d.domain] })
    }

    var groups = {
      all: dimensions.seller_tag_size.groupAll()
        .reduce(group.add,group.reduce,group.init),  
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
      seller_tag_size: dimensions.seller_tag_size.group()
        .order(function(d){return d.imps})
        .reduce(group.add,group.reduce,group.init),   
    }

    return {
      crs: crs,
      dimensions: dimensions,
      groups: groups
    }
  }

  data.options = function() {
    var sellers = {},
      tags = {},
      sizes = {},
      domains = {};


    data.CRS.groups.seller_tag_size.all()
      .filter(function(x){return x.value.imps > 0})
      .map(function(x){
        sellers[x.key[0]] = true
        tags[x.key[1]] = true
        sizes[x.key[2]] = true
        domains[x.key[3]] = true
      })

    return {
      seller: Object.keys(sellers),
      tag: Object.keys(tags),
      size: Object.keys(sizes),
      domain: Object.keys(domains)
    }

  }

  data.build = function(dd) {
    data.CRS = buildCrossfilter(dd)
    return data.CRS
  }

  var filters = {}

  data.add_filter = function(item){
    filters[item] = true
  }

  data.remove_filter = function(item){
    delete filters[item] 
  } 

  data.get_filters = function() {
    return Object.keys(filters)
  }


  return data
})(RB.rho.data || {})
