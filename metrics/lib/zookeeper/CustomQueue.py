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

    def put(self, value, priority):
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
        sub_location = "v0616"
        job_id=hashlib.md5(value).hexdigest()
        new_path = "workqueue/{}/{}/{}".format(sub_location, job_id, str(entry_location.split("/")[2]))
        self.client.create(new_path, "", makepath=True)

    def delete(self, entry):
        import ipdb; ipdb.set_trace()
        if type(entry) == list:
            for entr in entry:
                current_entry = "/python_queue/{}".format(entr)
                self.client.delete(current_entry)
        else:
            self.client.delete("/python_queue/{}".format(entry))

    def get(self):
        """
        Get item data and remove an item from the queue.

        :returns: Item data or None.
        :rtype: bytes
        """
        self._ensure_paths()
        return self.client.retry(self._inner_get)

    def _inner_get(self):
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
