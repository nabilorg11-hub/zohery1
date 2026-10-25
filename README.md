# Zohery Tours

27 independent menu pages. Original menu-specific information is stored in data/menu-content.json; repeated cross-promotions are excluded. Theme palette: #0e1324 background, #181f35 panels, #a0aeff accents.

Run `npm start` to preview at http://127.0.0.1:4173. Run `npm run build` to regenerate static pages. No dependency installation is needed.

Tour reservations use the existing Bookeo service. Digital and physical purchases use the existing checkout service. Inquiry forms prepare an email draft in the visitor’s email app; the visitor must send it. No request is represented as submitted before that action. Amazon book previews and the existing Zohery Tours AI service remain external services.

## Deploy on Vercel

Import this repository with its root as the Root Directory. The committed vercel.json selects the Other/static preset, runs npm run build, and serves dist directly. No Vercel Functions, environment variables, or backend server are required for page delivery. Directory URLs such as /washington-dc-night-tours/ load their own index.html.

Deploy the latest main commit after this fix. Deployments made from older commits retain their old configuration. If the project was created with a server framework, verify that its Framework Preset is Other, its Build Command is npm run build, and its Output Directory is dist.

## Local validation

Run npm run build, then npm run check. Run npm start for a local preview. The preview server lives under scripts/ and is not a deployment entrypoint. Building does not modify package.json or recreate a root server.mjs.
