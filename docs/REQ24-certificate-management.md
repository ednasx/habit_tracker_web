# REQ24 – Certificate management (Let’s Encrypt + cert-manager)

## Overview
TLS certificates are issued and automatically renewed using **cert-manager** with **Let’s Encrypt** (ACME). The Ingress references a TLS secret managed by cert-manager.

## ClusterIssuer
A ClusterIssuer defines how certificates are requested from Let’s Encrypt.

Example:
- Kind: `ClusterIssuer`
- ACME server: `https://acme-v02.api.letsencrypt.org/directory`
- Solver: `http01` via Nginx Ingress class

The `email` field should be a real monitored email address (team/shared inbox preferred) because Let’s Encrypt sends expiration/problem notices there.

## Ingress integration
Ingress annotations connect cert-manager and the issuer:
- `cert-manager.io/cluster-issuer: letsencrypt-prod`

Ingress TLS section:
- `hosts: habit-tracker.ltu-m7011e-8.se`
- `secretName: habit-tls`

cert-manager will:
1. Create an ACME HTTP-01 challenge
2. Prove domain ownership through the Ingress route
3. Store the issued cert in the Kubernetes secret (`habit-tls`)
4. Renew automatically before expiry

## Operational notes
- Ensure DNS for the host points to the cluster ingress controller
- Ensure cert-manager is installed in the cluster
- Check status:
  - `kubectl get certificate -n <namespace>`
  - `kubectl describe certificate <name> -n <namespace>`
  - `kubectl get challenge,order -A`
