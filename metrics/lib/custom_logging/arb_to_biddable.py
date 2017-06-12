import ujson
import kafka
from pykafka import KafkaClient
from pykafka.simpleconsumer import OwnedPartition, OffsetType
import json
from urlparse import urlparse
from urllib import urlencode
import urllib2

if __name__ == '__main__':

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("ip",  default="")
    define("port", default="")

    basicConfig(options={})

    parse_command_line()
    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['arb_imps']
    consumer = topic.get_simple_consumer(reset_offset_on_start=True, auto_offset_reset=OffsetType.LATEST)

    producer_client = kafka.KafkaClient("slave67:9092")
    producer = kafka.SimpleProducer(producer_client, async=False, batch_send=False)
    producer.client.load_metadata_for_topics('prebid_imps')
    for message in consumer:
        if message is not None:
            msg = json.loads(message.value)
            auction_id = msg['bid_request']['tags'][0]['auction_id_64']
            uid = msg['bid_request']['bid_info']['user_id_64']
            seller = str(msg['bid_request']['bid_info']['selling_member_id'])
            url = msg['bid_request']['bid_info']['url']

            domain = urlparse(url).netloc or url

            rq = {
                "key":str(uid),
                "seller":seller,
                "referrer":domain,
            }

            rq_url = "http://localhost:9001/uid?" + urlencode(rq)

            try:
                resp = urllib2.urlopen(rq_url).read()
                if resp != "":
                    rq['uid'] = rq['key']
                    rq['key'] = domain + ":" + seller
                    rq['auction_id'] = str(auction_id)
                    rq['values'] = resp.replace("\n","")
                    rq['url'] = url
                    producer.send_messages('biddable_imps', json.dumps(rq))
            except Exception as e:
                logging.info(json.dumps(rq))
                logging.info(str(e))
                pass 
