import kafka

from pykafka import KafkaClient
import urlparse
import ujson
import logging

BASE_QUERY = "insert into pmp.fills (biddable_auction_id, json_object) values "

if __name__ == '__main__':

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("campaign_id", default=False)

    basicConfig(options={})
    parse_command_line()

    from link import lnk
    db = lnk.dbs.rockerboxidf

    batch = []
    def batch_insert(batch):
        base_string = "('%(auction_id)s', '%(json_body)s')"
        values_query = ",".join([base_string % x for x in batch])
        query = BASE_QUERY + values_query
        db.execute(query)


    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['served_imps']
    consumer = topic.get_simple_consumer()
    for message in consumer:
        if message is not None:
            try:
                msg = ujson.loads(message.value)
                auction_id = msg.get('auction_id', False)
                campaign_id = msg.get('campaign_id',False)
                if str(campaign_id) == str(options.campaign_id):
                    batch.append({"auction_id":auction_id, "json_body":ujson.dumps(msg).replace("'","")})
                    if len(batch)>=10:
                        batch_insert(batch)
                        batch = []
            except:
                logging.info("error")
                logging.info(message.value)
