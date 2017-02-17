import ujson
import kafka
from pykafka import KafkaClient
from pykafka.simpleconsumer import OwnedPartition, OffsetType
import socket

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

if __name__ == '__main__':

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("ip",  default="")
    define("port", default="")

    basicConfig(options={})

    parse_command_line()
    s.connect(((str(options.ip)),(int(options.port)))) 
    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['application_log']
    consumer = topic.get_simple_consumer(reset_offset_on_start=True, auto_offset_reset=OffsetType.LATEST)
    for message in consumer:
        if message is not None:
            print message.value
            if not ujson.loads(message.value).get('timestamp',False):
                new_msg = message.value.replace('\\n',"") + '\x00'
                s.sendall(new_msg)
