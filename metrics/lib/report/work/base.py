import logging

class BaseWorker(object):
    def work(self, **kwargs):
        success = self.do_work(**kwargs)
        if success:
            logging.info("job_finished")
            return
        logging.exception("job_error encountered")

    def do_work(self, **kwargs):
        raise NotImplementedError
