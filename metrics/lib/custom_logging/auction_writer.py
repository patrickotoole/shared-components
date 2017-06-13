import kafka

from pykafka import KafkaClient
import urlparse
import ujson
import logging

BASE_QUERY = "insert into pmp.auction (uid, seed_auction_id, auction_key, json_object) values "

if __name__ == '__main__':

    from link import lnk
    db = lnk.dbs.rockerboxidf

    def insert(values):
        values_string = "('%(uid)s', '%(auction_id)s', '%(key)s', '%(json_body)s')" % values
        query = BASE_QUERY + values_string
        db.execute(query)

    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['prebid_imps']
    consumer = topic.get_simple_consumer()
    for message in consumer:
        if message is not None:
            try:
                msg = ujson.loads(message.value)
                auction_id = msg.get('external_auction_id', False)
                key = msg.get('key',0)
                user_id = msg.get('uid',False)
                insert({"uid":user_id, "auction_id":auction_id, "key": key, "json_body":ujson.dumps(msg).replace("'","")})
            except:
                logging.info("error")
                logging.info(message.value)
