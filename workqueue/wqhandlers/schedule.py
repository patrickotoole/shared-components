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

INSERT = "insert into workqueue_scripts_schedule (workqueue_script_id, days, time) values (%(id)s, %(days)s, %(time)s)"
GETID = "select id from workqueue_scripts where name = '%s'"
DELETE = "delete from workqueue_scripts_schedule where workqueue_script_id = %(name)s and day=%(day)s and time=%(time)s"

class ScheduleHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, crushercache=None, *args, **kwargs):
        self.zookeeper = zookeeper
        self.crushercache = crushercache

    def add_to_db(self, request_body):
        data = ujson.loads(request_body)
        if data.get("type",False):
            if data['type'] =="delete":
                self.crushercache.execute(DELETE,data)
        jobid = self.crushercache.select_dataframe(GETID % data['name'])
        data['id'] = jobid['id'][0]
        self.crushercache.execute(INSERT, data)

    @tornado.web.asynchronous
    def get(self):
        try:
            df = self.crushercache.select_dataframe("select * from workqueue_scripts_schedule")
            data = {'values':[]}
            for item in df.iterrows():
                data['values'].append({"days":item[1]['days'], "time":item[1]["time"], "active": item[1]['active'],"run everytime":item[1]["run_everytime"],"deleted":item[1]['deleted'], "last_activty":str(item[1]['last_activity']), "id":item[1]['workqueue_script_id'], "remove":""})
            self.render("scheduledatatable.html", data=data, paths="")
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


class ScheduleNewHandler(tornado.web.RequestHandler):

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

var select_target_name = content.append("div").classed("selector_name",true).text("Script name")

var select_target_days = content.append("div").classed("selector_code",true).text("Days")

var select_target_time = content.append("div").classed("selector_code",true).text("Time")

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
    "name": d3.selectAll("input")[0][0].value,
    "days":d3.selectAll("input")[0][1].value,
    "time":d3.selectAll("input")[0][2].value
    }
    console.log(obj)
    
    d3.xhr("/schedule")
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
