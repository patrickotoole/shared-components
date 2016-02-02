import d3_updateable from '../d3_updateable'
import d3 from 'd3'

export default function(target) {

  var dimensions = this.dimensions(target)
  var width = dimensions.width,
    height = dimensions.width,
    radius = dimensions.radius

  var svg = d3_updateable(target,"svg","svg");
  var desc = d3_updateable(svg,".desc","g").classed("desc",true)

  desc.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
    .style("fill","#5A5A5A")

  var drawDesc = function(y) {

    d3_updateable(desc,".num-domains","text")
      .classed("num-domains",true)
      .attr("dy","-.35em")
      .style("text-anchor","middle")
      .style("font-size","2.3em")
      .style("font-weight","bold")
      .text(function(x) {
        var selected = y ? y.data.label : true
        var domains = x.domains ? x.domains.filter(function(z){
          return selected === true ? true : z.parent_category_name == selected
        }) : []
        return domains.length ? d3.format(",")(domains.length) : ""
      })

    d3_updateable(desc,".domain-desc","text")
      .classed("domain-desc",true)
      .attr("dy",".35em")
      .style("text-anchor","middle")
      .style("font-weight","500")
      .text(function(x) {return x.domains ? "domains" : ""})

    var num_users = d3_updateable(desc,".num-users","g")
      .classed("num-users",true)
      .attr("dy","1.35em")
      .style("text-anchor","middle")
      .style("font-size","1.75em")
      .style("font-weight","bold")
      

    d3_updateable(num_users,".num","text")
      .classed("num",true)
      .attr("dy","1.35em")
      .text(function(x) {
        var selected = y ? y.data.label : true
        var domains = x.domains ? x.domains.filter(function(z){
          return selected === true ? true : z.parent_category_name == selected
        }) : []
        return domains.length ? d3.format(",")(domains.reduce(function(p,c){return p + c.count},0)) : ""
      })

    var user_text = d3_updateable(num_users,".desc","text")
      .classed("desc",true)
      .attr("dy","1.85em")
      .style("font-weight","normal")
      .style("padding-left","5px")

    d3_updateable(user_text,"tspan","tspan")
      .style("font-size","0.5em")
      .text(function(x) {return x.domains ? "uniques" : ""})
  }

  

  return drawDesc

}
