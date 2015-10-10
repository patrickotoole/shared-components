import logging
import pandas

class PatternCache(object):

    def __init__(self,cache,advertiser,pattern,cache_insert,uid_values,url_values,*args,**kwargs):

        self.cache = cache
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
            self.cache.run_counter_updates(values,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column,True)


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
    
            self.cache.run_inserts(values,UID_INSERT)
    
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
           
            self.cache.run_inserts(values,UID_INSERT)

 

    def cache_raw(self,*args,**kwargs):
        logging.info("Cacheing: %s => %s occurences raw" % (self.advertiser,self.pattern))


        SELECT_COUNTER = "SELECT * from rockerbox.pattern_occurrence_u2_counter"
        UPDATE_COUNTER = "UPDATE rockerbox.pattern_occurrence_u2_counter"

        dimensions     = ["source","date","action","uid","u2"]
        to_count       = "url"
        count_column   = "occurrence"

        if len(self.cache_insert):
            self.cache.run_counter_updates(self.cache_insert,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column,True) 



    def cache_uids(self,*args,**kwargs):
        logging.info("Cacheing: %s => %s occurence uuids" % (self.advertiser,self.pattern))

        UID_INSERT = "INSERT INTO rockerbox.pattern_occurrence_users_u2 (source,date,action,uid,u2) VALUES (?,?,?,?,?)"
        if len(self.uid_values):
            self.cache.run_inserts(self.uid_values,UID_INSERT)

 
    def cache_urls(self,*args,**kwargs):
        logging.info("Cacheing: %s => %s occurence urls" % (self.advertiser,self.pattern))

        SELECT_COUNTER = "SELECT * from rockerbox.pattern_occurrence_urls_counter" 
        UPDATE_COUNTER = "UPDATE rockerbox.pattern_occurrence_urls_counter" 

        dimensions     = ["source","date","action"]
        to_count       = "url"
        count_column   = "count"

        if len(self.url_values):
            self.cache.run_counter_updates(self.url_values,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column)


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
                domain_values = self.cache.get_domains_from_uids(self.uid_values,DOMAIN_SELECT)
                domain_values = domain_values[["source","date","action","domain","count"]].values.tolist()
                self.cache.run_counter_updates(domain_values,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column,True)
            except:
                pass
    


