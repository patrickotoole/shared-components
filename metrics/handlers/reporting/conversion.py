import tornado.web
import ujson
import pandas
import StringIO
from ..base import BaseHandler

from lib.helpers import *
from lib.query.MYSQL import *


class ConversionReportingBase(object):
    """
    Interacts with the database to pull reporting data
    """

    ERR_MSG = "No conversions for "

    def initialize(self, db):
        self.db = db 

    @decorators.make_run_query(ERR_MSG + "advertiser %(advertiser_id)s")
    def get_conversion_data(self,advertiser_id):
        params = {"advertiser_id": advertiser_id}
        return (self.db, CONVERSION_QUERY, params)

class ConversionReportingHandler(BaseHandler,ConversionReportingBase):

    def initialize(self, db=None, **kwargs):
        self.db = db 

    @tornado.web.authenticated
    @decorators.formattable
    def get(self):

        advertiser = self.current_advertiser
        user = self.current_user
        _format  = self.get_argument("format",False)

        try:
            data = self.get_conversion_data(advertiser)
        except Exception as e:
            data = pandas.DataFrame([])

        def default(self,data):
            _json = """{"advertiser":{"id":%(id)s,"conversions":%(data_formatted)s}}"""
            _json = _json % {
                "id":advertiser,
                "data_formatted":Convert.df_to_json(data)
            }
            self.write(_json)
            #self.render("reporting/_conversion.html", advertiser_id=advertiser, user_id=user)

        yield default, (data,)
 
