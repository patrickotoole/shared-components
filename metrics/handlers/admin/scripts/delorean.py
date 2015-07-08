import tornado.web
import ujson
import functools
import copy
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
    def edit_tree(self, filter_label, edits, replace=False):
        host,port = yield self.defer_get_available()
        self.server = "http://{}:{}".format(host, port)

        tree = yield self.defer_get_tree()
        
        if replace:
            new_tree = self.replace_node(filter_label, tree["pattrenTree"], edits)
        else:
            new_tree = self.append_to_node(filter_label, tree["pattrenTree"], edits)

        self.push_tree(new_tree)

    @defer.inlineCallbacks
    def delete_from_tree(self, filter_label, to_delete):
        host,port = yield self.defer_get_available()
        self.server = "http://" + host + ":" + port

        tree = yield self.defer_get_tree()

        new_tree = self.delete_from_node(filter_label, tree["pattrenTree"], to_delete)
        self.push_tree(new_tree)

    @defer.inlineCallbacks
    def push_tree(self, tree):
        response = yield self.defer_post_tree(tree)

        if response.body == '"1"':
            self.write("1")
        else:
            self.write(response.body)
        self.finish()
        
    def append_to_node(self, label, old_tree, to_append):
        tree = copy.deepcopy(old_tree)
        for node in tree["children"]:
            if node["node"]["label"] == label:
                node["children"].extend(to_append["children"])
        return tree

    def replace_node(self, label, old_tree, replacement):
        tree = copy.deepcopy(old_tree)
        for node in tree["children"]:
            if node["node"]["label"] == label:
                node["children"] = replacement["children"]
        return tree

    def delete_from_node(self, label, old_tree, to_delete):
        tree = copy.deepcopy(old_tree)
        for node in tree["children"]:
            if node["node"]["label"] == label:
                node["children"] = [ c for c in node["children"] 
                                     if c not in to_delete["children"] ]
        return tree

    @tornado.web.asynchronous
    def post(self, *args):
        '''When delete=True, given a label and a list of nodes, delete all 
        nodes in the tree that exactly match any of the given nodes'''

        label = self.get_argument("label")
        replace = self.get_argument("replace", False)
        delete = self.get_argument("delete", False)

        payload = tornado.escape.json_decode(self.request.body)

        if delete and delete.lower() == "true":
            self.delete_from_tree(label, payload)
        elif replace and replace.lower() == "true":
            self.edit_tree(label, payload, replace=True)
        else:
            self.edit_tree(label, payload, replace=False)
