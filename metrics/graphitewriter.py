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
        self.sock = socket.socket()
        
    def send(self,metric, value):
        try:
            self.sock.connect( (self.server,self.port) )
        except:
            logging.info("Couldn't connect to Graphite")

        now = int( time.time() )
        message ="%s %s %s\n"
        message = message % (metric, value, now)
        logging.info("pushed message to graphite")
        self.sock.sendall(message)
        self.sock.close()
