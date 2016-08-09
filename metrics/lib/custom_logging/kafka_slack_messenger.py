import kafka
from pykafka import KafkaClient
from link import lnk
import ujson

QUERY = "select * from kafka_regex"

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
        regex_channel[item[1]['pattern']] = {"channel":item[1]['channel'], "app_name":item[1]['app_name'], "send_message":item[1]['send_message']}

    return regex_channel

if __name__ == '__main__':
    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['hindsight_log']
    consumer = topic.get_simple_consumer()
    crushercache = lnk.dbs.crushercache
    regex_channel= get_regex(crushercache)
    for message in consumer:
        if message is not None:
            msg = ujson.loads(message.value)
            matches = [x if x in msg['log_message'] else False for x in regex_channel.keys()]
            if any(matches):
                for pattern in matches:
                    if pattern and regex_channel[pattern]['app_name'] in msg['app_name']:
                        channel = regex_channel[pattern]['channel']
                        send_msg = {"channel":channel, "message":regex_channel[pattern]['send_message']}
                        slack().__call__(send_msg)
            print message.value
