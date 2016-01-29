import ujson
from kazoo.client import KazooClient
from zk_tree import ZKTree
from link import lnk
from lib.helpers import *

TREE = {"node":{"pattern":"","label":""},"children":[{"node":{"pattern":"","label":"_patterns"},"children":[]}]}

class ZKHelper():

    @classmethod
    def _assert_valid(self,subtree_array):
        for child in subtree_array:
            assert subtree.get("node")
            assert subtree.get("children")

    @classmethod
    def _validate_boolean(self, validate, subtree, key):
        assert validate.get("pattern")
        assert validate.get("label")
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
        for child in subtree:
            self._assert_valid(subtree)
            if self._validate_boolean(validate, child, "label") and self._validate_boolean(validate, child,"pattern"):
                returnArray.append(child["children"])
        return returnArray

    @classmethod
    def search_tree_children(self, validation_list, subtree):
        children_array = [subtree]
        for child in validation_list:
            children_array = self._validate_condition(child, children_array)
        return children_array

    @classmethod
    def _validate_condition_node(self, validate, subtree):
        returnTree = {}
        #returns first instance
        for child in subtree:
            self._assert_valid(subtree)
            if self._validate_boolean(validate, subtree, "label") and self._validate_boolean(validate, subtree,"pattern"):
                if returnTree == {}:
                    returnTree = child
                else:
                    returnTree = returnTree
        return returnTree

    @classmethod
    def search_tree_node(self,validation_list,subtree):
        childtree = subtree
        for child in validation_list:
            childtree = self._validate_condition_node(child, childtree["children"])
        return childtree
    
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
    def remove_label_node_children(self, label, tree_struct):
        label_search = [{"label":False,"pattern":False},{"label":label, "pattern":False}]
        label_node = self.search_tree_node(label_search, tree_struct)
        label_node["children"] = []

    def remove_label_node_children(self, label, tree_struct):
        label_search = [{"label":False,"pattern":False}]
        children = self.search_tree_childnre(label_search, tree_struct)
        update_children = []
        for child in children:
            if child["node"]["label"] != label:
                update_children.append(child)
        children = update_children
        return children

    @classmethod
    def remove_label_node(self, label, tree_struct):
        #based on older functions (iterate tree & find label child)
        current_label = self.find_label_child(label, tree_struct)
        all_labels = tree_struct["children"]
        updated_labels=[]
        if current_label != {}:
            for child in all_labels:
                if child["node"]["label"] != label:
                    updated_labels.append(child)
        tree_struct["children"] = updated_labels
        return tree_struct
