module Main where

import IO.IO as IO exposing (..)
import IO.Runner exposing (Request, Response, run)

import View

testRunner : IO ()
testRunner = IO.putStr <| View.view

port requests : Signal Request
port requests = run responses testRunner

port responses : Signal Response
