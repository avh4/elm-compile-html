module VirtualDom where

import String
import Graphics.Element exposing (Element, show)

type alias Node = String
type alias Property = (String,String)

node : String -> List Property -> List Node -> Node
node name properties children =
    let
        propertiesString = ""
        childrenString = children |> String.join ""
    in
        "<" ++ name ++ ">" ++ childrenString ++ "</" ++ name ++ ">"

text : String -> Node
text t = t

attribute : String -> String -> Property
attribute name value = (name,value)

toElement : Int -> Int -> Node -> Element
toElement _ _ _ = show "(VirtualDom.Node)"

fromElement : Element -> Node
fromElement _ = "(Elm Element)"
