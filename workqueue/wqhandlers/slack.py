import tornado.web
import ujson
import pandas
import StringIO
import logging
import work_queue
import logging
import pickle
import hashlib
import datetime

from twisted.internet import defer

INSERT = "insert into slack_log_match (regex, channel, message) values (%(regex)s, %(channel)s, %(message)s)"

class SlackHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, crushercache=None, *args, **kwargs):
        self.zookeeper = zookeeper
        self.crushercache = crushercache

    def add_to_db(self, request_body):
        data = ujson.loads(request_body)
        self.crushercache.execute(INSERT, data)

    @tornado.web.asynchronous
    def get(self):
        try:
            df = self.crushercache.select_dataframe("select * from slack_log_match")
            data = {'values':[]}
            for item in df.iterrows():
                data['values'].append({"channel":item[1]['channel'], "message":item[1]["message"], "regex":item[1]["regex"],"active":item[1]['active'], "deleted":item[1]['deleted']})
            self.render("slackdatatable.html", data=data, paths="")
        except Exception, e:
            self.set_status(400)
            self.write(ujson.dumps({"error":str(e)}))
            self.finish()

    @tornado.web.asynchronous
    def post(self):
        try:
            self.add_to_db(self.request.body)
            self.write(ujson.dumps({"success":"True"}))
            self.finish()
        except Exception, e:
            self.set_status(400)
            self.write(ujson.dumps({"error":str(e)}))
            self.finish()


class SlackNewHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, crushercache=None, *args, **kwargs):
        self.zookeeper = zookeeper
        self.crushercache = crushercache

    def get_content_schedule(self,data):
        js = """
<style>
.content .label {
  min-width:100px;color:black;display:inline-block
}
</style>
<script>
var content = d3.select(".content");


var select_target = content.append("div").classed("selector",true)

var select_target_name = content.append("div").classed("selector_name",true).text("Message")

var select_target_days = content.append("div").classed("selector_code",true).text("Channel")

var select_target_time = content.append("div").classed("selector_code",true).text("Regex")

var submit_target = content.append("div").classed("submit",true)


var resp_target = content.append("div").classed("response",true)

select_target_name.append("input")
    .classed("paraminput3",true)
    .style("width","200px")
    .style("margin-top", "10px")
    .style("margin-left", "8%")

select_target_days.append("input")
    .classed("paraminput3",true)
    .style("width","200px")
    .style("margin-top", "10px")
    .style("margin-left", "8%")

select_target_time.append("input")
    .classed("paraminput3",true)
    .style("width","200px")
    .style("margin-top", "10px")
    .style("margin-left", "8%")


submit_target.append("button")
  .text("submit")
  .style("width","160px")
  .style("margin-left","100px")
  .on("click",function(x){

    var obj = {
    "message": d3.selectAll("input")[0][0].value,
    "channel":d3.selectAll("input")[0][1].value,
    "regex":d3.selectAll("input")[0][2].value
    }
    console.log(obj)
    
    d3.xhr("/slack")
      .post(
        JSON.stringify(obj),
        function(err,x) {
          var j = JSON.parse(x.response)

          resp_target.html("Job Submitted: <br><pre>" + x.response + "</pre><br>")
         
        }
      )
  })
</script>
            """
        self.render("datatable.html", data="", paths=js)


    def get_data_schedule(self):
        import pandas
        df = self.crushercache.select_dataframe("select name from recurring_scripts where active = 1 and deleted = 0")
        self.get_content_schedule(df.to_dict("records"))

    @tornado.web.asynchronous
    def get(self):
        self.get_data_schedule()
