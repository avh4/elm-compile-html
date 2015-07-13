module Elm where

import Transducer as T exposing (Transducer)
import Transducer.Debug
import String
import Regex

type Token
  = Identifier String
  | ElmString String
  | Module String
  | Import String (Maybe String) (List String)
  | TypeAnnotation String (List String)
  | Tokens (List Token)
  | Equals
  | ListSeparator
  | StartList | EndList

identifier = Identifier
string = ElmString
module' = Module
import' = Import
typeAnnotation = TypeAnnotation
startList = StartList
endList = EndList
list l = case l of
  [] -> Tokens [ StartList, EndList ]
  (a::[]) ->
    Tokens
      [ StartList
      , Tokens (List.intersperse ListSeparator l)
      , EndList
      ]
  _ ->
    Tokens
    [ StartList
    , Tokens (List.intersperse ListSeparator l)
    , EndList
    ]
fnCall name ts = Tokens [ identifier name, Tokens ts ]
definitionStart name vars = Tokens [ identifier name, Equals ]

withUnit a = ((),a)

step : (String -> r -> r) -> Token -> r -> r
step reduce input value = case input of
  Tokens ts -> List.foldl (step reduce) value ts
  Equals -> value |> reduce "="
  ListSeparator -> value |> reduce ", "
  StartList -> value |> reduce "["
  EndList -> value |> reduce "]"
  Identifier name -> value
    |> reduce name
  ElmString s -> value
    |> reduce "\""
    |> reduce (s
      |> Regex.replace Regex.All (Regex.regex "\t") (always "\\t")
      |> Regex.replace Regex.All (Regex.regex "\n") (always "\\n")
      |> Regex.replace Regex.All (Regex.regex "\r") (always "\\r")
      )
    |> reduce "\""
  Module name -> value
    |> reduce "module "
    |> reduce name
    |> reduce " where\n\n"
  Import name Nothing [] -> value
    |> reduce "import "
    |> reduce name
    |> reduce "\n"
  Import name (Just alias) [] -> value
    |> reduce "import "
    |> reduce name
    |> reduce " as "
    |> reduce alias
    |> reduce "\n"
  Import name Nothing expose -> value
    |> reduce "import "
    |> reduce name
    |> reduce " exposing ("
    |> reduce (String.join "," expose)
    |> reduce ")\n"
  TypeAnnotation name types -> value
    |> reduce name
    |> reduce " : "
    |> reduce (String.join " -> " types)
    |> reduce "\n"
  _ -> value
    |> reduce "{- NOT YET IMPLEMENTED: \n"
    |> reduce (Basics.toString input)
    |> reduce "-}\n"

toString : Transducer Token String r ()
toString =
  { init = \reduce r -> r |> withUnit
  , step = \reduce input (_,value) -> value |> step reduce input |> withUnit
  , complete = \reduce (_,value) -> value
  }
