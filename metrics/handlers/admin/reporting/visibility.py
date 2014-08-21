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
QUERY = "select seller, tag, width, height, domain, sum(num_served) as num_served, sum(num_loaded) as num_loaded, sum(num_visible) as num_visible from agg_visibility where {} group by seller, tag, width, height, domain order by cast(num_served as int)"

class ViewabilityBase():
    def __init__(self, hive):
        self.hive = hive

    def execute_query(self, query):
        try:
            df = pd.DataFrame(self.hive.session_execute(["set shark.map.tasks=256", "set mapred.reduce.tasks=24", query]))
            return df
        except StandardError as e:
            raise StandardError("Problem with query: {}".format(query))

    def clean_string(self, s):
        s = s.replace('"', '').replace("'", "")
        return s
    
    @classmethod
    def format_results(cls, df):
        df.insert(len(df.columns), 'percent_loaded', df.num_loaded.astype(int) / df.num_served.astype(int))
        df.insert(len(df.columns), 'percent_visible', df.num_visible.astype(int) / df.num_served.astype(int))

        cols = [
            "seller",
            "tag",
            "height",
            "width",
            "domain",
            "num_served",
            "num_loaded",
            "num_visible",
            "percent_loaded",
            "percent_visible"
            ]

        df = df[cols]
        df['num_served'] = df.num_served.astype(int)
        df = df.sort('num_served', ascending=False)

        return df

    def construct_query(self, from_date, to_date, from_hour, to_hour, domain=False, tag=False, seller=False):
        where = 'date >= "{}" and date <= "{}" and hour >= "{}" and hour <= "{}"'.format(from_date, to_date, from_hour, to_hour)       


        if domain:
            where += ''' and domain="{}"'''.format(self.clean_string(domain))
        if tag:
            where += ''' and tag="{}"'''.format(self.clean_string(tag))
        if seller:
            where += ''' and seller="{}"'''.format(self.clean_string(seller))

        query = QUERY.format(where)

        return query

    def pull_report(self, from_date, to_date, from_hour, to_hour, domain=False, tag=False, seller=False):
        query = self.construct_query(from_date, to_date, from_hour, to_hour, domain, tag, seller)

        try:
            df = self.execute_query(query)
        except StandardError as e:
            raise StandardError("Problem with Query")
            
        if df.empty:
            raise StandardError("No results returned")

        data = self.format_results(df)

        return data        

class ViewabilityHandler(tornado.web.RequestHandler):
    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive
    
    def raw_to_html(self, data):
        data = data.head(1000).to_html(index=False)
        return data

    @decorators.formattable
    def get(self):
        from_date = self.get_argument("from_date", False)
        to_date = self.get_argument("to_date", False)
        from_hour = self.get_argument("from_hour", False)
        to_hour = self.get_argument("to_hour", False)

        # If no arguments were given
        if not from_date or not to_date or not from_hour or not to_hour:
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
                data = base.pull_report(from_date, to_date, from_hour, to_hour, domain, tag, seller)
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

        domain = self.get_argument("domain", False)
        seller = self.get_argument("seller", False)
        tag = self.get_argument("tag", False)

        # Convert one-digit numbers to strings (eg '0' -> "00")
        if len(from_hour) == 1:
            from_hour = '0' + from_hour
        
        if len(to_hour) == 1:
            to_hour = '0' + to_hour

        api_args = {
            "from_date": from_date,
            "to_date": to_date,
            "from_hour": from_hour,
            "to_hour": to_hour,
            "domain": domain,
            "seller": seller,
            "tag": tag
        }

        api_call = "/admin/viewable?" + '&'.join(["{}={}".format(k,api_args[k]) for k in api_args.keys() if api_args[k]]) 
        
        # Send the arguments back to the server as a GET request
        self.redirect(api_call)
