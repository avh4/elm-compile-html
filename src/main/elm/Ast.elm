module Ast where

import Debug

import Elm
import Transducer as T exposing (Transducer, (>>>))
import Transducer.Debug
import Regex
import String

foldOne reduce init a = init |> reduce a

transduceSingleToString : Transducer a String String s -> a -> String
transduceSingleToString = T.transduce foldOne (flip (++)) ""

toElmCode : Module -> String
toElmCode = transduceSingleToString (toElm >>> Elm.toString)

--
-- ElmWriter
--

attrToElm : (Elm.Token -> r -> r) -> Attr -> r -> r
attrToElm reduce (k,v) =
  reduce (Elm.startFnCall "Attr.attribute")
  >> reduce (Elm.string k)
  >> reduce (Elm.string v)
  >> reduce (Elm.endFnCall)

nodeToElm : (Elm.Token -> r -> r) -> Node -> r -> r
nodeToElm reduce node r = case node of
  Node name attrs children -> r
    |> reduce (Elm.startFnCall "Html.node")
    |> reduce (Elm.string name)
    |> reduce (Elm.startList)
    |> \r -> List.foldl (attrToElm reduce) r attrs
    |> reduce (Elm.endList)
    |> reduce (Elm.startList)
    |> \r -> List.foldl (nodeToElm reduce) r children
    |> reduce (Elm.endList)
    |> reduce (Elm.endFnCall)
  Text text -> r
    |> reduce (Elm.startFnCall "Html.text")
    |> reduce (Elm.string text)
    |> reduce (Elm.endFnCall)
  MustacheString name -> r
    |> reduce (Elm.startFnCall "Html.text")
    |> reduce (Elm.identifier ("model." ++ name))
    |> reduce (Elm.endFnCall)
  MustacheBool name children -> r
    |> reduce Elm.StartIfToken
    |> reduce (Elm.ExprToken <| Elm.RefExpr ("model." ++ name))
    --|> reduce Elm.StartList
    |> \r -> List.foldl (nodeToElm reduce) r children -- TODO: right direction?
    --|> reduce Elm.EndList
    |> reduce (Elm.startFnCall "Html.text")
    |> reduce (Elm.ExprToken <| Elm.LiteralExpr <| Elm.StringLiteral "")
    |> reduce Elm.endFnCall

toElm' : (Elm.Token -> r -> r) -> Module -> r -> r
toElm' reduce m r = case m of
  Module name node vars -> r
    |> reduce (Elm.module' name)
    |> reduce (Elm.import' "Html" Nothing ["Html"])
    |> reduce (Elm.import' "Html.Attributes" (Just "Attr") [])
    |> reduce (Elm.typeAlias "Model" vars)
    |> reduce (Elm.typeAnnotation "render" (if vars == [] then ["Html"] else ["Model", "Html"]))
    |> reduce (Elm.definitionStart "render" (if vars == [] then [] else [" model"]))
    |> nodeToElm reduce node

toElm : Transducer Module Elm.Token r ()
toElm =
  { init = \reduce r -> ((),r)
  , step = \reduce input (_,r) -> ((),toElm' reduce input r)
  , complete = \reduce (_,r) -> r
  }

--
-- Ast
--

type alias Attr = (String,String)
type alias Vars = List (String,String)

type Module = Module String Node Vars

type Node
  = Node String (List Attr) (List Node) {-reversed-}
  | Text String
  | MustacheString String
  | MustacheBool String (List Node) {-reversed-}

type Zipper
  = InChild Zipper String (List Attr) (List Node) {-reversed-}
  | InMustache Zipper String (List Node) {-reversed-}
  | Root

type alias State =
  { name : String
  , zipper : Zipper
  , vars : Vars
  }

insertChild : Node -> State -> State
insertChild n s = case s.zipper of
  Root -> { s | zipper <- InChild Root "div" [] [n] }
  InChild context tagname attrs left ->
    { s | zipper <- InChild context tagname attrs (n::left) }
  InMustache context name left ->
    { s | zipper <- InMustache context name (n::left) }

addVar name type' s = -- TODO: Err if it already exists with a different type
  { s | vars <- (name,type') :: s.vars}

--
-- PUBLIC FUNCTIONS
--

start : String -> State
start moduleName = { name = moduleName, zipper = Root, vars = [] }

onOpenTag : String -> List Attr -> State -> State
onOpenTag tagname attrs s = { s | zipper <- InChild s.zipper tagname attrs [] }

closeTag : String -> State -> Result String State
closeTag tagname s = case s.zipper of
  Root -> Err "Close tag with no matching open"
  InChild context tagname' attrs left ->
    if tagname /= tagname' then
      Err <| "Expected closing " ++ tagname' ++ ", but got closing " ++ tagname
    else
      { s | zipper <- context }
      |> insertChild (Node tagname attrs left)
      |> Ok

end' : State -> Result String Node
end' s = case s.zipper of
  Root -> Err "No content"
  InMustache _ name _ -> Err <| "Unclosed mustache group {{#" ++ name ++ "}}"
  InChild Root "div" [] (single::[]) ->
    Ok single
  InChild Root tagname attrs left ->
    Ok <| Node tagname attrs left
  InChild context tagname attrs left ->
    { s | zipper <- context }
    |> insertChild (Node tagname attrs left)
    |> end'

end : State -> Result String Module
end s = end' s
  |> Result.map (\node -> Module s.name node s.vars)

type Token
  = Literal String
  | MustacheReference String
  | MustacheOpen String
  | MustacheClose String

toMaybe l = case l of
  (a::_) -> Just a
  _ -> Nothing

applyString : (Token -> r -> r) -> String -> r -> r
applyString reduce s r =
  let
    refMatch = Regex.find (Regex.AtMost 1) (Regex.regex "{{[^#/].*?}}") s |> toMaybe
      |> Maybe.map (\m -> (m,MustacheReference (m.match |> String.slice 2 -2)))
    openMatch = Regex.find (Regex.AtMost 1) (Regex.regex "{{#.*?}}") s |> toMaybe
      |> Maybe.map (\m -> (m,MustacheOpen (m.match |> String.slice 3 -2)))
    endMatch = Regex.find (Regex.AtMost 1) (Regex.regex "{{/.*?}}") s |> toMaybe
      |> Maybe.map (\m -> (m,MustacheClose (m.match |> String.slice 3 -2)))
    bestMatch = Maybe.oneOf [refMatch, openMatch, endMatch] -- TODO: get the first one
  in
    case bestMatch of
      Just (m,t) -> r
        |> reduce (Literal (String.left m.index s))
        |> reduce t
        |> applyString reduce (s |> String.dropLeft (m.index + (String.length m.match)))
      Nothing -> r
        |> reduce (Literal s)

onText : String -> State -> State
onText text s =
  let
    reduce token state = case token of
      Literal "" -> state
      Literal str -> state
        |> insertChild (Text str)
      MustacheReference name -> state
        |> insertChild (MustacheString name)
        |> addVar name "String"
      MustacheOpen name ->
        { state | zipper <- InMustache state.zipper name [] }
      MustacheClose name -> case state.zipper of
        InMustache context name left ->
          { state | zipper <- context }
          |> addVar name "Bool"
          |> insertChild (MustacheBool name left)
        --_ -> Err
  in
    applyString reduce text s
