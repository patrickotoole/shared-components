import tornado.web
import ujson
import pandas
import StringIO
from lib.helpers import *

from lib.query.MYSQL import *
from lib.query.HIVE import *
import lib.query.helpers as query_helpers

class BatchRequestBase():
    def initialize(self, db, api, hive):
        self.db = db 
        self.api = api
        self.hive = hive

    def pull_segments(self):
        '''Return a list of domain list segments'''
        segments = self.db.select_dataframe(DISTINCT_SEGMENT)
        return segments['log'].tolist()

    def insert_request(self, request_type, content, owner, target_segment,
                             target_window, expiration, active, comment):
        '''Given data for a batch request, insert a row in the batch_request
        table.'''

        if request_type == "hive_query":
            content = self.clean_query(content)

        query = INSERT_BATCH_REQUEST.format(
            request_type,
            content,
            owner,
            target_segment,
            target_window,
            expiration,
            active,
            comment
            )

        self.db.execute(query)
        self.db.commit()        

    def deactivate_request(self, request_id):
        '''Given an id of a batch request, set the 'active' column to 0'''
        query = DEACTIVATE_REQUEST.format(request_id)
        self.db.execute(query)
        self.db.commit()

    def activate_request(self, request_id):
        '''Given an id of a batch request, set the 'active' column to 1'''
        query = ACTIVATE_REQUEST.format(request_id)
        self.db.execute(query)
        self.db.commit()

    def clean_query(self, query):
        '''Given a Hive query, sanitize it for use in batch processing'''

        first_char = query[0]
        last_char = query[-1]

        # If query is surrounded by quotes, remove them
        if first_char in ['"', "'"] and last_char==first_char:
            query = query[1:]
            query = query[:-1]
        
        # Replace whitespace with single space
        query = ' '.join(query.split())
        
        # Remove ending semicolon
        if query[-1] == ';':
            query = query[:-1]
            
        # Replace 
        query = query.replace("'", "\\'")
        
        return query

    def clean_target_segment(self, target_segment):
        '''Given a target segment, sanitize it for entry into database'''

        if ':' not in target_segment:
            target_segment = target_segment + ":0"
        return target_segment


class BatchRequestsHandler(BatchRequestBase, tornado.web.RequestHandler):
    '''Handler for viewing batch requests'''

    @decorators.formattable
    def get(self):
        deactivate_request_id = self.get_argument("deactivate_request", 
                                                  default=False)
        activate_request_id = self.get_argument("activate_request", 
                                                default=False)

        requests = self.db.select_dataframe("select * from batch_request")
                
        if not self.get_argument("format", False):
            requests = requests.to_html(classes=["dataframe"])

        if deactivate_request_id:
            self.deactivate_request(deactivate_request_id)
            self.redirect("/admin/batch_requests")
        elif activate_request_id:
            self.activate_request(activate_request_id)
            self.redirect("/admin/batch_requests")
        
        def default(self, requests):
            self.render( "../templates/admin/batch_requests.html", 
                         data = requests)

        yield default, (requests,)

class BatchRequestFormHandler(BatchRequestBase, tornado.web.RequestHandler):
    '''Handler for submitting new batch requests'''

    def get(self):
        '''Display a form for a new batch request'''

        segments = self.pull_segments()
        request_types = ["domain_list", "hive_query"]

        self.render("../templates/admin/batch_request_form.html", 
                    segments = segments, 
                    request_types = request_types)

    def post(self):
        '''Given parameters for a new batch request, preprocess them and insert
        the data into the SQL table'''

        # Universal parameters
        request_type = self.get_argument("request_type")
        expiration = self.get_argument("expiration", False)
        target_segment = self.get_argument("target_segment", False)
        active = self.get_argument("active")
        owner = self.get_argument("owner")
        comment = self.get_argument("comment")
        target_window = self.get_argument("target_window", False)

        # Parameters specific to domain_list
        segment = self.get_argument("segment", False)

        # Parameters specific to hive_query
        hive_query = self.get_argument("hive_query", False)
        custom_params = self.get_argument("custom_params", False)

        if request_type=="domain_list":
            # Set the content parameter to segment#target_window
            content = segment
        elif request_type=="hive_query":
            # Set the content parameter to the query
            content = hive_query

        # If the user has specified a custom target segment, but hasn't added a
        # rhs parameter (after the colon), add a ':0' to the end of the segment
        if custom_params:
            target_segment = "NULL"
            expiration = "NULL"
        else:
            target_segment = self.clean_target_segment(target_segment)
        
        self.insert_request(request_type, content, owner, target_segment, 
                            target_window, expiration, active, comment)

        self.redirect("/admin/batch_requests")

