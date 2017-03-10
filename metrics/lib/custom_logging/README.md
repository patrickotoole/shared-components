Readme and documentation for custom mesos logging
=================================================

The following files are used to write the log files from mesos applications to graylog
* rockerbox.sh
* mesos_script.py
* run_move.sh
* kafka_mesos.py
* file_to_graylog.py

Writing from Mesos Sandbox to /tmp/graylogging.log
--------------------------------------------------

Files for this reside on all servers in the location /srv/utils/mesos

Within this directory are 3 files, a C shared object, rockerbox.sh and mesos_script.py

The shared C object (libexternal_container_logger-0.1.1.so) is the compiled module based on modified version of [this github repo](https://github.com/wjoel/mesos-external-container-logger)
This repo compiles into this shared object which is then implemented as a mesos module for the mesos-slaves.

rockerbox.sh is a bash script that is specified in modified version of the above github repo. The result of this implementation is that stdout and stderr pass through this bash script. The bash script takes the standard in and write it to both the file /tmp/graylogging.log as well as the mesos stderr and stdout locations. This script also includes information about the mesos appliction. This information is stred in an evironment variable $EXEC_JSON(the name of which can be configured).

mesos_script.py is a python script that parses the json object environemnt variable containing the information regarding the mesos module. The environment variable $EXEC_JSON contains a JSON object that has information regarding the mesos applications, such as app name, execution info, etc. This object needs to be parsed, which is the purpose of this python script. The bash script rockerbox.sh executes this and passes  $EXEC_JSON as a command line arguement to this file. This script then prints the parsed result which is stored in a variable in the bash script

Moving /tmp/graylogging.log to Kafka and Graylog
------------------------------------------------

Once the file /tmp/graylogging.lo has been written it needs to be moved to graylog via kafka. Kafka is used to monitor and potentially limit the flow of log files into graylog.

run_move.sh this is bash script that is used as a marathon application and executed on all boxes. It uses tail -F to pipe the contents of /tmp/graylogging.log into file_to_graylog.py

file_to_graylog.py reads from stdin and sends each line to Kafka. It processes each message as it is read in to format it into GELF, a graylog specific format required by Graylog. It writes these messages to the application_log queue topic queue on Kafka.

kafka_mesos.py this script reads from the kafka topic application_log and sends each message to graylog via a TCP socket connection.
