import datetime
from lib.zookeeper import CustomQueue

class ZKApi():

    def __init__(self, zk, zk_path, cutoff):
        self.zk = zk
        volume = datetime.datetime.now().strftime('%m%y') 
        self.CustomQueue = CustomQueue.CustomQueue(zk,zk_path, "log", "v" + volume, cutoff)

    def get(self):
        entry_id, data = self.CustomQueue.get_w_name()
        return entry_id, data

    def write(self, work, priority, debug):
        entry_id = self.CustomQueue.put(work,priority,debug=debug)
        return entry_id

    def sets(self, job_id, entry_id):
        self.CustomQueue.client.set(self.CustomQueue.secondary_path_base + "/%s/%s" % (job_id.split(entry_id)[1][1:], entry_id), '1' )

    def finish(self, job_id, entry_id):
        self.CustomQueue.client.ensure_path(self.CustomQueue.secondary_path_base + "/%s/%s" % (job_id.split(entry_id)[1][1:],  entry_id))
        self.CustomQueue.client.set(self.CustomQueue.secondary_path_base + "/%s/%s" % (job_id.split(entry_id)[1][1:], entry_id), '' ) # running 
