module VirtualDom where

import String
import Graphics.Element exposing (Element, show)
import Json.Decode as Json

type alias Node = String
type alias Property = (String,String)

node : String -> List Property -> List Node -> Node
node name properties children =
    let
        childrenString = children |> String.join ""
        translatePropName p = case p of
            "className" -> "class"
            _ -> p
        propToString (k,v) = (translatePropName k) ++ "=" ++ v
        propertiesString = properties |> List.map propToString |> String.join " "
        propertiesSpacing = case properties of
            [] -> ""
            _ -> " "
        propertiesString' = propertiesSpacing ++ propertiesString
    in
        "<" ++ name ++ propertiesString' ++ ">" ++ childrenString ++ "</" ++ name ++ ">"

text : String -> Node
text t = t

attribute : String -> String -> Property
attribute name value = (name, toString value)

property : String -> Json.Value -> Property
property name value = (name, toString value)

toElement : Int -> Int -> Node -> Element
toElement _ _ _ = show "(VirtualDom.Node)"

fromElement : Element -> Node
fromElement _ = "(Elm Element)"
