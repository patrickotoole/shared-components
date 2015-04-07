var RB = RB || {}
RB.yoshi = RB.yoshi || {}

RB.yoshi.selection = (function(selection){

  selection.filterContains = function(a,b){
    var bh = {}
    b.map(function(x){bh[x] = true})
    return a.filter(function(x){ return bh[x] })
  }

  selection.placement_exclusions = []
  selection.domain_exclusions = []
  selection.size_exclusions = []

  selection.placements = []
  selection.domains = []
  selection.sizes = []
  selection.auctions = []

  var resetExclusions = function(){
    selection.placement_exclusions = []
    selection.domain_exclusions = []
    selection.size_exclusions = []
  }

  var resetInclusions = function() {
    selection.placements = []
    selection.domains = []
    selection.sizes = []  
    selection.auctions = []
  }


  selection.targets = function(){
    var history = d3.selectAll(".ad-history tbody > tr input:checked")
    var history_data = history.data()

    resetInclusions()

    if (history_data.length == 0) {
      resetExclusions()
      return selection
    }
    
    var exclude_placements = function(c,x){
      var placement_excluded = selection.placement_exclusions.indexOf(x) > -1 ? 1 : 0
      return c + placement_excluded
    }

    var exclude_sizes = function(c,x){
      var size_excluded = selection.size_exclusions.indexOf(x) > -1 ? 1 : 0
      return c + size_excluded
    }

    history_data.map(function(br){

      var excluded_domain = selection.domain_exclusions.indexOf(br.domain) > -1
      var excluded_placement = br.placements.reduce(exclude_placements,0) == br.placements.length
      var excluded_size = br.sizes.reduce(exclude_sizes,0) == br.sizes.length 

      if (!(excluded_domain || excluded_placement || excluded_size)) {
        selection.placements.push.apply(selection.placements,br.placements)
        selection.domains.push(br.domain)
        selection.sizes.push.apply(selection.sizes,br.sizes)
        selection.auctions.push(br)
      }
      
    })

    return selection
  }

  

  return selection
})(RB.yoshi.selection || {})
