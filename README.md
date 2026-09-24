# Routier

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://routier-madi.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/437bc9d4-2585-46bc-be4b-1c78c1b31a42).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Client municipal Windows (Tauri)

Le navigateur public reste l'application citoyenne et entreprise. Le client
Tauri réutilise la même interface React, mais ouvre directement l'espace
municipal (`/admin/login`, ou `/admin/dashboard` lorsqu'une session admin de
démonstration existe). Il ne contient ni base locale, ni accès Prisma, ni clé
du service ML.

Configurez l'URL publique du backend centralisé dans `.env.local` :

```sh
VITE_API_URL=https://platform.example.com
```

`VITE_API_URL` est une URL publique, jamais un secret. Les identifiants de
base de données, la clé API du service ML et les autres secrets restent côté
serveur TanStack Start.

Commandes avec Bun :

```sh
bun run dev
bun run build
bun run desktop:dev
bun run desktop:build
bun run tauri dev
bun run tauri build
```

Le build Tauri utilise un bundle React statique dédié dans `desktop-dist/`, car
Tauri ne peut pas embarquer le rendu SSR du web. Son serveur de développement
utilise le port `8081`. Le build web continue d'utiliser TanStack Start et
`.output/public`. Sous Windows, les installateurs non signés sont
générés dans `src-tauri/target/release/bundle/` : dossiers `nsis/` (`.exe`) et
`msi/` (`.msi`).

Le poste de compilation doit disposer de Rust/Cargo et des outils C++ MSVC.
