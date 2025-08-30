#!/bin/sh
set -eu

# Let the Node script handle DB provider, optional forking, seeding, and server start
exec node dist/scripts/start.js


