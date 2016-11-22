import 'd3'
import accessor from '../helpers'


export function Integrations(target) {
  this._target = target;

  var self = this;
  this._on = {
      "success": function(x) { /* should override with success event (next) */ }
    , "fail" : function(err) { self._message.update("Error: " + err)}
  }
}

export default function integrations(target) {
  return new Integrations(target)
}

Integrations.prototype = {
    draw: function() {

      this.render_stage()
      this.render_envelope()

      return this
    }
  , render_stage: function() {
      this._stage = start.stage(this._target)
        .title("Integrations!")
        .subtitle("Get started by setting up Hindsight campaigns within your Adwords account!")
        .left("")
        .right("")
        .draw()
    }
  , render_envelope: function() {
      var iwrap = d3_updateable(this._stage._stage,".img","div")
        .classed("img pull-left",true)
        .style("width"," 50%")
        .style("border","10px solid white")
        .style("background","white")


      var div = d3_updateable(iwrap,"div.slack","div")
        .classed("slack hidden",true)
        .style("text-align","center")

      var head = d3_updateable(div,"h3","h3")
        .text("Integrate Hindsight with Slack")
        .style("margin-bottom","30px")
        .style("font-weight","bold")


      d3_updateable(div,".slack-btn-wrap","div")
        .classed("slack-btn-wrap",true)
        .style("text-align","center")
        .html('<a href="https://slack.com/oauth/authorize?scope=incoming-webhook,commands,bot,channels:read,channels:write,groups:read,groups:write,chat:write:bot&amp;client_id=2171079607.55132364375"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"></a>')
        .style("margin-bottom","30px")


      var div = d3_updateable(iwrap,"div.adwords","div")
        .classed("adwords",true)
        .style("text-align","center")

      var head = d3_updateable(div,"h3","h3")
        .text("Integrate Hindsight with Adwords")
        .style("margin-bottom","30px")
        .style("font-weight","bold")


      d3_updateable(div,".adwords-btn-wrap","div")
        .classed("adwords-btn-wrap",true)
        .style("text-align","center")
        .html('<a href="/integrations/adwords" style="display: inline-block; border: solid 1px #e0e0e0; background-color: #fafafa; line-height: 24px; padding: 8px; border-radius: 3px; color: #666; text-decoration: none; font-family: sans-serif; font-size: 14px;"><svg style="display: inline-block; float: left; margin-right: 5px;" version="1.1" id="Layer_3" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="24px" height="24px" viewBox="0 -180 20 80" xml:space="preserve"><g><path fill="#0F9D59" d="M26.864-100.747l17.997,0.003l-0.018-0.041l-24.577-73.752v70.98C21.937-101.833,24.266-100.747,26.864-100.747"></path><path fill="#0A6E3D" d="M7.903-137.693l10.271,30.826c0.003,0.006,0.003,0.012,0.006,0.023c0.448,1.251,1.172,2.355,2.077,3.29v-70.978l-0.026-0.07L7.903-137.693z"></path><path fill="#4284F4" d="M-4.419-174.604l-0.006,0.026l-0.009-0.026l-24.604,73.822l-0.018,0.038h17.997c2.596,0,4.928-1.081,6.601-2.818c0.902-0.932,1.626-2.036,2.074-3.287c0.003-0.012,0.003-0.018,0.006-0.018l22.614-67.746H-4.425v0.009H-4.419z"></path></g></svg>Connect with AdWords</a>')
        .style("margin-bottom","30px")




    }
  , text: function(val) { return accessor.bind(this)("text",val) }
  , data: function(val) { return accessor.bind(this)("data",val) }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action];
      this._on[action] = fn;
      return this
    }
}

