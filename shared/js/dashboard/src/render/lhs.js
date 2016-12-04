import * as transform from '../data_helpers'
import * as ui_helper from '../helpers'
import bar_selector from '../bar_selector'


export default function render_lhs() {

      var self = this

      this._lhs = d3_updateable(this._target,".lhs","div")
        .classed("lhs col-md-2",true)
        .style("border-right","1px solid #ccc")

      var current = this._lhs
        //, _top = ui_helper.topSection(current)
        , _lower = ui_helper.remainingSection(current)

      //summary_box(_top)
      //  .data(transform.buildOnsiteSummary(this._data))
      //  .draw()

      this._data.display_actions = this._data.display_actions || transform.buildActions(this._data)
      _lower.classed("affix",true)
        .style("min-width","200px")

      bar_selector(_lower)
        .type("radio")
        .data(this._data.display_actions)
        .on("click",function(x) {
          var t = this;
          self._state.set("action_name",x.key)
          _lower.selectAll("input")
            .attr("checked",function() {
              this.checked = (t == this)
              return undefined
            })

          //self._data.display_actions.values.map(function(v) {
          //  v.selected = 0
          //  if (v == x) v.selected = 1
          //})
          self.draw_loading()

          self.on("select")(x)
        })
        .draw()

    }
