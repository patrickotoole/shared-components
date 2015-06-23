import tornado.web
import ujson
import functools
from lib.helpers import *
from filter import FilterHandler
from tornado.httpclient import HTTPClient
from twisted.internet import defer

class DeloreanHandler(FilterHandler):

    @decorators.deferred
    def defer_get_tree(self):
        http_client = HTTPClient()
        response = http_client.fetch(self.server + "/segments", method="GET")
        return ujson.loads(response.body)

    @decorators.deferred
    def defer_post_tree(self, tree):
        http_client = HTTPClient()
        response = http_client.fetch(self.server + "/segments", method="POST", body=ujson.dumps(tree))
        return response

    @defer.inlineCallbacks
    def append_to_tree(self, filter_label, to_append):
        available = yield self.defer_get_available()
        self.server = "http://" + available[0]['host'] + ":9999"

        tree = yield self.defer_get_tree()
        
        new_tree = self.search_tree(tree, filter_label, to_append)
        response = yield self.defer_post_tree(new_tree)

        if response.body == '"1"':
            self.write("1")
        else:
            self.write(response.body)
        self.finish()

    def search_tree(self, tree, filter_label, to_append):
        return self.append_to_node(filter_label, tree["pattrenTree"], to_append)

    def append_to_node(self, label, tree, to_append):
        for node in tree["children"]:
            if node["node"]["label"] == label:
                node["children"].extend(to_append["children"])
        return tree

    @tornado.web.asynchronous
    def post(self, *args):
        payload = tornado.escape.json_decode(self.request.body)
        label = self.get_argument("label")
        self.append_to_tree(label, payload)
