import logging
import pandas
import json
import ujson
from lib.helpers import *
from twisted.internet import defer
import custom_defer
from udf_helper import *

ONSITEQUERY = "select uid, full_onsite_url, time, segments from prototype.onsite where match (segments) against ('{}' in boolean mode) limit 0, {}"

DOMAINQUERY = """
select offsite.* from prototype.offsite 
join
(select distinct onsite.uid from prototype.onsite 
inner join 
(select uid from prototype.offsite where domain='{}') ofs 
on onsite.uid = ofs.uid
where segments like '%{}%') ons
on offsite.uid = ons.uid
limit {},{}
"""

KEYWORDQUERY = """
select offsite.* from prototype.offsite 
join
(select distinct onsite.uid from prototype.onsite 
inner join 
(select uid from prototype.offsite where match (url_sentence) against ('{}' in natural language mode)) ofs 
on onsite.uid = ofs.uid
where segments like '%{}%') ons
on offsite.uid = ons.uid
limit {},{}
"""

VERIFYQUERY = "select action_name from action_with_patterns where action_id={} and pixel_source_name='{}'"

COUNTKEYWORDQUERY = """
select count(*) from prototype.offsite 
join
(select distinct onsite.uid from prototype.onsite 
inner join 
(select uid from prototype.offsite where match (url_sentence) against ('{}' in natural language mode)) ofs 
on onsite.uid = ofs.uid
where segments like '%{}%') ons
on offsite.uid = ons.uid
"""

COUNTDOMAINQUERY = """
select count(*) from prototype.offsite
join
(select distinct onsite.uid from prototype.onsite 
inner join 
(select uid from prototype.offsite where domain='{}') ofs 
on onsite.uid = ofs.uid
where segments like '%{}%') ons
on offsite.uid = ons.uid
"""

class ApiHelper(UDFHandler):

    def onsite_data(self,filter_id, filter_limit):
        df = self.prototype.select_dataframe(ONSITEQUERY.format(filter_id, filter_limit))
        df = df[['uid','full_onsite_url', 'time']]
        return df

    def offsite_domain_data(self,filter_id, domain, filter_limit, page):
        if not page:
            df = self.prototype.select_dataframe(DOMAINQUERY.format(domain, filter_id, 0,filter_limit))
        else:
            df = self.prototype.select_dataframe(DOMAINQUERY.format(domain, filter_id, int(page),filter_limit))
        return df

    def offsite_keyword_data(self,filter_id, keyword, filter_limit, page):
        if not page:
            df = self.prototype.select_dataframe(KEYWORDQUERY.format(keyword, filter_id, 0, filter_limit))
        else:
            df = self.prototype.select_dataframe(KEYWORDQUERY.format(keyword, filter_id, int(page), filter_limit))
        count_df = self.prototype.select_dataframe(COUNTKEYWORDQUERY.format(keyword, filter_id))
        return df, count_df

    def verify_filter_id(self, advertiser, filter_id):
        df = self.db.select_dataframe(VERIFYQUERY.format(filter_id, advertiser))
        if df.empty:
            valid=False
            self.write(ujson.dumps({"error": "not a valid filter id for given advertiser"}))
            self.set_status(400)
            self.finish()
        else:
            valid=True
        return valid

    def remove_hex(self, domains):
        fixed = []
        for d in domains:
            try:
                dom = d.encode('latin')
                fixed.append(dom)
            except:
                logging.info("can't encode")
        return fixed

    def get_idf(self, offsite_df):
        domain_set = offsite_df['domain']

        QUERY = """
            SELECT domain, total_users as num_users, idf, category_name, case when parent_category_name = "" then category_name else parent_category_name end as parent_category_name
            FROM domain_idf
            WHERE domain in (%(domains)s) and category_name != ""
        """
        domain_set = [self.crushercache.escape_string(i.encode("utf-8")) for i in domain_set ]
        domain_set = self.remove_hex(set(domain_set))
        domains = "'" + "','".join(domain_set) + "'"
        results = self.rockerboxidf.select_dataframe(QUERY % {"domains":domains})
        return results

    @decorators.deferred
    def domain_query(self, domain_filter, filter_id, udf, advertiser, filter_limit, page):
        valid_advertiser_filter = self.verify_filter_id(advertiser, filter_id)
        if not valid_advertiser_filter:
            return None
        onsite_df = self.onsite_data(filter_id, filter_limit)
        offsite_df = self.offsite_domain_data(filter_id, domain_filter, filter_limit, page) 
        kwargs = {"onsite":onsite_df, "offsite":offsite_df}
        resp = self.run_udf(udf, kwargs)
        return resp

    @decorators.deferred
    def keyword_query(self, keyword, filter_id, udf, advertiser, filter_limit, page):
        valid_advertiser_filter = self.verify_filter_id(advertiser, filter_id)
        if not valid_advertiser_filter:
            return None
        onsite_df =  self.onsite_data(filter_id, filter_limit)
        offsite_df, count = self.offsite_keyword_data(filter_id, keyword, filter_limit, page)
        idf = self.get_idf(offsite_df)
        kwargs = {"onsite":onsite_df, "offsite":offsite_df, "count":count['count(*)'][0], "idf":idf}
        resp = self.run_udf(udf, kwargs)
        return resp
