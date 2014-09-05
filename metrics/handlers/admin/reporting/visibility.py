import contextlib
import tornado.web
import ujson
import pandas as pd
import StringIO
import tornado.template as template
import os
import json

import logging

from urlparse import urlparse
from twisted.internet import defer
from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred

API_QUERY = "select * from appnexus_reporting.%s where %s "
QUERY = "select {}, sum(num_served) as num_served, sum(num_loaded) as num_loaded, sum(num_visible) as num_visible from agg_visibility where {} group by {}"

class ViewabilityBase():
    '''A base class for the viewability handler. This defines several functions that are used to construct queries,
    return data, and format results. These are separated from the handler class to improve modularity, information
    hiding, and enable us to utilize traditional testing methods.
    '''
    def __init__(self, hive):
        self.hive = hive

    def clean_string(self, s):
        '''Given a string, returns a cleaned, HQL-safe string'''
        s = s.replace('"', '').replace("'", "")
        return s
    
    @classmethod
    def format_results(cls, df, cols):
        '''Given a list of columns and a DataFrame, generate summary measurements as new columns and return
        the updated dataframe.'''

        print df.head()

        df.insert(len(df.columns), 'num_not_loaded', df.num_served.astype(int) - df.num_loaded.astype(int))
        df.insert(len(df.columns), 'load_score', 1 - (df.num_not_loaded.astype(int) ** 2 / df.num_served.astype(int)))

        df.insert(len(df.columns), 'num_not_viewable', df.num_served.astype(int) - df.num_visible.astype(int))
        df.insert(len(df.columns), 'viewable_score', 1 - (df.num_not_viewable.astype(int) ** 2 / df.num_served.astype(int)))
        df.insert(len(df.columns), 'percent_viewable', (df.num_visible.astype(int) / df.num_served.astype(int))) 

        cols.append("load_score")
        cols.append("viewable_score")
        cols.append("percent_viewable")

        df = df[cols]
        df['num_served'] = df.num_served.astype(int)
        df = df.sort('num_served', ascending=False)

        return df

    def construct_query(self, from_date, to_date, from_hour, to_hour, group_by, opt_dims):
        '''Return a query given many optional and non-optional parameters
        '''
        where = 'date >= "{}" and date <= "{}" and hour >= "{}" and hour <= "{}"'.format(from_date, to_date, from_hour, to_hour)      

        for dim in opt_dims.keys():
            if opt_dims[dim]:
                where += ''' and {}="{}"'''.format(dim, self.clean_string(opt_dims[dim]))

        select = group_by
        query = QUERY.format(select, where, group_by)
        return query

class ViewabilityHandler(tornado.web.RequestHandler):
    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive

        self.base = ViewabilityBase(self.hive)

    @defer.inlineCallbacks
    def execute_query(self, query, cols):
        ''' Given an HQL query, execute it and return a dataframe'''
        try:
            t = yield run_hive_session_deferred(self.hive, ["set shark.map.tasks=128", "set mapred.reduce.tasks=8", query])
            df = pd.DataFrame(t)
            self.get_content(df, cols)
        except StandardError as e:
            self.render("admin/visibility.html", data="Error: {}\nProblem with query: {}".format(e,query))

    def get_data(self, query):
        try:
            df = self.execute_query(query)
        except StandardError as e:
            self.render("admin/visibility.html", data="Problem with query")
            
        if df.empty:
            self.render("admin/visibility.html", data="No results returned.")

        return data

    @decorators.formattable
    def get_content(self, data, cols):
        data = self.base.format_results(data, cols)

        if not self.get_argument("format", False):
            data = data.to_html(index=False)

        # Define the default renderer (if format not specified)
        def default(self, data):
            self.render("admin/visibility.html", data=data)
    
        yield default, (data,)        

    @tornado.web.asynchronous
    def get(self):
        from_date = self.get_argument("from_date", False)
        to_date = self.get_argument("to_date", False)
        from_hour = self.get_argument("from_hour", False)
        to_hour = self.get_argument("to_hour", False)
        group_by = self.get_argument("group_by", False)

        # If no arguments were given
        if not from_date or not to_date or not from_hour or not to_hour or not group_by:
            self.render("admin/visibility.html", data="Please enter query parameters.")

        # If we saw a minimum amount of arguments, process the parameters
        # and execute the query
        else:
            venue = self.get_argument("venue", False)
            domain = self.get_argument("domain", False)
            tag = self.get_argument("tag", False)
            seller = self.get_argument("seller", False)
            width = self.get_argument("width", False)
            height = self.get_argument("height", False)

            # Try to pull the data. If it fails, report the reason to the user
            opt_dims = {
                "venue": venue, 
                "domain": domain, 
                "tag": tag, 
                "seller": seller, 
                "width": width, 
                "height": height
            }
            cols = group_by.split(',')
            cols.extend(["num_served", "num_loaded", "num_visible"])
            
            query = self.base.construct_query(from_date, to_date, from_hour, to_hour, group_by, opt_dims)

            self.execute_query(query, cols)

    @tornado.web.asynchronous
    def post(self):
        # Collect the arguments and process them as necessary 
        from_date = self.get_argument("from_date")
        to_date = self.get_argument("to_date")
        
        from_hour = self.get_argument("from_hour")
        to_hour = self.get_argument("to_hour")

        group_by_venue = self.get_argument("group_by_venue", False)
        group_by_domain = self.get_argument("group_by_domain", False)
        group_by_seller = self.get_argument("group_by_seller", False)
        group_by_tag = self.get_argument("group_by_tag", False)
        group_by_width = self.get_argument("group_by_width", False)
        group_by_height = self.get_argument("group_by_height", False)

        venue = self.get_argument("venue", False)
        domain = self.get_argument("domain", False)
        seller = self.get_argument("seller", False)
        tag = self.get_argument("tag", False)
        width = self.get_argument("width", False)
        height = self.get_argument("height", False)
        
        # Convert one-digit numbers to strings (eg '0' -> "00")
        if len(from_hour) == 1:
            from_hour = '0' + from_hour
        
        if len(to_hour) == 1:
            to_hour = '0' + to_hour

        # Since dictionaries aren't sorted, this will specify the
        # order of the select/group_by
        dims = [
            "venue",
            "domain",
            "seller",
            "tag",
            "width",
            "height"
            ]

        # Convert each group_by to a single statement
        all_groups =  {
            "venue": group_by_venue,
            "domain": group_by_domain, 
            "seller": group_by_seller,
            "tag": group_by_tag,
            "width": group_by_width,
            "height": group_by_height
            }

        # Try to pull the data. If it fails, report the reason to the user
        opt_dims = {
            "venue": venue, 
            "domain": domain, 
            "tag": tag, 
            "seller": seller, 
            "width": width, 
            "height": height
        }


        group_by = ','.join([group for group in dims if all_groups[group]])

        api_args = {
            "from_date": from_date,
            "to_date": to_date,
            "from_hour": from_hour,
            "to_hour": to_hour,
            "group_by": group_by,
            "domain": domain,
            "seller": seller,
            "tag": tag
        }

        api_call = "/admin/viewable?" + '&'.join(["{}={}".format(k,api_args[k]) for k in api_args.keys() if api_args[k]]) 
        cols = group_by.split(',')
        cols.extend(["num_served", "num_loaded", "num_visible"])
        
        # Send the arguments back to the server as a GET request
        query = self.base.construct_query(from_date, to_date, from_hour, to_hour, group_by, opt_dims)
        self.execute_query(query, cols)


