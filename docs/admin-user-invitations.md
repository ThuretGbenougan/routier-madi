# Utilisateurs et invitations administrateur — recette

## Parcours

Tout administrateur actif peut consulter `/admin/users` et inviter un administrateur disposant des mêmes accès après activation. La liste présente tous les comptes, leur entreprise éventuelle, leur état et celui de leur invitation. La recherche porte sur le nom et l’e-mail ; le filtre porte sur le rôle ; chaque page contient au maximum 25 comptes.

« Créer un administrateur » demande le nom, l’e-mail et la langue française ou russe. Le serveur impose `ADMIN`, sans entreprise associée. Une adresse déjà utilisée est refusée, même pour un autre rôle. Les créations de prestataires restent dans `/admin/contractors`. La modification des rôles, la désactivation et la suppression ne font pas partie de ce parcours.

L’invitation dure 48 heures. Le compte reste en attente jusqu’au choix d’un mot de passe de 12 à 128 caractères ; toute connexion est refusée avant activation. Le lien est à usage unique et seule son empreinte est stockée. `/activate` redirige vers la connexion correspondant au rôle retourné par le serveur. Les liens existants `/contractor/activate` restent valides et les contrôles d’entreprise restent appliqués.

Un renvoi invalide le lien précédent, avec une minute entre envois et cinq tentatives de renvoi par heure. Les comptes activés, désactivés et les comptes entreprise ne peuvent pas recevoir d’invitation administrateur. Les responsables d’entreprise sont renvoyés vers la gestion des prestataires.

## Configuration et migration

La configuration Brevo reste celle du [guide prestataires](contractor-invitations.md). Aucune variable supplémentaire ni file QStash. Sans configuration, la liste reste accessible et les actions d’invitation sont désactivées. En cas d’échec Brevo, le compte reste enregistré en attente ; un renvoi manuel reste possible. Une réponse acceptée par Brevo ne garantit pas la réception.

Le modèle Prisma `UserInvitation` utilise `@@map("ContractorInvitation")` : aucun renommage physique ni nouvelle migration. La comparaison des schémas avant/après produit une migration vide. La migration `20260928150000_contractor_invitations` doit déjà être appliquée sur la recette avant utilisation. Ne pas exécuter le seed.

Le déploiement actuel reste la **recette**. La vérification distante de migration n’a pas pu aboutir dans cette session : la configuration locale pointe vers une adresse factice (`host`). Vérifier `prisma migrate status` avec la connexion réelle avant mise en service. Aucun déploiement ni changement de base distante n’a été effectué par cette livraison.

## Vérifications automatisées et visuelles

Résultat local : **77 tests réussis**, six parcours navigateur réussis (le parcours mobile a été rejoué après correction). Captures avec données simulées : [bureau en russe](images/admin-users-ru.png) et [mobile](images/admin-users-mobile.png).

- Tests sur PostgreSQL local jetable : création et activation concurrentes, course entre renvoi et activation, doublons entre rôles, transactions annulées, liens expirés/remplacés, comptes désactivés, refus de connexion avant activation, accès administrateur après activation, échecs Brevo et limites de renvoi.
- Tests HTTP : liste et mutations refusées aux visiteurs et entreprises ; administrateur autorisé ; origine incorrecte refusée ; rôle fourni par le client refusé.
- Recherche, filtres et pagination de 25 comptes ; aucune empreinte, aucun mot de passe ni identifiant de message Brevo exposé dans la liste.
- Tests navigateur avec API simulée : formulaires, recherche, pagination, filtre, français/russe, absence de configuration, anciennes et nouvelles pages d’activation, redirections par rôle et affichage mobile à 390 pixels.
- Suites prestataires conservées, notamment l’activation et l’éligibilité à l’attribution.
- TypeScript, ESLint et compilations web/bureau. ESLint conserve sept avertissements React préexistants, sans erreur.

Commandes : `npm test` avec `TEST_DATABASE_URL` vers une base locale jetable dont le nom finit par `_test`, `npm run test:e2e`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run desktop:build`. Le navigateur Chrome installé peut être sélectionné avec `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

## Essai réel restant en recette

Après vérification de la migration et configuration de Brevo, utiliser une adresse contrôlée et consigner la date et le résultat, sans copier le jeton dans un ticket :

1. Créer un administrateur en français, confirmer la réception et le refus de connexion avant activation.
2. Activer le compte, vérifier la redirection vers `/admin/login`, se connecter et ouvrir `/admin/users`.
3. Depuis ce compte, inviter une seconde adresse contrôlée en russe pour confirmer les mêmes droits.
4. Renvoyer une invitation après une minute et vérifier le refus de l’ancien lien.
5. Vérifier un ancien lien prestataire, puis son accès entreprise et son éligibilité à l’attribution.

Cet essai de délivrance réelle n’a pas été réalisé : les tests d’envoi simulent Brevo et aucune adresse contrôlée n’a été fournie.
