import pandas, re, ujson

def parse_domain(referrer):
    try:
        if referrer[:len(referrer)/2]*2 == referrer:
            referrer = referrer[:len(referrer)/2]
        t = referrer.split("//")
    except:
        t = [""]

    if len(t) > 1:
        t = [t[1]]

    d = t[0].split("/")[0].split("?")[0].split("&")[0].split(" ")[0].split(".")

    if len(d) < 3:
        domain = ".".join(d)
    elif len(d[-2]) < 4:
        domain = ".".join(d[-3:])
    else:
        domain = ".".join(d[-2:])

    return domain.lower()


class Lookback(object):
    
    HOUR_REGEX = re.compile("\d+:(\d+):\d+")
    
    def __init__(self,uid,data=False):
        self.uid = uid
        self.do = lnk.dbs.digital_ocean
        self.hourly_base = self.__hourly_base__()
        self.get_lookback(data)
        
        
    def __hourly_base__(self):
        index = map(lambda x: str(x) if len(str(x)) > 1 else "0" + str(x),pandas.np.arange(0,60))
        return pandas.DataFrame([0]*60,index=index)
        
        
    def __remote_grep__(self):
        pass

    @classmethod
    def parse_lookback(self,data):
        parsed_data = [row.split(" ")[:3] + ["".join(row.split(" ")[3:-3])]  +row.split(" ")[-3:] for row in data.split("\n")] 
        parsed_df = pandas.DataFrame(parsed_data)
        
        parsed_df[3] = parsed_df[3].map(lambda x: parse_domain(x))
        parsed_df[7] = parsed_df[6].map(lambda x: self.HOUR_REGEX.findall(x)[0] if type(x) is str else '00')
        
        return parsed_df
    
    def get_lookback(self,data=False):
        if not data: 
            data = self.__remote_grep__()
            
        self._raw_lookback = data 
        self.lookback = self.parse_lookback(self._raw_lookback)
        return self.lookback
    
    def get_imps(self):
        imps_df = self.lookback.groupby([1,7]).count()[0].unstack(0).T.fillna(0)
        imps_df = self.hourly_base.join(imps_df.T,how="left").fillna(0).ix[:,1:]
        imps_json = ujson.dumps([i[1].tolist() for i in imps_df.T.iterrows()])
        
        #return imps_json
        return [i[1].tolist() for i in imps_df.T.iterrows()]
    
    def get_domains(self):
        domains_df = self.lookback.groupby([1,7]).agg({3:lambda x: set(x)})[3].map(list).unstack(0).T.fillna(False)
        domains_df = self.hourly_base.join(domains_df.T,how="left").fillna(False).ix[:,1:]
        domains_json = ujson.dumps([[j if j else [] for j in i[1].tolist()] for i in domains_df.iterrows() ])
        
        #return domains_json
        return [[j if j else [] for j in i[1].tolist()] for i in domains_df.iterrows() ]
    
    def get_categories(self):
        cats_df = self.lookback.groupby([1]).count()
        cat_ids = cats_df.index
        
        if len(cat_ids) > 1:
            cats = pandas.DataFrame(console.get_all_pages(
                '/content-category?category_type=universal&id=%s' % ",".join(cat_ids),
                'content-categories'
            ))
            
        else:
            cats = pandas.DataFrame([console.get_all_pages(
                '/content-category?category_type=universal&id=%s' % ",".join(cat_ids),
                'content-category'
            )])

        try:
            cats['id'] = cats['id'].map(str)
        except:
            cats['id'] = '0'
            cats['name'] = '0'
        cats_list = cats.set_index('id')['name'].ix[cat_ids].fillna("No Category").tolist()
        cats_json = ujson.dumps(cats_list)
        
        #return cats_json
        return cats_list
    
    def get_served(self):

        served_df = self.do.select_dataframe('select * from log_imp_served where uid = %s' % self.uid)
        served_df['minute'] = served_df.datetime.map(lambda x: str(x.minute))
        served = served_df.groupby("minute").agg({"domain":lambda x: list(x)})[['domain']]
        served['domain'] = served['domain'].map(lambda x: x if type(x) is list else [])
        
        served = self.hourly_base.join(served,how="left").ix[:,1:]
        served['domain'] = served['domain'].map(lambda x: x if type(x) is list else [])
        
        served_json = ujson.dumps([i[1].tolist() for i in served.T.iterrows()][0])
        served_count_json = ujson.dumps([len(j) for i in served.T.values for j in i])
        
        #return served_count_json
        return [len(j) for i in served.T.values for j in i]


    def get_all(self):
        imps = self.get_imps()
        domains = self.get_domains()
        served = self.get_served()
        import datetime
        minute = datetime.datetime.now().minute
        return {
            "columns":self.get_categories(),
            "data":[list(reversed(i[minute:] + i[:minute])) for i in imps],
            "domains":list(reversed(domains[minute:] + domains[:minute])),
            "served":served[minute:] + served[:minute]
        }
