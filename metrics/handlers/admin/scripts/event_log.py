import tornado.web
import ujson
from lib.helpers import Convert
UNFINISHED = """ SELECT * from data_integrity_log where row_count != agg_count """
SELECT = "SELECT * from data_integrity_log where %s"
INSERT = "insert into data_integrity_log (`table_name`,`agg_name`, `partition`, `row_count`, `agg_count`, `result`) values ('%(table_name)s','%(agg_name)s','%(partition)s','%(row_count)s','%(agg_count)s','%(result)s')"
UPDATE = "update data_integrity_log set `table_name` = '%(table_name)s',`agg_name` = '%(agg_name)s', `partition` = '%(partition)s', `row_count` = '%(row_count)s', `agg_count` = '%(agg_count)s', `result` = '%(result)s', `deleted` = '%(deleted)s' where id = '%(id)s'"

class EventLogHandler(tornado.web.RequestHandler):
    def initialize(self, db, api):
        self.db = db 
        self.api = api

    def get(self,*args):
        if self.get_argument("unfinished",False):
            unfinished = self.db.select_dataframe(UNFINISHED)
            as_json = Convert.df_to_json(unfinished)

        elif self.get_argument("deleted",False):
            _all = self.db.select_dataframe(SELECT % "deleted=1")
            print _all
            as_json = Convert.df_to_json(_all)    
        elif args and len(args[0]):
            where = "id = %s" % args[0]
            _all = self.db.select_dataframe(SELECT % where)
            as_json = Convert.df_to_json(_all)
        else:
            _all = self.db.select_dataframe(SELECT % "deleted=0")
            as_json = Convert.df_to_json(_all)

        self.write(as_json)
        self.finish()

    def make_to_insert(self,body):
        required_columns = ["table_name","agg_name","partition"]
        optional_columns = ["result", "agg_count", "row_count"]
        obj = ujson.loads(body)
        if len([ i for i in required_columns if i in obj.keys()]) != len(required_columns):
            raise Exception("required_columns: table_name, agg_name, partition")

        insert_obj = { i: obj.get(i,"") for i in required_columns + optional_columns}
        return insert_obj

    def post(self):
        try:
            insert_obj = self.make_to_insert(self.request.body)
                
            self.db.execute(INSERT % insert_obj)
            where = "id = LAST_INSERT_ID()"
            res = self.db.select_dataframe(SELECT % where)
            as_json = Convert.df_to_json(res)
            self.write(as_json)
        except Exception, e:
            self.write(str(e))

    def put(self,*args):
        try:
            try:
                where = "id = %s" % args[0]
                _all = self.db.select_dataframe(SELECT % where)
                obj = _all.T.to_dict()[0]

                new_values = ujson.loads(self.request.body)
                to_insert = {i: new_values.get(i,j) for i,j in obj.iteritems()}

                self.db.execute(UPDATE % to_insert)
                where = "id = %s" % args[0]
                res = self.db.select_dataframe(SELECT % where)
                as_json = Convert.df_to_json(res)
                self.write(as_json)

            except:
                raise Exception("entry does not exist")
        except Exception,e :
            self.write(str(e))

    def delete(self,*args):
        where = "id = %s" % args[0]
        _all = self.db.select_dataframe(SELECT % where)
        obj = _all.T.to_dict()[0]
        obj['deleted'] = '1'

        self.db.execute(UPDATE % obj)
        self.write("1")
