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
  | StartFnCall String | EndFnCall

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
startFnCall = StartFnCall
endFnCall = EndFnCall
definitionStart name vars = Tokens [ identifier name, Equals ]

type Expr
  = StringExpr String
  | ListExpr (List Expr) {-reversed-}
  | ApplyExpr String (List Expr) {-reversed-}

type Zipper
  = Start
  | InList Zipper (List Expr) {-reversed-}
  | InFnCall Zipper String (List Expr) {-reversed-}

write : (String -> r -> r) -> Expr -> r -> r
write reduce expr r = case expr of
  StringExpr s -> r
    |> reduce "\""
    |> reduce (s
      |> Regex.replace Regex.All (Regex.regex "\t") (always "\\t")
      |> Regex.replace Regex.All (Regex.regex "\n") (always "\\n")
      |> Regex.replace Regex.All (Regex.regex "\r") (always "\\r")
      )
    |> reduce "\""
  ListExpr items -> case items of
    [] -> r
      |> reduce "[]"
    (a::[]) -> r
      |> reduce "[ "
      |> write reduce a
      |> reduce " ]"
    (a::rest) -> r
      |> reduce "["
      |> write reduce a
      |> \r -> List.foldl (\e r -> r |> reduce ", " |> write reduce e) r rest
      |> reduce "]"
  ApplyExpr name exprs -> r
    |> reduce name
    |> \r -> List.foldr (\e r -> r |> reduce " " |> write reduce e) r exprs

applyExpr reduce (state,value) expr = case state of
  Start -> (state, write reduce expr value)
  InList z es -> value |> (,) (InList z (expr::es))
  InFnCall z n es -> value |> (,) (InFnCall z n (expr::es))

step : (String -> r -> r) -> Token -> (Zipper,r) -> (Zipper,r)
step reduce input (state,value) = case input of
  StartList -> value
    |> (,) (InList state [])
  EndList -> case state of
    InList context items ->
      applyExpr reduce (context,value) (ListExpr items)
    --_ -> crash
  StartFnCall name -> value
    |> (,) (InFnCall state name [])
  EndFnCall -> case state of
    InFnCall context name exprs ->
      applyExpr reduce (context,value) (ApplyExpr name exprs)
    --_ -> crash
  ElmString s -> applyExpr reduce (state,value) (StringExpr s)
  Tokens ts -> List.foldl (step reduce) (state,value) ts
  Equals -> value |> reduce " = "
    |> (,) state
  ListSeparator -> value |> reduce ", "
    |> (,) state
  Identifier name -> value
    |> reduce name
    |> (,) state
  Module name -> value
    |> reduce "module "
    |> reduce name
    |> reduce " where\n\n"
    |> (,) state
  Import name Nothing [] -> value
    |> reduce "import "
    |> reduce name
    |> reduce "\n"
    |> (,) state
  Import name (Just alias) [] -> value
    |> reduce "import "
    |> reduce name
    |> reduce " as "
    |> reduce alias
    |> reduce "\n"
    |> (,) state
  Import name Nothing expose -> value
    |> reduce "import "
    |> reduce name
    |> reduce " exposing ("
    |> reduce (String.join "," expose)
    |> reduce ")\n"
    |> (,) state
  TypeAnnotation name types -> value
    |> reduce name
    |> reduce " : "
    |> reduce (String.join " -> " types)
    |> reduce "\n"
    |> (,) state
  _ -> value
    |> reduce "{- NOT YET IMPLEMENTED: \n"
    |> reduce (Basics.toString input)
    |> reduce "-}\n"
    |> (,) state

toString : Transducer Token String r Zipper
toString =
  { init = \reduce r -> (Start,r)
  , step = step
  , complete = \reduce (state,value) -> value
  }
