import * as transform from '../data_helpers'
import table from 'table'
import time_series from '../timeseries'

export default function render_data_view(_lower,data) {

      var head = d3_updateable(_lower, "h3","h3")
        .style("margin-bottom","15px")
        .style("margin-top","-5px")

      var self = this

      var tabs = [
          transform.buildDomains(data)
        , transform.buildUrls(data)
      ]

      if ((tabs[0].selected == undefined) && (!this._state.get("tabs")))  this._state.set("tabs",[1,0]) 

      this._state.get("tabs").map(function(x,i) { tabs[i].selected = x })

      d3_updateable(head,"span","span")
        .text(tabs.filter(function(x){ return x.selected})[0].key)

      var select = d3_updateable(head,"select","select")
        .style("width","19px")
        .style("margin-left","12px")
        .on("change", function(x) {
          tabs.map(function(y) { y.selected = 0 })

          this.selectedOptions[0].__data__.selected = 1
          self._state.set("tabs", tabs.map(function(y) {return y.selected }) )
          draw()
        })
      
      d3_splat(select,"option","option",tabs,function(x) {return x.key})
        .text(function(x){ return x.key })
        .style("color","#888")
        .style("min-width","100px")
        .style("text-align","center")
        .style("display","inline-block")
        .style("padding","5px")
        .style("border",function(x) {return x.selected ? "1px solid #888" : undefined})
        .style("opacity",function(x){ return x.selected ? 1 : .5})

      function draw() {
        var selected = tabs.filter(function(x){ return x.selected})[0]

        d3_updateable(head,"span","span")
          .text(selected.key)

        _lower.selectAll(".vendor-domains-bar-desc").remove()

        _lower.datum(data)

        var t = table.table(_lower)
          .data(selected)


        if (selected.key == "Top Domains") {

          var samp_max = d3.max(selected.values,function(x){return x.sample_percent_norm})
            , pop_max = d3.max(selected.values,function(x){return x.pop_percent})
            , max = Math.max(samp_max,pop_max);

          t.headers([
                {key:"key",value:"Domain",locked:true,width:"100px"}
              , {key:"value",value:"Sample versus Pop",locked:true}
              , {key:"count",value:"Views",selected:false}

            ])
            .option_text("&#65291;")
            .on("expand",function(d) {

              d3.select(this).selectAll("td.option-header").html("&ndash;")
              if (d3.select(this.nextSibling).classed("expanded") == true) {
                d3.select(this).selectAll("td.option-header").html("&#65291;")
                return d3.select(this.parentNode).selectAll(".expanded").remove()
              }

              d3.select(this.parentNode).selectAll(".expanded").remove()
              var t = document.createElement('tr');
              this.parentNode.insertBefore(t, this.nextSibling);  

              var tr = d3.select(t).classed("expanded",true).datum({})
              var td = d3_updateable(tr,"td","td")
                .attr("colspan",this.children.length)
                .style("background","#f9f9fb")
                .style("padding-top","10px")
                .style("padding-bottom","10px")

              var dd = this.parentElement.__data__.full_urls.filter(function(x) { return x.domain == d.key})


              var p = []
              d3.range(0,24).map(function(t) {
                ["0","20","40"].map(function(m) {
                  if (t < 10) p.push("0" + String(t)+String(m))
                  else p.push(String(t)+String(m))

                })
              })

              var rolled = d3.nest()
                .key(function(k) { return k.hour + k.minute })
                .rollup(function(v) {
                  return v.reduce(function(p,c) {
                    p.articles[c.url] = true
                    p.views += c.count
                    p.sessions += c.uniques
                    return p
                  },{ articles: {}, views: 0, sessions: 0})
                })
                .entries(dd)
                .map(function(x) {
                  Object.keys(x.values).map(function(y) {
                    x[y] = x.values[y]
                  })
                  x.article_count = Object.keys(x.articles).length
                  x.hour = x.key.slice(0,2)
                  x.minute = x.key.slice(2)
                  x.value = x.article_count
                  x.key = p.indexOf(x.key)
                  //delete x['articles']
                  return x
                })

              var timing = d3_updateable(td,"div.timing","div",rolled)
                .classed("timing",true)
                .style("height","60px")
                .style("width","60%")
                .style("text-transform","uppercase")
                .style("font-weight","bold")
                .style("font-size",".9em")
                .style("margin-bottom","45px")
                .style("line-height","35px")
                .style("display","inline-block")
                .text("Articles Accessed")

              var details = d3_updateable(td,"div.details","div")
                .classed("details",true)
                .style("width","40%")
                .style("display","inline-block")
                .style("vertical-align","top")

              d3_updateable(details,"span","span")
                .style("text-transform","uppercase")
                .style("font-weight","bold")
                .style("font-size",".9em")
                .style("margin-bottom","10px")
                .style("line-height","35px")
                .text("Details")

              var articles = d3_updateable(td,"div.articles","div")
                .classed("articles",true)

              d3_updateable(articles,"span","span")
                .style("text-transform","uppercase")
                .style("font-weight","bold")
                .style("font-size",".9em")
                .style("margin-bottom","10px")
                .style("line-height","35px")
                .text("Top articles")
                
              var drawArticles = function(urls) {

                var a = d3_splat(articles,"div","div",urls)
                  .text(String)
                  .exit().remove()

              }

              var drawDetails = function(x) {

                var time = d3_updateable(details,".time","div",x)
                  .classed("time",true)
                  .text("Time: " + x.hour + ":" + (x.minute.length == 1 ? "0" + x.minute : x.minute ) )

                var button = d3_updateable(details,".button","a",false,function() { return 1})
                  .classed("button",true)
                  .style("padding","5px")
                  .style("border-radius","5px")
                  .style("border","1px solid #ccc")
                  .style("margin","auto")
                  .style("margin-top","10px")
                  .style("display","block")
                  .style("width","50px")
                  .style("text-align","center")
                  .text("Reset")
                  .on("click",reset)

              }

              var reset = function() {
                details.selectAll(".time").remove()
                details.selectAll(".button").remove()

                drawArticles(d.urls.slice(0,10))
              }
              reset() 

              time_series(timing)
                .data({"key":"y","values":timing.data()[0]})
                .on("hover",function(x) {
                  drawArticles(Object.keys(x.articles).slice(0,10))
                  drawDetails(x)

                })
                .draw()

               
               
                
            })
            .hidden_fields(["urls","percent_unique","sample_percent_norm"])
            .render("value",function(d) {
              var width = (d3.select(this).style("width").replace("px","") || this.offsetWidth) - 50
                , height = 28;

              var x = d3.scale.linear()
                .range([0, width])
                .domain([0, max])

              if (d3.select(this).text()) d3.select(this).text("")

              var bullet = d3_updateable(d3.select(this),".bullet","div",this.parentNode.__data__,function(x) { return 1 })
                .classed("bullet",true)
                .style("margin-top","3px")

              bullet.exit().remove()

              var svg = d3_updateable(bullet,"svg","svg",false,function(x) { return 1})
                .attr("width",width)
                .attr("height",height)
  
   
              d3_updateable(svg,".bar","rect",false,function(x) { return 1})
                .attr("x",0)
                .attr("width", function(d) {return x(d.pop_percent) })
                .attr("height", height)
                .attr("fill","#888")
  
              d3_updateable(svg,".bar","rect",false,function(x) { return 1})
                .attr("x",0)
                .attr("y",height/4)
                .attr("width", function(d) {return x(d.sample_percent_norm) })
                .attr("height", height/2)
                .attr("fill","rgb(8, 29, 88)")


            })
          
        }

        t.draw()
      }

      draw()      
    }
