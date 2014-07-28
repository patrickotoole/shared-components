import copy

class Buffer(object):

    def __init__(self,buf):
        self._buffer = buf

    def __delitem__(self, key):
        self._buffer.__delattr__(key)

    def __getitem__(self, key):
        return self._buffer.__getattribute__(key)

    def __setitem__(self, key, value):
        self._buffer.__setattr__(key, value)

    def __len__(self):
        return len(self._buffer)

    @property
    def buffer(self):
        return self._buffer

    def append(self,value):
        self._buffer.append(value)
        return self._buffer

    def clear(self):
        self._buffer[:] = []
        return self._buffer

    def copy(self):
        return copy.copy(self._buffer)

    def clear_and_copy(self):
        _copy = self.copy()
        self.clear()
        return _copy



