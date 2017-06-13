import kafka

from pykafka import KafkaClient
import urlparse
import ujson
import logging

BASE_QUERY = "insert into pmp.bids (biddable_auction_id, auction_key, json_object) values "

if __name__ == '__main__':


    from link import lnk
    db = lnk.dbs.rockerboxidf

    def insert(values):
        values_string =  "('%(uid)s', '%(auction_id)s', '%(key)s', '%(json_body)s')" % values
        query = BASE_QUERY + values_string
        db.execute(query)

    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['biddable_imps']
    consumer = topic.get_simple_consumer()
    for message in consumer:
        if message is not None:
            try:
                msg = ujson.loads(message.value)
                logging.info(msg)
                auction_id = msg.get('auction_id', False)
                key = msg.get('key',False)
                user_id = msg.get("uid", False)
                if key and auction_id:
                    insert({"uid":user_id,"auction_id":auction_id, "key":key, "json_body":ujson.dumps(msg).replace("'","")})
            except:
                logging.info("error")
                logging.info(message.value)
