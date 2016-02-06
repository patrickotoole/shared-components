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
        print("WebSocket connection closed: {0}".format(reason))

    def initKafka(self):
        client = KafkaClient(hosts="zk1:2181/v0_8_1")
        topic = client.topics['lg_imps']
        consumer = topic.get_simple_consumer(
            reset_offset_on_start=True
        )
        for message in consumer:
            if message is not None:
                try:
                    # payload = int(message.offset)
                    message_object = json.loads(message.value)
                    payload = {
                        'offset': message.offset,
                        'time': message_object['bid_request']['timestamp'],
                        'location': {
                            'latitude': zipcodes.get(message_object.get('bid_request', {}).get('bid_info', {}).get('postal_code', {}), {}).get('latitude', {}),
                            'longitude': zipcodes.get(message_object.get('bid_request', {}).get('bid_info', {}).get('postal_code', {}), {}).get('longitude', {}),
                        }
                    }
                    payload = json.dumps(payload)
                    self.sendMessage(payload, 0)
                except e:
                    print e
                # message_object = json.loads(message.value)
        #         package = {
        #             'time': message_object['bid_request']['timestamp'],
        #             'zipcode': message_object['bid_request']['bid_info']['postal_code']
        #         }
                print 'Sent message with offset %s' % message.offset
                # self.sendMessage(json.dumps(package), 1)


if __name__ == '__main__':

    try:
        import asyncio
    except ImportError:
        # Trollius >= 0.3 was renamed
        import trollius as asyncio

    factory = WebSocketServerFactory(u"ws://127.0.0.1:9000", debug=False)
    factory.protocol = MyServerProtocol

    loop = asyncio.get_event_loop()
    coro = loop.create_server(factory, '0.0.0.0', 9000)
    server = loop.run_until_complete(coro)

    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.close()
        loop.close()
