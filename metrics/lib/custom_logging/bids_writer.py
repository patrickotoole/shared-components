import kafka

from pykafka import KafkaClient
import urlparse
import ujson

BASE_QUERY = "insert into pmp.bids (biddable_auction_id, auction_key, json_object) values "

if __name__ == '__main__':


    from link import lnk
    db = lnk.dbs.rockerboxidf

    batch = []
    def batch_insert(batch):
        base_string = "('%(auction_id)s', '%(key)s', '%(json_body)s')"
        values_query = ",".join([base_string % x for x in batch])
        query = BASE_QUERY + values_query
        db.execute(query)


    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['biddable_imps']
    consumer = topic.get_simple_consumer()
    for message in consumer:
        if message is not None:
            try:
                msg = ujson.loads(message.value)
                auction_id = msg.get('auction_id', False)
                key = msg.get('key',False)
                if key and auction_id:
                    batch.append({"auction_id":auction_id, "key":key, "json_body":ujson.dumps(msg).replace("'","")})
                    if len(batch)>=10:
                        batch_insert(batch)
                        batch = []
            except:
                print message.value
