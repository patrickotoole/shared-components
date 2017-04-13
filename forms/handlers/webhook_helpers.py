import logging
import ujson
import requests

class WebhookDatabase():

    def __init__(self,**kwargs):
        self.crushercache = kwargs.get("crushercache",False)

    def get_script(self,uri):
        scriptname = self.crushercache.select_dataframe("select scriptname from forms_webhooks where path = '%s'" % uri)
        return scriptname['scriptname'][0]

class WebhookWorkqueue():

    def __init__(self,**kwargs):
        self.crushercache = kwargs.get("crushercache",False)

    def add_webhook_to_wq(self,scriptname, data):
        logging.info("posting")
        post_data = {"udf": scriptname, "parameters": data}
        resp = requests.post("http://workqueue.crusher.getrockerbox.com/jobs", auth=("rockerbox","RBOXX2017"), data = ujson.dumps(post_data))
        logging.info(resp.text)
