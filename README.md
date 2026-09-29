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
municipal (`/admin/login`, ou `/admin/dashboard` lorsqu’une session administrateur
est active). Il ne contient ni base locale, ni accès Prisma, ni clé
du service ML.

Configurez l'URL publique du backend centralisé dans `.env.local` :

```sh
VITE_API_URL=https://routier-madi.vercel.app
```

`VITE_API_URL` est une URL publique, jamais un secret. Les identifiants de
base de données, la clé API du service ML et les autres secrets restent côté
serveur TanStack Start.

Cette adresse correspond à la **recette** actuelle. Elle désigne la racine du
site, sans `/api/v1` : le client ajoute lui-même les chemins API. Le build bureau
charge les fichiers `.env` à la racine et refuse une URL absente, locale ou non
HTTPS. L’adresse est intégrée à la compilation ; la changer nécessite un nouveau
build. `PUBLIC_APP_URL` reste une variable serveur utilisée notamment pour les
liens d’invitation. Les URL `localhost` de `tauri.conf.json` servent au développement.

Le workflow GitHub Actions **Windows desktop** compile sur Windows les
installateurs x64 `.exe` et `.msi`, puis les conserve dans l’artefact
`voirie-connect-windows-x64-recette` pendant 30 jours, avec les empreintes SHA-256
et l’URL embarquée. Il peut être lancé manuellement après fusion sur `main`.
La branche `build/windows-recette` déclenche aussi le premier build à chaque push.
Voir [le guide du build Windows](docs/windows-desktop.md).

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

## Socle API sécurisé

Le backend v1 est intégré à TanStack Start. Il fournit une API HTTP commune au
web et à Tauri, sous `/api/v1`, avec réponses d’erreur normalisées, identifiants
de corrélation et contrôles d’autorisation côté serveur. Le client unique est
`src/lib/api/client.ts`; les écrans ne doivent pas appeler `fetch` directement.

Copiez `.env.example` dans `.env.local`, puis définissez les valeurs serveur :

```sh
DATABASE_URL="postgresql://..."
SESSION_SECRET="une-valeur-aleatoire-d-au-moins-32-caracteres"
DEMO_PASSWORD="mot-de-passe-de-demo"
PUBLIC_APP_URL="https://routier-madi.vercel.app"
```

Les variables `DATABASE_URL`, `SESSION_SECRET`, `ML_API_KEY` et les clés
Cloudinary sont exclusivement côté serveur. Seule `VITE_API_URL` est publique
et nécessaire au bundle Tauri.

Après configuration de Neon, créez d’abord la migration initiale en local,
puis appliquez-la et chargez les données de démonstration :

```sh
bunx prisma migrate dev --name init
bun run db:migrate:deploy
bun run db:seed
```

Le seed réinitialise les tables de démonstration : ne l’exécutez jamais sur une
base de production contenant de vraies demandes. Il exige `DEMO_PASSWORD` et
ne contient aucun mot de passe de production.

Contrôles rapides :

```sh
curl http://localhost:3000/api/health
bun run build
```

Les clients web et Tauri restent actuellement en mode démo tant que Neon n’est
pas configuré et que l’adaptateur de données UI n’a pas été basculé. Cette
précaution évite de casser le déploiement public avant la migration des données.

## Photos, analyse ML et contrôles

Le parcours utilise les envois directs signés vers Cloudinary et une file QStash gratuite pour le service ML Render Free. Voir [le guide d’exploitation](docs/ml-workflow.md) pour la configuration, les migrations, les tests et le rattrapage des photos existantes. Le seed est désormais une opération manuelle réservée à une base de démonstration.
