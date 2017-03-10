import json
import sys
import os


if len(sys.argv) > 1:
    mesos_environ = str(sys.argv[1])
    mesos_data = json.loads(mesos_environ.split(',"shell"')[0]+"}}")['command']['environment']['variables']
    mesos_process_data = {"marathon_data":[{str(x['name']):str(x['value'])} for x in mesos_data]}
    for line in sys.stdin:
            mesos_process_data['short_message'] = line
            print json.dumps(mesos_process_data)
