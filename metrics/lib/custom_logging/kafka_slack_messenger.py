import kafka
from pykafka import KafkaClient
from pykafka.simpleconsumer import OwnedPartition, OffsetType
from link import lnk
import ujson
import datetime
import re

QUERY = "select * from slack_log_match where active=1 and deleted=0"

def slack():

    class Slack():
    
        def __call__(self,msg):
            return self.send(msg)

        def send(self, msg):
            self.send_message(msg['channel'],msg['message'])
        
        def send_message(self, channel = "#yoshibot", message = "hello"):
            self.slackclient.api_call("chat.postMessage", channel = channel, text = message, as_user=False)
                
        def __init__(self):
            from slackclient import SlackClient
            TOKEN = "xoxp-2171079607-3074847889-26638050530-c10bb6093c"
            self.slackclient = SlackClient(TOKEN)

    return Slack()

def get_regex(db):
    regex_channel = {}
    data = db.select_dataframe(QUERY)
    for item in data.iterrows():
        regex_channel[item[1]['regex']] = {"channel":item[1]['channel'], "send_message":item[1]['message']}

    return regex_channel

if __name__ == '__main__':
    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['hindsight_log']
    consumer = topic.get_simple_consumer(reset_offset_on_start=True, auto_offset_reset=OffsetType.LATEST)
    crushercache = lnk.dbs.crushercache
    regex_channel= get_regex(crushercache)
    timer = datetime.datetime.now() + datetime.timedelta(seconds=20)
    for message in consumer:
        current_timer = datetime.datetime.now()
        if current_timer > timer:
            regex_channel= get_regex(crushercache)
        if message is not None:
            msg = message.value
            result = msg
            for pattern in regex_channel.keys():
                if re.match(pattern,msg) is not None: 
                    result = re.sub(pattern, regex_channel[pattern]['send_message'], msg)
                    send_msg = {"channel":regex_channel[pattern]['channel'], "message":result}
                    slack().__call__(send_msg)
            print message.value
