module Elm where

import Transducer as T exposing (Transducer)
import Transducer.Debug
import String
import Regex
import Debug

type Token
  = Identifier String
  | Module String
  | Import String (Maybe String) (List String)
  | TypeAnnotation String (List String)
  | Tokens (List Token)
  | Equals
  | ListSeparator
  | StartList | EndList
  | StartFnCall String | EndFnCall
  | TopLevelStatementToken TopLevelStatement
  | ExprToken Expr
  | StartIfToken | StartThenToken | StartElseToken

identifier = Identifier
string s = ExprToken <| LiteralExpr <| StringLiteral s
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
definitionStart name vars = Tokens
  [ identifier name
  , Tokens (List.map identifier vars)
  , Equals
  ]
typeAlias name vars =
  AliasDef name (TRecord (List.map (\(k,v) -> TRecBind k (TVar v)) vars))
  |> TopLevelStatementToken

type Literal
  = StringLiteral String

type TRecBind = TRecBind String Type

type Type
  = TVar String
  | TRecord (List TRecBind)

type TopLevelStatement
  = AliasDef String {-(List Pattern)-} Type

type Expr
  = ListExpr (List Expr) {-reversed-}
  | ApplyExpr String (List Expr) {-reversed-}
  | IfExpr Expr Expr Expr
  | LiteralExpr Literal
  | RefExpr String

type Zipper
  = Start
  | InList Zipper (List Expr) {-reversed-}
  | InFnCall Zipper String (List Expr) {-reversed-}

write : (String -> r -> r) -> Expr -> r -> r
write reduce expr r = case expr of
  ListExpr items -> case items of
    [] -> r
      |> reduce "[]"
    (a::[]) -> r
      |> reduce "[ "
      |> write reduce a
      |> reduce " ]"
    (a::rest) -> r
      |> reduce "[ "
      |> write reduce a
      |> \r -> List.foldl (\e r -> r |> reduce "\n    , " |> write reduce e) r rest
      |> reduce "]"
  ApplyExpr name exprs -> r
    |> reduce name
    |> \r -> List.foldr (\e r -> r |> reduce " " |> write reduce e) r exprs
  IfExpr e1 e2 e3 -> r
    |> reduce "if "
    |> write reduce e1
    |> reduce " then "
    |> write reduce e2
    |> reduce " else "
    |> write reduce e3
  LiteralExpr lit -> case lit of
    StringLiteral s -> r
      |> reduce "\""
      |> reduce (s
        |> Regex.replace Regex.All (Regex.regex "\t") (always "\\t")
        |> Regex.replace Regex.All (Regex.regex "\n") (always "\\n")
        |> Regex.replace Regex.All (Regex.regex "\r") (always "\\r")
        )
      |> reduce "\""
  RefExpr name -> r
    |> reduce name

applyExpr reduce (state,value) expr = case state of
  Start -> value |> write reduce expr |> (,) state
  InList z es -> value |> (,) (InList z (expr::es))
  InFnCall z n es -> value |> (,) (InFnCall z n (expr::es))

applyType type' reduce value = case type' of
  TVar name -> value
    |> reduce name
  TRecord bindings -> value
    |> reduce "{ "
    |> \r -> List.foldl (\(TRecBind k v) r -> r |> reduce k |> reduce " : " |> applyType v reduce) r bindings
    |> reduce " }"

applyTopLevelStatement reduce (state,value) statement = case statement of
  AliasDef name type' -> value
    |> reduce "\ntype alias "
    |> reduce name
    |> reduce " = "
    |> applyType type' reduce
    |> reduce "\n"
    |> (,) state

step : (String -> r -> r) -> Token -> (Zipper,r) -> (Zipper,r)
step reduce input (state,value) = case input of
  StartList -> value
    |> (,) (InList state [])
  EndList -> case state of
    InList context items ->
      applyExpr reduce (context,value) (ListExpr items)
    --_ -> Err
  StartFnCall name -> value
    |> (,) (InFnCall state name [])
  EndFnCall -> case state of
    InFnCall context name exprs ->
      applyExpr reduce (context,value) (ApplyExpr name exprs)
    --_ -> Err
  Identifier name -> applyExpr reduce (state,value) (RefExpr name)
  Tokens ts -> List.foldl (step reduce) (state,value) ts
  TopLevelStatementToken statement -> applyTopLevelStatement reduce (state,value) statement
  ExprToken expr -> applyExpr reduce (state,value) expr
  StartIfToken -> value |> reduce "if " |> (,) state
  StartThenToken -> value |> reduce " then " |> (,) state
  StartElseToken -> value |> reduce " else " |> (,) state
  Equals -> value |> reduce " = "
    |> (,) state
  ListSeparator -> value |> reduce ", "
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
