

class WorkContainers():

    def __init__(self, work_containers, zkwrapper):
        self.containers = work_containers
        self.zkwrapper = zkwrapper

    def reset_queue(self):
        import time
        time.sleep(5)
        self.zkwrapper.reset_queue()

    def populate_container(self, container):
        entry_id, data = self.zkwrapper.get()
        if data is None:
            self.reset_queue()
        else:
            container['entry_id'] = entry_id
            container['data'] = data

    def __call__(self):
        while True:
            [self.populate_container(x) for x in self.containers if x['entry_id'] is None]
