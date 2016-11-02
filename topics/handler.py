import tornado
import os
import ujson
import logging
import requests
import pickle
import numpy as np

class TopicClassifyHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.data = {}
        self.classifier_obj = kwargs.get('classifier',None)
        self.classifier = self.classifier_obj.get_obj()
        self.crushercache = kwargs.get('crushercache', None)
        self.scrappers = self.get_scrapper_boxes()
        self.count_box_query=0

    def get_scrapper_boxes(self):
        list_of_servers = []
        _resp = requests.get('http://master2:8080/v2/apps/apps/scrapper/tasks')
        data = _resp.json()['tasks']
        for item in data:
            temp = "http://{}:{}".format(str(item['host']),str(item['ports'][0]))
            list_of_servers.append(temp)
        return list_of_servers

    def get_host(self):
        return np.random.choice(self.scrappers,1)[0]

    def get_title(self,url):
        try:
            URL = self.get_host()
            url_with_param = URL + "/?url=%s" % url.replace("=","%3D")
            logging.info(url_with_param)
            _resp = requests.get(url_with_param, timeout=5)
            data = _resp.json()
            title = data['result']['title']
        except Exception as e:
            logging.info(str(e))
            logging.info("could not get title")
            title = None

        self.count_box_query+=1
        if self.count_box_query>=100:
            self.scrapper_boxes=self.get_scrapper_boxes()
            self.count_box_query =0
        return title

    def update_weight(self,wnum):
        print(wnum)
        self.classifier_obj.change_cutoff(wnum)
        self.classifier = self.classifier_obj.get_obj()

    def show_sample(self):
        QUERYSAMPLE = "select url, topic from url_title order by RAND() limit 1000"
        data = self.crushercache.select_dataframe(QUERYSAMPLE)
        self.write(ujson.dumps(data.to_dict('records')))

    def get(self, uri):    
        url = self.get_argument("url",False)
        title = self.get_argument("title",False)
        weight = self.get_argument("weight",False)
        weight_num = float(weight)
        if "show_sample" in uri:
            self.show_sample()
        elif "update_weight" in uri:
            if weight:
                try:
                    self.update_weight(weight_num)
                    success = "Success"
                except Exception as e:
                    logging.info(str(e))
                    success = "Fail"
            else:
                success = "Fail no weight parameter"
            self.write(ujson.dumps({"Status":success}))
        else:
            if url:
                if not title:
                    title = self.get_title(url)

                if title is not None:
                    topic = self.classifier.classify(url,title)
                else:
                    topic = "No topic"
                response = {"url":url, "topic":topic, "title":title}
            else:
                response = {"Error": "No url provided"}
            self.write(ujson.dumps(response))

