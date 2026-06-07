#!/bin/bash

# Function to check if server is running
check_server() {
  local url=$1
  local name=$2

  if curl -s -f --max-time 5 "$url" > /dev/null 2>&1; then
    return 0
  else
    echo "⚠️ SKIPPED: $name server is not running at $url"
    return 1
  fi
}

rm -rf src/*.d.ts src/custapi

# Experiment Manager
echo "Checking Experiment Manager server..."
if check_server "http://experiment-manager.mapfox.hoshina.san/openapi.json" "Experiment Manager"; then
  echo "Generating types for Experiment Manager..."
  pnpm openapi-typescript http://experiment-manager.mapfox.hoshina.san/openapi.json -o src/experiment-manager.d.ts
fi

# CustAPI
echo "Checking CustAPI server..."
if check_server "http://custapi.mapfox.hoshina.san/swagger/doc.json" "CustAPI"; then
  echo "Generating client for CustAPI..."
  pnpm openapi-generator-cli generate \
    -g typescript-fetch \
    -i http://custapi.mapfox.hoshina.san/swagger/doc.json \
    -o src/custapi \
    --additional-properties=disallowAdditionalPropertiesIfNotPresent=false,supportsES6=true,useSingleRequestParameter=false \
    --enable-post-process-file \
    --remove-operation-id-prefix
fi

echo "✓ Code generation completed"
