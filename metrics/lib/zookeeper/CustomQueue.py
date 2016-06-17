import logging
import hashlib
import datetime
from kazoo.recipe.queue import Queue

class SingleQueue(Queue):

    _instance = None
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(SingleQueue, cls).__new__(
                                cls, *args, **kwargs)
        return cls._instance


class CustomQueue(SingleQueue):

    def __init__(self, client, path, secondary_path, volume):
        self.client = client
        self.path = path
        self._entries_path = path
        self.structure_paths = (self.path, )
        self.ensured_path = False
        self.secondary_path = secondary_path
        self.volume = volume

    def put(self, value, priority, _job_id=False):
        """Put an item into the queue.

            :param value: Byte string to put into the queue.
            :param priority:
            An optional priority as an integer with at most 3 digits.
            Lower values signify higher priority.
        """
        self._check_put_arguments(value, priority)
        self._ensure_paths()
        path = '{path}/{prefix}{priority:03d}-'.format(
        path=self.path, prefix=self.prefix, priority=priority)
        entry_location = self.client.create(path, value, sequence=True)
        if not _job_id:
            _job_id = hashlib.md5(value).hexdigest()
        secondary_path = '{path}-{secondary_path}/{volume}/{job_id}/{new_entry}'.format(
        path=self.path, secondary_path=self.secondary_path, volume=self.volume, job_id=_job_id, new_entry=entry_location)
        
        self.client.create(secondary_path, "", makepath=True)

    def delete(self, entry):
        if type(entry) == list:
            for entr in entry:
                current_entry = "/python_queue/{}".format(entr)
                self.client.delete(current_entry)
        else:
            self.client.delete("/python_queue/{}".format(entry))

    def get_secondary_path(self):
        secondary_path = '{path}-{secondary_path}/{volume}'.format(
        path=self.path, secondary_path=self.secondary_path, volume=self.volume)
        return secondary_path

    def get_w_name(self):
        """
        Get item data and remove an item from the queue.

        :returns: Item data or None.
        :rtype: bytes
        """
        self._ensure_paths()
        return self.client.retry(self._inner_get_w_name)

    def _inner_get_w_name(self):
        if not self._children:
            self._children = self.client.retry(
                self.client.get_children, self.path)
            self._children = sorted(self._children)
        if not self._children:
            return None
        name = self._children[0]
        try:
            data, stat = self.client.get(self.path + "/" + name)
        except NoNodeError:  # pragma: nocover
            # the first node has vanished in the meantime, try to
            # get another one
            raise ForceRetryError()
        try:
            self.client.delete(self.path + "/" + name)
        except NoNodeError:  # pragma: nocover
            # we were able to get the data but someone else has removed
            # the node in the meantime. consider the item as processed
            # by the other process
            raise ForceRetryError()
        self._children.pop(0)
        return (name, data)
