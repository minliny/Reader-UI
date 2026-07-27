#!/bin/zsh
# One operator action for a completed Figma writer batch.
# The token stays only in this shell process and is never passed as an argument
# or written to disk.

if [[ -z "${FIGMA_READ_TOKEN:-}" ]]; then
  read -rs "FIGMA_READ_TOKEN?Figma read token: "
  echo
fi

if [[ -z "${FIGMA_READ_TOKEN:-}" ]]; then
  print -u2 'FIGMA_READ_TOKEN is required; no network request was made.'
  exit 1
fi

export FIGMA_READ_TOKEN
node tools/design/fetch-figma-current-revision.mjs --finalize-reading-chain
status=$?
unset FIGMA_READ_TOKEN
exit $status
