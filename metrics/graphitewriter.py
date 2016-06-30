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
        self.server = server
        self.port=port

    def __enter__(self):
        try:
            self.sock = socket.socket()
            self.sock.connect( (self.server,self.port) )
            #logging.info("connected to Graphite")
        except Exception as e:
            logging.error(str(e))
            logging.error("Couldn't connect to Graphite")

    def __exit__(self, exc_type, exc_value, traceback):
        self.sock.close()
        #logging.info("connection closed")
        
    def send(self,metric, value):
        now = int( time.time() )
        message ="%s %s %s\n"
        message = message % (metric, value, now)
        #logging.info("pushed message to graphite")
        self.sock.sendall(message)
