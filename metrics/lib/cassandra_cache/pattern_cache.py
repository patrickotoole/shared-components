import logging
import pandas

from lib.cassandra_helpers.range_query import PreparedCassandraRangeQuery
from lib.cassandra_helpers.helpers import FutureHelpers

from lib.cassandra_cache.helpers import *



class CacheBase(PreparedCassandraRangeQuery):

    num_futures = 60

    def max_ttl(self,cache_date,max_days=7):
        from datetime import date, datetime
        cache_time = datetime.strptime(cache_date,"%Y-%m-%d") 
        _today = date.today()
        today = datetime.fromordinal(_today.toordinal())
        diff = today - cache_time

        seconds = diff.total_seconds()
        return 60*60*24*max_days - seconds

        

    def pull_simple(self,to_pull,query):
        statement = self.cassandra.prepare(query)
        to_bind = self.bind_and_execute(statement)

        results = FutureHelpers.future_queue(to_pull,to_bind,simple_append,self.num_futures,[])
        results = results[0]
        return results



    def run_counter_updates(self,url_inserts,select,update,dimensions=[],to_count="",count_column="",counter_value=False):
        """
        Arguments:
          url_inserts: data to update
          select: select statement to use to check data
          update: update statement to use to insert data
          dimensions: dimensions that are fixed (and that we will use in the select)
          to_count: the field that we want to count (like url)
          count_column: the name of the database counter that we will update / increment
        """

        import pandas

        cols = dimensions
        if to_count not in dimensions:
            cols += [to_count]
        cols_with_count = cols + [count_column]

        select = select + self.__where_formatter__(dimensions)
        update = update + self.__set_formatter__(count_column) + self.__where_formatter__(cols)
        
        # if the count is part of the dataset, no need to group and count
        if counter_value:
       
            new_values = pandas.DataFrame(url_inserts,columns=cols_with_count)
        else:
            df = pandas.DataFrame(url_inserts,columns=cols)
            new_values = group_all_and_count(df,count_column)
        
    
        to_pull = new_values[dimensions].drop_duplicates().values.tolist()
        results = self.pull_simple(to_pull,select)
        
        # determine what needs to be update and by how much
        if len(results) > 0:
            existing_values = pandas.DataFrame(results,columns=cols_with_count)
            updates_df = compare_and_increment(new_values,existing_values)
            to_update = updates_df.values.tolist()
        else:
            to_update = new_values[[count_column]+list(new_values.columns)[:-1]].values.tolist()

            
        print "updating: %s" % len(to_update)
        statement = self.cassandra.prepare(update)
        print update

        to_bind = self.bind_and_execute(statement)
        FutureHelpers.future_queue(to_update,to_bind,simple_append,self.num_futures,[])  

    def run_inserts(self,inserts,insert_query):
        insert_query = insert_query 
        import random 
        if len(inserts) > 0:
            insert_statement = self.build_statement(insert_query,"","")
            bound_insert = self.bind_and_execute(insert_statement)
            def cb(x):
                print x
            random.shuffle(inserts)
            FutureHelpers.future_queue(inserts,bound_insert,cb,self.num_futures)

    def get_domain_hll_from_uids(self,uid_inserts,select):
        import pandas
        import hyperloglog

        def build_hll(uids):
            hll = hyperloglog.HyperLogLog(0.04)
            for uid in uids:
                hll.add(uid)
            return bytearray(hll.M)

        statement = self.cassandra.prepare(select)
        to_bind = self.bind_and_execute(statement)
        uids = [[j] for j in list(set([i[-2] for i in uid_inserts]))]

        logging.info("Unique user ids :%s" % len(uids))
        results = FutureHelpers.future_queue(uids,to_bind,simple_append,self.num_futures,[])
        results = results[0]

        df = pandas.DataFrame(results)

        _temp = df.groupby("uid").count()
        bad_users = _temp[_temp.sort_index(by="domain").domain > 2000].index.tolist()
        
        print df.groupby("uid").count()['domain'].describe()
        import math
        counts, bins = pandas.np.histogram(df.groupby("uid").count()['domain'].map(lambda x: math.log(x,10)))
        print pandas.Series(counts, index=map(lambda x: 10**x,bins[:-1]))

        def filter_fraud(df):
        
            uids = df.groupby("uid")["uid"].count()
            bad_uids = list(uids[uids > 1000].index)
        
            bad_domain_uids = list(set(df[(df.domain == "pennlive.com") | (df.domain == "nola.com") | (df.domain == "palmbeachpost.com")].uid))
            df = df[~df.uid.isin(bad_uids) & ~df.uid.isin(bad_domain_uids)]
        
            return df

        df = filter_fraud(df)


        df = df[~df.uid.isin(bad_users)]

        print "Users with more than 2000 datapoints: %s" % len(bad_users)
        print df.groupby("uid").count()['domain'].describe()
        df['date'] = df.timestamp.map(lambda x: x.split(" ")[0] + " 00:00:00")

        #domain_date = df.groupby(["domain","date"])["uid"].count()
        domain_date = df.groupby(["domain","date"])["uid"].agg({"count":lambda x: len(set(x)), "hll":build_hll})

        df = domain_date.reset_index()

        df["source"] = uid_inserts[0][0]
        df["action"] = uid_inserts[0][2]

       
        return df



    def get_domains_from_uids(self,uid_inserts,select):
        import pandas

        statement = self.cassandra.prepare(select)
        to_bind = self.bind_and_execute(statement)
        uids = [[j] for j in list(set([i[-2] for i in uid_inserts]))]

        logging.info("Unique user ids :%s" % len(uids))
        results = FutureHelpers.future_queue(uids,to_bind,simple_append,self.num_futures,[])
        results = results[0]

        df = pandas.DataFrame(results)

        _temp = df.groupby("uid").count()
        bad_users = _temp[_temp.sort_index(by="domain").domain > 2000].index.tolist()
        
        print df.groupby("uid").count()['domain'].describe()
        import math
        counts, bins = pandas.np.histogram(df.groupby("uid").count()['domain'].map(lambda x: math.log(x,10)))
        print pandas.Series(counts, index=map(lambda x: 10**x,bins[:-1]))

        def filter_fraud(df):
        
            uids = df.groupby("uid")["uid"].count()
            bad_uids = list(uids[uids > 1000].index)
        
            bad_domain_uids = list(set(df[(df.domain == "pennlive.com") | (df.domain == "nola.com") | (df.domain == "palmbeachpost.com")].uid))
            df = df[~df.uid.isin(bad_uids) & ~df.uid.isin(bad_domain_uids)]
        
            return df

        df = filter_fraud(df)



        df = df[~df.uid.isin(bad_users)]

        print "Users with more than 2000 datapoints: %s" % len(bad_users)
        print df.groupby("uid").count()['domain'].describe()
        df['date'] = df.timestamp.map(lambda x: x.split(" ")[0] + " 00:00:00")


        #domain_date = df.groupby(["domain","date"])["uid"].count()
        domain_date = df.groupby(["domain","date"]).agg({"uid":lambda x: len(set(x))})['uid']

        domain_date.name = "count"
        df = domain_date.reset_index()

        df["source"] = uid_inserts[0][0]
        df["action"] = uid_inserts[0][2]

       
        return df

class PatternCache(CacheBase):

    def __init__(self,cassandra,advertiser,pattern,cache_insert,uid_values,url_values,*args,**kwargs):

        self.cassandra = cassandra
        self.cache_insert = cache_insert 
        self.uid_values = uid_values
        self.url_values = url_values

        self.advertiser = advertiser
        self.pattern = pattern

    
    def cache_views(self,*args,**kwargs):
        logging.info("Cacheing: %s => %s views" % (self.advertiser,self.pattern))

        SELECT_COUNTER = "SELECT * from rockerbox.pattern_occurrence_views_counter"
        UPDATE_COUNTER = "UPDATE rockerbox.pattern_occurrence_views_counter"

        dimensions     = ["source","date","action"]
        to_count       = "action"
        count_column   = "count"
        
        all_columns = dimensions + ["uid","u2","url","count"]

        if len(self.cache_insert):
            series = pandas.DataFrame(self.cache_insert,columns=all_columns).groupby(dimensions)['count'].sum()

            values = series.reset_index().values.tolist()
            self.run_counter_updates(values,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column,True)


    def cache_visits(self,*args,**kwargs):
        logging.info("Cacheing: %s => %s occurence uniques" % (self.advertiser,self.pattern))
    
        UID_INSERT = "INSERT INTO rockerbox.pattern_occurrence_visits (source,date,action,count) VALUES (?,?,?,?)"

        dimensions  = ["source","date","action"]
        dim_plus    = dimensions + ["uid","url"]
        all_columns = dimensions + ["uid","u2","url","count"]

        if len(self.cache_insert):
            series = pandas.DataFrame(self.cache_insert,columns=all_columns).groupby(dim_plus)['count'].count()
            reset = series.reset_index()
    
            dims = reset.groupby(dimensions)['count'].count()
            values = dims.reset_index().values.tolist()
    
            self.run_inserts(values,UID_INSERT)
    
    def cache_uniques(self,*args,**kwargs):
        logging.info("Cacheing: %s => %s occurence uniques" % (self.advertiser,self.pattern))

        UID_INSERT = "INSERT INTO rockerbox.pattern_occurrence_uniques (source,date,action,count) VALUES (?,?,?,?)"

        dimensions  = ["source","date","action"]
        dim_plus    = dimensions + ["uid"]
        all_columns = dimensions + ["uid","u2","url","count"]

        if len(self.cache_insert):

            series = pandas.DataFrame(self.cache_insert,columns=all_columns).groupby(dim_plus)['count'].count()
            reset = series.reset_index()

            dims = reset.groupby(dimensions)['count'].count()
            values = dims.reset_index().values.tolist()
           
            self.run_inserts(values,UID_INSERT)

 

    def cache_raw(self,*args,**kwargs):
        logging.info("Cacheing: %s => %s occurences raw" % (self.advertiser,self.pattern))


        SELECT_COUNTER = "SELECT * from rockerbox.pattern_occurrence_u2_counter"
        UPDATE_COUNTER = "UPDATE rockerbox.pattern_occurrence_u2_counter"

        dimensions     = ["source","date","action","uid","u2"]
        to_count       = "url"
        count_column   = "occurrence"

        if len(self.cache_insert):
            self.run_counter_updates(self.cache_insert,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column,True) 



    def cache_uids(self,*args,**kwargs):
        logging.info("Cacheing: %s => %s occurence uuids" % (self.advertiser,self.pattern))

        UID_INSERT = "INSERT INTO rockerbox.pattern_occurrence_users_u2 (source,date,action,uid,u2) VALUES (?,?,?,?,?)"
        if len(self.uid_values):
            self.run_inserts(self.uid_values,UID_INSERT)

 
    def cache_urls(self,*args,**kwargs):
        logging.info("Cacheing: %s => %s occurence urls" % (self.advertiser,self.pattern))

        SELECT_COUNTER = "SELECT * from rockerbox.pattern_occurrence_urls_counter" 
        UPDATE_COUNTER = "UPDATE rockerbox.pattern_occurrence_urls_counter" 

        dimensions     = ["source","date","action"]
        to_count       = "url"
        count_column   = "count"

        if len(self.url_values):
            self.run_counter_updates(self.url_values,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column)


    def cache_domains(self,*args,**kwargs):
        logging.info("Cacheing: %s => %s occurance domains" % (self.advertiser,self.pattern))
        
        DOMAIN_SELECT = "select * from rockerbox.visitor_domains_2 where uid = ?"
        DOMAIN_INSERT = "INSERT INTO rockerbox.pattern_occurrence_domains (source,date,action,domain) VALUES (?,?,?,?)"

        SELECT_COUNTER = "SELECT * from rockerbox.pattern_occurrence_domains_counter"
        UPDATE_COUNTER = "UPDATE rockerbox.pattern_occurrence_domains_counter"
        dimensions     = ["source","date","action"]
        to_count       = "domain"
        count_column   = "count"

        if len(self.uid_values):
            try:
                domain_values = self.get_domains_from_uids(self.uid_values,DOMAIN_SELECT)
                domain_values = domain_values[["source","date","action","domain","count"]].values.tolist()
                self.run_counter_updates(domain_values,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column,True)
            except:
                pass
    

    def cache_hll_domains(self,*args,**kwargs):
        logging.info("Cacheing: %s => %s occurance domains" % (self.advertiser,self.pattern))
        
        ttl = self.max_ttl(args[0])

        DOMAIN_SELECT = "select * from rockerbox.visitor_domains_2 where uid = ?"
        INSERT = "INSERT INTO rockerbox.pattern_occurrence_domains_hll (source,date,action,action_date,domain,hll) VALUES (?,?,?,?,?,?) USING TTL %s " % ttl

        if len(self.uid_values):
            try:
                domain_values = self.get_domain_hll_from_uids(self.uid_values,DOMAIN_SELECT)
                values = [
                    [di['source'],di['date'],di['action'],args[0] + " 00:00:00",di['domain'],di['hll']] 
                    for di in domain_values.T.to_dict().values()
                ]

                self.run_inserts(values,INSERT)
            
                pass
            except:
                pass
 
