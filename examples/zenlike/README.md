To run the demo:

```bash
npm install -g elm-compile-html
elm-compile-html Zenlike.html > Zenlike.elm
elm-package install --yes
elm-reactor
open http://localhost:8080/Main.elm
```
