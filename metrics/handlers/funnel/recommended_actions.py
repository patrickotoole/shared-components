import tornado.web
import ujson
import pandas

from handlers.base import BaseHandler
from lib.helpers import Convert, APIHelpers

QUERY = """
select 
    SUBSTRING_INDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(url,".com/",-1),"/",1),"-",1) first_word, 
    sum(views) as views 
from reporting.pixel_url_analytics 
where 
    advertiser = "%(advertiser)s" 
group by 1 
having length(first_word) > 3 
order by views 
desc limit 100
"""

QUERY = """
select 
    keyword as first_word,
    views 
from 
    reporting.pixel_keyword_analytics
where
    advertiser = "%(advertiser)s"
order by views desc
limit 100
"""
 
class RecommendedActionHandler(BaseHandler,APIHelpers):

    def initialize(self, db=None, **kwargs):
        self.db = db 

    @tornado.web.authenticated
    def get(self):
        advertiser = self.get_argument("advertiser", self.current_advertiser_name)

        df = self.db.select_dataframe(QUERY % {"advertiser":advertiser})

        self.write(Convert.df_to_json(df))
        self.finish()
