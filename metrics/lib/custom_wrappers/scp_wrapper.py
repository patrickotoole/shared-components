import paramiko
from link import Wrapper
from scp import SCPClient

class SCPWrapper(Wrapper):
    def __init__(self, wrap_name=None, host_name=None, user_name=None, 
                key_path=None, default_path="/tmp"):

        self.key = open(key_path).read()
        self.host = host_name
        self.user = user_name

        self._wrapped = self._init_ssh()

        super(SCPWrapper,self).__init__(wrap_name, self._wrapped)

    def _init_ssh(self):
        self.ssh = paramiko.SSHClient()
        self.ssh.get_host_keys().add('zk1.com', 'ssh-rsa', self.key)
        self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        return self.ssh

    def _open_ssh(self):
        self.ssh.connect(self.host, username=self.user) 
        return self.ssh

    def _init_scp(self):
        self._open_ssh()
        self.scp_client = SCPClient(self.ssh.get_transport())
        return self.scp_client

    def _close_ssh(self):
        self.ssh.close()
        
    def get(self,src=None,target=None):
        self._init_scp()
        self.scp_client.get(src,target,preserve_times=True)
        self._close_ssh()

    def run(self,cmd=''):
        self._open_ssh()
        stdin, stdout, stderr = self.ssh.exec_command(cmd)
        self._close_ssh()
        return stdin, stdout, stderr
