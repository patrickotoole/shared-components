import unittest, paramiko, os
from scp_wrapper import SCPWrapper
class TestSCPWrapper(unittest.TestCase):

    def setUp(self):
        self.key_path = "/root/.ssh/id_rsa.pub"
        self.cwd = os.getcwd()
        open(self.cwd + "/test.txt", 'a').close()

    def tearDown(self):
        os.remove(self.cwd + "/test.txt")

    def test_init(self):
        scp = SCPWrapper(key_path=self.key_path)
        self.assertEqual(type(scp._wrapped), paramiko.SSHClient)

    def test_get(self):
        scp = SCPWrapper(host_name='localhost',user_name='root',key_path=self.key_path)
        scp.get(self.cwd + "/test.txt",self.cwd + "/test2.txt")
        self.assertTrue(os.path.exists(self.cwd + "/test2.txt"))
        os.remove(self.cwd + "/test2.txt")

    def test_run(self):
        scp = SCPWrapper(host_name='localhost',user_name='root',key_path=self.key_path)
        scp.run()

if __name__ == '__main__':
    import nose
    nose.runmodule(argv=[__file__,'-vvs','-x'], exit=False)
