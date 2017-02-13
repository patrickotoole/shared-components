import tornado.web
import logging
import json

class SubmitHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("db",False)

    def post(self):
        data = json.loads(self.request.body)
        import requests

        dd = { "udf": data['script'], "priority":1 }
        for d in data['data']:
            dd[d['key']] = d['value']


        logging.info("Sending job to workqueue: ")
        logging.info(dd)
        from link import lnk
        wq = lnk.api.workqueue
        resp = wq.post("/jobs",data=json.dumps(dd))

        logging.info("Workqueue resposne: ")
        logging.info(resp.json)

        self.write(resp.json)
        self.finish()


