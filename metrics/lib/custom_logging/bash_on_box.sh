#!/bin/bash
increment=1

while read line ; do
    mesos_file=$(echo $line | python /srv/utils/mesos/mesos_script.py $EXEC_JSON)
    echo $mesos_file >> /tmp/graylogging.log
    locationfile=$(echo "$STREAM" | tr '[:upper:]' '[:lower:]')
    echo $line >> $SANDBOX_DIRECTORY/$locationfile

    file_size=`du -b $SANDBOX_DIRECTORY/$locationfile | tr -s '\t' ' ' | cut -d' ' -f1`
    if [file_size -gt 64000];then
        mv $SANDBOX_DIRECTORY/$locationfile $SANDBOX_DIRECTORY/$locationfile.$increment 
        increment="$(($increment + 1))"
    fi
done
