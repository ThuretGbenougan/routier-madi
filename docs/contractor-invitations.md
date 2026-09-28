# Invitations des prestataires — recette

Les invitations administrateur et la page commune d’activation sont décrites dans le [guide utilisateurs](admin-user-invitations.md).

## Parcours

Dans `/admin/contractors`, « Ajouter un prestataire » crée sa fiche et un compte responsable en attente. L’e-mail du responsable sert d’identifiant. Un lien valable 48 heures permet de choisir un mot de passe de 12 à 128 caractères. L’activation rend l’entreprise disponible pour l’attribution des demandes.

Les comptes déjà présents restent activés. Une entreprise existante sans compte peut être invitée depuis sa fiche. Les comptes désactivés ne sont pas réactivés par ce parcours. Il ne gère ni les collaborateurs supplémentaires, ni la récupération de mot de passe.

## Configuration Brevo

1. Dans Brevo, créer l’expéditeur avec le nom et l’adresse retenus, puis valider cette adresse.
2. Ajouter le domaine d’envoi et publier les enregistrements DNS indiqués par Brevo (code de vérification, DKIM et DMARC). Ne pas remplacer un enregistrement existant sans vérifier la configuration du domaine. Attendre la validation dans Brevo.
3. Générer une clé API transactionnelle. Ajouter les variables serveur ci-dessous dans le projet Vercel existant, puis redéployer. Ne jamais utiliser le préfixe `VITE_` pour ces secrets.

| Variable             | Valeur attendue                                                                   |
| -------------------- | --------------------------------------------------------------------------------- |
| `BREVO_API_KEY`      | Clé API Brevo, jamais une clé SMTP                                                |
| `BREVO_SENDER_EMAIL` | Adresse d’expédition validée                                                      |
| `BREVO_SENDER_NAME`  | Nom affiché, par exemple Voirie Connect                                           |
| `PUBLIC_APP_URL`     | URL HTTPS canonique de la recette, actuellement `https://routier-madi.vercel.app` |

Le déploiement nommé « Production » dans Vercel reste notre **recette**. Ne pas créer une nouvelle infrastructure. L’absence d’une variable désactive la création et les invitations, sans désactiver la connexion des comptes existants. La présence des variables ne prouve pas que la clé et l’expéditeur sont acceptés par Brevo.

Références : [envoi transactionnel](https://developers.brevo.com/docs/send-a-transactional-email), [expéditeur](https://developers.brevo.com/reference/create-sender), [domaine](https://developers.brevo.com/reference/create-domain).

## Migration et mise en service

La migration `20260928150000_contractor_invitations` ajoute l’état d’activation des utilisateurs et la table d’invitations ; les utilisateurs existants sont activés par défaut. Appliquer les migrations **avant** de servir le nouveau code. Le script `vercel-build` exécute `prisma migrate deploy` uniquement lorsque `RUN_MIGRATION=true` et `VERCEL_ENV=production`, avec `DIRECT_URL`. Vérifier ces paramètres sur la recette ; sinon exécuter `npm run db:migrate:deploy` avec les URL de cette base explicitement configurées. Ne pas lancer le seed.

Une preview utilisant la même base a également besoin de la migration avant de tester le nouveau code. Les anciennes versions tolèrent ces ajouts ; un retour à l’ancienne version après création d’invitations supprime toutefois les nouveaux contrôles d’activation et d’attribution. Préférer désactiver les invitations en retirant la configuration Brevo, sans retirer le contrôle d’activation.

## Envoi, renvoi et diagnostic

L’envoi a lieu après la transaction en base, avec un délai maximal de 10 secondes. « Invitation transmise à Brevo » signifie que l’API a accepté le message, pas qu’il est arrivé dans la boîte du destinataire. Vérifier la délivrance et les éventuels rejets dans les journaux transactionnels Brevo. Aucun webhook de délivrance n’est inclus.

Un échec ou une interruption conserve la fiche et le compte en attente. Le renvoi génère un nouveau lien et invalide l’ancien, même si le nouvel envoi échoue. Délai minimal : une minute entre invitations ; limite supplémentaire : cinq tentatives de renvoi par heure et par prestataire. Il n’y a pas de relance automatique ni de file QStash pour les e-mails dans cette version.

La base ne conserve que l’empreinte du jeton. Le lien transporte le jeton dans le fragment de l’URL, absent des requêtes HTTP de navigation ; ouvrir le lien ne l’active pas. Le serveur consomme le jeton uniquement lors du choix du mot de passe. Ne pas copier les liens d’invitation dans les journaux ou les tickets. Le diagnostic serveur `user_invitation_delivery_failed` contient seulement l’identifiant utilisateur.

## Vérification avant utilisation

- Créer un prestataire avec une adresse de test contrôlée et vérifier la réception réelle.
- Avant activation, vérifier l’absence dans la liste d’attribution et le refus de connexion.
- Activer, se connecter, attribuer une demande puis la consulter dans l’espace entreprise.
- Vérifier un renvoi et le refus de l’ancien lien ; tester le français et le russe.
- Vérifier qu’une fiche existante sans compte peut être invitée et que les comptes existants se connectent toujours.

Tests automatisés : `npm test`. Pour les tests transactionnels, `TEST_DATABASE_URL` doit pointer vers une base **locale jetable** sur `127.0.0.1`, dont le nom finit par `_test`. Les suites tronquent les données de cette base ; elles ne doivent jamais être dirigées vers Neon. Les tests Brevo simulent les réponses : ils ne remplacent pas l’essai d’envoi réel.
