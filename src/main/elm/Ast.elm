module Ast where

import Debug

import Elm
import Transducer as T exposing (Transducer, (>>>))
import Transducer.Debug

foldOne reduce init a = init |> reduce a

transduceSingleToString : Transducer a String String s -> a -> String
transduceSingleToString = T.transduce foldOne (flip (++)) ""

toElmCode : Module -> String
toElmCode = transduceSingleToString (toElm >>> Elm.toString)

--
-- ElmWriter
--

withUnit a = ((),a)

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
    |> \r -> List.foldr (nodeToElm reduce) r children
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
  MustacheBool name node -> r
    |> reduce Elm.StartIfToken
    |> reduce (Elm.ExprToken <| Elm.RefExpr ("model." ++ name))
    |> reduce Elm.StartThenToken
    |> nodeToElm reduce node
    |> reduce Elm.StartElseToken
    |> reduce (Elm.ExprToken <| Elm.LiteralExpr <| Elm.StringLiteral "")

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
  , step = \reduce input (_,r) -> toElm' reduce input r |> withUnit
  , complete = \reduce (_,r) -> r
  }

--
-- Ast
--

type alias Attr = (String,String)
type alias Vars = List (String,String)

type Module = Module String Node Vars

type Node
  = Node String (List Attr) (List Node)
  | Text String
  | MustacheString String
  | MustacheBool String Node

type Zipper
  = OpenChild Zipper String (List Attr) (List Node) (List Node)
  | Root

type alias State =
  { name : String
  , zipper : Zipper
  , vars : Vars
  }

insertChild : Node -> State -> State
insertChild n s = case s.zipper of
  Root -> { s | zipper <- OpenChild Root "div" [] [n] [] }
  OpenChild context tagname attrs left right ->
    { s | zipper <- OpenChild context tagname attrs (n::left) right }

addVar name type' s =
  { s | vars <- (name,type') :: s.vars}

--
-- PUBLIC FUNCTIONS
--

start : String -> State
start moduleName = { name = moduleName, zipper = Root, vars = [] }

onOpenTag : String -> List Attr -> State -> State
onOpenTag tagname attrs s = { s | zipper <- OpenChild s.zipper tagname attrs [] [] }

closeTag : String -> State -> Result String State
closeTag tagname s = case s.zipper of
  Root -> Err "Close tag with no matching open"
  OpenChild context tagname' attrs left right ->
    if tagname /= tagname' then
      Err <| "Expected closing " ++ tagname' ++ ", but got closing " ++ tagname
    else
      { s | zipper <- context }
      |> insertChild (Node tagname attrs ((List.reverse left) ++ right))
      |> Ok

end' : State -> Result String Node
end' s = case s.zipper of
  Root -> Err "No content"
  OpenChild Root "div" [] (single::[]) [] ->
    Ok single
  OpenChild Root tagname attrs left right ->
    Ok <| Node tagname attrs ((List.reverse left) ++ right)
  OpenChild context tagname attrs left right ->
    { s | zipper <- context }
    |> insertChild (Node tagname attrs ((List.reverse left) ++ right))
    |> end'

end : State -> Result String Module
end s = end' s
  |> Result.map (\node -> Module s.name node s.vars)

onText : String -> State -> State
onText text s = case text of
  "{{x}}" -> insertChild (MustacheString "x") s |> addVar "x" "String"
  "{{#b}}Text{{/b}}" ->
    insertChild (MustacheBool "b" (Text "Text")) s
    |> addVar "b" "Bool"
  "Hello, {{subject}}!\n" -> s
    |> insertChild (Text "Hello, ")
    |> insertChild (MustacheString "subject")
    |> addVar "subject" "String"
    |> insertChild (Text "!\n")
  _ -> insertChild (Text text) s
