var RB = RB || {}
RB.rho = RB.rho || {}
RB.rho.ui = RB.rho.ui || {}
 
RB.rho.ui.filter = (function(f) {

  f.buildOptions = function(select) {

    var options = select.selectAll("option")
      .data(
        function(x){ return x.value },
        function(x){ return x }
      )

    options.enter()
      .append("option")
      .text(function(x){return x})

    options.exit()
      .remove() 
  }

  f.buildFilter = function(filter,callback){


    var h5 = filter.append("h5")
      .classed("col-md-6 row",true)

    h5.append("a")
      .classed("col-md-1",true)
      .html("&#215;")
      .on("click",function(){
        RB.rho.controller.remove_filter(d3.select(this).datum().key)
      })
     

    var where = h5.append("span")
      .classed("col-md-4",true)

    where.append("span")
      .text("WHERE")

    where.append("span")
      .text("AND")
      
    h5.append("span")
      .classed("col-md-4",true) 
      .text(function(x){return x.key})

    h5.append("span")
      .classed("col-md-3",true) 
      .text("IS IN")
     

    
    /*filter.append("div").html(" and ")
      .classed("and",true) 
      */
    var select = filter.append("div")
      .classed("col-md-6",true)
      .append("select")
      .attr("multiple",true)
      .classed("filter-select",true)
      .style("width","100%")

    var node = select[0].filter(function(x){return x})

    setTimeout(function(){
      $(node)
        .chosen({
          width: "100%",
          create_option: function(term){
            var chosen = this;
            chosen.append_option({
              value: term,
              text: "Custom: " + term
            });
            $(node).trigger("change")
          },
          persistent_create_option: false 
        })
        .change(callback)
    },1)
  
    return select
  }

  f.newFilters = function(filters,callback){
    var newFilters = filters.enter()
      //.append("div").classed("filter col-md-3",true)
      .append("div").classed("filter col-md-12 row",true) 
  
    var elements = newFilters.data().reduce(function(c,x){
      return c + (x != undefined)
    },0)

    if (elements) {
      var newSelects = f.buildFilter(newFilters,callback)
      f.buildOptions(newSelects)
    }
  }

  f.existingFilters = function(filters,key){

    var allSelects = filters.select("select")
    var mark = false

    var toUpdate = allSelects.filter(function(d,i){
      var previous_mark = mark
      mark = mark || d['key'] == key
      return previous_mark 
    });

    f.buildOptions(toUpdate)
     
  }
  
  f.buildFilters = function(target,options,callback,key){


    var wrapper = target.selectAll(".filter-wrapper.row")
      .data([options])

    wrapper.enter().append("div")
      .classed("filter-wrapper row",true)
  
    var filters = wrapper.selectAll(".filter")
      .data(
        function(x){ return x },
        function(x){ return x.key }
      )

    f.newFilters(filters,callback)
    f.existingFilters(filters,key) 
    
    $(".filter-select").trigger("chosen:updated"); 
    
  }

  f.build = function(target,options,callback,key) {
    f.buildFilters(target,options,callback,key)
  }

  return f

})(RB.rho.ui.filter || {}) 
