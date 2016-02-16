#!/bin/bash

git config --global user.email "rick@rockerbox.com"
git config --global user.name "rickotoole"

cd /root/rockerbox-metrics;
git pull --rebase git@rockerbox-metrics:patrickotoole/rockerbox-metrics.git;
pip install -r requirements.txt;

cd /root/datacell; git pull --rebase git@datacell:rockerbox/datacell.git

