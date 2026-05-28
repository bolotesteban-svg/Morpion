# Morpion ⚡ — Multijoueur en ligne

Morpion en temps réel avec règles spéciales :
- **3 coups max** : le 4e coup supprime ton premier
- **Timer 5 secondes** par coup, sinon le tour passe
- **Premier à 5 victoires** gagne le match

## Stack

- **Backend** : Node.js + Express + Socket.io
- **Frontend** : React + Vite

---

## Lancer en local

### 1. Backend
```bash
cd server
npm install
npm run dev    # démarre sur http://localhost:3001
```

### 2. Frontend
```bash
cd client
npm install
npm run dev    # démarre sur http://localhost:5173
```

---

## Déploiement gratuit

### Backend → Render.com (gratuit)

1. Push le dossier `server/` sur un repo GitHub
2. Aller sur [render.com](https://render.com) → New Web Service
3. Connecter le repo
4. Paramètres :
   - **Build Command** : `npm install`
   - **Start Command** : `node index.js`
   - **Environment** : Node
5. Récupère l'URL générée (ex: `https://morpion-server.onrender.com`)

### Frontend → Vercel (gratuit)

1. Push le dossier `client/` sur GitHub
2. Aller sur [vercel.com](https://vercel.com) → New Project
3. Connecter le repo
4. Ajouter la variable d'environnement :
   - `VITE_SERVER_URL` = `https://ton-backend.onrender.com`
5. Deploy

> ⚠️ Sur Render (free tier), le serveur "dort" après 15min d'inactivité.
> Le premier chargement peut prendre ~30s. Pour éviter ça : utiliser
> [UptimeRobot](https://uptimerobot.com) pour ping le serveur toutes les 10min.

---

## Variables d'environnement

| Variable | Côté | Valeur |
|---|---|---|
| `PORT` | Server | Automatique sur Render |
| `VITE_SERVER_URL` | Client | URL du backend Render |

---

## Structure du projet

```
morpion/
├── server/
│   ├── index.js          ← Socket.io, logique de jeu
│   └── package.json
└── client/
    ├── src/
    │   ├── App.jsx        ← Lobby, waiting, match over
    │   ├── Game.jsx       ← Plateau, timer, scores
    │   ├── socket.js      ← Singleton Socket.io
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## Règles du jeu côté serveur

Le serveur valide **tous les coups** et gère :
- La suppression automatique du plus vieux coup (>3 coups posés)
- Le timer (skip automatique après 5s)
- La détection de victoire (alignement de 3)
- Le score cumulé (premier à 5 = fin du match)
- La revanche (vote des 2 joueurs)
