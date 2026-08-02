#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_zip="$project_dir/assets/source_models/toilet_sink/toilet_sink_source.zip"
target_dir="$project_dir/assets/models/toilet_sink"

mkdir -p "$target_dir"
unzip -p "$source_zip" toilet4bs.blend > "$target_dir/toilet_sink.blend"

