import d3 from 'd3'
import d3_updateable from '../d3_updateable'
import d3_splat from '../d3_splat'


function draw() {

  var data = this._data || this._target.data()

  data = data.sort(function(p,c){
    return c.values.length - p.values.length
  }).slice(0,1000)

  var wrap = d3_updateable(this._target,".histogram-table","div",data)
    .classed("histogram-table",true)
    .style("position","relative")

  var header = d3_updateable(wrap,".hist-headers","div")
    .classed("hist-headers",true)
    .style("text-transform"," uppercase")
    .style("font-weight"," 600")
    .style("margin-bottom"," 15px")
    .style("color"," #444")

  d3_updateable(header,".domain","div")
    .classed("domain",true)
    .style("width","150px")
    .style("display","inline-block")
    .text("Domain")

  d3_updateable(header,".pages","div")
    .classed("pages",true)
    .style("display","inline-block")

    .text("Pages")

  var body = d3_updateable(wrap,".hist-body","div")
    .classed("hist-body",true)

  var row = d3_splat(body,".hist-row","div",function(x){return x },function(x){return x.key})
    .classed("hist-row",true)

    .each(function(x){
      x.range = d3.scale.sqrt()
       .range([.2,1])
       .domain(
         x.values.reduce(function(p,c) {
           p[0] = p[0] > c.count ? c.count : p[0]
           p[1] = p[1] < c.count ? c.count : p[1]

           return p
         }, [100000,0])
       )
    })

  var label = d3_updateable(row,".hist-label","div")
    .classed("hist-label",true)
    .style("width","150px")
    .style("display","inline-block")
    .style("line-height","15px")
    .style("vertical-align","top")
    .text(function(x){return x.key})

  var item_wrapper = d3_updateable(row,".hist-item-wrapper","div")
    .classed("hist-item-wrapper",true)
    .style("width","450px")
    .style("display","inline-block")
    .style("max-height","45px")

 
  var rhs = d3_updateable(d3.select("body"),".rhs","div")
    .classed("rhs site-details col-md-3",true)


  var values = d3_splat(item_wrapper,".hist-item","div",function(x) {return x.values }, function(x){return x.url})
    .classed("hist-item",true)
    .style("opacity",function(x){
      return this.parentNode.__data__.range(x.count)
    })
    .on("mouseover",function(x){

      var parent_data = this.parentNode.__data__

      var site_visits = d3.sum(this.parentNode.__data__.values,function(x){return x.count})
      var unique_sites = this.parentNode.__data__.values.length

      d3_updateable(rhs,"h3","h3")
        .text("Site Details")
        .style("margin-bottom","10px")

      d3_updateable(rhs,".domain","div")
        .classed("domain item",true)
        .html("<span>Domain </span><a href='http://" + x.domain + "'>" + x.domain + "</a>")

      d3_updateable(rhs,".category","div")
        .classed("category item",true)
        .html("<span>Category </span>" + x.parent_category_name)

      d3_updateable(rhs,".site-count","div")
        .classed("site-count item",true)
        .html("<span>Site Visits </span>" + site_visits)

      d3_updateable(rhs,".site-unique-pages","div")
        .classed("site-unique-pages item",true)
        .html("<span>Unique Pages </span>" + unique_sites)





      d3_updateable(rhs,"h3.details","h3")
        .classed("details",true)
        .text("Page Details")
        .style("margin-top","50px")
        .style("margin-bottom","10px")

      d3_updateable(rhs,".url","div")
        .classed("url item",true)
        .html("<span>Page URL </span><a href='" + x.url + "'>" + x.url + "</a>")
      
      d3_updateable(rhs,".count","div")
        .classed("count item",true)
        .html("<span>Page Visits </span>" + x.count)

      
    })
    //.call(
    //  d3.helper.tooltip()
    //    .text(function(d, i){return d.url;})
    //);

  
  

  


  return this
}

d3.helper = {};

d3.helper.tooltip = function(){
    var tooltipDiv;
    var bodyNode = d3.select('body').node();    
    var attrs = [];
    var text = "";
    var styles = [];

    function tooltip(selection) {

        selection.on("mouseover", function(d, i){
            var name, value;
            // Clean up lost tooltips
            d3.select('body').selectAll('div.tooltip').remove();
            // Append tooltip
            tooltipDiv = d3.select('body').append('div');
            for (var i in attrs) {
                var name = attrs[i][0];
                if (typeof attrs[i][1] === "function") {
                    value = attrs[i][1](d, i);
                } else value = attrs[i][1];
                if (name === "class") value += " tooltip";
                tooltipDiv.attr(name, value);
            }
            for (var i in styles) {
                name = styles[i][0];
                if (typeof attrs[i][1] === "function") {
                    value = styles[i][1](d, i);
                } else value = styles[i][1];
                tooltipDiv.style(name, value);
            }
            var absoluteMousePos = d3.mouse(bodyNode);
            tooltipDiv.style('left', (absoluteMousePos[0] + 10)+'px')
                .style('top', (absoluteMousePos[1] - 15)+'px')
                .style('position', 'absolute') 
                .style('z-index', 1001);
            // Add text using the accessor function
            var tooltipText = '';
            if (typeof text === "function") tooltipText = text(d, i);
            else if (typeof text != "undefined" || typeof text != null) tooltipText = text;
            // Crop text arbitrarily
            tooltipDiv.style('width', function(d, i){return (tooltipText.length > 80) ? '300px' : null;})
                .html(tooltipText);
        })
        .on('mousemove', function(d, i) {
            // Move tooltip
            var absoluteMousePos = d3.mouse(bodyNode);
            tooltipDiv.style('left', (absoluteMousePos[0] + 10)+'px')
                .style('top', (absoluteMousePos[1] - 15)+'px');
            var tooltipText = '';
            if (typeof text === "string") tooltipText = text;
            if (typeof text === "function") tooltipText = text(d, i);
            tooltipDiv.html(tooltipText);
        })
        .on("mouseout", function(d, i){
            // Remove tooltip
            tooltipDiv.remove();
        });

    }

    tooltip.attr = function(name, value) {
        attrs.push(arguments);
        return this;
    }

    tooltip.text = function(value) {
        text = value;
        return this;
    }

    tooltip.style = function(name, value) {
        styles.push(arguments);
        return this;
    }

    return tooltip;
};

export default draw
