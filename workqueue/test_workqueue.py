import unittest
import mock
import ujson
from link import lnk 
import work_queue as workqueue
import pickle
import datetime        

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

def overwrite_logging_finish(msg):
    assert(msg in ["finished item in queue"])

def overwrite_logging_failure(msg):
    assert(msg in ["data not inserted", "random error", "ERROR: queue random error"])

def overwrite_logging_clear(msg):
    assert(msg in ["removed old item in cache"])

#class MockRespValidate():
#    def __init__(self):
#        self.json = {"results":{"advertisers":[{"pixel_source_name":"rockerbox_advertiser"}]}}

#class MockWrapper():
#    def get(self,x):
#        mock_resp = MockRespValidate()
#        return mock_resp


class WQTest(unittest.TestCase):

    def setUp(self):
        cr = mock.MagicMock()
        cr.execute.side_effect = "ex"
        self.wq = workqueue.WorkQueue(True, {}, {},{},{},{"crushercache":cr},{})
        self.wq.log_before_job = mock.MagicMock()
        self.wq.log_before_job.side_effect = lambda v,w,x,y,z : ""
        self.wq.set_api_wrapper = mock.MagicMock()
        self.wq.set_api_wrapper.side_effect = lambda x : ""
        self.wq.log_job_success = mock.MagicMock()
        self.wq.log_job_success.side_effect = lambda x,y,z: ""
        self.wq.log_process = mock.MagicMock()
        self.wq.log_process.side_effect = lambda x : ""
    
    def test_wq_job_run(self):
        workqueue.logging.info = overwrite_logging_pass
        self.wq.run_job(tftwo, 12345,'entry_001_12345576')
        #pass job

    def test_wq_job_fail(self):
        workqueue.logging.info = overwrite_logging_fail
        self.wq.run_job(tfone, 54321,'entry_001_1234567')
        #fail job

    def test_proces_job(self):
        class MockLogHandlers():
            def __init__(self):
                self.job_id=0
        class LoggingOverwrite():
            def __init__(self):
                mock_log_handlers = MockLogHandlers()
                self.handlers = [mock_log_handlers]
            def info(self,x):
                overwrite_logging_finish(x)
        self.wq.run_job = mock.MagicMock()
        self.wq.run_job.side_effect = lambda x,y,z : True     
        self.wq.logging = LoggingOverwrite()
        workqueue.logging.info = overwrite_logging_finish
        self.wq.process_job("entry_id",tfone)

    def test_remove_oldjob(self):
        cr = mock.MagicMock()
        cr.select_dataframe.side_effect = lambda x: {"count(*)":[31], "date":[datetime.datetime.now()]}
        kwargs = {"connectors":{"crushercache":cr}}
        kwargs['advertiser'] = "fakeadvertiser"
        kwargs['filter_id'] = 0
        kwargs['pattern'] = "/"
        kwargs['func_name'] = "domains_full_time_minute"
        workqueue.logging.info = overwrite_logging_clear
        workqueue.clear_old_cache(**kwargs)

    def test_crusher_object(self):
        cr_obj = mock.MagicMock()
        cr_obj.authenticate.side_effect = lambda : True 
        crusher_obj = workqueue.get_crusher_obj("fakeadvertiser", "http://rockerbox.com",cr_obj)
        assert crusher_obj

    def test_log_job_success(self):
        cr = mock.MagicMock()
        kwargs = {"connectors":{"crushercache":cr}}
        self.wq.mcounter = mock.MagicMock()
        self.wq.log_job_success(0123,"functionA",kwargs)

    def test_log_before_job(self):
        cr = mock.MagicMock()
        kwargs = {"connectors":{"crushercache":cr}}
        self.wq.log_before_job(0123,"ebtry_0123", True, "functionA", kwargs)

    def test_log_error(self):
        class LoggingOverwrite():
            def info(self,x):
                overwrite_logging_failure(x)
        cr = mock.MagicMock()
        cr.execute.side_effect = lambda x,y : True
        kwargs = {"connectors":{"crushercache":cr}}
        self.wq.mcounter = mock.MagicMock()
        self.wq.logging = LoggingOverwrite()
        self.wq.log_error(Exception("random error"), 01234, {})


    def test_validate_crusher(self):
        class MockResp():
            def __init__(self):
                self.json = {"results":{"advertisers":[{"pixel_source_name":"rockerbox_advertiser"}]}}
        class MockWrapper():
            def get(self,x):
                mock_resp = MockResp()
                return mock_resp
        wrapper = MockWrapper()
        valid = workqueue.validate_crusher(wrapper,"rockerbox_advertiser")
        assert valid

if __name__ == '__main__':
    unittest.main()
