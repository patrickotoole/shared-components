import kafka
from pykafka import KafkaClient
from pykafka.simpleconsumer import OwnedPartition, OffsetType
from link import lnk
import ujson
import queue_helpers as helpers

QUERY = "INSERT INTO %(table_name)s (%(columns)s) values ( %(values)s )"

class QueueInsert():
    def __init__(self, table_name, col_list):
        self.table_name = table_name
        self.columns_list = col_list

    def set_values(self, data):
        values = helpers.value_builder(data, self.col_list)
        return values

    def generic_insert(self, values):
        query_params = {}
        query_params['table_name'] = self.table_name
        query_params['columns'] = self.col_list
        query_params['values'] = values

        cr = crushercache.create_connection()
        qp = cr.escapte_string(query_params)
        crushercache.execute(QUERY % query_params)


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

    query_params = {}
    query_params['table_name'] = options.table_name
    query_params['columns'] = helpers.column_builder(columns_as_list)

    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['topic_titles']
    consumer = topic.get_simple_consumer()
    for message in consumer:
        if message is not None:
            data = ujson.loads(message.value)
            assert(all(col in data.keys() for col in columns_as_list))

            query_params['values'] = helpers.value_builder(data, columns_as_list)

