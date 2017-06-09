import unittest
import mock
import ujson
from link import lnk 
from work_queue import *

        

def test_func(**kwargs):
    print "case one"
    return False

def test_func_s(**kwargs):
    print "case two"
    return True

tfone = pickle.dumps((test_func, {'connectors':{}}))
tftwo = pickle.dumps((test_func_s,{'conectors':{}}))

def overwrite_logging_pass(msg):
    assert(msg in ["job finish succesful"])

def overwrite_logging_fail(msg):
    assert(msg in ["Job failed, did not complete without error"])

class WQTest(unittest.TestCase):

    def setUp(self):
        cr = mock.MagicMock()
        cr.execute.side_effect = "ex"
        self.wq = WorkQueue(True, {}, {},{},{},{"crushercache":cr},{})
        self.wq.log_before_job = mock.MagicMock()
        self.wq.log_before_job.side_effect = lambda v,w,x,y,z : ""
        self.wq.set_api_wrapper = mock.MagicMock()
        self.wq.set_api_wrapper.side_effect = lambda x : ""
        self.wq.log_job_success = mock.MagicMock()
        self.wq.log_job_success.side_effect = lambda x,y,z: ""
        self.wq.log_process = mock.MagicMock()
        self.wq.log_process.side_effect = lambda x : ""
    
    def test_wq_job_run(self):
        logging.info = overwrite_logging_pass
        self.wq.run_job(tftwo, 12345,'entry_001_12345576')
        #pass job

    def test_wq_job_fail(self):
        logging.info = overwrite_logging_fail
        self.wq.run_job(tfone, 54321,'entry_001_1234567')
        #fail job

    def test_proces_job(self):
        self.wq.logging = mock.MagicMock()
        self.wq.process_job("entry_id",tfone)
        assert True

if __name__ == '__main__':
    unittest.main()
