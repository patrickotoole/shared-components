from link import lnk
import time
import logging
import datetime
import ujson

NEW_QUERY = "select a.pixel_source_name from advertiser a left join advertiser_caching b on a.pixel_source_name = b.pixel_source_name where b.pixel_source_name is null and a.crusher =1 and deleted=0"
INSERT_CACHE = "insert into advertiser_caching (pixel_source_name) values (%s)" 
CURRENT_QUERY = "select pixel_source_name from advertiser_caching"
UPDATE_CACHE_0 = "update advertiser_caching set valid_pixel_fires_yesterday = 0, job_id = %s where pixel_source_name = %s"
UPDATE_CACHE_1 = "update advertiser_caching set valid_pixel_fires_yesterday = 1, job_id = %s where pixel_source_name = %s"
SEGMENT_QUERY = """
select external_segment_id from advertiser_segment a join advertiser b on a.external_advertiser_id = b.external_advertiser_id where b.pixel_source_name = '{}' and b.deleted=0 and a.segment_name like "%%all pages%%"
"""

PIXEL_LOG = "insert into advertiser_pixel_fires (pixel_source_name, pixel_fires, date, skip_at_log, job_id) values (%s, %s, %s, %s, %s)"
QUERY_YESTERDAY = "select pixel_fires from advertiser_pixel_fires where pixel_source_name = '%s' and date = '%s'"

class SetCacheList():


    def __init__(self, db, crusher_wrapper, crushercache):
        self.db = db
        self.advertisers = self.get_current_advertisers()
        logging.info(self.advertisers)
        self.api_wrapper = crusher_wrapper
        self.crushercache = crushercache
        self.api_wrapper.base_url="http://portal.getrockerbox.com"

    def query_advertisers(self, QUERY):
        df = self.db.select_dataframe(QUERY)
        return df['pixel_source_name'].tolist()

    def get_current_advertisers(self):
        new_advertisers = self.query_advertisers(NEW_QUERY)
        logging.info("got new")
        [self.db.execute(INSERT_CACHE, (x,)) for x in new_advertisers]
        all_advertisers = self.query_advertisers(CURRENT_QUERY) + new_advertisers
        logging.info("got old and new")
        return all_advertisers


    def get_segment_id(self, advertiser):
        segment_id = self.db.select_dataframe(SEGMENT_QUERY.format(advertiser))
        segment = segment_id.ix[0]['external_segment_id'] if len(segment_id)>0 else 0
        return segment

    def get_from_portal(self, advertiser,segment, sample_size):
         try:
             _resp = self.api_wrapper.get("/admin/pixel/lookup?advertiser=%s&segment=%s&sample=%s" % (advertiser, segment,sample_size), auth=('rockerbox','RBOXX2017'))
             time.sleep(5)
             resp = _resp.json
         except:
             resp = {}
         return resp

    def check_pixel_fires(self, advertiser, segment):
        logging.info("requesting advertiser % segment %s" % (advertiser, segment))
        sample_list = [1,5,25,50,75,100]
        resp ={}
        index = 0
        while len(resp)==0 and index <=5:
            resp = self.get_from_portal(advertiser,segment, sample_list[index])
            index+=1
        if len(resp) > 0:
            return True
        else: 
            return False

    def check_yesterday(self, advertiser,check):
        yesterday_date = (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        data_from_db = self.crushercache.select_dataframe(QUERY_YESTERDAY % (advertiser,yesterday_date))
        has_data_yesterday = 0 if len(data_from_db) ==0 else data_from_db['pixel_fires'][0]
        if str(has_data_yesterday) != str(check):
            logging.info("changed expectation: advertiser %s changed from %s to %s" % (advertiser, has_data_yesterday, check))

    def populate_advertiser_table(self, job_id):
        for advertiser in self.advertisers:
           all_pages_segment = self.get_segment_id(advertiser)
           check = self.check_pixel_fires(advertiser, all_pages_segment)
           now = datetime.datetime.now().strftime("%Y-%m-%d")
           set_to_skip = self.db.select_dataframe("select skip from advertiser_caching where pixel_source_name = '%s'" % advertiser)['skip'][0]
           self.check_yesterday(advertiser,check)
           if check:
               self.db.execute(UPDATE_CACHE_1, (job_id, advertiser))
               self.crushercache.execute(PIXEL_LOG, (advertiser,1,now,set_to_skip, job_id))
           else:
               self.db.execute(UPDATE_CACHE_0, (job_id, advertiser))
               self.crushercache.execute(PIXEL_LOG, (advertiser,0,now, set_to_skip, job_id))


if __name__ == "__main__":

    api = lnk.api.crusher
    db = lnk.dbs.rockerbox
    crushercache = lnk.dbs.crushercache
    scl = SetCacheList(db,api, crushercache)
    import hashlib
    timestamp = datetime.datetime.now().strftime("%Y-%d-%m %HH:%MM:%SS") 
    job_id=hashlib.md5(timestamp).hexdigest()
    scl.populate_advertiser_table(job_id)
