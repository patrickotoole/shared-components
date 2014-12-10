import tornado.ioloop 
import time
import logging


MAX_WAIT_SECONDS_BEFORE_SHUTDOWN = 1 

def sig_wrap(reactor,server):

    def sig_handler(sig, frame):
        logging.warning('Caught signal: %s', sig)
        tornado.ioloop.IOLoop.instance().add_callback_from_signal(shutdown_wrap(reactor,server))

    return sig_handler

def shutdown_wrap(reactor,server):

    def shutdown():
        logging.info('Stopping http server')
        try:
            reactor.stop()
        except:
            pass
        server.stop()

        logging.info('Will shutdown in %s seconds ...', MAX_WAIT_SECONDS_BEFORE_SHUTDOWN)
        io_loop = tornado.ioloop.IOLoop.instance()

        deadline = time.time() + MAX_WAIT_SECONDS_BEFORE_SHUTDOWN

        def stop_loop():
            now = time.time()
            if now < deadline and (io_loop._callbacks or io_loop._timeouts):
                io_loop.add_timeout(now + 1, stop_loop)
            else:
                io_loop.stop()
                logging.info('Shutdown')
        stop_loop()
     
    return shutdown
