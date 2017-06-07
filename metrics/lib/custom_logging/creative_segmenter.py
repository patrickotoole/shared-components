import ujson
import kafka
from pykafka import KafkaClient
from pykafka.simpleconsumer import OwnedPartition, OffsetType
from lib.kafka_stream.kafka_stream import KafkaStream
import datetime

QUERY  = "select * from campaign_map"

def get_from_db(db):
    campaign_map = db.select_dataframe(QUERY)
    campaign_map = campaign_map.set_index("campaign_id")
    return campaign_map

def checktime(prior_time):
     now = datetime.datetime.now()
     return (now - prior_time).total_seconds() >=60

def map_campaign(df, campaign_id):
     try:
        row = df.ix[int(campaign_id)]
        return row['segment'], row['value']
     except:
        return None, None

if __name__ == '__main__':

    from link import lnk
    db = lnk.dbs.rockerbox

    campaign_map = get_from_db(db)
    last_time = datetime.datetime.now()

    
    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    producer = KafkaStream(
        "segment_log",
        "slave17:9092,slave40:9092,slave16:9092",
        async=False

    )
    topic = client.topics['served_imps']
    consumer = topic.get_simple_consumer(reset_offset_on_start=True, auto_offset_reset=OffsetType.LATEST)
    for message in consumer:
        try:
            if message is not None:
                j = ujson.loads(message.value)
                segment, value = map_campaign(campaign_map, j.get('campaign_id',0))
                if segment:
                    producer.send_message( str(j['uid'] +","+ str(segment) +":"+str(value) + ":10080") )
                if checktime(last_time):
                    campaign_map = get_from_db(db)
                    last_time = datetime.datetime.now()
        except Exception as e:
            print e
