var EXAMPLE_DATA = {
    "key": "User Visits"
  , "values": [
      {  
          "key":"Off-site Views"
        , "value": 12344
      }
    , {
          "key":"Off-site Uniques"
        , "value": 12344
      }
  ] 
}

export function SummaryBox(target) {
  this._target = target;
  this._data = EXAMPLE_DATA
}

export default function summary_box(target) {
  return new SummaryBox(target)
}

SummaryBox.prototype = {

    data: function(val) { return accessor.bind(this)("data",val) }
  , title: function(val) { return accessor.bind(this)("title",val) }
  , draw: function() {
      var wrap = this._target
      var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
        .classed("vendor-domains-bar-desc",true)
        .style("display","inherit")
        .datum(this._data)

      var w = d3_updateable(desc,".w","div")
        .classed("w",true)
  
      d3_updateable(w, "h3","h3")
        .text(function(x){return x.key})
        .style("margin-bottom","15px")

      var ww = d3_splat(desc,".ww","div",function(x){ return x.values},function(x){ return x.key})
        .classed("ww",true)
        .style("text-align","center")
        .style("display","inline-block")
        .style("width","45%")
  
      var views = d3_updateable(ww,".views","div")
        .classed("views",true)
        .style("text-align","left")
        .style("display","inline-block")
  
      d3_updateable(views,"div","div")
        .text(function(x){return x.key})
  
      d3_updateable(views,".number","div")
        .classed("number",true)
        .text(function(x){ return d3.format(",")(x.value)})
        .style("font-size","32px")
        .style("font-weight","bold")
  
  


    }
}
