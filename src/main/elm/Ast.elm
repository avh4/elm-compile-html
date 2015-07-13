module Ast where

import Debug

import Elm
import Transducer as T exposing (Transducer, (>>>))
import Transducer.Debug

transduceSingleToString : Transducer a String String s -> a -> String
transduceSingleToString = T.transduce (\reduce init a -> init |> reduce a) (flip (++)) ""

toElmCode : Node -> String
toElmCode node = transduceSingleToString (toElm >>> Elm.toString) node

--
-- ElmWriter
--

withUnit a = ((),a)

toElm' : Node -> Elm.Token
toElm' input = case input of
  Node name attrs children ->
    Elm.fnCall "Html.node"
      [ Elm.string name
      , Elm.list (List.map (\(k,v) -> Elm.fnCall "Attr.attribute" [Elm.string k, Elm.string v]) attrs |> List.reverse)
      , Elm.list (List.map toElm' children)
      ]
  Text text ->
    Elm.fnCall "Html.text" [ Elm.string text ]

toElm : Transducer Node Elm.Token r ()
toElm =
  { init = \reduce r -> r
    |> reduce (Elm.module' "View")
    |> reduce (Elm.import' "Html" Nothing ["Html"])
    |> reduce (Elm.import' "Html.Attributes" (Just "Attr") [])
    |> reduce (Elm.typeAnnotation "render" ["Html"])
    |> reduce (Elm.definitionStart "render" [])
    |> withUnit
  , step = \reduce input (_,r) -> r
    |> reduce (toElm' input)
    |> withUnit
  , complete = \_ (_,r) -> r
  }

--
-- Ast
--

type alias Attr = (String,String)

type Node
  = Node String (List Attr) (List Node)
  | Text String

type Zipper
  = OpenChild Zipper String (List Attr) (List Node) (List Node)
  | Root

insertChild : Node -> Zipper -> Zipper
insertChild n z = case z of
  Root -> OpenChild Root "div" [] [n] []
  OpenChild context tagname attrs left right ->
    OpenChild context tagname attrs (n::left) right

start : Zipper
start = Root

onOpenTag : String -> List Attr -> Zipper -> Zipper
onOpenTag tagname attrs z = OpenChild z tagname attrs [] []

closeTag : String -> Zipper -> Result String Zipper
closeTag tagname z = case z of
  Root -> Err "Close tag with no matching open"
  OpenChild context tagname' attrs left right ->
    if tagname /= tagname' then
      Err <| "Expected closing " ++ tagname' ++ ", but got closing " ++ tagname
    else
      insertChild (Node tagname attrs ((List.reverse left) ++ right)) context
      |> Ok

end : Zipper -> Result String Node
end z = case z of
  Root -> Err "No content"
  OpenChild Root "div" [] (single::[]) [] ->
    Ok single
  OpenChild Root tagname attrs left right ->
    Ok <| Node tagname attrs ((List.reverse left) ++ right)
  OpenChild context tagname attrs left right ->
    end <| insertChild (Node tagname attrs ((List.reverse left) ++ right)) context

onText : String -> Zipper -> Zipper
onText text z = insertChild (Text text) z
