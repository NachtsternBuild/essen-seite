# essen-seite
This is a small but neat project that aims to solve my problem with the confusion and complexity of the current meal plan. It's just an experiment with TypeScript, Vite, and React. Together with Pocketbase, which will serve as the database behind it all.   

## Setup Frontend
1. Installing system dependencies:
```sh
sudo apt install nodejs npm git
```
2. Get files:
```sh
git clone https://github.com/NachtsternBuild/essen-seite.git
cd ./essen-seite
```
3. Get additional dependencies:
```sh
npm install
```
4. Customize API URL:
```tsx
const pb = new PocketBase('http://SERVER_IP:8090');
```
5. Development Tests:
```sh
npm run dev
```
6. Build for Release:
```sh
npm run build
```

## Setup Backend
- **Note:** The backend operates on the basis of [Pocketbase](https://pocketbase.io/) as a database behind the code.

1. Download Pocketbase for your operating system at:
[https://pocketbase.io/docs/](https://pocketbase.io/docs/)
2. Unzip the files and place them in a folder.
3. Go to the directory and run: 
```sh
./pocketbase serve --http="0.0.0.0:8090/_/" 
``` 
to get the Superuser Interface

4. Add Admin configuration:
	- Open `http://0.0.0.0:8090/_/`  in your browser.
	- Create your admin account → Follow the Instructions in the Terminal
	- Go to Collections → New Collectionn
	- Name: meals_data
	- Type: Base Collection.
	- Add a field:
		- Name: `content`
		- Type: `JSON`
		- API Rules: Click on **Unlock and set custom rules.** Leave the fields for `List`, `View`, `Create`, `Update blank` (this allows public access) or set them according to your security needs.
5. You can copy the build result for the frontend to `pb_public` to enable direct interaction between the frontend and backend.

	**Note:** If the directory `pb_public` does not exist, simply create it.
6. Create a Systemd service so that the Pocketbase database always runs automatically:
```sh
sudo nano /etc/systemd/system/mealplanner.service
```
```ini
[Unit]
Description=PocketBase MealPlanner

[Service]
Type=simple
User=root
Group=root
LimitNOFILE=4096
WorkingDirectory=/path/to/backend
ExecStart=/path/to/backend/pocketbase serve --http="0.0.0.0:8090"
Restart=always

[Install]
WantedBy=multi-user.target
``` 
```sh
# Service aktivieren und ausführen
sudo systemctl enable mealplanner
sudo systemctl start mealplanner
```

## Something to React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

### React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

### Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
