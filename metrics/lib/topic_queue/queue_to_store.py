import kafka
from pykafka import KafkaClient
from pykafka.simpleconsumer import OwnedPartition, OffsetType
from link import lnk
import ujson
import queue_helpers as helpers

QUERY = """INSERT INTO %(table_name)s (%(columns)s) values ( %(values)s )"""

class QueueInsert():
    def __init__(self, table_name, col_list, crushercache):
        self.table_name = table_name
        self.columns_list = col_list
        self.crushercache = crushercache

    def get_values(self, data):
        columns = list(self.columns_list)
        str_list, values = helpers.value_builder(data, columns)
        return str_list, values

    def generic_insert(self, values_to_replace, values_dict):
        cr = self.crushercache.create_connection()
        query_params = {}
        query_params['table_name'] = self.table_name
        query_params['columns'] = helpers.column_builder(self.columns_list)
        query_params['columns'] = cr.escape_string(query_params['columns'])
        query_params['values'] = values_to_replace
        for key,val in values_dict.items():
            values_dict[key] = cr.escape_string(val)
        query_params['values'] = query_params['values'] % values_dict
        self.crushercache.execute(QUERY % query_params)


if __name__ == '__main__':

    from link import lnk
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("table_name",  default="")
    define("columns", default={"columns":[]})

    basicConfig(options={})

    parse_command_line()
    assert('columns' in ujson.loads(options.columns))
    columns_as_list = ujson.loads(options.columns)['columns']
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
                assert(all(col in data.keys() for col in columns_as_list))
                str_values, values = QI.get_values(data)
                QI.generic_insert(str_values, values)
                import time
                time.sleep(2)
            except Exception as e:
                print str(e)

