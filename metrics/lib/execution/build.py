import environment


DEFAULT = "SELECT * FROM workqueue_scripts where active = 1 and deleted = 0"

def build_execution_env_from_db(db,query=DEFAULT):
    df = db.select_dataframe(query)
    assert "name" in df.columns
    assert "script" in df.columns

    js = df[df.name.map(lambda x: ".js" in x)]
    python = df[df.name.map(lambda x: ".js" not in x)]

    js_funcs = [ environment.wrap_js(row['name'], row.script) for i,row in js.iterrows()]
    py_funcs = [ environment.wrap_py(row['name'], row.script) for i,row in python.iterrows()]

    return environment.ExecutionEnvironment(js_funcs + py_funcs)


    
if __name__ == "__main__":

    import sys
    import logging
    log_object = logging.getLogger()
    log_object.setLevel(logging.INFO)
    ch = logging.StreamHandler(sys.stderr)

    from link import lnk
    env = build_execution_env_from_db(lnk.dbs.crushercache)


    logging.info("asdf")
    print env.run("anothertest",{})
    
