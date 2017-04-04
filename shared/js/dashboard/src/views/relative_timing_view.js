import accessor from '../helpers'
import header from '../generic/header'
import table from 'table'

import {drawStream} from './summary_view'
import {simpleTimeseries} from './summary_view'


function d3_class(target,cls,type) {
  return d3_updateable(target,"." + cls, type || "div")
    .classed(cls,true)
}


export default function relative_timing(target) {
  return new RelativeTiming(target)
}

class RelativeTiming {
  constructor(target) {
    this._target = target
    this._on = {}
  }

  data(val) { return accessor.bind(this)("data",val) } 

  on(action, fn) {
    if (fn === undefined) return this._on[action] || noop;
    this._on[action] = fn;
    return this
  }


  draw() {


        var self = this
    var data = this._data
    var wrap = d3_class(this._target,"summary-wrap")

    header(wrap)
      .text("Before and After")
      .draw()

    var bawrap = d3_updateable(wrap,".ba-row","div",false,function() { return 1})
        .classed("ba-row",true)
        .style("padding-bottom","10px")

    drawStream(bawrap,this._data.before_categories,this._data.after_categories)

    var values = this._data.before_categories[0].values


    var category_multipliers = data.before_categories.reduce((p,c) => {
      p[c.key] = (1 + c.values[0].percent_diff)
      return p
    },{})


    var tabular_data = this._data.before.reduce((p,c) => {
      p[c.domain] = p[c.domain] || {}
      p[c.domain]['domain'] = c.domain
      p[c.domain]['weighted'] = c.visits * category_multipliers[c.parent_category_name]
      
      p[c.domain][c.time_diff_bucket] = (p[c.domain][c.time_diff_bucket] || 0) + c.visits
      return p
    },{})

    tabular_data = this._data.after.reduce((p,c) => {
      p[c.domain] = p[c.domain] || {} 
      p[c.domain]['domain'] = c.domain
      p[c.domain]["-" + c.time_diff_bucket] = (p[c.domain][c.time_diff_bucket] || 0) + c.visits

      return p
    },tabular_data)

    var sorted_tabular = Object.keys(tabular_data).map((k) => {
      return tabular_data[k]
    }).sort((p,c) => {
      
      return d3.descending(p['600']*p.weighted || -Infinity,c['600']*c.weighted || -Infinity)
    })




    var buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].reverse().map(function(x) { return String(x*60) })
    buckets = buckets.concat([10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return String(-x*60) }))


    var formatName = function(x) {

      if (x < 0) x = -x

      if (x == 3600) return "1 hr"
      if (x < 3600) return x/60 + " mins" 

      if (x == 86400) return "1 day"
      if (x > 86400) return x/86400 + " days" 

      return x/3600 + " hrs"
    }

    var table_obj = table.table(bawrap)
      .top(140)
      .headers(
        [{"key":"domain", "value":"Domain"}].concat(
          buckets.map(x => { return {"key":x, "value":formatName(x), "selected":true} })
        )
        
      )
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

          var before_urls = data.before.filter(y => y.domain == d.domain)
          var after_urls = data.after.filter(y => y.domain == d.domain)

          var url_category = before_urls.reduce((p,c) => {
            p[c.url] = c.parent_category_name
            return p
          },{})
          url_category = after_urls.reduce((p,c) => {
            p[c.url] = c.parent_category_name
            return p
          },url_category)


          var url_volume = before_urls.reduce((p,c) => {
            p[c.url] = (p[c.url] || 0) + c.visits
            return p
          },{})
          url_volume = after_urls.reduce((p,c) => {
            p[c.url] = (p[c.url] || 0) + c.visits
            return p
          },url_volume)

    
          
          var sorted_urls = d3.entries(url_volume).sort((p,c) => { 
            return d3.descending(p.value,c.value) 
          })


          var before_url_ts = before_urls.reduce((p,c) => {
            p[c.url] = p[c.url] || {}
            p[c.url]["url"] = c.url

            p[c.url][c.time_diff_bucket] = c.visits
            return p
          },{})

          var after_url_ts = after_urls.reduce((p,c) => {
            p[c.url] = p[c.url] || {}
            p[c.url]["url"] = c.url

            p[c.url]["-" + c.time_diff_bucket] = c.visits
            return p
          },before_url_ts)



          var to_draw = sorted_urls.slice(0,1000).map(x => after_url_ts[x.key])
.map(function(x){
  x.total = d3.sum(buckets.map(function(b) { return x[b] || 0 }))
  return x
})

var kw_to_draw = d3.entries(after_url_ts).reduce(function(p,c) {

  c.key.toLowerCase().split(d.domain)[1].split("/").reverse()[0].replace("_","-").split("-").map(x => {
    var values = ["that","this","what","best","most","from","your","have","first","will","than","says","like","into","after","with"]
    if (x.match(/\d+/g) == null && values.indexOf(x) == -1 && x.indexOf(",") == -1 && x.indexOf("?") == -1 && x.indexOf(".") == -1 && x.indexOf(":") == -1 && parseInt(x) != x && x.length > 3) {
      p[x] = p[x] || {}
      p[x].key = x
      Object.keys(c.value).map(q => {
        p[x][q] = (p[x][q] || 0) + c.value[q]
      })
    }
    return p
  })
  return p
},{})


kw_to_draw = Object.keys(kw_to_draw).map(function(k) { return kw_to_draw[k] }).map(function(x){
  x.total = d3.sum(buckets.map(function(b) { return x[b] || 0 }))
  return x
}).sort((p,c) => {
  return c.total - p.total
})




          var summary_row = d3_class(td,"summary-row").style("margin-bottom","15px")
          var title_row = d3_class(td,"title-row")
          var expansion_row = d3_class(td,"expansion-row")
          var footer_row = d3_class(td,"footer-row").style("min-height","90px").style("margin-top","15px")
          


          d3_class(summary_row,"title")
            .style("font-size","16px")
            .style("font-weight","bold")
            .style("text-align","center")
            .style("line-height","40px")
            .style("margin-bottom","5px")
            .text("Before and After: " + d.domain)

          var options = [
              {"key":"All","value":"all", "selected":1}
            , {"key":"Consideration","value":"consideration", "selected":0}
            , {"key":"Validation","value":"all", "selected":0}
          ]

          var opts = d3_class(summary_row,"options")
            .style("text-align","center")
            .style("display","none")

          d3_splat(opts,".show-button","a",options,x => x.key)
            .classed("show-button",true)
            .classed("selected",x => x.selected)
            .style("line-height","36px")
            .style("margin-bottom","20px")
            .text(x => x.key)


          d3_class(summary_row,"description")
            .style("font-size","12px")
            .style("text-align","center")
            .style("margin-bottom","20px")
            .text("Select domains and keywords to build and refine your global filter")

          d3_class(footer_row,"title")
            .style("font-size","14px")
            .style("font-weight","bold")
            .style("line-height","40px")
            .text("Build Filter")



          var select_value = {"value":""}

          function buildFilterInput() {

            var select = d3_updateable(footer_row,"input","input")
              .style("min-width","200px")
              .attr("value",select_value.value)
              .property("value",select_value.value)



        footer_row.selectAll(".selectize-control")
          .each(function(x) {
            var destroy = d3.select(this).on("destroy")
            if (destroy) destroy()
          })



            var s = $(select.node()).selectize({
              persist: false,
              create: function(x){
                select_value.value = (select_value.value.length ? select_value.value + "," : "") + x
                //self.on("update")(self.data())
                return {
                  value: x, text: x
                }
              },
              onDelete: function(x){
                select_value.value = select_value.value.split(",").filter(function(z) { return z != x[0]}).join(",")
                //self.on("update")(self.data())
                return {
                  value: x, text: x
                }
              }
            })

       footer_row.selectAll(".selectize-control")
          .on("destroy",function() {
            s[0].selectize.destroy()
          })

          }

          buildFilterInput()


          var button = d3_updateable(footer_row,"button","button")
            .style("min-width","120px")
            .style("border-radius","5px")
            .style("line-height","29px")
            .style("background","#f9f9fb")
            .style("border","1px solid #ccc")
            .style("border-radius","5px")
            .style("vertical-align","top")
            .attr("type","submit")
            .text("Add filter")
            .on("click",function() {
              self.on("add-filter")({"field":"Title","op":"contains","value":select_value.value})
            })








          var urls_summary = d3_class(summary_row,"urls-summary")
            .style("display","inline-block")
            .style("width","50%")

          var kws_summary = d3_class(summary_row,"kws-summary")
            .style("display","inline-block")
            .style("width","50%")


          d3_class(urls_summary,"title")
            .style("font-weight","bold")
            .style("font-size","14px")
            .text("URL Summary")

          d3_class(kws_summary,"title")
            .style("font-weight","bold")
            .style("font-size","14px")
            .text("Keyword Summary")

          d3_class(urls_summary,"count")
            .style("line-height","24px")
            .style("padding-left","4px")
            .text("Distinct URLs: " + to_draw.length)

          d3_class(kws_summary,"count")
            .style("line-height","24px")
            .style("padding-left","4px")
            .text("Distinct Keywords: " + kw_to_draw.length)

          d3_class(urls_summary,"views")
            .style("line-height","24px")
            .style("padding-left","4px")
            .text("Average Views: " + parseInt(to_draw.reduce((p,c) => p + c.total,0)/to_draw.length) )

          d3_class(kws_summary,"views")
            .style("line-height","24px")
            .style("padding-left","4px")
            .text("Average Views: " + parseInt(kw_to_draw.reduce((p,c) => p + c.total,0)/kw_to_draw.length) )

          d3_class(urls_summary,"median")
            .style("line-height","24px")
            .style("padding-left","4px")
            .text("Median Views: " + (to_draw[parseInt(to_draw.length/2)] || {}).total )

          d3_class(kws_summary,"median")
            .style("line-height","24px")
            .style("padding-left","4px")
            .text("Median Views: " + (kw_to_draw[parseInt(kw_to_draw.length/2)] || {}).total )








          var euh = d3_class(title_row,"expansion-urls-title")
            .style("width","50%")
            .style("height","36px")
            .style("line-height","36px")
            .style("display","inline-block")
            .style("vertical-align","top")
 
          d3_class(euh,"title")
            .style("width","265px")
            .style("font-weight","bold")
            .style("display","inline-block")
.style("vertical-align","top")

            .text("URL")

          d3_class(euh,"view")
            .style("width","50px")
            .style("margin-left","20px")
            .style("margin-right","20px")
            .style("font-weight","bold")
            .style("display","inline-block")
.style("vertical-align","top")

            .text("Views")

          var svg_legend = d3_class(euh,"legend","svg")
            .style("width","120px")
            .style("height","36px")
.style("vertical-align","top")



          d3_updateable(svg_legend,".before","text")
            .attr("x","30")
            .attr("y","20")
            .style("text-anchor","middle")
            .text("Before")

          d3_updateable(svg_legend,".after","text")
            .attr("x","90")
            .attr("y","20")
            .style("text-anchor","middle")
            .text("After")

          d3_updateable(svg_legend,"line","line")
                .style("stroke-dasharray", "1,5")
                .attr("stroke-width",1)
                .attr("stroke","black")
                .attr("y1", 0)
                .attr("y2", 36)
                .attr("x1", 60)
                .attr("x2", 60)




          var ekh = d3_class(title_row,"expansion-kws-title")
            .style("width","50%")
            .style("height","36px")
            .style("line-height","36px")
            .style("display","inline-block")
            .style("vertical-align","top")

          d3_class(ekh,"title")
            .style("width","265px")
            .style("font-weight","bold")
            .style("display","inline-block")

            .text("Keywords")

          d3_class(ekh,"view")
            .style("width","50px")
            .style("margin-left","20px")
            .style("margin-right","20px")
            .style("font-weight","bold")
            .style("display","inline-block")

            .text("Views")

          var svg_legend = d3_class(ekh,"legend","svg")
            .style("width","120px")
            .style("height","36px")
.style("vertical-align","top")



          d3_updateable(svg_legend,".before","text")
            .attr("x","30")
            .attr("y","20")
            .style("text-anchor","middle")
            .text("Before")

          d3_updateable(svg_legend,".after","text")
            .attr("x","90")
            .attr("y","20")
            .style("text-anchor","middle")
            .text("After")

          d3_updateable(svg_legend,"line","line")
                .style("stroke-dasharray", "1,5")
                .attr("stroke-width",1)
                .attr("stroke","black")
                .attr("y1", 0)
                .attr("y2", 36)
                .attr("x1", 60)
                .attr("x2", 60)








          var expansion = d3_class(expansion_row,"expansion-urls")
            .classed("scrollbox",true)
            .style("width","50%")
            .style("display","inline-block")
            .style("vertical-align","top")


            .style("max-height","300px")
            .style("overflow","scroll")

          var url_row = d3_splat(expansion,".url-row","div",to_draw,function(x) { return x.url })
            .classed("url-row",true)

          var url_name = d3_updateable(url_row,".name","div").classed("name",true)
            .style("width","260px")
            .style("overflow","hidden")
            .style("line-height","20px")
            .style("height","20px")

            .style("display","inline-block")

          d3_updateable(url_name,"input","input")
            .style("margin-right","10px")
            .style("display","inline-block")
            .style("vertical-align","top")
            .attr("type","checkbox")
            .on("click", function(x) {
              select_value.value += (select_value.value ? "," : "") + x.url

              buildFilterInput()
            })

          d3_class(url_name,"url")
            .style("display","inline-block")
            .style("text-overflow","ellipsis")
            .style("width","235px")
            .text(x => x.url.split(d.domain)[1] || x.url )

          d3_updateable(url_row,".number","div").classed("number",true)
            .style("width","50px")
            .style("height","20px")
            .style("line-height","20px")
            .style("vertical-align","top")
            .style("text-align","center")
            .style("font-size","13px")
            .style("font-weight","bold")
            .style("margin-left","20px")
            .style("margin-right","20px")
            .style("display","inline-block")
            .text(function(x) { return d3.sum(buckets.map(function(b) { return x[b] || 0 })) })


          d3_updateable(url_row,".plot","svg").classed("plot",true)
            .style("width","120px")
            .style("height","20px")
            .style("display","inline-block")
            .each(function(x) {
              var dthis = d3.select(this)
              var values = buckets.map(function(b) { return x[b] || 0 })
              simpleTimeseries(dthis,values,120,20)
              d3_updateable(dthis,"line","line")
                .style("stroke-dasharray", "1,5")
                .attr("stroke-width",1)
                .attr("stroke","black")
                .attr("y1", 0)
                .attr("y2", 20)
                .attr("x1", 60)
                .attr("x2", 60)

            })

          after_url_ts

          var expansion = d3_class(expansion_row,"expansion-keywords")
            .classed("scrollbox",true)
            .style("width","50%")
            .style("display","inline-block")
            .style("vertical-align","top")

            .style("max-height","300px")
            .style("overflow","scroll")

          var url_row = d3_splat(expansion,".url-row","div",kw_to_draw,function(x) { return x.key })
            .classed("url-row",true)

          var kw_name = d3_updateable(url_row,".name","div").classed("name",true)
            .style("width","260px")
            .style("overflow","hidden")
            .style("line-height","20px")
            .style("height","20px")

            .style("display","inline-block")

          d3_updateable(kw_name,"input","input")
            .style("display","inline-block")
            .style("vertical-align","top")

            .style("margin-right","10px")
            .attr("type","checkbox")
            .on("click", function(x) {
              select_value.value += (select_value.value ? "," : "") + x.key
              buildFilterInput()
            })

          d3_class(kw_name,"url")
            .style("text-overflow","ellipsis")
            .style("display","inline-block")
            .style("width","235px")
            .text(x => x.key )

          d3_updateable(url_row,".number","div").classed("number",true)
            .style("width","50px")
            .style("height","20px")
            .style("line-height","20px")
            .style("vertical-align","top")
            .style("text-align","center")
            .style("font-size","13px")
            .style("font-weight","bold")
            .style("margin-left","20px")
            .style("margin-right","20px")
            .style("display","inline-block")
            .text(function(x) { return d3.sum(buckets.map(function(b) { return x[b] || 0 })) })


          d3_updateable(url_row,".plot","svg").classed("plot",true)
            .style("width","120px")
            .style("height","20px")
            .style("display","inline-block")
            .each(function(x) {
              var dthis = d3.select(this)
              var values = buckets.map(function(b) { return x[b] || 0 })
              simpleTimeseries(dthis,values,120,20)
              d3_updateable(dthis,"line","line")
                .style("stroke-dasharray", "1,5")
                .attr("stroke-width",1)
                .attr("stroke","black")
                .attr("y1", 0)
                .attr("y2", 20)
                .attr("x1", 60)
                .attr("x2", 60)

            })

          
          //table.table(td)
          //  .headers(
          //    [{"key":"url", "value":"Url"}].concat(
          //      buckets.map(x => { return {"key":x, "value":formatName(x), "selected":true} })
          //    )
          //  )
          //  .skip_option("true")
          //  .data({"values":to_draw})
          //  .draw()
        



        })
      .option_text("<div style='width:40px;text-align:center'>&#65291;</div>")
      //.sort("600")
      .data({"values":sorted_tabular.slice(0,1000)})
      .draw()

    table_obj._target.selectAll("th")
      //.style("width",x => (parseInt(x.key) == x.key) ? "31px" : undefined )
      //.style("max-width",x => (parseInt(x.key) == x.key) ? "31px" : undefined )
      .style("border-right","1px rgba(0,0,0,.1)")
      .selectAll("span")
      .attr("style", function(x) { 
        if (parseInt(x.key) == x.key && x.key < 0) return "font-size:.9em;width:70px;transform:rotate(-45deg);display:inline-block;margin-left:-9px;margin-bottom: 12px"
        if (parseInt(x.key) == x.key && x.key > 0) return "font-size:.9em;width:70px;transform:rotate(45deg);text-align:right;display:inline-block;margin-left: -48px; margin-bottom: 12px;"

      })


    table_obj._target.selectAll(".table-option")
      .style("display","none")



      



    //var t = table.table(_explore)
    //  .data(selected)



    
  }
}
