import sys
import os
import socket
import logging
import time

CARBON_SERVER = 'graphite'
CARBON_PORT = 2003

#CARBON_SERVER = 'localhost'
#CARBON_PORT = 2323

class GraphiteWriter:
    def __init__(self,server=CARBON_SERVER, port=CARBON_PORT):
        self.sock = socket.socket()
        try:
            self.sock.connect( (server,port) )
        except:
            logging.info("Couldn't connect to %(server)s on port %(port)d, is carbon-agent.py running?" % { 'server':CARBON_SERVER, 'port':CARBON_PORT })
            #sys.exit(1)
        
    def send(self,metric, value):
        self.sock.connect( (server,port) )
        now = int( time.time() )
        message ="%s %s %s\n"
        message = message % (metric, value, now)
        logging.info("pushed message to graphite")
        self.sock.sendall(message)
