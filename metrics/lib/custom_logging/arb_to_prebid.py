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
            uid = msg['bid_request']['bid_info']['user_id_64']
            seller = msg['bid_request']['bid_info']['selling_member_id']
            ip = msg['bid_request']['bid_info']['ip_address']
            ua = msg['bid_request']['bid_info']['user_agent']
            url = msg['bid_request']['bid_info']['url']
            domain = urlparse(url).netloc

            auction_id = msg['bid_request']['tags'][0]['auction_id_64']

            sizes = msg['bid_request']['tags'][0]['sizes'][0].split("x")
            width = sizes[0]
            height = sizes[1]

            if width == "300" and height == "250":

                rq = {
                    "uid":uid,
                    "seller":seller,
                    "ip":ip,
                    "width":width,
                    "height":height,
                    "user_agent":ua,
                    "page_url":url,
                    "domain":domain,
                    "seed":auction_id,
                    "segment":"buy"
                }
                rq_url = "http://localhost:9001/run?" + urlencode(rq)

                try:
                    resp = json.loads(urllib2.urlopen(rq_url).read())
                    resp['key'] = domain + ":" + str(seller)
                    resp['uid'] = str(uid)
                    producer.send_messages('prebid_imps',json.dumps(resp))
                except:
                    logging.info(ujson.dumps({"external_auction_id":"%s" % auction_id}))
