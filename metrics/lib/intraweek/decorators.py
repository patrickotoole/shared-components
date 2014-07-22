def property_checker_twoargs(func):
    def wrapper(arg1, arg2):
      try:
        return func(arg1, arg2)
      except (KeyError, IndexError):
        return -1
    return wrapper

def property_checker_threeargs(func):
    def wrapper(arg1, arg2, arg3):
      try:
        return func(arg1, arg2, arg3)
      except (KeyError, IndexError):
        return -1
    return wrapper

def property_checker_onearg(func):
    def wrapper(arg1):
      try:
        return func(arg1)
      except (KeyError, IndexError):
        return -1
    return wrapper
