
def __whereor__(field,values):
    l = [field + " = %s" % value for value in values]
    where = "(%s)" % " or ".join(l)
    return where
