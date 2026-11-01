# Expedition Amazon

Browser port of Expedition Amazon, designed by Willard Phillips, originally published by Penguin Software in 1984. Original credits and recovered imagery are preserved.

This repository is a static hosting export. It contains the password screen, playable browser game, required JavaScript/assets and credits. Development pages, experiments, test fixtures, recovery reports, original disk images and research history stay in the private expedition-amazon-code repository. No license or rights transfer is implied for original game content.

## GitHub Pages

In Settings → Pages, choose “Deploy from a branch”, branch `main`, folder `/ (root)`, then Save. The site opens at `https://cstoffel.github.io/expedition-amazon-browser/`. `.nojekyll` keeps these files as ordinary static assets. No build service, application server, package installation or backend is required.

For local preview, run `python3 -m http.server 8765` here and visit `http://localhost:8765/`.

The Apple II password prompt checks a salted PBKDF2 verifier locally and sets a sessionStorage flag. `exp_amzn.html` checks that flag before loading game scripts. This discourages casual visitors; source/assets remain public. The original password is not stored. HTTPS or localhost is required for Web Crypto. Session flags and campaign saves are separate.

A public repo can use GitHub Pages on GitHub Free; private repo Pages availability depends on the account plan. See https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site.

Browser saves belong to the site's origin. Localhost saves do not automatically transfer to github.io. The native game retains its documented reconstruction and timing limits; the supplied cracked disks do not verify retail startup.

`site-manifest.json` records the exported file hashes. To update this site, regenerate an export from the research project's tools/build_pages.py and review/copy the changed files into this repository.
