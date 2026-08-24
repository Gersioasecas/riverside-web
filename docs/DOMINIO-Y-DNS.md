# El dominio y el correo — lo que NO se puede romper

## Estado antes de la mudanza (medido el 2026-08-24)

| Registro | Valor | ¿Se toca? |
|---|---|---|
| **NS** | `ns1/ns2/ns3.wordpress.com` | ❌ **NO** — se quedan |
| **A** (apex) | `192.0.78.180`, `192.0.78.232` | ✅ se sustituyen |
| **CNAME** `www` | → apex | ✅ se sustituye |
| **MX** | `10 mx1.titan.email`, `20 mx2.titan.email` | ❌ **NO** |
| **TXT** SPF | `v=spf1 include:_spf.wpcloud.com include:_spf.google.com include:spf.titan.email ~all` | ❌ **NO** |
| **TXT** DMARC (`_dmarc`) | `v=DMARC1;p=none;` | ❌ **NO** |
| **TXT** Google | `google-site-verification=rXOxyZounnZasA8Z7oaD3c14JdjS9aKSWvsR1EbUSIQ` | ❌ **NO** |

> ⚠️ **`reservaciones@riversidechachalacas.com.mx` vive en Titan Email.** Si se migran los
> nameservers a otro proveedor (Cloudflare, por ejemplo, como se hizo en SOLMIL), el correo
> deja de llegar hasta que se recreen los MX allá. Por eso aquí **NO se migran**: se cambian
> solo los registros A, dentro de la misma zona de WordPress.com.

## El cambio, exactamente

**Quitar** los dos registros A del apex (están marcados como protegidos: hay que mandar
`protected_field: true` al quitarlos).

**Poner** los cuatro A de GitHub Pages en el apex:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Y el `www` como CNAME a `<usuario>.github.io`.

Se hace con el MCP de WordPress.com:
`wpcom-domain-update-dns-records` sobre `riversidechachalacas.com.mx`.

## Rollback

Volver a poner los dos A originales (`192.0.78.180`, `192.0.78.232`) y quitar los cuatro de
GitHub. El sitio de WordPress sigue existiendo: **no se borra hasta que el nuevo esté
verificado en vivo**.

## Orden de operaciones

1. Repo en GitHub + Pages activado por la acción → el sitio vive en `<usuario>.github.io/<repo>`.
2. Verificar ahí que todo carga.
3. Añadir el dominio en Settings ▸ Pages de GitHub (el `CNAME` del repo ya lo declara).
4. **Recién entonces** cambiar los A.
5. Esperar el certificado (GitHub lo emite solo; suele tardar entre minutos y una hora).
6. Activar «Enforce HTTPS».
7. Probar que llega un correo a `reservaciones@`.
