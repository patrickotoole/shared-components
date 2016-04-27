# from pykafka import KafkaClient
# import json
#
# client = KafkaClient(hosts="zk1:2181/v0_8_1")
#
# topic = client.topics['lg_imps']
#
# consumer = topic.get_simple_consumer()
# for message in consumer:
#     if message is not None:
#         # print message.offset
#         message_object = json.loads(message.value);
#         print message_object['bid_request']['timestamp']
#         print message_object['bid_request']['bid_info']['postal_code']
#         print '------------------------------------'
#         print ''
#
# print client.topics

from autobahn.asyncio.websocket import WebSocketServerProtocol, \
    WebSocketServerFactory
from pykafka import KafkaClient
import json

global consumer

with open('zipcodes.json') as data_file:
    zipcodes = json.load(data_file)

class MyServerProtocol(WebSocketServerProtocol):

    def onConnect(self, request):
        print("Client connecting: {0}".format(request.peer))

    def onOpen(self):
        self.initKafka()
        print("WebSocket connection open.")

    def onMessage(self, payload, isBinary):
        if isBinary:
            print("Binary message received: {0} bytes".format(len(payload)))
        else:
            print("Text message received: {0}".format(payload.decode('utf8')))

        # echo back message verbatim
        self.sendMessage(payload, isBinary)

    def onClose(self, wasClean, code, reason):
        self.skip = True
        print("WebSocket connection closed: {0}".format(reason))

    def initKafka(self):
        
        loop = asyncio.get_event_loop()
        loop.call_later(0,self.initKafka)
        message = consumer.consume()
        if message is not None:
            try:
                message_object = json.loads(message.value)
                payload = {
                    'offset': message.offset,
                    'time': message_object['bid_request']['timestamp'],
                    'location': {
                        'latitude': zipcodes.get(message_object.get('bid_request', {}).get('bid_info', {}).get('postal_code', {}), {}).get('latitude', {}),
                        'longitude': zipcodes.get(message_object.get('bid_request', {}).get('bid_info', {}).get('postal_code', {}), {}).get('longitude', {}),
                    },
                    'url': message_object.get('bid_request', {}).get('bid_info', {}).get('url'),
                    'uid': message_object.get('bid_request', {}).get('bid_info', {}).get('user_id_64'),
                    'hit': message_object.get('branches',0)

                }
                payload = json.dumps(payload)
                self.sendMessage(payload, 0)
            except e:
                print e
            print 'Sent message with offset %s' % message.offset


if __name__ == '__main__':

    import sys
    args = sys.argv
    stream = "lg_imps"
    if len(args) > 1:
        stream = args[1]

    client = KafkaClient(hosts="zk1:2181/v0_8_1")
    topic = client.topics[stream]
    consumer = topic.get_simple_consumer(
        reset_offset_on_start=True 
    )
    try:
        import asyncio
    except ImportError:
        # Trollius >= 0.3 was renamed
        import trollius as asyncio
    
    print "kafka loaded..."
    factory = WebSocketServerFactory()
    factory.protocol = MyServerProtocol

    loop = asyncio.get_event_loop()
    coro = loop.create_server(factory, '0.0.0.0', 9001)
    server = loop.run_until_complete(coro)
    print "server loaded..."

    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.close()
        loop.close()
