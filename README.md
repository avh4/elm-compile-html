Compile HTML files into Elm code!

### Installation

```bash
git clone https://github.com/avh4/elm-compile-html.git
cd elm-compile-html
npm install --global
```

### Use

```bash
elm-package install evancz/elm-html
elm-compile-html MyHtmlFile.html > MyHtmlFile.elm
```

You can now import `MyHtmlFile` as an Elm module:

```elm
import MyHtmlFile

main = MyHtmlFile.render
```


## Demos

See `examples/Clock/README.md`.


## Development

Running tests:

```bash
npm test
```