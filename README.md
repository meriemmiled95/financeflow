# 💎 FinanceFlow v2.0 — Guide Complet Firebase

## Ce que tu vas avoir à la fin

Une app web PRO où chaque client :
- Se connecte avec son compte Google (1 clic)
- Retrouve ses données sur N'IMPORTE QUEL appareil
- A ses données 100% privées et sécurisées dans le cloud
- **Et toi tu ne payes RIEN** (plan gratuit Firebase)

---

## 📋 Étapes (30 minutes max)

1. Créer un projet Firebase (gratuit)
2. Activer l'authentification Google
3. Créer la base de données Firestore
4. Copier la config dans le code
5. Déployer sur Vercel
6. C'est en ligne !

---

## ÉTAPE 1 — Créer un projet Firebase

1. Va sur **https://console.firebase.google.com**
2. Connecte-toi avec ton compte Google
3. Clique **"Ajouter un projet"** (ou "Create a project")
4. Nom du projet : tape **financeflow** (ou ce que tu veux)
5. Google Analytics → désactive-le (pas besoin) → clique **"Créer le projet"**
6. Attends que le projet se crée (30 secondes)
7. Clique **"Continuer"**

Tu es maintenant dans le tableau de bord de ton projet Firebase !

---

## ÉTAPE 2 — Activer l'authentification Google

1. Dans le menu à gauche, clique **"Authentication"** (ou "Authentification")
2. Clique **"Commencer"** (ou "Get started")
3. Tu vois une liste de "Fournisseurs de connexion"
4. Clique sur **"Google"**
5. Active le bouton **"Activer"** (toggle ON)
6. Dans "Adresse e-mail d'assistance du projet" → sélectionne ton email
7. Clique **"Enregistrer"**

✅ L'authentification Google est prête !

---

## ÉTAPE 3 — Créer la base de données Firestore

1. Dans le menu à gauche, clique **"Firestore Database"**
2. Clique **"Créer une base de données"**
3. Choisis un emplacement (sélectionne **europe-west1** ou le plus proche de tes clients)
4. Choisis **"Démarrer en mode test"** (on sécurisera après)
5. Clique **"Créer"**

Attends quelques secondes... ta base de données est créée !

### Sécuriser les données (IMPORTANT)

Maintenant va dans l'onglet **"Règles"** de Firestore et remplace tout le contenu par :

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Clique **"Publier"**.

Cette règle fait que : chaque utilisateur peut UNIQUEMENT lire et écrire SES propres données. Personne ne peut accéder aux données des autres.

---

## ÉTAPE 4 — Récupérer la config Firebase

1. Dans le tableau de bord Firebase, clique sur l'icône **"</>** " (Web) en haut de la page pour ajouter une app web
2. Nom de l'application : tape **financeflow-web**
3. NE COCHE PAS "Firebase Hosting"
4. Clique **"Enregistrer l'application"**
5. Tu vas voir un bloc de code qui ressemble à ça :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB1234567890abcdefg",
  authDomain: "financeflow-12345.firebaseapp.com",
  projectId: "financeflow-12345",
  storageBucket: "financeflow-12345.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

6. **COPIE CES VALEURS** (pas le code entier, juste les valeurs entre guillemets)

7. Ouvre le fichier **`src/firebase.js`** dans ton projet et remplace les placeholders :

```javascript
const firebaseConfig = {
  apiKey: "COLLE_TA_VRAIE_VALEUR_ICI",
  authDomain: "COLLE_TA_VRAIE_VALEUR_ICI",
  projectId: "COLLE_TA_VRAIE_VALEUR_ICI",
  storageBucket: "COLLE_TA_VRAIE_VALEUR_ICI",
  messagingSenderId: "COLLE_TA_VRAIE_VALEUR_ICI",
  appId: "COLLE_TA_VRAIE_VALEUR_ICI"
};
```

8. Sauvegarde le fichier

---

## ÉTAPE 5 — Tester en local

```bash
cd financeflow-firebase
npm install
npm run dev
```

Ouvre **http://localhost:5173** dans ton navigateur.

Tu devrais voir l'écran de connexion Google. Clique dessus, connecte-toi, et teste l'app !

Si ça marche en local → passe à l'étape suivante.

---

## ÉTAPE 6 — Déployer sur Vercel (GRATUIT)

### Mettre sur GitHub

```bash
git init
git add .
git commit -m "FinanceFlow v2 avec Firebase"
git remote add origin https://github.com/TON-USERNAME/financeflow.git
git branch -M main
git push -u origin main
```

### Déployer sur Vercel

1. Va sur **https://vercel.com** → connecte-toi avec GitHub
2. Clique **"Add New Project"**
3. Sélectionne ton repo **financeflow**
4. Clique **"Deploy"**
5. Attends 1-2 minutes

### Ajouter ton domaine Vercel à Firebase

IMPORTANT : après le déploiement, tu dois autoriser ton domaine dans Firebase.

1. Retourne dans **Firebase Console** → **Authentication** → **Settings** → **Authorized domains**
2. Clique **"Add domain"**
3. Ajoute ton domaine Vercel : **financeflow-xxx.vercel.app**
4. Si tu as un domaine custom, ajoute-le aussi

Sans cette étape, le login Google ne marchera pas sur le site déployé !

---

## ✅ C'est fait !

Ton app est maintenant en ligne avec :

| Fonctionnalité | Status |
|---|---|
| Login Google | ✅ Gratuit et illimité |
| Base de données cloud | ✅ 1 GB gratuit |
| Sync multi-appareils | ✅ Automatique |
| Données privées | ✅ Chaque user voit que ses données |
| Hébergement | ✅ Gratuit sur Vercel |
| SSL/HTTPS | ✅ Automatique |

---

## 💰 Limites du plan gratuit Firebase (Spark)

| Ressource | Limite gratuite | C'est assez pour... |
|---|---|---|
| Authentification | Illimitée | ∞ utilisateurs |
| Stockage Firestore | 1 GB | ~10,000 utilisateurs actifs |
| Lectures/jour | 50,000 | ~500 utilisateurs actifs/jour |
| Écritures/jour | 20,000 | ~200 utilisateurs actifs/jour |

Tu ne commenceras à payer que quand tu auras des CENTAINES d'utilisateurs actifs par jour. Et même là, ça coûte quelques centimes.

---

## 🔧 Dépannage

### "Le popup Google ne s'ouvre pas"
→ Vérifie que les popups ne sont pas bloqués dans ton navigateur

### "Erreur auth/unauthorized-domain"
→ Tu n'as pas ajouté ton domaine Vercel dans Firebase Authentication → Settings → Authorized domains

### "Les données ne se sauvegardent pas"
→ Vérifie que tu as bien créé la base Firestore (étape 3)
→ Vérifie que les règles Firestore sont correctes

### "Error: Firebase config not found"
→ Tu n'as pas remplacé les valeurs dans src/firebase.js (étape 4)

---

## 📦 Structure du projet

```
financeflow-firebase/
├── index.html              ← Page HTML principale
├── package.json            ← Dépendances (React + Firebase)
├── vite.config.js          ← Config du bundler
├── src/
│   ├── main.jsx            ← Point d'entrée React
│   ├── firebase.js         ← 🔥 Config Firebase (À MODIFIER)
│   └── App.jsx             ← L'application complète
└── README.md               ← Ce guide
```
