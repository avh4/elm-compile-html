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


type alias State =
  { zipper : Zipper
  , whitespace : Whitespace
  , indent : String
  }

indent (state,r) = ({state | indent <- state.indent ++ "    "},r)
unindent (state,r) = ({state | indent <- state.indent |> String.dropRight 4},r)

type Zipper
  = Start
  | InList Zipper (List Expr) {-reversed-}
  | InFnCall Zipper String (List Expr) {-reversed-}

setZipper z (state,r) = ({state | zipper <- z},r)

type Whitespace
  = NoSpace
  | Space
  | NextLine

setWhitespace : Whitespace -> (State,r) -> (State,r)
setWhitespace w (state,r) = ({state | whitespace <- w}, r)

increaseWhitespace : Whitespace -> (State,r) -> (State,r)
increaseWhitespace w (state,r) =
  let
    w' = case (w,state.whitespace) of
      (_,NextLine) -> NextLine
      (NextLine,_) -> NextLine
      (_,Space) -> Space
      _ -> w
  in
    setWhitespace w' (state,r)


writeToken : (String -> r -> r) -> String -> (State,r) -> (State,r)
writeToken reduce s (state,r) =
  let
    reduce' string (state,r) = (state,reduce string r)
  in case state.whitespace of
    NoSpace -> (state,r)
      |> reduce' s
      |> setWhitespace NoSpace
    Space -> (state,r)
      |> reduce' " "
      |> reduce' s
      |> setWhitespace NoSpace
    NextLine -> (state,r)
      |> reduce' "\n"
      |> reduce' state.indent
      |> reduce' s
      |> setWhitespace NoSpace

write : (String -> r -> r) -> Expr -> (State,r) -> (State,r)
write reduce expr (state,r) = 
  let
    write' = write reduce
    writeToken' = writeToken reduce
    foldl' fn rest = \r -> List.foldl fn r rest
    foldr' fn rest = \r -> List.foldr fn r rest
  in case expr of
  ListExpr items -> case items of
    [] -> (state,r)
      |> writeToken' "[]"
    (a::[]) -> (state,r)
      |> writeToken' "["
      |> increaseWhitespace Space
      |> write' a
      |> increaseWhitespace Space
      |> writeToken' "]"
    (a::rest) -> (state,r)
      |> increaseWhitespace NextLine
      |> writeToken' "["
      |> increaseWhitespace Space
      |> write' a
      |> foldl' (\e r -> r |> increaseWhitespace NextLine |> writeToken' "," |> increaseWhitespace Space |> write' e) rest
      |> increaseWhitespace NextLine
      |> writeToken' "]"
      |> increaseWhitespace NextLine
  ApplyExpr name exprs -> (state,r)
    |> writeToken' name
    |> indent
    |> foldr' (\e (state,r) -> (state,r) |> increaseWhitespace Space |> write' e) exprs
    |> unindent
  IfExpr e1 e2 e3 -> (state,r)
    |> writeToken' "if "
    |> write' e1
    |> writeToken' " then "
    |> write' e2
    |> writeToken' " else "
    |> write' e3
  LiteralExpr lit -> case lit of
    StringLiteral s -> (state,r)
      |> writeToken' "\""
      |> writeToken' (s
        |> Regex.replace Regex.All (Regex.regex "\t") (always "\\t")
        |> Regex.replace Regex.All (Regex.regex "\n") (always "\\n")
        |> Regex.replace Regex.All (Regex.regex "\r") (always "\\r")
        )
      |> writeToken' "\""
  RefExpr name -> (state,r)
    |> writeToken' name

applyExpr : (String -> r -> r) -> Expr -> (State,r) -> (State,r)
applyExpr reduce expr (state,value) = case state.zipper of
  Start -> (state,value)
    |> write reduce expr
  InList z es -> value
    |> (,) { state | zipper <- InList z (expr::es) }
  InFnCall z n es -> value
    |> (,) { state | zipper <- InFnCall z n (expr::es) }

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

step : (String -> r -> r) -> Token -> (State,r) -> (State,r)
step reduce input (state,value) =
  let
    reduce' = (\string (state,r) -> (state,reduce string r))
    write' = write reduce
    applyExpr' = applyExpr reduce
    foldl' fn rest = \r -> List.foldl fn r rest
    foldr' fn rest = \r -> List.foldr fn r rest
  in case input of
  StartList -> value
    |> (,) { state | zipper <- InList state.zipper [] }
  EndList -> case state.zipper of
    InList context items -> (state,value)
      |> setZipper context
      |> applyExpr' (ListExpr items)
    --_ -> Err
  StartFnCall name -> value
    |> (,) { state | zipper <- InFnCall state.zipper name [] }
  EndFnCall -> case state.zipper of
    InFnCall context name exprs -> (state,value)
      |> setZipper context
      |> applyExpr' (ApplyExpr name exprs)
    --_ -> Err
  Identifier name -> (state,value) |> applyExpr' (RefExpr name)
  Tokens ts -> List.foldl (step reduce) (state,value) ts
  TopLevelStatementToken statement -> applyTopLevelStatement reduce (state,value) statement
  ExprToken expr -> (state,value) |> applyExpr' expr
  StartIfToken -> (state,value) |> reduce' "if "
  StartThenToken -> (state,value) |> reduce' " then "
  StartElseToken -> (state,value) |> reduce' " else "
  Equals -> (state,value) |> reduce' " = "
  ListSeparator -> (state,value) |> reduce' ", "
  Module name -> (state,value)
    |> reduce' "module "
    |> reduce' name
    |> reduce' " where\n\n"
  Import name Nothing [] -> (state,value)
    |> reduce' "import "
    |> reduce' name
    |> reduce' "\n"
  Import name (Just alias) [] -> (state,value)
    |> reduce' "import "
    |> reduce' name
    |> reduce' " as "
    |> reduce' alias
    |> reduce' "\n"
  Import name Nothing expose -> (state,value)
    |> reduce' "import "
    |> reduce' name
    |> reduce' " exposing ("
    |> reduce' (String.join "," expose)
    |> reduce' ")\n"
  TypeAnnotation name types -> (state,value)
    |> reduce' name
    |> reduce' " : "
    |> reduce' (String.join " -> " types)
    |> reduce' "\n"
  _ -> (state,value)
    |> reduce' "{- NOT YET IMPLEMENTED: \n"
    |> reduce' (Basics.toString input)
    |> reduce' "-}\n"

toString : Transducer Token String r State
toString =
  { init = \reduce r -> ({ zipper = Start, whitespace = NoSpace, indent = "" },r)
  , step = step
  , complete = \reduce (state,value) -> value
  }
