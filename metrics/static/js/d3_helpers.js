var accordianify = function(wrapper, click_selector, sibling_selector) {

  var heading = wrapper.selectAll(click_selector)

  heading
    .select(sibling_selector)
    .classed("hidden",true)

  heading
    .on("click",function(x){
      d3.select(sibling_selector.bind(this)()).classed("hidden",function(x){
        x.is_opened = x.is_opened || 0
        var is_hidden = this.classList.contains("hidden")
        x.is_opened += is_hidden ? 1 : -1
        return !is_hidden
      })
      return 
    })
}

var checkOpened = function(wrapper) {
  wrapper
    .on("click",function(data){
      var p = d3.select(this.parentNode), 
      has_opened = (data.is_opened >  0)

      //p.classed("col-md-6",!has_opened) 
      //p.classed("col-md-12",has_opened)  
    })
   
}
