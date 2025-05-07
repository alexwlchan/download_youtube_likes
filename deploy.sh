#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o xtrace

ROOT_FOLDER=repos/alexwlchan.net/_site/my-tools/list-youtube-likes

ssh alexwlchan.net mkdir -p "$ROOT_FOLDER"

rsync index.html alexwlchan.net:$ROOT_FOLDER/index.html
rsync style.css alexwlchan.net:$ROOT_FOLDER/style.css
rsync list_youtube_likes.js alexwlchan.net:$ROOT_FOLDER/list_youtube_likes.js
