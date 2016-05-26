import sys
import os
import socket
import logging

CARBON_SERVER = 'graphite'
CARBON_PORT = 2003

#CARBON_SERVER = 'localhost'
#CARBON_PORT = 2323

class graphiteWriter:
    def __init__(self,server=CARBON_SERVER, port=CARBON_PORT):
        self.sock = socket.socket()
        try:
            self.sock.connect( (server,port) )
        except:
            print "Couldn't connect to %(server)s on port %(port)d, is carbon-agent.py running?" % { 'server':CARBON_SERVER, 'port':CARBON_PORT }
            #sys.exit(1)
        
    def send(self,metric, value):
        message = metric + " " + str(value)+"\n"
        logging.info("pushed message to graphite")
        self.sock.sendall(message)
