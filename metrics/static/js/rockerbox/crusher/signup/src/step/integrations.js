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
        .subtitle("People love integrations. And it sounds like you're one of them. Right now we've made it easy for you to receive the digest in Slack everyday. ")
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


      var div = d3_updateable(iwrap,"div","div")
        .style("text-align","center")

      var head = d3_updateable(div,"h3","h3")
        .text("Integrate Hindsight with Slack")
        .style("margin-bottom","30px")
        .style("font-weight","bold")


      d3_updateable(iwrap,".slack-btn-wrap","div")
        .classed("slack-btn-wrap",true)
        .style("text-align","center")
        .html('<a href="https://slack.com/oauth/authorize?scope=incoming-webhook,commands,bot,channels:read,channels:write,groups:read,groups:write,chat:write:bot&amp;client_id=2171079607.55132364375"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"></a>')
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

