# random-tools

## After every code change

Always run the full build and push the compiled output:

```bash
cd react && npm run build
cd ..
git add html/
git commit -m "build: update compiled html"
git push
```

This keeps the `html/` directory (served as the live site) in sync with source changes.
