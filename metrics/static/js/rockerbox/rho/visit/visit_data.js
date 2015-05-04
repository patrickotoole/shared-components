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

  var uniqueOrdered = function(name,lookup) {

    return data.CRS.groups[name].all()
      .sort(function(x,y){return y.value.imps - x.value.imps})
      .filter(function(x){return lookup[x.key] })
      .map(function(x){return x.key})
  }

  data.options = function() {
      var urls = {};

    data.CRS.groups.seller_tag_size.all()
      .filter(function(x){return x.value.imps > 0})
      .map(function(x){
        urls[x.key[0]] = true
      })

    return {
	url: uniqueOrdered("url", urls),
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
