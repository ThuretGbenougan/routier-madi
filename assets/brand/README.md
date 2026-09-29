# Logo Voirie Connect

Le fichier `voirie-connect.png` est le logo validé le 29 septembre 2026 : un V bleu en forme de route, sur fond transparent. Source de 1 254 × 1 254 pixels, générée avec l’outil de génération d’images intégré, puis conservée sans modification graphique.

Consigne de création : symbole original pour Voirie Connect, V formé par une route, bleu proche de `#0864AD`, géométrie simple lisible en favicon, fond transparent, sans texte, ombre ni effet 3D.

Les déclinaisons sont obtenues par redimensionnement avec la CLI Tauri déjà installée :

```sh
npm run tauri -- icon assets/brand/voirie-connect.png --output /tmp/voirie-connect-icons
npm run tauri -- icon assets/brand/voirie-connect.png --output /tmp/voirie-connect-web-icons --png 16 --png 32 --png 128 --png 180
```

- `public/brand/voirie-connect.png` : version de 128 pixels utilisée dans les en-têtes.
- `public/favicon.ico`, `public/favicon-16.png`, `public/favicon-32.png` : icônes du navigateur.
- `public/apple-touch-icon.png` : icône de 180 pixels pour les raccourcis.
- `src-tauri/icons/` : formats PNG, ICO et ICNS pour l’application bureau. Copier uniquement les fichiers de premier niveau générés par Tauri ; les variantes mobiles ne sont pas utilisées.

Le favicon ICO porte une version dans son URL afin de renouveler le cache de l’ancien logo. La version bureau partage le dossier `public` du web.
