#!/bin/bash
set -ex
# pip install virtualenv
virtualenv venv
. venv/bin/activate
pip install -r requirements.txt
