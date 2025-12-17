# Certificate Management (HTTPS / TLS) — cert-manager + Let’s Encrypt (REQ24)

This project terminates HTTPS at the Kubernetes Ingress layer using **cert-manager** and **Let’s Encrypt**.

---

## Architecture Overview

- **Ingress host:** `habit-tracker.ltu-m7011e-8.se`
- **Ingress TLS secret:** `habit-tls`
- **Issuer:** `ClusterIssuer/letsencrypt-prod`
- **ACME challenge type:** HTTP-01 (via Nginx ingress controller)

Traffic flow:

1. Client connects to `https://habit-tracker.ltu-m7011e-8.se`
2. Nginx Ingress terminates TLS using the certificate stored in `habit-tls`
3. Ingress routes traffic to services by path:
   - `/api/habits` → `habit-service:4000`
   - `/api/leaderboard` → `habit-service:4000`
   - `/api/users` → `user-service:4001`
   - `/grafana` → `habit-tracker-grafana:3000`
   - `/` → `habit-frontend:80`

---

## Configuration Files

### 1) ClusterIssuer

File: `infra/k8s/cluster-issuer.yaml`

- Creates a cluster-wide issuer named `letsencrypt-prod`
- Uses the Let’s Encrypt production endpoint
- Uses HTTP-01 validation through Nginx ingress

Important:
- The `spec.acme.email` field must be set to a real email address to receive expiry/issuance notifications.

### 2) Ingress

File: `infra/k8s/helm/habit-tracker/templates/ingress.yaml`

Key points:
- Annotated with:

`cert-manager.io/cluster-issuer: letsencrypt-prod`

- Specifies TLS:
  - hosts: `habit-tracker.ltu-m7011e-8.se`
  - secretName: `habit-tls`

Recommendation:
- Ensure the Ingress uses the Nginx ingress class (`ingressClassName: nginx`) so it matches the ClusterIssuer solver configuration.

---

## How certificate issuance works

1. When the Ingress is applied, cert-manager sees the annotation and creates a `Certificate` resource for the host.
2. cert-manager creates an ACME `Order` and `Challenge` against Let’s Encrypt.
3. Let’s Encrypt validates domain ownership by requesting a temporary HTTP endpoint served by the Ingress controller (HTTP-01).
4. On success, cert-manager stores the issued certificate and private key in the TLS secret (`habit-tls`).
5. The Ingress controller reloads and starts serving HTTPS using that secret.

---

## Renewal

Let’s Encrypt certificates are short-lived (typically ~90 days).
cert-manager automatically renews certificates before they expire.

No manual renewal steps are required, as long as:
- the domain still resolves to the cluster ingress,
- the HTTP-01 challenge path can be served,
- cert-manager and the ingress controller are healthy.

---

## Debugging / Verification

### Verify resources
```bash
kubectl get clusterissuer
kubectl get certificate -A
kubectl get certificaterequest -A
kubectl get order -A
kubectl get challenge -A
```

## Inspect cert-manager logs
```bash
kubectl -n cert-manager logs deploy/cert-manager
```

## Check the TLS secret exists
```bash
kubectl -n <namespace> get secret habit-tls
```

