import * as transform from '../data_helpers'
import table from 'table'
import time_series from '../timeseries'
import * as timeseries from '../timeseries'


export default function render_data_view(_lower,data) {

      var _olower = _lower

      var options = d3_updateable(_lower,".options-view","div")
        .classed("options-view",true)
        .style("margin-bottom","35px")

      var _media = d3_updateable(_lower,".media-view","div")
        .classed("view-option media-view hidden",true)
        .style("margin-left","-15px")
        .style("margin-right","-15px")

      var _content = d3_updateable(_lower,".content-view","div")
        .classed("view-option content-view hidden",true)


      var _lower = d3_updateable(_lower,".data-view","div")
        .classed("view-option data-view hidden",true)

      

      var CSS_STRING = String(function() {/*
    .options-view { text-align:center }
    .show-button {
    width: 190px;
    text-align: center;
    line-height: 50px;
    border-radius: 15px;
    border: 1px solid #ccc;
    font-size: 12px;
    text-transform: uppercase;
    font-weight: bold;
    display:inline-block;
    margin-right:30px;
      }
      */})
    
      d3_updateable(d3.select("head"),"style#show-css","style")
        .attr("id","header-css")
        .text(CSS_STRING.replace("function () {/*","").replace("*/}",""))

      d3_updateable(options, "h3.option-header","h3")
        .classed("option-header",true)
        .style("margin-bottom","15px")
        .style("margin-top","0px")
        .style("text-align","left")
        .text("Choose Option")


      d3_updateable(options,".show-data-view","a")
        .classed("show-data-view show-button",true)
        .text("Explore data")
        .on("click",function() { 
          _olower.selectAll(".view-option").classed("hidden",true) 

          _lower.classed("hidden",false) 
        })

      d3_updateable(options,".media-plan-view","a")
        .classed("media-plan-view show-button",true)
        .text("Create Media Plan")
        .on("click",function() { 
          _olower.selectAll(".view-option").classed("hidden",true) 

          _media.classed("hidden",false) 
          media_plan.media_plan(_media)
            .data(data)
            .draw()


        })

      d3_updateable(options,".generate-content-view","a")
        .classed("generate-content-view show-button",true)
        .text("Build Content Brief")
        .on("click",function() { 
          _olower.selectAll(".view-option").classed("hidden",true) 

          _content.classed("hidden",false) 
        })






      var chead = d3_updateable(_content, "h3.data-header","h3")
        .classed("data-header",true)
        .style("margin-bottom","15px")
        .style("margin-top","-5px")


      d3_updateable(chead,"span","span")
        .text("Content Brief (Coming soon)")




      var head = d3_updateable(_lower, "h3.data-header","h3")
        .classed("data-header",true)
        .style("margin-bottom","15px")
        .style("margin-top","-5px")

      var self = this

      var tabs = [
          transform.buildDomains(data)
        , transform.buildUrls(data)
        , transform.buildTopics(data)

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


        if ((selected.key == "Top Topics") || (selected.key == "Top Domains")) {

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


              

              var rolled = timeseries.prepData(dd)

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
  
   
              d3_updateable(svg,".bar-1","rect",false,function(x) { return 1})
                .classed("bar-1",true)
                .attr("x",0)
                .attr("width", function(d) {return x(d.pop_percent) })
                .attr("height", height)
                .attr("fill","#888")
  
              d3_updateable(svg,".bar-2","rect",false,function(x) { return 1})
                .classed("bar-2",true)
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
