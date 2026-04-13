#!/bin/sh
set -eu

cp manifest.chrome.json manifest.json
printf '%s\n' 'manifest.json is now set to the Chrome build.'
