FROM ubuntu

MAINTAINER rickotoole

RUN apt-get update && \
apt-get install -y python-software-properties software-properties-common git-core python-pandas

RUN apt-get install -y python-setuptools python-dev libmysqlclient-dev build-essential gcc libffi-dev

ADD ./docker/ssh /root/.ssh/

RUN chmod 400 /root/.ssh/id_rsa && chmod 400 /root/.ssh/datacell

ADD ./docker/init/my_init.d /etc/my_init.d

ADD ./docker/init/my_init /sbin/my_init

RUN chmod 755 /sbin/my_init 

RUN mkdir /root/rockerbox-metrics && cd /root/rockerbox-metrics && git clone git@rockerbox-metrics:patrickotoole/rockerbox-metrics.git .

RUN mkdir /root/datacell  && cd /root/datacell && git clone git@datacell:rockerbox/datacell.git .

RUN easy_install pip && cd /root/rockerbox-metrics && pip install -r requirements.txt

RUN cd /root/datacell && pip install -r requirements.txt 

RUN pip install gitpython

ADD ./docker/hosts /etc/workaround-docker-2267/

ADD ./docker/container_environment.json /etc/container_environment.json

ADD ./docker/container_environment.sh /etc/container_environment.sh

RUN mkdir /etc/container_environment

RUN chmod 755 /etc/my_init.d/*

CMD /bin/bash
