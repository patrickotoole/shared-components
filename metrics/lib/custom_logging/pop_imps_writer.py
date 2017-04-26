import kafka

from pykafka import KafkaClient
import urlparse
import ujson

BASE_QUERY = "insert into pop_data (uid, url, domain) values "

if __name__ == '__main__':

    from link import lnk
    db = lnk.dbs.rockerboxidf

    batch = []
    def batch_insert(batch):
        base_string = "('%(uid)s', '%(url)s', '%(domain)s')"
        values_query = ",".join([base_string % x for x in batch])
        query = BASE_QUERY + values_query
        db.execute(query)


    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['pop_imps']
    consumer = topic.get_simple_consumer()
    for message in consumer:
        if message is not None:
            url = ujson.loads(message.value)['bid_request']['bid_info']['url']
            domain = urlparse.urlparse(url).hostname
            domain = domain if domain is not None else url
            uid = int(ujson.loads(message.value)['bid_request']['bid_info']['user_id_64'])
            if url is not None and url != "" and url != " ":
                batch.append({"uid":str(uid), "url":url.replace("'",""), "domain":domain.replace("'","")})
            if len(batch)==100:
                batch_insert(batch)
                batch = []
