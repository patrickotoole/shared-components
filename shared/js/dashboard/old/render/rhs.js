import * as transform from '../data_helpers'
import * as ui_helper from '../helpers'
import share from '../share'
import * as overlay from './overlay'

export default function render_rhs(data) {

      var self = this
        , data = data || this._data

      this._right = d3_updateable(this._target,".right","div")
        .classed("right col-md-3",true)

      var current = this._right
        , _top = ui_helper.topSection(current)
        , _lower = ui_helper.remainingSection(current)

      var head = d3_updateable(_top, "h3","h3")
        .style("margin-bottom","15px")
        .style("margin-top","-5px")
        .text("")

      _top.classed("affix",true)
        .style("right","0px")
        .style("width","inherit")


      

      var funcs = {
          "Build Media Plan": function(x) {
            document.location = "/crusher/media_plan"
          }
        , "Share Search": overlay.share_search
        , "Schedule Report": overlay.schedule_report
      }

      //var f = d3_splat(_top,".subtitle-filter","a",["Save Results","Share Results","Schedule Results","Build Content Brief","Build Media Plan" ])

      var f = d3_splat(_top,".subtitle-filter","a",["Share Search","Schedule Report", "", "Build Media Plan"])
        .classed("subtitle-filter",true)
        .style("text-transform","uppercase")
        .style("font-weight","bold")
        .style("line-height", "24px")
        .style("padding","16px")
        .style("width"," 180px")
        .style("text-align"," center")
        .style("border-radius"," 10px")
        .style("border",function(x) { return x == "" ? "none" : "1px solid #ccc" } )
        .style("padding"," 10px")
        .style("margin"," auto")
        .style("margin-bottom","10px")
        .style("cursor","pointer")
        .style("display","block")
        .text(String)
        .on("click", function(x) {
          funcs[x].bind(self)(self._data)
        })

     

      this._data.display_categories = data.display_categories || transform.buildCategories(data)


    }
