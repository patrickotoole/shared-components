from lib.pandas_sql import s

class DataLoader(object):

    def __init__(self,db):
        self.db = db

    def insert_df(self,df,table,key=[],columns=[]):

        con = self.db.create_connection()
        df = df[columns]
        BATCH_SIZE = 50
        LAST = int(len(df) / BATCH_SIZE) + 1
        current = 1
        print "Records to insert: %s" % len(df)
        while current <= LAST:
            print "Inserting: %s to %s" % ((current - 1)*BATCH_SIZE,current*BATCH_SIZE)
            _df = df.ix[(current - 1)*BATCH_SIZE:current*BATCH_SIZE]
            s.write_frame(_df,table,con,flavor='mysql',if_exists='update',key=key)
            current += 1

        return df
