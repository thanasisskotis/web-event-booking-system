#!/usr/bin/env bash
# Generates a self-signed TLS certificate for local development/demo.
# The spec requires all client-server traffic over SSL/TLS; for a local
# demo a self-signed cert is sufficient (in production, TLS is normally
# terminated at a reverse proxy such as Nginx — see README).
set -euo pipefail

CERT_DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"
mkdir -p "$CERT_DIR"

openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -days 365 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Self-signed certificate written to $CERT_DIR/{cert.pem,key.pem}"
