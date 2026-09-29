# Build Windows — recette

Le client embarque l’interface et contacte `https://routier-madi.vercel.app` pour
l’authentification et les données. Il nécessite une connexion Internet. L’URL
de l’API est publique ; aucun secret de base de données, Brevo, Cloudinary ou ML
n’est nécessaire à sa compilation. Le serveur accepte déjà les origines Tauri
Windows `http://tauri.localhost` et `https://tauri.localhost`.

## Générer et récupérer les installateurs

1. Ouvrir **Actions → Windows desktop** dans GitHub.
2. Après fusion du workflow, cliquer sur **Run workflow** et sélectionner `main`.
3. Télécharger l’artefact `voirie-connect-windows-x64-recette` du run réussi.
4. Extraire l’archive. Utiliser le fichier `.exe` pour l’installation habituelle,
   ou le `.msi` pour un déploiement géré. Ne pas installer les deux.

L’archive comprend `SHA256SUMS.txt` et `build-info.json` : version du code, URL,
architecture et environnement. Les installateurs ne sont pas signés ; Windows
peut afficher un avertissement d’éditeur inconnu. La signature nécessitera un
certificat ou un service de signature, absent de cette configuration.

Le workflow ne publie pas de release et ne modifie pas le déploiement web.

## URL et configuration

- `VITE_API_URL` est fixée explicitement dans le workflow, sans chemin `/api/v1`.
- En local, définir cette valeur dans `.env.local` à la racine du dépôt.
- `PUBLIC_APP_URL` reste configurée sur le serveur pour les liens d’activation.
- `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` et les clés des services restent
  exclusivement côté serveur. Ne pas les ajouter au workflow Windows.
- La variable GitHub facultative `VITE_YANDEX_MAPS_API_KEY` concerne le sélecteur
  cartographique du formulaire citoyen, pas la carte intégrée des demandes
  administrateur. Sans cette clé, la saisie manuelle de position reste disponible.
  La clé publique et ses restrictions doivent être adaptées avant d’utiliser ce
  sélecteur dans un client bureau.

La connexion Tauri utilise un jeton conservé en mémoire. Fermer l’application
nécessite donc de se reconnecter à la prochaine ouverture.

## Recette sur un poste Windows

- Installer, ouvrir et vérifier le logo et l’arrivée sur la connexion administrateur.
- Se connecter avec un compte administrateur actif de recette.
- Ouvrir la liste des demandes, le détail, les photos et la carte.
- Vérifier une action sur une demande de test, puis sa présence dans le navigateur.
- Fermer et rouvrir : vérifier la demande de reconnexion.
- Vérifier le comportement hors connexion, puis après rétablissement du réseau.

Le succès de la compilation ne remplace pas cette vérification dans WebView2 sur
un poste Windows. Le runtime WebView2 peut être téléchargé par l’installateur
s’il manque.
