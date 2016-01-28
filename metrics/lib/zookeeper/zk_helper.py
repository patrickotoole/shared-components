import ujson
from kazoo.client import KazooClient
from zk_tree import ZKTree
from link import lnk
from lib.helpers import *

TREE = {"node":{"pattern":"","label":""},"children":[{"node":{"pattern":"","label":"_patterns"},"children":[]}]}

class ZKHelper(ZKTree):

    @classmethod
    def _validate_boolean(self, validate, subtree, key):
        returnBool = False
        if validate[key] ==True and len(subtree.get("node",{}).get(key,""))>1:
            returnBool = True
        if subtree.get("node",{}).get(key, False) == validate[key]:
            returnBool = True
        if not validate.get(key):
            returnBool = True
        return returnBool

    @classmethod
    def _validate_condition(self, validate, subtree):
        returnArray = []
        if type(subtree) == dict:
            if self._validate_boolean(validate, subtree, "label") and self._validate_boolean(validate, subtree, "pattern"):
                returnArray= subtree["children"]
        if type(subtree) == list:
            for child in subtree:
                if self._validate_boolean(validate, subtree, "label") and self._validate_boolean(validate, subtree,"pattern"):
                    returnArray.append(subtree["children"])
        return returnArray

    @classmethod
    def search_tree(self, validation_list, subtree):
        children_array = subtree
        for child in validation_list:
            child_array = self._validate_condition(child, children_array)
        return children_array
    
    @classmethod
    def _check_parentkey_tree(self,parentkeyname, subkeyname, subkeyval, subtree):
        result ={}
        try:
            if subtree.get(parentkeyname).get(subkeyname) == subkeyval:
                result = subtree
        except:
            pass
        return result

    @classmethod
    def _check_nonparentkey_tree(self,keyname, keyval, subtree):
        result = {}
        if subtree.get(keyname) == keyval:
                result =  subtree
        return result

    @classmethod
    def iterate_tree(self,keyname, keyval, subtree_array, parentkeyname=False):
        returnTree = {}
        if parentkeyname:
            for child in subtree_array:
                returnTree = self._check_parentkey_tree(parentkeyname, keyname, keyval, child)
                if returnTree != {}:
                    break
        else:
            for child in subtree_array:
                returnTree = self._check_nonparentkey_tree(keyname, keyval, child)
                if returnTree != {}:
                    break
        return returnTree

    @classmethod
    def find_label_child(self,label, tree_struct):
        children = tree_struct["children"]
        returnChild = self.iterate_tree("label", label, children, parentkeyname="node")
        return returnChild

    @classmethod
    def create_node(self,label="", pattern="", query=False, children=[]):
        node = {
                    "node":{
                        "pattern":pattern,
                        "label":label
                    },
                    "children":children
                }

        if query:
            node["node"]["query"] = query
        return node

    @classmethod
    def remove_label_node(self, label, tree_struct):
        current_label = self.find_label_child(label, tree_struct)
        all_labels = tree_struct["children"]
        updated_labels=[]
        if current_label != {}:
            for child in all_labels:
                if child["node"]["label"] != label:
                    updated_labels.append(child)
        tree_struct["children"] = updated_labels
        return tree_struct
