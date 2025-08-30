#!/bin/sh
set -eu

AUTO_SEED_ON_START=${AUTO_SEED_ON_START:-true}
RPC_URL=${FORK_RPC_URL:-${SEPOLIA_RPC_URL:-http://fork:8545}}

if [ "$AUTO_SEED_ON_START" != "false" ]; then
  echo "[entrypoint] Waiting for fork RPC at $RPC_URL ..."
  i=0
  until [ $i -ge 60 ]
  do
    if node -e "(async()=>{try{const res=await fetch(process.env.RPC_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]})}); if(res.ok){process.exit(0)} else {process.exit(1)}}catch(e){process.exit(1)}})()" >/dev/null 2>&1; then
      echo "[entrypoint] Fork RPC ready."
      break
    fi
    i=$((i+1))
    sleep 1
  done

  echo "[entrypoint] Running seed script..."
  if ! node dist/scripts/seed.js; then
    echo "[entrypoint] Seed failed, continuing startup."
  fi
fi

exec node dist/index.js


