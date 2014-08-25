import contextlib
import tornado.web
import ujson
import pandas as pd
import StringIO
import hive_utils
import tornado.template as template
import os
import json

import logging

from urlparse import urlparse
from twisted.internet import defer, threads
from lib.helpers import *
#from lib.hive import Hive

API_QUERY = "select * from appnexus_reporting.%s where %s "
QUERY = "select {}, sum(num_served) as num_served, sum(num_loaded) as num_loaded, sum(num_visible) as num_visible from agg_visibility where {} group by {} order by cast(num_served as int)"

class ViewabilityBase():
    '''A base class for the viewability handler. This defines several functions that are used to construct queries,
    return data, and format results. These are separated from the handler class to improve modularity, information
    hiding, and enable us to utilize traditional testing methods.
    '''
    def __init__(self, hive):
        self.hive = hive

    def execute_query(self, query):
        ''' Given an HQL query, execute it and return a dataframe'''
        try:
            df = pd.DataFrame(self.hive.session_execute(["set shark.map.tasks=256", "set mapred.reduce.tasks=24", query]))
            return df
        except StandardError as e:
            raise StandardError("Problem with query: {}".format(query))

    def clean_string(self, s):
        s = s.replace('"', '').replace("'", "")
        return s
    
    @classmethod
    def format_results(cls, df, cols):
        '''Given a list of columns and a DataFrame, generate summary measurements as new columns and return
        the updated dataframe.'''
        # Distabling these for now until they prove useful
        # df.insert(len(df.columns), 'percent_loaded', df.num_loaded.astype(int) / df.num_served.astype(int))
        # df.insert(len(df.columns), 'percent_visible', df.num_visible.astype(int) / df.num_served.astype(int))

        df.insert(len(df.columns), 'num_not_loaded', df.num_served.astype(int) - df.num_loaded.astype(int))
        df.insert(len(df.columns), 'load_score', 1 - (df.num_not_loaded.astype(int) ** 2 / df.num_served.astype(int)))

        df.insert(len(df.columns), 'num_not_viewable', df.num_served.astype(int) - df.num_visible.astype(int))
        df.insert(len(df.columns), 'viewable_score', 1 - (df.num_not_viewable.astype(int) ** 2 / df.num_served.astype(int)))
        
        # Disabling these for now until they prove useful
        # cols.append("percent_loaded")
        # cols.append("percent_visible")


        cols.append("load_score")
        cols.append("viewable_score")

        df = df[cols]
        df['num_served'] = df.num_served.astype(int)
        df = df.sort('num_served', ascending=False)

        return df

    def construct_query(self, from_date, to_date, from_hour, to_hour, group_by, venue=False, domain=False, tag=False, seller=False, width=False, height=False):
        '''Return a query given many optional and non-optional parameters
        '''
        where = 'date >= "{}" and date <= "{}" and hour >= "{}" and hour <= "{}"'.format(from_date, to_date, from_hour, to_hour)      

        opt_dims = {
            "venue": venue, 
            "domain": domain, 
            "tag": tag, 
            "seller": seller, 
            "width": width, 
            "height": height
            }

        for dim in opt_dims.keys():
            if opt_dims[dim]:
                where += ''' and {}="{}"'''.format(dim, self.clean_string(opt_dims[dim]))

        select = group_by

        query = QUERY.format(select, where, group_by)

        return query

    def pull_report(self, from_date, to_date, from_hour, to_hour, group_by, venue=False, domain=False, tag=False, seller=False, width=False, height=False):
        query = self.construct_query(from_date, to_date, from_hour, to_hour, group_by, venue, domain, tag, seller, width, height)

        try:
            df = self.execute_query(query)
        except StandardError as e:
            raise StandardError("Problem with Query")
            
        if df.empty:
            raise StandardError("No results returned")

        cols = group_by.split(',')
        cols.extend(["num_served", "num_loaded", "num_visible"])

        data = self.format_results(df, cols)

        return data        

class ViewabilityHandler(tornado.web.RequestHandler):
    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive
    
    def raw_to_html(self, data):
        data = data.to_html(index=False)
        return data

    @decorators.formattable
    def get(self):
        from_date = self.get_argument("from_date", False)
        to_date = self.get_argument("to_date", False)
        from_hour = self.get_argument("from_hour", False)
        to_hour = self.get_argument("to_hour", False)
        group_by = self.get_argument("group_by", False)

        # If no arguments were given
        if not from_date or not to_date or not from_hour or not to_hour or not group_by:
            data = "Please enter query parameters."

        # If we saw a minimum amount of arguments, process the parameters
        # and execute the query
        else:
            domain = self.get_argument("domain", False)
            tag = self.get_argument("tag", False)
            seller = self.get_argument("seller", False)

            # Try to pull the data. If it fails, report the reason to the user
            try:
                base = ViewabilityBase(self.hive)
                data = base.pull_report(from_date, to_date, from_hour, to_hour, group_by, domain, tag, seller)                
            except StandardError as e:
                data = str(e)
                self.render("admin/visibility.html", data=data)

            # If no format was specified, return the data within the UI
            if not self.get_argument("format", False):
                data = self.raw_to_html(data)
       
        # Define the default renderer (if format not specified)
        def default(self, data):
            self.render("admin/visibility.html", data=data)
    
        yield default, (data,)

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

        domain = self.get_argument("domain", False)
        seller = self.get_argument("seller", False)
        tag = self.get_argument("tag", False)

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
        
        # Send the arguments back to the server as a GET request
        self.redirect(api_call)
