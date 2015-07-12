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

## Example

MyPanel.html:

```html
<div class="panel panel-default">
  <div class="panel-heading">
    <h3 class="panel-title">Panel title</h3>
  </div>
  <div class="panel-body">
    Panel content
  </div>
</div>
```

Running `elm-compile MyPanel.html` yields:

```elm
module MyPanel where

import Html exposing (Html)
import Html.Attributes as Attr

render : Html
render = Html.node "div"
    [ Attr.attribute "class" "panel panel-default" ]
    [ Html.text "\n  "
    , Html.node "div"
        [ Attr.attribute "class" "panel-heading" ]
        [ Html.text "\n    "
        , Html.node "h3" [ Attr.attribute "class" "panel-title" ] [ Html.text "Panel title" ]
        , Html.text "\n  "
        ]
    , Html.text "\n  "
    , Html.node "div" [ Attr.attribute "class" "panel-body" ] [ Html.text "\n    Panel content\n  " ]
    , Html.text "\n"
    ]
```


## Demos

See `examples/Clock/README.md`.


## Development

Running tests:

```bash
npm test
```