import kafka
from pykafka import KafkaClient
from pykafka.simpleconsumer import OwnedPartition, OffsetType
from link import lnk
import ujson

QUERY = """INSERT INTO %(table_name)s (%(columns)s) %(subquery)s"""
SUB_QUERY = "values ( %s )"

class QueueInsert():
    def __init__(self, table_name, col_list, crushercache):
        self.table_name = table_name
        self.columns_list = col_list
        self.crushercache = crushercache
        self.sub_query = self.build_subquery(col_list, SUB_QUERY)

    def build_subquery(self,col_list, query):
        columns = list(col_list)
        sub_string = "%({})s"
        sub_query_cols = []
        for col in columns:
            sub_query_cols.append(sub_string.format(col))
        sub_into_subquery = "\""+ "\",\"".join(sub_query_cols) + "\""
        sub_query = query % (sub_into_subquery)
        return sub_query

    def column_list_to_string(self, db_connection):
        cols = list(self.columns_list)
        cols_str = ",".join(cols)
        cols_str = db_connection.escape_string(cols_str)
        return cols_str

    def build_subquery_w_values(self,values, db_connection):
        for key,val in values.items():
            values[key] = db_connection.escape_string(val)
        built_subquery = self.sub_query % values
        return built_subquery

    def create_db_dict(self, values_dict):
        db_connection = self.crushercache.create_connection()
        query_params = {}
        query_params['table_name'] = self.table_name
        query_params['columns'] = self.column_list_to_string(db_connection)
        query_params['subquery'] = self.build_subquery_w_values(values_dict, db_connection)
        return query_params

    def process_message(self, data):
        assert(all(col in data.keys() for col in self.columns_list))
        query_params = self.create_db_dict(data)
        self.crushercache.execute(QUERY % query_params)

if __name__ == '__main__':

    from link import lnk
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("table_name",  default="")
    define("columns", default="")

    basicConfig(options={})

    parse_command_line()
    assert(len(options.columns) >1)
    columns_as_list = options.columns.split(",")
    assert(type(columns_as_list)==list)

    crushercache = lnk.dbs.crushercache
    QI = QueueInsert(options.table_name, columns_as_list, crushercache)

    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['topic_titles']
    consumer = topic.get_simple_consumer()
    for message in consumer:
        if message is not None:
            data = ujson.loads(message.value)
            try:
                QI.process_message(data)
                import time
                time.sleep(2)
            except Exception as e:
                print str(e)

