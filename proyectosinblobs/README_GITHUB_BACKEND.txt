# Turnos compartidos (Netlify + GitHub Storage)

1) Sube estos archivos a un repo de GitHub (raíz):
- index.html
- netlify.toml
- package.json
- netlify/functions/semana.mjs

2) En Netlify → Import from Git (elige tu repo)
   Build command: (vacío) · Publish directory: .

3) Variables en Netlify (Site settings → Environment variables):
   GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH=main, DATA_DIR=data

4) Deploy y prueba. Los JSON de cada semana se guardan en /data/AAAA-MM-DD.json del repo.
