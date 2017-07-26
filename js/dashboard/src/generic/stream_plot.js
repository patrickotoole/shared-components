import {noop, d3_updateable, d3_splat} from '@rockerbox/helpers'
import accessor from '../helpers'

export default function stream_plot(target) {
  return new StreamPlot(target)
}

function drawAxis(target,scale,text,width) {
  var xAxis = d3.svg.axis();
  xAxis
    .orient('top')
    .scale(scale)
    .tickFormat(function(x) { 
      if (x == 3600) return "1 hour"
      if (x < 3600) return x/60 + " mins" 

      if (x == 86400) return "1 day"
      if (x > 86400) return x/86400 + " days" 

      return x/3600 + " hours"
    })

  var x_xis = d3_updateable(target,'g.x.before','g')
    .attr("class","x axis before")
    .attr("transform", "translate(0,-5)")
    .attr('id','xaxis')
    .call(xAxis);

        
  x_xis.selectAll("text")
    .attr("y", -25)
    .attr("x", 15)
    .attr("dy", ".35em")
    .attr("transform", "rotate(45)")
    .style("text-anchor", "end")

  x_xis.selectAll("line")
    .attr("style","stroke:black")

  x_xis.selectAll("path")
    .attr("style","stroke:black; display:inherit")

  d3_updateable(x_xis,"text.title","text")
    .attr("class","title")
    .attr("x",width/2)
    .attr("y",-46)
    .attr("transform",undefined)
    .style("text-anchor", "middle")
    .style("text-transform", "uppercase")
    .style("font-weight", "bold")
    .text(text + " ")

  return x_xis

}


class StreamPlot {
  constructor(target) {
    this._target = target
    this._on = {}
    this._buckets = [0,10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 })

    this._width = 370
    this._height = 250
    this._middle = 180
    this._color = d3.scale.ordinal()
      .range(
['#999','#aaa','#bbb','#ccc','#ddd','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','rgba(33, 113, 181,.9)','rgba(8, 81, 156,.91)','#08519c','rgba(8, 48, 107,.9)','#08306b'].reverse())

  } 

  key_accessor(val) { return accessor.bind(this)("key_accessor",val) }
  value_accessor(val) { return accessor.bind(this)("value_accessor",val) }
  height(val) { return accessor.bind(this)("height",val) }
  width(val) { return accessor.bind(this)("width",val) }
  middle(val) { return accessor.bind(this)("middle",val) }
  skip_middle(val) { return accessor.bind(this)("skip_middle",val) }




  data(val) { return accessor.bind(this)("data",val) } 
  title(val) { return accessor.bind(this)("title",val) } 


  draw() {

    var data = this._data
      , order = data.order
      , buckets = this._buckets
      , before_stacked = data.before_stacked
      , after_stacked = data.after_stacked
      , height = this._height
      , width = this._width
      , target = this._target
      , color = this._color
      , self = this

    color.domain(order)

    var y = d3.scale.linear()
      .range([height,0])
      .domain([0,d3.max(before_stacked, function(layer) { return d3.max(layer,function(d) {return d.y0 + d.y })})])
  
    var x = d3.scale.ordinal()
      .domain(buckets)
      .range(d3.range(0,width+10,width/(buckets.length-1)))
  
    var xreverse = d3.scale.ordinal()
      .domain(buckets.slice().reverse())
      .range(d3.range(0,width+10,width/(buckets.length-1)))

    this._before_scale = xreverse
    this._after_scale = x
  
    var barea = d3.svg.area()
      .interpolate("zero")
      .x(function(d) { return xreverse(d.x); })
      .y0(function(d) { return y(d.y0); })
      .y1(function(d) { return y(d.y0 + d.y); });
  
    var aarea = d3.svg.area()
      .interpolate("linear")
      .x(function(d) { return x(d.x); })
      .y0(function(d) { return y(d.y0); })
      .y1(function(d) { return y(d.y0 + d.y); });
  
  
    var svg = d3_updateable(target,"svg","svg")
      .attr("width", width*2+this._middle)
      .attr("height", height + 100);

    this._svg = svg
  
    var before = d3_updateable(svg,".before-canvas","g")
      .attr("class","before-canvas")
      .attr("transform", "translate(-1,60)")

    function hoverCategory(cat,time) {
      if (cat === false) {
        self.on("category.hover")(false)
      }
      apaths.style("opacity",".5")
      bpaths.style("opacity",".5")
      apaths.filter(y => y[0].key == cat).style("opacity",undefined)
      bpaths.filter(y => y[0].key == cat).style("opacity",undefined)
      d3.select(this).style("opacity",undefined)

      d3_updateable(middle,"text","text")
        .style("text-anchor", "middle")
        .style("text-transform","uppercase")
        .style("font-weight", "bold")
        .style("font-size","10px")
        .style("color","#333")
        .style("opacity",".65")
        .text(cat)

      var mwrap = d3_updateable(middle,"g","g")

      self.on("category.hover").bind(mwrap.node())(cat,time)
    }
  
    var b = d3_updateable(before,"g","g")

    function mOver(x) {
      hoverCategory.bind(this)(x[0].key)
    }
    function mOut(x) {
      hoverCategory.bind(this)(false)
      apaths.style("opacity",undefined)
      bpaths.style("opacity",undefined)
    }
    function click(x) {
        var bool = apaths.on("mouseover") == mOver

        apaths.on("mouseover",bool ? noop: mOver)
        apaths.on("mouseout",bool ? noop: mOut)
        bpaths.on("mouseover",bool ? noop: mOver)
        bpaths.on("mouseout",bool ? noop: mOut)

    }

    var bpaths = d3_splat(b,"path","path", before_stacked,function(x,i) { return x[0].key})
      .attr("d", barea)
      .attr("class", function(x) { return x[0].key})
      .style("fill", function(x,i) { return color(x[0].key); })
      .on("mouseover",mOver)
      .on("mouseout",mOut)
      .on("click",click)

    bpaths.exit().remove()

    var brect = d3_splat(b,"rect","rect",buckets.slice().reverse(),(x,i) => i)
      .attr("x",z => xreverse(z))
      .attr("width",1)
      .attr("height",height)
      .attr("y",0)
      .attr("opacity","0")



      

    var middle = d3_updateable(svg,".middle-canvas","g")
      .attr("class","middle-canvas")
      .attr("transform","translate(" + (width + this._middle/2) + ",60)")
      .style("display",this._skip_middle ? "none": "inherit")
  
  
  
    var after = d3_updateable(svg,".after-canvas","g")
      .attr("class","after-canvas")
      .attr("transform", "translate(" + (width + this._middle) + ",60)")

    var a = d3_updateable(after,"g","g")

    
  
    var apaths = d3_splat(a,"path","path",after_stacked,function(x,i) { return x[0].key})
      .attr("d", aarea)
      .attr("class", function(x) { return x[0].key})
      .style("fill", function(x,i) { return color(x[0].key); })
      .on("mouseover",mOver)
      .on("mouseout",mOut)
      .on("click",click)


    apaths.exit().remove()

    var _x_xis = drawAxis(before,xreverse,"before arriving",width)

    _x_xis.selectAll("text").filter(function(y){ return y == 0 }).remove()

    var _x_xis = drawAxis(after,x,"after leaving",width)

    _x_xis.selectAll("text:not(.title)")
      .attr("transform", "rotate(-45)")
      .attr("x",20)
      .attr("y",-25)

    _x_xis.selectAll("text").filter(function(y){ return y == 0 }).remove()

    return this
  }

  on(action,fn) {
    if (fn === undefined) return this._on[action] || noop;
    this._on[action] = fn;
    return this
  }
}
