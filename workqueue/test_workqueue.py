import unittest
import mock
import ujson
from link import lnk 
import work_queue as workqueue
import pickle
import datetime        

def test_func(**kwargs):
    return False

def test_func_s(**kwargs):
    return True

tfone = pickle.dumps((test_func, {'connectors':{}}))
tftwo = pickle.dumps((test_func_s,{'conectors':{}}))

def overwrite_logging_pass(msg):
    assert(msg in ["job finish succesful"])

def overwrite_logging_finish(msg):
    assert(msg in ["finished item in queue"])

def overwrite_logging_failure(msg):
    expected_message = msg in ["data not inserted", "random error", "ERROR: queue cause an error ", 'None\n', "finished item in queue"] or "Exception" in msg
    #assert(msg in ["data not inserted", "random error", "ERROR: queue cause an error ", 'None\n', "finished item in queue"])
    assert expected_message

def overwrite_logging_success(msg):
    expected_message = msg in ["crusher object is valid: False"] or "finished item in queue" in msg or "starting queue" in msg
    assert expected_message

def overwrite_logging_clear(msg):
    assert(msg in ["removed old item in cache"])

def overwrite_logging_before(msg):
    expected_message = msg in ["crusher object is valid: True"] or "starting queue functionA {'connectors'" in msg
    assert expected_message

def overwrite_logging_wrapper(msg):
    expected_message = msg in ["crusher object not set to current user, setting now current user is rockerbox"]

class MockResp():
    def __init__(self):
        self.json = {"results":{"advertisers":[{"pixel_source_name":"rockerbox_advertiser"}]}}

class MockWrapper():
    def __init__(self):
        self.base_url=""
        self.user = "notrockerbox"
        self._token={"advertiser":"123142342"}
    def authenticate(self):
        return True
    def get(self,x):
        mock_resp = MockResp()
        return mock_resp
    def logout_user(self):
        return True

class MockLogHandlers():
   def __init__(self):
       self.job_id=0

class LoggingOverwrite():
   def __init__(self,func):
       self.override = func
       mock_log_handlers = MockLogHandlers()
       self.handlers = [mock_log_handlers]

   def info(self,x):
       self.override(x)

class Test(unittest.TestCase):

    def setUp(self):
        cr = mock.MagicMock()
        self.wq = workqueue.WorkQueue(True, {}, {},{},{},{"crushercache":cr},{})
        
        self.wq.mcounter = mock.MagicMock()
        self.wq.mcounter.side_effect = lambda x : True
        self.wq.timer = mock.MagicMock()        

        self.wq.log_process = mock.MagicMock()
        self.wq.log_process.side_effect = lambda x : ""
    
    def test_wq_job_run(self):
        self.wq.set_api_wrapper = mock.MagicMock()
        self.wq.set_api_wrapper.side_effect = lambda x : ""

        self.wq.logging = LoggingOverwrite(overwrite_logging_success)
        workqueue.logging.info = overwrite_logging_pass
        cr = mock.MagicMock()
        cr.execute.side_effect = lambda x,y : True
        self.wq.connectors = {"crushercache":cr}
        self.wq.run_job(tftwo, 'entry_001_1234567', "1234567")

    def test_set_wrapper(self):
        self.wq.connectors={}
        self.wq.connectors['crusher_wrapper'] = MockWrapper()
        self.wq.logging = LoggingOverwrite(overwrite_logging_wrapper)
        valid = self.wq.set_api_wrapper({"advertiser":"rockerbox_advertiser"})
        assert valid

    def test_proces_job(self):
        self.wq.run_job = mock.MagicMock()
        self.wq.run_job.side_effect = lambda x,y,z : True     
        self.wq.logging = LoggingOverwrite(overwrite_logging_finish)
        self.wq.process_job("entry_001_7654321",tfone)

    def test_process_fail(self):
        self.wq.run_job = mock.MagicMock()
        def raise_error(x,y,z):
            raise Exception("cause an error")
        self.wq.connectors['crusher_wrapper'] = MockWrapper()
        cr = mock.MagicMock()
        cr.execute.side_effect = lambda x,y : True
        self.wq.connectors['crushercache'] = cr
        self.wq.run_job.side_effect = lambda x,y,z : raise_error(x,y,z)
        self.wq.logging = LoggingOverwrite(overwrite_logging_failure)
        self.wq.process_job("entry_001_12345",tftwo)

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
        cr.execute.side_effect = lambda x,y : True
        kwargs = {"connectors":{"crushercache":cr}}
        connectors = {"crushercache":cr}
        self.wq.connectors = connectors
        self.wq.logging = LoggingOverwrite(overwrite_logging_success)
        self.wq.log_job_success("entry_001_0123","randomfunction",kwargs)

    def test_log_before_job(self):
        cr = mock.MagicMock()
        kwargs = {"connectors":{"crushercache":cr}}
        self.wq.logging = LoggingOverwrite(overwrite_logging_before)
        self.wq.log_before_job("entry_001_0123","_0123", True, "functionA", kwargs)

    def test_log_error(self):
        cr = mock.MagicMock()
        cr.execute.side_effect = lambda x,y : True
        connectors = {"crushercache":cr}
        self.wq.mcounter = mock.MagicMock()
        self.wq.connectors = connectors
        self.wq.logging = LoggingOverwrite(overwrite_logging_failure)
        self.wq.log_error(Exception("cause an error"), "entry_01234_A1", {})

    def test_validate_crusher(self):
        wrapper = MockWrapper()
        valid = workqueue.validate_crusher(wrapper,"rockerbox_advertiser")
        assert valid

if __name__ == '__main__':
    unittest.main()
