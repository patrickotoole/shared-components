import logging
from link import lnk
import datetime

ADVERTISERS = "select pixel_source_name from advertiser_caching where valid_pixel_fires_yesterday=1"
SEGMENTS = "select a.action_id, a.action_name, a.url_pattern from action_with_patterns a join action b on a.action_id = b.action_id where a.pixel_source_name = '%s' and b.deleted=0 and b.active=1"
CURRENT_SEGMENTS = "select filter_id from advertiser_caching_segment where pixel_source_name = '%s'"
FILL_IN_DB = "insert into advertiser_caching_segment (pixel_source_name, filter_id, action_name, pattern) values (%s, %s, %s, %s)"
UPDATE_DB="update advertiser_caching_segment set data_populated=%s, job_id=%s where pixel_source_name = %s and filter_id = %s"

SEGMENT_LOG = "insert into advertiser_segment_check (pixel_source_name, url_pattern, filter_id, pixel_fires, date, skip_at_log, job_id) values (%s, %s, %s, %s, %s, %s, %s)"
QUERY_YESTERDAY = "select pixel_fires from advertiser_segment_check where filter_id = %s and date = '%s'"

class CheckSegmentData():

    def __init__(self,rockerbox, hindsight, crushercache):
        self.rockerbox = rockerbox
        self.hindsight = hindsight
        self.crushercache = crushercache
        self.advertisers = self.get_advertisers()
        self.segment_dict = {}
        self.build_segment_dict()

    def get_advertisers(self):
        advertiser = self.rockerbox.select_dataframe(ADVERTISERS).pixel_source_name
        return advertiser.tolist()

    def build_segment_dict(self):
        for advertiser in self.advertisers: 
            self.segment_dict[advertiser] = self.get_segments(advertiser)
            current_segments = self.rockerbox.select_dataframe(CURRENT_SEGMENTS % advertiser).filter_id.tolist()
            for seg in self.segment_dict[advertiser].iterrows():
                self.compare_and_insert(advertiser, current_segments,seg)

    def compare_and_insert(self,advertiser, list_of_existing, segment_data):
        if segment_data[1]['action_id'] not in list_of_existing:
            self.fill_missing_segment(advertiser, segment_data[1]['url_pattern'], segment_data[1]['action_id'], segment_data[1]['action_name'])

    def get_segments(self,advertiser):
        segments = self.rockerbox.select_dataframe(SEGMENTS % advertiser)
        return segments

    def fill_missing_segment(self, advertiser, pattern, filter_id, action_name):
        self.rockerbox.execute(FILL_IN_DB, (advertiser, filter_id, action_name, pattern))

    def check_timeseries_endpoint(self, pattern, action_id):
        try:
            _resp = self.hindsight.get('/crusher/pattern_search/timeseries_only?filter_id=%s&search=%s' % (action_id, pattern), timeout=300)
            if 'results' in _resp.json.keys() and len(_resp.json['results']) >0 and 'date' in _resp.json['results'][0]:
                last_two_days = sorted(_resp.json['results'], key=lambda x : x['date'],reverse=True)[:2]
                checks = sum([x['uniques'] for x in last_two_days])
                has_data = True if checks>20 else False
            else:
                has_data =False
            if _resp.status_code==502:
                import time
                time.sleep(10)
        except:
            has_data=False
        return has_data

    def iter_segments(self, job_id):
        for advertiser in self.advertisers:
            self.hindsight.user = 'a_%s' % advertiser
            self.hindsight.authenticate()
            for seg in self.segment_dict[advertiser].iterrows():
                has_data = self.check_timeseries_endpoint(seg[1]['url_pattern'], seg[1]['action_id'])
                self.update_db(has_data, advertiser, seg[1]['action_id'], seg[1]['url_pattern'], job_id)

    def check_yesterday(self, filter_id,check):
        yesterday_date = (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        has_data_yesterday = self.crushercache.select_dataframe(QUERY_YESTERDAY % (filter_id,yesterday_date))['pixel_fires'][0]
        if str(has_data_yesterday) != str(check):
            logging.info("changed expectation: segment %s changed from %s to %s" % (filter_id, has_data_yesterday, check))

    def update_db(self,has_data, advertiser, filter_id, pattern, job_id):
        now = datetime.datetime.now().strftime("%Y-%m-%d")
        self.check_yesterday(filter_id, has_data)
        set_to_skip = self.rockerbox.select_dataframe("select skip from advertiser_caching_segment where filter_id = %s" % filter_id)['skip'][0]
        if has_data:
            self.rockerbox.execute(UPDATE_DB, (1, job_id, advertiser, filter_id))
            self.crushercache.execute(SEGMENT_LOG, (advertiser,pattern, filter_id,1,now, set_to_skip, job_id))
        else:
            self.rockerbox.execute(UPDATE_DB, (0, job_id, advertiser, filter_id))
            self.crushercache.execute(SEGMENT_LOG, (advertiser,pattern, filter_id,0,now,set_to_skip, job_id))

if __name__ =="__main__":
    from link import lnk
    rockerbox = lnk.dbs.rockerbox
    crusher = lnk.api.crusher
    crushercache = lnk.dbs.crushercache
    csd = CheckSegmentData(rockerbox, crusher, crushercache)
    import hashlib
    timestamp = datetime.datetime.now().strftime("%Y-%d-%m %HH:%MM:%SS")
    job_id=hashlib.md5(timestamp).hexdigest() 
    csd.iter_segments(job_id)
