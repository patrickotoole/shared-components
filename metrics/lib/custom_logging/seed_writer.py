import kafka

from pykafka import KafkaClient
import urlparse
import ujson
import logging

BASE_QUERY = "insert into pmp.seed (seed_auction_id, json_object) values "

if __name__ == '__main__':

    from link import lnk
    db = lnk.dbs.rockerboxidf

    def insert(values):
        values_string = "('%(uid)s', '%(auction_id)s', '%(json_body)s')" % values
        query = BASE_QUERY + values_string
        db.execute(query)

    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['arb_imps']
    consumer = topic.get_simple_consumer()
    for message in consumer:
        if message is not None:
            try:
                msg = ujson.loads(message.value)
                auction_id = str(msg['bid_request']['tags'][0]['auction_id_64'])
                user_id = msg.get("uid",False)
                insert({"uid":user_id, "auction_id":auction_id, "json_body":ujson.dumps(msg).replace("'","")})
            except:
                logging.info("error")
                logging.info(message.value)
