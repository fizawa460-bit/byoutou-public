#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_url="https://opengameart.org/sites/default/files/toilets_fbx_gltf_blend.zip"
target_dir="$project_dir/assets/models/toilet_sink"
glb_path="$target_dir/toilet_sink.glb"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

mkdir -p "$target_dir"
curl --fail --location --retry 3 --output "$work_dir/toilets.zip" "$source_url"
unzip -p "$work_dir/toilets.zip" glb/Toilets.glb > "$work_dir/Toilets.glb"
python3 "$project_dir/tools/curate_toilet_glb.py" "$work_dir/Toilets.glb" "$glb_path"
test -s "$glb_path"
