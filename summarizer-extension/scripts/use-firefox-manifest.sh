#!/bin/sh
set -eu

cp manifest.firefox.json manifest.json
printf '%s\n' 'manifest.json is now set to the Firefox build.'
