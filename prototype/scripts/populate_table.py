from link import lnk
import pandas

BATCHINSERT = "insert into uid_test (uid, full_onsite_url, advertiser, time, occur) values "

class PopulatePrototype:

    def __init__(self, cassandra, prototype):
        self.cassandra = cassandra
        self.prototype = prototype

    def pull_cass_u2(self, u2, date):
        Q = "SELECT uid, url, date, occurrence from rockerbox.pattern_occurrence_u2_counter where source='%s' and action='%s' and date='%s' and u2=%s"
        QUERY = Q % ('vimeo', 'vimeo.com', date, u2)
        data = self.cassandra.execute(QUERY)
        return data

    def aggregate_u2(self, df, data):
        newdf = df.append(data)
        return newdf

    def run_u2(self, date):
        df = pandas.DataFrame()
        for x in range(1,100):
            data = self.pull_cass_u2(x, date)
            df = pandas.DataFrame(data)
            self.batch_insert(df)


    def batch_insert(self,df):
        values_list = []
        values_base = "('%s','%s', '%s', '%s', %s)"
        df['advertiser'] = 'vimeo'
        for i,row in df.iterrows():
            temp_value = values_base % (row['uid'], row['url'].replace("'","").replace('"',""), row['advertiser'], row['date'], row['occurrence'])
            values_list.append(temp_value)
        values_portion = ",".join(values_list)
        full_query = BATCHINSERT + values_portion
        self.prototype.execute(full_query)


if __name__ == "__main__":

    from link import lnk
    cass = lnk.dbs.cassandra
    proto = lnk.dbs.prototype
    pp = PopulatePrototype(cass,proto)
    df = pp.run_u2('2017-06-07 00:00:00')
    df['advertiser'] = 'vimeo'
    #pp.batch_insert(df)
