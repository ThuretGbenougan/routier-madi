# Exploitation des photos et du ML

## Architecture et limites

Les clients demandent une réservation, envoient directement le fichier à Cloudinary, puis confirment son enregistrement. Le serveur vérifie la ressource attendue et son contenu. La confirmation crée atomiquement la photo, l’analyse et son événement de publication. Une panne de QStash laisse cet événement récupérable.

Seules les photos citoyennes des demandes `POTHOLE` sont analysées. La file `routier-ml` travaille en série. Le serveur attend Render jusqu’à 120 secondes ; trois reprises sont prévues après la première tentative. La maintenance signée fonctionne toutes les quinze minutes. Les résultats sont une aide à la décision municipale, jamais une validation automatique.

Le service Render Free peut se mettre en veille. Aucun maintien artificiel en activité n’est installé. Le budget applicatif réserve au maximum 180 publications par jour UTC, y compris les republications et les relances ; les reprises de livraison et la maintenance consomment aussi le quota QStash. Surveiller également les quotas Vercel, Neon et Cloudinary : une offre gratuite n’est pas une garantie de capacité. Une saturation reporte les analyses, sans bascule automatique vers une offre payante.

## Configuration

Créer un compte **QStash Free**, puis renseigner les variables **serveur** de l’environnement cible :

- `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` : configuration existante.
- `PUBLIC_APP_URL` : origine canonique HTTPS de l’application, sans sous-chemin.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` : configuration existante.
- `CLOUDINARY_UPLOAD_PRESET` : nom dédié, par exemple `routier_signed_photos`.
- `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`.
- `ML_API_URL` : URL Render sans `/detect` ; `ML_API_KEY` doit correspondre à `API_KEY` côté Render.
- `ML_ENABLED=false` pendant la préparation, puis `true` après recette.

Le navigateur reçoit uniquement une signature d’envoi, l’identifiant public Cloudinary et sa clé API publique. Le secret Cloudinary et la clé ML restent côté serveur. Ne pas mettre les secrets dans des variables `VITE_*`.

Depuis une configuration locale sécurisée de l’environnement cible :

```sh
bun run integrations:setup
bun run integrations:setup --apply
```

La première commande affiche le périmètre sans modifier les services. La seconde configure le preset signé (8 Mio, formats autorisés, sans écrasement), la file série et la maintenance. Elle crée ou actualise les ressources ; elle n’achète aucun abonnement. Vérifier dans QStash que les destinations pointent vers le bon environnement. Ne jamais partager la même file, base ou configuration de stockage entre recette et exploitation.

Les routes internes vérifient la signature QStash et ne doivent pas être protégées par un écran de connexion Vercel inaccessible à QStash. La configuration Nitro produit une Function avec `maxDuration: 180` ; vérifier `.vercel/output/functions/__server.func/.vc-config.json` après compilation.

## Livraison et retour arrière

1. Travailler sur `feat/ml-workflow-finalization` dans chaque dépôt et ouvrir deux demandes de fusion liées vers `main`.
2. Déployer d’abord le contrat ML enrichi et rétrocompatible.
3. Sauvegarder la base cible, appliquer les migrations avec `bun run db:migrate:deploy`, puis déployer l’application avec `ML_ENABLED=false`.
4. Configurer les intégrations, vérifier un envoi signé et les droits, puis activer le traitement.
5. Effectuer la recette réelle décrite ci-dessous avant de distribuer le nouveau client Tauri.

En cas d’incident, désactiver `ML_ENABLED` : les signalements et les photos restent utilisables, les analyses restent récupérables. Ne pas revenir à un ancien backend après création de plusieurs contrôles par demande : l’ancien modèle supposait un contrôle unique. Privilégier un correctif compatible avec le nouveau schéma plutôt qu’une migration descendante destructive.

## Anciennes photos et données de démonstration

```sh
bun run ml:backfill
bun run ml:backfill --apply
```

L’aperçu annonce les photos réelles éligibles. L’application crée uniquement les analyses et événements manquants ; la maintenance les publie ensuite. Les photos de démonstration et les catégories non prises en charge passent à `SKIPPED`. Les relances manuelles sont réservées aux analyses échouées.

Le seed ne fait plus partie du build. Il supprime les données des tables du projet : le réserver à une base dédiée de démonstration avec `ALLOW_DEMO_SEED=true`, `SEED_CONFIRM=RESET_DEMO_DATABASE` et `DEMO_PASSWORD`. Il refuse les déploiements Vercel de production. Ne jamais l’exécuter sur la base exploitée.

## Vérifications

```sh
bun run prisma:generate
bun run typecheck
bun run test
bun run build
bun run desktop:build
bun run test:e2e
```

Les tests d’intégration nécessitent `TEST_DATABASE_URL` vers une base PostgreSQL **locale**, dédiée et dont le nom se termine par `_test`. Ils réinitialisent cette base. Appliquer les migrations à cette base avant les tests ; ne jamais utiliser une URL distante.

Les tests navigateur utilisent l’interface réelle et des réponses API simulées ; ils ne remplacent pas la recette des services déployés. Vérifier une photo de 8 Mio, une image corrompue, une mauvaise clé ML, Render endormi, un envoi répété, un accès par une autre entreprise, puis le parcours complet jusqu’à une reprise et une clôture conforme. Tester le client Windows sur Windows avec Rust/MSVC disponibles.

Surveiller `/admin/analyses` et les événements `ml_publish_deferred`, `ml_failed`, `ml_succeeded`. Les identifiants de demande/photo/analyse permettent la corrélation ; ne pas journaliser les jetons citoyens ou les secrets.
