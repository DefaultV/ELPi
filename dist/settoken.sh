#!/bin/bash
echo "Enter your youtube API token"

read token

sed -i "s/APITOKEN/${token}/g" client.min.js
sed -i "s/APITOKEN/${token}/g" client.js
