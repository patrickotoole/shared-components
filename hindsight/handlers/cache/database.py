from handlers.helpers import decorators, Render
import logging
import codecs 
import zlib

SQL_SELECT = "select zipped from generic_function_cache where udf='%s' and advertiser='%s' and filter_id='%s' and date='%s'"
ACTION_QUERY = "select filter_id from action_with_patterns where pixel_source_name='{}' and url_pattern='{}'"
DATE_FALLBACK = "select distinct date from generic_function_cache where advertiser='%(advertiser)s' and filter_id='%(action_id)s' and udf='%(udf)s' order by date DESC"

class CacheDatabase(object):

    def get_recent_data(self, advertiser, url_pattern, action_id, udf):
        query_dict = {"url_pattern":url_pattern, "advertiser":advertiser, "action_id": action_id, "udf": udf}
        datefallback = self.crushercache.select_dataframe(DATE_FALLBACK % query_dict)
        now_date = str(datefallback['date'][0])
        return now_date

    def get_action_id(self, advertiser, pattern):
        action_id = self.db.select_dataframe(ACTION_QUERY.format(advertiser, pattern))
        return action_id['action_id'][0]    

    def decode_data(self, data):
        try:
            hex_data = codecs.decode(data.ix[0]['zipped'], 'hex')
            logging.info("Decoded")
            decomp_data = zlib.decompress(hex_data)
        except:
            #Should we raise Exception?
            self.set_status(400)
            decomp_data = '{"error": "Data has not yet been cached for this function or date"}'
        return decomp_data

    @decorators.deferred
    def get_from_db(self, udf, advertiser, pattern, filter_id, filter_date):
        now_date=filter_date
        if not filter_id:
            filter_id = self.get_action_id(advertiser, pattern)

        if not filter_date:
            now_date = self.get_recent_data(advertiser, pattern, filter_id, udf)


        QUERY = SQL_SELECT % (udf, advertiser, filter_id, now_date)
        logging.info("Making query")
        data = self.crushercache.select_dataframe(QUERY)

        response = self.decode_data(data) 
        return response



