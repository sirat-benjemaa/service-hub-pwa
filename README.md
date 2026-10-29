# ServiceHub — Mode hors ligne

Base Next.js 16 / React 19 / TypeScript / Tailwind 4 pour le projet Modern Mobile Application.

## Lancer la démonstration

```bash
npm install
npm run build
npm run start
```

Ouvrir http://localhost:3000. Le service worker est volontairement activé uniquement en production, pas avec `npm run dev`.

## Scénario pour la validation notée

1. Ouvrir l’accueil avec une connexion réseau.
2. Dans Application → Service Workers, attendre que `/sw.js` soit activé et contrôle la page. Aucun bandeau n’est affiché lorsque la connexion est disponible.
3. Dans Chrome/Edge, ouvrir les outils développeur → Network → choisir **Offline**. Ne pas activer « Bypass for network » dans Application → Service Workers.
4. Recharger la page : les trois services restent visibles et le bandeau indique **Vous êtes hors ligne**. Le cache HTTP peut être désactivé pour prouver que le service worker répond.
5. Aller directement à `/page-non-visitee` : la page de secours explique que cette page est indisponible. Revenir au catalogue avec son lien.
6. Rétablir **No throttling / Online** : le bandeau hors ligne disparaît sans rechargement.
7. Dans Application → Cache Storage, examiner le cache `servicehub-offline-v3`. Dans Manifest, examiner les informations d’installation.

## Interface mobile first et responsive

La mise en page de base cible le téléphone, puis s’élargit avec les media queries :

| Largeur CSS | Catalogue | Adaptations |
| --- | --- | --- |
| Moins de 640 px | 1 colonne | Marges compactes, bouton principal pleine largeur, textes adaptés |
| De 640 à 1023 px | 2 colonnes | Espacements élargis, bouton à largeur naturelle |
| À partir de 1024 px | 3 colonnes | Contenu centré, largeur maximale et marges confortables |

Les liens de navigation et boutons ont une zone tactile d’au moins 44 px. Le viewport suit la largeur de l’appareil et conserve le zoom. Les marges prennent en compte les zones de sécurité des écrans à encoche. Le bandeau hors ligne et la page de secours s’adaptent aussi au mobile.

Pour la démonstration, ouvrir F12 → activer la barre d’outils des appareils (Ctrl+Maj+M), puis comparer 320, 390, 768, 1024 et 1440 px. Vérifier le nombre de colonnes, la lisibilité, l’absence de défilement horizontal et le bouton « Découvrir les services ». Essayer également le mode paysage et le mode Offline sur un petit écran.

L’installation sur l’écran d’accueil dépend du navigateur. En déploiement, utiliser HTTPS. `localhost` fonctionne pour les tests ; une adresse IP locale en HTTP sur téléphone ne suffit pas.

## Fonctionnement

- `app/manifest.ts` : nom, icônes PNG 192/512, couleurs et affichage standalone.
- `app/offline-status.tsx` : inscription du worker et état réseau accessible.
- `public/sw.js` : un seul service worker, précache de l’accueil et de ses ressources ; réseau d’abord pour les navigations, accueil sauvegardé ou page de secours en cas d’échec.
- `public/offline.html` : secours autonome, sans dépendance au réseau.
- Polices système : aucune police externe nécessaire hors ligne.

Le catalogue contient des données fictives. Cette livraison démontre la consultation hors ligne ; elle n’implémente pas encore l’authentification, les réservations, la synchronisation de mutations ou les autres modules du cahier des charges.

Seuls l’accueil public et les ressources autorisées sont sauvegardés. Les API, les profils privés, les requêtes RSC et les mutations sont exclus. Les données hors ligne sont signalées comme potentiellement anciennes. Le navigateur peut supprimer ses données de stockage ; une première visite connectée reste nécessaire.

## Mises à jour

Lors d’une livraison modifiant l’accueil ou ses ressources, incrémenter `CACHE` dans `public/sw.js` (par exemple `servicehub-offline-v4`). Le nouveau worker prépare son cache avant activation, puis supprime uniquement les anciens caches ServiceHub. L’accueil et ses ressources restent ainsi associés à une même version.

## Test navigateur automatisé

Le test utilise un navigateur Chromium réel, un profil temporaire et le protocole DevTools, sans dépendance supplémentaire.

```bash
npm run build
npm run start -- --port 3100
```

Dans un autre terminal :

```bash
node tests/offline-browser.mjs
```

Le chemin par défaut correspond à Edge sur Windows. Pour un autre navigateur, définir `BROWSER_PATH` ; `TEST_ORIGIN` permet de changer l’URL (défaut : `http://localhost:3100`). Le port 9229 doit être libre.

Le test vérifie l’installation, les mises en page de 320 à 1440 px, l’absence de débordement horizontal, les zones tactiles, le texte agrandi à 200 %, le rechargement hors ligne avec cache HTTP désactivé, la conservation du catalogue et de l’interactivité, la page de secours, le retour réseau et les ressources mises en cache. Définir `TEST_SCREENSHOTS=1` pour enregistrer les aperçus 390 et 1440 px dans `.next/responsive-preview/`.
