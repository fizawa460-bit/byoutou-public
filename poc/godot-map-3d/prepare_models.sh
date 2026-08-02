#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_glb_gz="$project_dir/assets/source_models/toilet_sink/toilet_sink_source.glb.gz"
target_dir="$project_dir/assets/models/toilet_sink"
glb_path="$target_dir/toilet_sink.glb"

mkdir -p "$target_dir"
gzip --decompress --stdout "$source_glb_gz" > "$glb_path"
test -s "$glb_path"
